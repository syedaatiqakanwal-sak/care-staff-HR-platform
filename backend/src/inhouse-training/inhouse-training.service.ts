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
        const rows = await this.recordRepo.find({
            where: { staffId },
            order: { sortOrder: 'ASC' },
        });
        return rows.map((r) => this.serializeRecord(r));
    }

    /** Ensure date-only fields are always YYYY-MM-DD for HTML date inputs. */
    private formatDateOnly(value: string | Date | null | undefined): string | null {
        if (value == null || value === '') return null;
        if (typeof value === 'string') {
            const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
            return match ? match[1] : null;
        }
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
        }
        return null;
    }

    private serializeRecord(record: InHouseTrainingRecord): InHouseTrainingRecord {
        return {
            ...record,
            enrollmentDate: this.formatDateOnly(record.enrollmentDate),
            completionDate: this.formatDateOnly(record.completionDate),
        };
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
            record.enrollmentDate = this.formatDateOnly(dto.enrollmentDate);
        }
        if (dto.completionDate !== undefined) {
            record.completionDate = this.formatDateOnly(dto.completionDate);
        }
        if (dto.status !== undefined) {
            record.status = dto.status || null;
        }

        const saved = await this.recordRepo.save(record);
        return this.serializeRecord(saved);
    }

    async setDocument(
        staffId: string,
        recordId: string,
        documentName: string,
        documentPath: string,
        extras?: {
            enrollmentDate?: string | null;
            completionDate?: string | null;
            status?: string | null;
        },
    ): Promise<InHouseTrainingRecord> {
        const record = await this.getRecord(staffId, recordId);
        record.documentName = documentName;
        record.documentPath = documentPath;
        // Persist dates/status sent with the upload so they are not lost if Save was not clicked
        if (extras && Object.prototype.hasOwnProperty.call(extras, 'enrollmentDate')) {
            record.enrollmentDate = this.formatDateOnly(extras.enrollmentDate);
        }
        if (extras && Object.prototype.hasOwnProperty.call(extras, 'completionDate')) {
            record.completionDate = this.formatDateOnly(extras.completionDate);
        }
        if (extras && Object.prototype.hasOwnProperty.call(extras, 'status')) {
            const status = extras.status || null;
            record.status =
                status && ['enrolled', 'progressing', 'completed'].includes(status)
                    ? status
                    : null;
        }
        const saved = await this.recordRepo.save(record);
        return this.serializeRecord(saved);
    }

    async getRecord(staffId: string, recordId: string): Promise<InHouseTrainingRecord> {
        const record = await this.recordRepo.findOne({ where: { id: recordId, staffId } });
        if (!record) {
            throw new NotFoundException('In-house training record not found');
        }
        return record;
    }
}
