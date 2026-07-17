import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InHouseTrainingTemplate } from './inhouse-training-template.entity';
import { InHouseTrainingRecord } from './inhouse-training-record.entity';
import { UpdateInHouseTrainingDto } from './dto/update-inhouse-training.dto';

@Injectable()
export class InHouseTrainingService {
    constructor(
        @InjectRepository(InHouseTrainingTemplate)
        private readonly templateRepo: Repository<InHouseTrainingTemplate>,
        @InjectRepository(InHouseTrainingRecord)
        private readonly recordRepo: Repository<InHouseTrainingRecord>,
    ) {}

    async findForStaff(staffId: string): Promise<InHouseTrainingRecord[]> {
        return this.recordRepo.find({
            where: { staffId },
            order: { sortOrder: 'ASC' },
        });
    }

    /** Copies all template rows into staff-specific records. No-op (returns existing) if already initialized. */
    async initForStaff(staffId: string): Promise<InHouseTrainingRecord[]> {
        const existing = await this.recordRepo.find({ where: { staffId } });
        if (existing.length > 0) {
            return this.findForStaff(staffId);
        }

        const templates = await this.templateRepo.find({ order: { sortOrder: 'ASC' } });
        const records = templates.map((t) =>
            this.recordRepo.create({
                staffId,
                templateId: t.id,
                title: t.title,
                group: t.group,
                sortOrder: t.sortOrder,
                filterGroup: t.filterGroup,
                categoryHeader: t.categoryHeader,
                enrollmentDate: null,
                completionDate: null,
                status: null,
                documentPath: null,
                documentName: null,
            }),
        );
        await this.recordRepo.save(records);
        return this.findForStaff(staffId);
    }

    async updateRecord(
        staffId: string,
        recordId: string,
        dto: UpdateInHouseTrainingDto,
    ): Promise<InHouseTrainingRecord> {
        const record = await this.getRecord(staffId, recordId);

        if (dto.enrollmentDate !== undefined) {
            record.enrollmentDate = dto.enrollmentDate || null;
        }
        if (dto.completionDate !== undefined) {
            record.completionDate = dto.completionDate || null;
        }
        if (dto.status !== undefined) {
            record.status = dto.status || null;
        }

        return this.recordRepo.save(record);
    }

    async setDocument(
        staffId: string,
        recordId: string,
        documentName: string,
        documentPath: string,
    ): Promise<InHouseTrainingRecord> {
        const record = await this.getRecord(staffId, recordId);
        record.documentName = documentName;
        record.documentPath = documentPath;
        return this.recordRepo.save(record);
    }

    async getRecord(staffId: string, recordId: string): Promise<InHouseTrainingRecord> {
        const record = await this.recordRepo.findOne({ where: { id: recordId, staffId } });
        if (!record) {
            throw new NotFoundException('In-house training record not found');
        }
        return record;
    }
}
