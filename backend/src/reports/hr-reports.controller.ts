import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { HrReportsService } from './hr-reports.service';
import { JwtOrApiTokenGuard } from '../staff/jwt-or-api-token.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DASHBOARD_ROLES } from '../users/role.utils';
import { Param } from '@nestjs/common';

@Controller('reports/hr')
@UseGuards(JwtOrApiTokenGuard, RolesGuard)
@Roles(...DASHBOARD_ROLES)
export class HrReportsController {
  constructor(private readonly hrReportsService: HrReportsService) {}

  private async sendPdf(res: Response, filename: string, buffer: Buffer) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('dbs-renewal/preview')
  async dbsRenewalPreview() {
    return this.hrReportsService.previewDbsRenewal();
  }

  @Get('visa-expiry/preview')
  async visaExpiryPreview() {
    return this.hrReportsService.previewVisaExpiry();
  }

  @Get('missing-reference/preview')
  async missingReferencePreview() {
    return this.hrReportsService.previewMissingReference();
  }

  @Get('training-compliance/preview')
  async trainingCompliancePreview() {
    return this.hrReportsService.previewTrainingCompliance();
  }

  @Get('supervision-overdue/preview')
  async supervisionOverduePreview() {
    return this.hrReportsService.previewSupervisionOverdue();
  }

  @Get('appraisal-due/preview')
  async appraisalDuePreview() {
    return this.hrReportsService.previewAppraisalDue();
  }

  @Get('staff-turnover/preview')
  async staffTurnoverPreview() {
    return this.hrReportsService.previewStaffTurnover();
  }

  @Get('cqc-audit/preview')
  async cqcAuditPreview() {
    return this.hrReportsService.previewCqcAudit();
  }

  @Get('dbs-renewal')
  async dbsRenewal(@Res() res: Response) {
    const buf = await this.hrReportsService.generateDbsRenewalReport();
    await this.sendPdf(res, 'dbs-renewal-report.pdf', buf);
  }

  @Get('visa-expiry')
  async visaExpiry(@Res() res: Response) {
    const buf = await this.hrReportsService.generateVisaExpiryReport();
    await this.sendPdf(res, 'visa-expiry-report.pdf', buf);
  }

  @Get('missing-reference')
  async missingReference(@Res() res: Response) {
    const buf = await this.hrReportsService.generateMissingReferenceReport();
    await this.sendPdf(res, 'missing-reference-report.pdf', buf);
  }

  @Get('training-compliance')
  async trainingCompliance(@Res() res: Response) {
    const buf = await this.hrReportsService.generateTrainingComplianceReport();
    await this.sendPdf(res, 'training-compliance-report.pdf', buf);
  }

  @Get('supervision-overdue')
  async supervisionOverdue(@Res() res: Response) {
    const buf = await this.hrReportsService.generateSupervisionOverdueReport();
    await this.sendPdf(res, 'supervision-overdue-report.pdf', buf);
  }

  @Get('appraisal-due')
  async appraisalDue(@Res() res: Response) {
    const buf = await this.hrReportsService.generateAppraisalDueReport();
    await this.sendPdf(res, 'appraisal-due-report.pdf', buf);
  }

  @Get('staff-turnover')
  async staffTurnover(@Res() res: Response) {
    const buf = await this.hrReportsService.generateStaffTurnoverReport();
    await this.sendPdf(res, 'staff-turnover-report.pdf', buf);
  }

  @Get('cqc-audit')
  async cqcAudit(@Res() res: Response) {
    const buf = await this.hrReportsService.generateCqcAuditReport();
    await this.sendPdf(res, 'cqc-audit-report.pdf', buf);
  }

  @Get('compliance/organisation')
  async complianceOrganisation(@Res() res: Response) {
    const buf = await this.hrReportsService.generateComplianceReportOrg();
    await this.sendPdf(res, 'compliance-organisation-report.pdf', buf);
  }

  @Get('compliance/staff/:userId')
  async compliancePerStaff(@Param('userId') userId: string, @Res() res: Response) {
    const buf = await this.hrReportsService.generateComplianceReportForUser(userId);
    await this.sendPdf(res, `compliance-staff-${userId}.pdf`, buf);
  }
}
