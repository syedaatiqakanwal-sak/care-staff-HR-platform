import { Module } from '@nestjs/common';
import { HrReportsService } from './hr-reports.service';
import { HrReportsController } from './hr-reports.controller';
import { StaffModule } from '../staff/staff.module';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';

@Module({
  imports: [StaffModule, ApiTokensModule],
  controllers: [HrReportsController],
  providers: [HrReportsService],
})
export class ReportsModule {}
