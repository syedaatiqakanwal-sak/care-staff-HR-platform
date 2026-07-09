import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { DASHBOARD_ROLES } from '../users/role.utils';
import { StartPolicyReadingDto } from './dto/start-policy-reading.dto';
import { FinishPolicyReadingDto } from './dto/finish-policy-reading.dto';
import { PoliciesService } from './policies.service';
import { PolicyReportService } from './policy-report.service';
import type { Response } from 'express';

@Controller('policy-reading')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PolicyReadingController {
  constructor(
    private policiesService: PoliciesService,
    private policyReportService: PolicyReportService,
  ) {}

  @Post('start')
  @Roles(UserRole.STAFF)
  start(@Request() req, @Body() dto: StartPolicyReadingDto) {
    return this.policiesService.startReading(req.user.userId, dto.policyId);
  }

  @Post('finish')
  @Roles(UserRole.STAFF)
  finish(@Request() req, @Body() dto: FinishPolicyReadingDto) {
    return this.policiesService.finishReading(req.user.userId, dto.sessionId);
  }

  @Post('cancel')
  @Roles(UserRole.STAFF)
  cancel(@Request() req, @Body() dto: FinishPolicyReadingDto) {
    return this.policiesService.cancelReading(req.user.userId, dto.sessionId);
  }

  @Get('my')
  @Roles(UserRole.STAFF)
  my(@Request() req) {
    return this.policiesService.mySessions(req.user.userId);
  }

  @Get('admin')
  @Roles(...DASHBOARD_ROLES)
  admin() {
    return this.policiesService.adminSessions();
  }

  @Get('admin/grouped')
  @Roles(...DASHBOARD_ROLES)
  adminGroupedDetail(@Query('staffId') staffId: string, @Query('policyId') policyId: string, @Query('date') date: string) {
    if (!staffId || !policyId || !date) {
      throw new BadRequestException('staffId, policyId, and date are required');
    }
    return this.policiesService.adminGetSessionsByStaffPolicyDate(staffId, policyId, date);
  }

  @Get('admin/report/pdf')
  @Roles(...DASHBOARD_ROLES)
  async reportPdf(
    @Query('staffId') staffId: string,
    @Query('policyId') policyId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    if (!staffId || !policyId || !date) {
      throw new BadRequestException('staffId, policyId, and date are required');
    }

    const sessions = await this.policiesService.adminGetSessionsByStaffPolicyDate(staffId, policyId, date);
    
    if (sessions.length === 0) {
      throw new BadRequestException('No sessions found for the specified criteria');
    }

    const doc = this.policyReportService.createMultiSessionReportPdf(sessions as any);

    const firstSession = sessions[0];
    const safePolicy = (((firstSession as any).policy?.title as string) || 'policy')
      .replace(/[^a-z0-9-_ ]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="policy_reading_${safePolicy}_${date}.pdf"`,
    );

    doc.pipe(res);
    doc.end();
  }

  @Get(':id')
  @Roles(...DASHBOARD_ROLES)
  adminDetail(@Param('id') id: string) {
    return this.policiesService.adminGetById(id);
  }

  @Get(':id/pdf')
  @Roles(...DASHBOARD_ROLES)
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const session = await this.policiesService.adminGetById(id);
    const doc = this.policyReportService.createSessionReportPdf(session as any);

    const safePolicy = (((session as any).policy?.title as string) || 'policy')
      .replace(/[^a-z0-9-_ ]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="policy_reading_${safePolicy}_${session.date}.pdf"`,
    );

    doc.pipe(res);
    doc.end();
  }
}

