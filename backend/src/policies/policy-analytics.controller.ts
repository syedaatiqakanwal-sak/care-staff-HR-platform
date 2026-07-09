import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DASHBOARD_ROLES } from '../users/role.utils';
import { PolicyAnalyticsService } from './policy-analytics.service';

@Controller('policy-analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PolicyAnalyticsController {
  constructor(private analyticsService: PolicyAnalyticsService) {}

  @Get('staff/list')
  @Roles(...DASHBOARD_ROLES)
  async getStaffList() {
    const staff = await this.analyticsService.getAllStaffAlphabetical();
    return staff.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.user?.email || '',
      ilccsNumber: s.ilccsNumber || '',
    }));
  }

  @Get(':staffId')
  @Roles(...DASHBOARD_ROLES)
  async getAnalytics(@Param('staffId') staffId: string) {
    return this.analyticsService.getPolicyAnalyticsForStaff(staffId);
  }
}
