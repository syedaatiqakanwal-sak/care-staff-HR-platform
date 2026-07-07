import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';
import { Reminder } from '../reminders/reminder.entity';
import { TrainingRecord } from '../training/training-record.entity';
import { ApiToken } from '../api-tokens/api-token.entity';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { N8nAutomationService } from './n8n-automation.service';
import { N8nAutomationController } from './n8n-automation.controller';
import { ScopesGuard } from './scopes.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Plan, Reminder, TrainingRecord, ApiToken]),
        ApiTokensModule, // Import to use ApiTokenGuard
    ],
    controllers: [N8nAutomationController],
    providers: [N8nAutomationService, ScopesGuard],
    exports: [N8nAutomationService],
})
export class N8nAutomationModule {}
