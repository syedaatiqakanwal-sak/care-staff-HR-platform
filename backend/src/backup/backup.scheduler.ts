import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupType } from './entities/backup-log.entity';

@Injectable()
export class BackupScheduler {
  private readonly logger = new Logger(BackupScheduler.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly config: ConfigService,
  ) {}

  private get timezone(): string {
    return this.config.get<string>('BACKUP_TIMEZONE') || 'Europe/London';
  }

  @Cron('0 2 * * *', { timeZone: 'Europe/London' })
  async handleDailyBackup() {
    // Cron expression uses Europe/London as required; env BACKUP_TIMEZONE documented for ops.
    this.logger.log(
      `Daily backup cron fired (tz=${this.timezone} / cron tz=Europe/London)`,
    );
    try {
      const settings = await this.backupService.getSettings();
      if (!settings.dailyEnabled) {
        this.logger.log('Daily backups disabled in settings — skipping');
        return;
      }
      const log = await this.backupService.runBackup(
        BackupType.DAILY,
        'scheduler:daily',
      );
      this.logger.log(
        `Daily backup finished status=${log.status} id=${log.id}`,
      );
    } catch (err: any) {
      this.logger.error(`Daily backup cron error: ${err?.message || err}`);
    }
  }

  @Cron('0 3 * * 0', { timeZone: 'Europe/London' })
  async handleWeeklyBackup() {
    this.logger.log(
      `Weekly backup cron fired (tz=${this.timezone} / cron tz=Europe/London)`,
    );
    try {
      const settings = await this.backupService.getSettings();
      if (!settings.weeklyEnabled) {
        this.logger.log('Weekly backups disabled in settings — skipping');
        return;
      }
      const log = await this.backupService.runBackup(
        BackupType.WEEKLY,
        'scheduler:weekly',
      );
      this.logger.log(
        `Weekly backup finished status=${log.status} id=${log.id}`,
      );
    } catch (err: any) {
      this.logger.error(`Weekly backup cron error: ${err?.message || err}`);
    }
  }

  @Cron('0 4 1 * *', { timeZone: 'Europe/London' })
  async handleMonthlyBackup() {
    this.logger.log(
      `Monthly backup cron fired (tz=${this.timezone} / cron tz=Europe/London)`,
    );
    try {
      const settings = await this.backupService.getSettings();
      if (!settings.monthlyEnabled) {
        this.logger.log('Monthly backups disabled in settings — skipping');
        return;
      }
      const log = await this.backupService.runBackup(
        BackupType.MONTHLY,
        'scheduler:monthly',
      );
      this.logger.log(
        `Monthly backup finished status=${log.status} id=${log.id}`,
      );
    } catch (err: any) {
      this.logger.error(`Monthly backup cron error: ${err?.message || err}`);
    }
  }
}
