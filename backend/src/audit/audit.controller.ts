import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

/** Audit log viewer: Admin and Manager only (not HR or Supervisor). */
const AUDIT_VIEW_ROLES = [UserRole.ADMIN, UserRole.MANAGER];

@Controller('audit-logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(...AUDIT_VIEW_ROLES)
  async list(@Query() query: AuditLogQueryDto) {
    const { items, total } = await this.auditService.findFiltered(query);
    return {
      success: true,
      total,
      items: items.map((row) => ({
        id: row.id,
        userId: row.userId,
        userRole: row.userRole,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
      })),
    };
  }
}
