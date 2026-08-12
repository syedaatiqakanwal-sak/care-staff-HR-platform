import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StaffService } from './staff.service';

/**
 * Daily due-today notifications for scheduled reviews / appraisals / supervisions.
 * Cron: 08:05 Europe/London. Processing is idempotent via notification dedupe keys.
 */
@Injectable()
export class ReviewScheduleScheduler {
  private readonly logger = new Logger(ReviewScheduleScheduler.name);

  constructor(private readonly staffService: StaffService) {}

  @Cron('5 8 * * *', { timeZone: 'Europe/London' })
  async handleDueScheduleNotifications() {
    this.logger.log('Review schedule due-notification cron fired (Europe/London 08:05)');
    try {
      const result = await this.staffService.processDueScheduleNotifications();
      this.logger.log(`Due schedule notifications created=${result.created}`);
    } catch (err: any) {
      this.logger.error(
        `Due schedule notification cron error: ${err?.message || err}`,
      );
    }
  }
}
