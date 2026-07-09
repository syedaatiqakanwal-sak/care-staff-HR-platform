import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Request,
    UseGuards,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { MANAGEMENT_ROLES } from './role.utils';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { StaffService } from '../staff/staff.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { clientIpFromRequest } from '../audit/audit-request.util';
import type { Request as ExpressRequest } from 'express';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly staffService: StaffService,
        private readonly audit: AuditService,
    ) {}

    @Get()
    @Roles(UserRole.ADMIN)
    async listUsers() {
        const users = await this.usersService.findAllSummaries();
        return {
            success: true,
            users: users.map((u) => ({
                id: u.id,
                email: u.email,
                role: (u.role as UserRole).toLowerCase(),
                isActive: u.isActive,
                readOnly: u.readOnly ?? false,
                lastLoginAt: u.lastLoginAt,
                createdAt: u.createdAt,
            })),
        };
    }

    @Post()
    @Roles(...MANAGEMENT_ROLES)
    async createUser(
        @Body() dto: CreateUserDto,
        @Request() req: ExpressRequest & { user: { userId: string; role: string } },
    ) {
        const email = dto.email.toLowerCase().trim();
        if (await this.usersService.exists(email)) {
            throw new BadRequestException('Email already registered');
        }

        if (dto.role === UserRole.STAFF) {
            if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
                throw new BadRequestException('firstName and lastName are required for STAFF users');
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = await this.usersService.create({
            email,
            password: hashedPassword,
            role: dto.role,
            readOnly: dto.readOnly ?? false,
            isActive: dto.isActive ?? true,
        });

        if (user.role === UserRole.STAFF) {
            await this.staffService.createProfile(
                user,
                dto.firstName!.trim(),
                dto.lastName!.trim(),
                dto.phone,
                dto.ilccsNumber,
                undefined,
                dto.lcaNumber,
                dto.middleName?.trim(),
            );
        }

        await this.audit.log({
            userId: req.user.userId,
            userRole: req.user.role,
            action: AuditAction.CREATE,
            entityType: 'user',
            entityId: user.id,
            summary: `Created user ${email} with role ${user.role}`,
            ipAddress: clientIpFromRequest(req),
        });

        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role.toLowerCase(),
                isActive: user.isActive,
                readOnly: user.readOnly,
            },
        };
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    async updateUser(
        @Param('id') id: string,
        @Body() dto: UpdateUserRoleDto,
        @Request() req: ExpressRequest & { user: { userId: string; role: string } },
    ) {
        const existing = await this.usersService.findById(id);
        if (!existing) {
            throw new NotFoundException('User not found');
        }

        if (dto.role !== undefined && dto.role !== UserRole.STAFF && existing.role === UserRole.STAFF) {
            // Staff profile may remain orphaned; acceptable for phase 1 (admin reassigns role)
        }

        const updated = await this.usersService.update(id, {
            ...(dto.role !== undefined ? { role: dto.role } : {}),
            ...(dto.readOnly !== undefined ? { readOnly: dto.readOnly } : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        });

        if (!updated) {
            throw new NotFoundException('User not found');
        }

        const changes: string[] = [];
        if (dto.role !== undefined && dto.role !== existing.role) {
            changes.push(`role ${existing.role} → ${dto.role}`);
        }
        if (dto.readOnly !== undefined && dto.readOnly !== existing.readOnly) {
            changes.push(`readOnly → ${dto.readOnly}`);
        }
        if (dto.isActive !== undefined && dto.isActive !== existing.isActive) {
            changes.push(`isActive → ${dto.isActive}`);
        }
        if (changes.length > 0) {
            await this.audit.log({
                userId: req.user.userId,
                userRole: req.user.role,
                action: AuditAction.UPDATE,
                entityType: 'user',
                entityId: id,
                summary: `Updated user ${existing.email}: ${changes.join(', ')}`,
                ipAddress: clientIpFromRequest(req),
            });
        }

        return {
            success: true,
            user: {
                id: updated.id,
                email: updated.email,
                role: updated.role.toLowerCase(),
                isActive: updated.isActive,
                readOnly: updated.readOnly,
            },
        };
    }
}
