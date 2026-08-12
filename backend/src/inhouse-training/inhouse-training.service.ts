import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InHouseTrainingTemplate } from './inhouse-training-template.entity';
import { InHouseTrainingRecord } from './inhouse-training-record.entity';
import { UpdateInHouseTrainingDto } from './dto/update-inhouse-training.dto';

export type SerializedInHouseTrainingRecord = Omit<
    InHouseTrainingRecord,
    'enrollmentDate' | 'completionDate'
> & {
    enrollmentDate: string | null;
    completionDate: string | null;
};

@Injectable()
export class InHouseTrainingService {
    constructor(
        @InjectRepository(InHouseTrainingTemplate)
        private readonly templateRepo: Repository<InHouseTrainingTemplate>,
        @InjectRepository(InHouseTrainingRecord)
        private readonly recordRepo: Repository<InHouseTrainingRecord>,
    ) {}

    /** Normalize any date / ISO value to YYYY-MM-DD (date-only) or null. */
    formatDateOnly(value: string | Date | null | undefined): string | null {
        if (value == null || value === '') return null;
        if (value instanceof Date) {
            if (Number.isNaN(value.getTime())) return null;
            const y = value.getUTCFullYear();
            const m = String(value.getUTCMonth() + 1).padStart(2, '0');
            const day = String(value.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        const trimmed = String(value).trim();
        if (!trimmed) return null;
        const datePart = trimmed.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return null;
        const y = parsed.getUTCFullYear();
        const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
        const day = String(parsed.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    serializeRecord(record: InHouseTrainingRecord): SerializedInHouseTrainingRecord {
        return {
            ...record,
            enrollmentDate: this.formatDateOnly(record.enrollmentDate),
            completionDate: this.formatDateOnly(record.completionDate),
        };
    }

    async findForStaff(staffId: string): Promise<SerializedInHouseTrainingRecord[]> {
        const records = await this.recordRepo.find({
            where: { staffId },
            order: { sortOrder: 'ASC' },
        });
        return records.map((r) => this.serializeRecord(r));
    }

    /** Copies all template rows into staff-specific records. No-op (returns existing) if already initialized. */
    async initForStaff(staffId: string): Promise<SerializedInHouseTrainingRecord[]> {
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
    ): Promise<SerializedInHouseTrainingRecord> {
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
    ): Promise<SerializedInHouseTrainingRecord> {
        const record = await this.getRecord(staffId, recordId);
        record.documentName = documentName;
        record.documentPath = documentPath;

        // Only update when present — do not wipe existing dates/status if omitted
        if (extras) {
            if (extras.enrollmentDate !== undefined) {
                record.enrollmentDate = this.formatDateOnly(extras.enrollmentDate);
            }
            if (extras.completionDate !== undefined) {
                record.completionDate = this.formatDateOnly(extras.completionDate);
            }
            if (extras.status !== undefined) {
                record.status = extras.status || null;
            }
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
