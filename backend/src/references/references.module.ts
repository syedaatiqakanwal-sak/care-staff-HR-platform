import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferencesService } from './references.service';
import { ReferencesController, StaffReferencesController, ReferenceSubmissionController } from './references.controller';
import { ReferencesSchedulerService } from './references-scheduler.service';
import { StaffReference } from './reference.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([StaffReference, StaffProfile]),
        EmailModule,
    ],
    controllers: [ReferencesController, StaffReferencesController, ReferenceSubmissionController],
    providers: [ReferencesService, ReferencesSchedulerService],
    exports: [ReferencesSchedulerService],
})
export class ReferencesModule { }
