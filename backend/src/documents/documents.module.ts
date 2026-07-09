import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffDocument } from './staff-document.entity';
import { DbsRecord } from './dbs-record.entity';
import { DocumentsService } from './documents.service';
import { DocumentsAccessService } from './documents-access.service';
import {
  StaffDocumentsController,
  DocumentsController,
  DbsController,
} from './documents.controller';
import { StaffProfile } from '../staff/staff-profile.entity';
import { Reminder } from '../reminders/reminder.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentExpirySchedulerService } from './document-expiry-scheduler.service';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffDocument, DbsRecord, StaffProfile, Reminder, User]),
    NotificationsModule,
  ],
  controllers: [StaffDocumentsController, DocumentsController, DbsController],
  providers: [DocumentsService, DocumentsAccessService, DocumentExpirySchedulerService],
  exports: [DocumentsService, DocumentExpirySchedulerService],
})
export class DocumentsModule {}
