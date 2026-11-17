import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StaffService } from './staff.service';

/**
 * Daily check: create in-app notifications when a scheduled
 * review / appraisal / supervision date arrives.
 */
@Injectable()
export class ReviewScheduleScheduler {
    private readonly logger = new Logger(ReviewScheduleScheduler.name);

    constructor(private readonly staffService: StaffService) {}

    @Cron('5 8 * * *', { timeZone: 'Europe/London' })
    async handleDueSchedules() {
        this.logger.log('Processing due schedule notifications...');
        try {
            const result = await this.staffService.processDueScheduleNotifications();
            this.logger.log(`Due schedule notifications created: ${result.notified}`);
        } catch (err) {
            this.logger.error(
                `Due schedule notification processing failed: ${
                    err instanceof Error ? err.message : String(err)
                }`,
            );
        }
    }
}
