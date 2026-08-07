import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupR2Service } from './backup-r2.service';
import { BackupScheduler } from './backup.scheduler';
import { BackupLog } from './entities/backup-log.entity';
import { BackupSettings } from './entities/backup-settings.entity';

/**
 * Standalone backup module. Wire into AppModule with:
 *   imports: [ ..., BackupModule ]
 *
 * ScheduleModule.forRoot() is registered here so AppModule only needs BackupModule
 * (no separate ScheduleModule line required unless already present elsewhere).
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([BackupLog, BackupSettings]),
  ],
  controllers: [BackupController],
  providers: [BackupService, BackupR2Service, BackupScheduler],
  exports: [BackupService, BackupR2Service],
})
export class BackupModule {}
