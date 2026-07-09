import { Injectable, Logger } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Injectable()
export class DocumentExpirySchedulerService {
  private readonly logger = new Logger(DocumentExpirySchedulerService.name);

  constructor(private readonly documentsService: DocumentsService) {}

  async processDailyExpiryReminders(): Promise<void> {
    this.logger.log('Starting document expiry reminder processing...');
    const result = await this.documentsService.processExpiryReminders();
    this.logger.log(
      `Document expiry reminders: processed=${result.processed} notifications=${result.notifications} reminders=${result.reminders} errors=${result.errors}`,
    );
  }
}
