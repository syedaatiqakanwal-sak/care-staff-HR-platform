import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollInfo } from './payroll-info.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { PayrollService } from './payroll.service';
import { PayrollAccessService } from './payroll-access.service';
import { PayrollController } from './payroll.controller';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PayrollInfo, StaffProfile]),
    DocumentsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollAccessService],
})
export class PayrollModule {}
