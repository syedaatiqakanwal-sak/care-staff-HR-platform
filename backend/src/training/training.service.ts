import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TrainingRecord, TrainingStatus } from './training-record.entity';
import { Certificate, CertificateStatus } from '../certificates/certificate.entity';

@Injectable()
export class TrainingService {
    private readonly logger = new Logger(TrainingService.name);

    constructor(
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
        @InjectRepository(Certificate)
        private certificateRepository: Repository<Certificate>,
    ) { }

    async findAllForUser(userId: string): Promise<TrainingRecord[]> {
        // Sync first to ensure data consistency
        await this.syncCertificatesToTraining(userId);

        return this.trainingRepository.find({
            where: { userId },
            order: { courseName: 'ASC' }
        });
    }

    // Backfill method to ensure existing certificates have training records
    async syncCertificatesToTraining(userId: string) {
        const certificates = await this.certificateRepository.find({
            where: { userId, status: CertificateStatus.COMPLETED }
        });

        for (const cert of certificates) {
            // Check if a record exists for this course (regardless of subModule for sync)
            const exists = await this.trainingRepository.findOne({
                where: { userId, courseName: cert.courseName }
            });

            if (!exists) {
                // FIXED: Double cast here as well to be safe
                const record = this.trainingRepository.create({
                    userId,
                    courseName: cert.courseName,
                    status: TrainingStatus.COMPLETED,
                    completedAt: cert.issuedAt || new Date(),
                } as any) as unknown as TrainingRecord;
                
                await this.trainingRepository.save(record);
                this.logger.log(`Backfilled Training Record for User ${userId} - Course: ${cert.courseName}`);
            } else if (exists.status !== TrainingStatus.COMPLETED) {
                exists.status = TrainingStatus.COMPLETED;
                exists.completedAt = cert.issuedAt || new Date();
                await this.trainingRepository.save(exists);
                this.logger.log(`Updated Training Record for User ${userId} - Course: ${cert.courseName}`);
            }
        }
    }

    // New method to delete a specific enrollment record
    async deleteRecord(userId: string, recordId: string): Promise<void> {
        const result = await this.trainingRepository.delete({ id: recordId, userId });
        if (result.affected === 0) {
            throw new NotFoundException(`Training record not found for user ${userId}`);
        }
    }

    async upsertRecord(userId: string, courseName: string, data: { enrollmentDate?: Date | null, completedAt?: Date | null, subModule?: string }) {
        // Construct the search criteria based on subModule presence
        const searchCriteria: any = {
            userId,
            courseName
        };

        // If a subModule is provided, we look for that SPECIFIC entry.
        // If not provided (standard courses), we look for the entry where subModule is null.
        if (data.subModule) {
            searchCriteria.subModule = data.subModule;
        } else {
            searchCriteria.subModule = IsNull();
        }

        let record = await this.trainingRepository.findOne({
            where: searchCriteria
        });

        if (!record) {
            // FIXED: Cast to 'unknown' first, then 'TrainingRecord'. 
            // This resolves the TS2352 error because we are forcing TS to accept the single object type.
            record = this.trainingRepository.create({
                userId,
                courseName,
                status: TrainingStatus.PENDING,
                subModule: data.subModule || null
            } as any) as unknown as TrainingRecord;
        }

        // FIXED: Create a non-null reference to avoid "possibly null" errors in TS
        const validRecord = record!;

        if (data.enrollmentDate !== undefined) {
            validRecord.enrollmentDate = data.enrollmentDate;
        }

        if (data.completedAt !== undefined) {
            validRecord.completedAt = data.completedAt;
            // Auto-update status based on date presence
            validRecord.status = data.completedAt ? TrainingStatus.COMPLETED : TrainingStatus.PENDING;
        }

        // Update the subModule if provided
        if (data.subModule !== undefined) {
            // FIXED: Cast to 'any' to allow assigning null to a field typescript might think is strict string
            (validRecord as any).subModule = data.subModule || null;
        }

        return this.trainingRepository.save(validRecord);
    }
}
