import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { HrDashboardService } from '../dashboard/hr-dashboard.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DASHBOARD_ROLES } from '../users/role.utils';
import { JwtOrApiTokenGuard } from './jwt-or-api-token.guard';

@Controller('dashboard')
@UseGuards(JwtOrApiTokenGuard, RolesGuard)
export class DashboardController {
    constructor(
        private staffService: StaffService,
        private hrDashboardService: HrDashboardService,
    ) { }

    @Get('stats')
    @Roles(...DASHBOARD_ROLES)
    getStats() {
        return this.staffService.getDashboardStats();
    }

    @Get('hr-stats')
    @Roles(...DASHBOARD_ROLES)
    getHrStats() {
        return this.hrDashboardService.getHrStatsSafe();
    }

  @Get('analytics-data')
  @Roles(...DASHBOARD_ROLES)
  getAnalyticsData(@Query('period') period?: string) {
    const normalized =
      period === 'week' || period === 'month' || period === 'year' ? period : 'month';
    return this.hrDashboardService.getAnalyticsData(normalized);
  }
}
