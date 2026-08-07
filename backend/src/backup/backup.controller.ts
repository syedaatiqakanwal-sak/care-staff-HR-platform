import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { BackupService } from './backup.service';
import { BackupR2Service } from './backup-r2.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { BackupType } from './entities/backup-log.entity';

/**
 * Project uses passport AuthGuard('jwt') — there is no JwtAuthGuard class.
 * Alias keeps the intended guard stack: JWT + RolesGuard + ADMIN.
 */
const JwtAuthGuard = AuthGuard('jwt');

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly r2: BackupR2Service,
  ) {}

  /** Trigger a manual (or typed) database backup. */
  @Post()
  async create(
    @Body() dto: CreateBackupDto,
    @Request() req: { user?: { userId?: string; email?: string } },
  ) {
    const type = dto.type || BackupType.MANUAL;
    const triggeredBy =
      req.user?.email || req.user?.userId || 'admin:manual';
    const log = await this.backupService.runBackup(type, triggeredBy);
    return { success: log.status === 'success', log };
  }

  @Get('logs')
  async listLogs(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    const logs = await this.backupService.listLogs(Number.isFinite(n) ? n : 50);
    return { success: true, logs };
  }

  @Get('logs/:id')
  async getLog(@Param('id') id: string) {
    const log = await this.backupService.getLog(id);
    return { success: true, log };
  }

  @Get('settings')
  async getSettings() {
    const settings = await this.backupService.getSettings();
    return { success: true, settings };
  }

  @Patch('settings')
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const settings = await this.backupService.updateSettings({
      ...(dto.dailyEnabled !== undefined
        ? { dailyEnabled: dto.dailyEnabled }
        : {}),
      ...(dto.weeklyEnabled !== undefined
        ? { weeklyEnabled: dto.weeklyEnabled }
        : {}),
      ...(dto.monthlyEnabled !== undefined
        ? { monthlyEnabled: dto.monthlyEnabled }
        : {}),
      ...(dto.maxDaily !== undefined ? { maxDaily: dto.maxDaily } : {}),
      ...(dto.maxWeekly !== undefined ? { maxWeekly: dto.maxWeekly } : {}),
      ...(dto.maxMonthly !== undefined ? { maxMonthly: dto.maxMonthly } : {}),
      ...(dto.r2Enabled !== undefined ? { r2Enabled: dto.r2Enabled } : {}),
      ...(dto.r2AutoUpload !== undefined
        ? { r2AutoUpload: dto.r2AutoUpload }
        : {}),
      ...(dto.deleteLocalAfterR2 !== undefined
        ? { deleteLocalAfterR2: dto.deleteLocalAfterR2 }
        : {}),
    });
    return { success: true, settings };
  }

  @Get('status')
  async status() {
    const running = await this.backupService.isLockHeld();
    const settings = await this.backupService.getSettings();
    return {
      success: true,
      running,
      lockKey: 'backup:running',
      backupDir: this.backupService.getBackupDir(),
      settings,
    };
  }

  @Post('r2/test')
  async testR2() {
    const result = await this.r2.testConnection();
    return { success: result.ok, ...result };
  }

  @Get('r2/files')
  async listR2Files() {
    const files = await this.r2.listFiles();
    return { success: true, files };
  }

  @Post('logs/:id/upload-r2')
  async uploadLogToR2(@Param('id') id: string) {
    const log = await this.backupService.uploadLogToR2(id);
    return { success: true, log };
  }

  /** Download a local dump by filename (basename only). */
  @Get('download/:filename')
  async download(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const absPath = this.backupService.resolveLocalFile(filename);
    const safeName = path.basename(absPath);
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName.replace(/"/g, '')}"`,
    );
    fs.createReadStream(absPath).pipe(res);
  }

  /** Delete local dump + log row by filename. */
  @Delete('files/:filename')
  async deleteByFilename(@Param('filename') filename: string) {
    const result = await this.backupService.deleteBackupByFilename(filename);
    return { success: true, ...result };
  }

  /** Delete by log id (removes local file when present). */
  @Delete('logs/:id')
  async deleteByLogId(@Param('id') id: string) {
    const result = await this.backupService.deleteBackupByLogId(id);
    return { success: true, ...result };
  }
}
