import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from './audit-action.enum';

export type AuditLogParams = {
  userId: string;
  userRole: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  ipAddress?: string | null;
};

export type AuditLogQuery = {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  /**
   * Append-only audit entry. Call from sensitive services (HR notes, payroll, documents, user admin).
   */
  async log(params: AuditLogParams): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      userId: params.userId,
      userRole: params.userRole?.toUpperCase?.() ?? params.userRole,
      action: String(params.action),
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
      ipAddress: params.ipAddress ?? null,
    });
    return this.auditRepo.save(entry);
  }

  async findFiltered(query: AuditLogQuery): Promise<{ items: AuditLog[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('a').orderBy('a.createdAt', 'DESC');

    if (query.entityType) {
      qb.andWhere('a.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.entityId) {
      qb.andWhere('a.entityId = :entityId', { entityId: query.entityId });
    }
    if (query.userId) {
      qb.andWhere('a.userId = :userId', { userId: query.userId });
    }
    if (query.action) {
      qb.andWhere('a.action = :action', { action: query.action });
    }
    if (query.from) {
      qb.andWhere('a.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      const to = new Date(query.to);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('a.createdAt <= :to', { to });
    }

    const total = await qb.getCount();
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    const offset = Math.max(query.offset ?? 0, 0);
    qb.take(limit).skip(offset);

    const items = await qb.getMany();
    return { items, total };
  }
}

/** @deprecated Use AuditService — alias for gradual migration */
export const AuditTrailService = AuditService;
export type AuditLogInput = AuditLogParams;
