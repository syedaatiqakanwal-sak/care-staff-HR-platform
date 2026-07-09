import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrCaseNote } from './hr-case-note.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { HrNotesService } from './hr-notes.service';
import { HrNotesAccessService } from './hr-notes-access.service';
import { HrNotesController } from './hr-notes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HrCaseNote, StaffProfile])],
  controllers: [HrNotesController],
  providers: [HrNotesService, HrNotesAccessService],
})
export class HrNotesModule {}
