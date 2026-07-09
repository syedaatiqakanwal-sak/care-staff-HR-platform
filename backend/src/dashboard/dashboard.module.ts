import { Module } from '@nestjs/common';
import { HrDashboardService } from './hr-dashboard.service';

/** HrDashboardService uses InjectDataSource only — do not import StaffModule (circular dep). */
@Module({
  providers: [HrDashboardService],
  exports: [HrDashboardService],
})
export class DashboardModule {}
