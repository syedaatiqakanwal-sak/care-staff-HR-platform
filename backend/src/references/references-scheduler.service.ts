import { Injectable, Logger } from '@nestjs/common';
import { ReferencesService } from './references.service';

@Injectable()
export class ReferencesSchedulerService {
    private readonly logger = new Logger(ReferencesSchedulerService.name);

    constructor(private readonly referencesService: ReferencesService) {}

    /**
     * Process automated reminders for pending references
     * This should be called daily via a cron job or scheduled task
     */
    async processDailyReminders(): Promise<void> {
        this.logger.log('Starting daily reference reminder processing...');
        
        try {
            const result = await this.referencesService.processAutomatedReminders();
            this.logger.log(
                `Daily reminder processing completed: ${result.processed} processed, ${result.sent} sent, ${result.errors} errors`
            );
        } catch (error) {
            this.logger.error('Error processing daily reminders:', error);
            throw error;
        }
    }
}
