import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTokenGuard } from '../api-tokens/api-token.guard';
import { ScopesGuard } from './scopes.guard';
import { RequireScopes } from './scopes.decorator';
import { N8nAutomationService } from './n8n-automation.service';
import { EnrollUserDto } from './dto/enroll-user.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Controller('api/n8n')
@SkipThrottle()
@UseGuards(ApiTokenGuard, ScopesGuard) // Only API token auth, NOT JWT session auth
@UseInterceptors(ClassSerializerInterceptor)
export class N8nAutomationController {
    constructor(private readonly n8nService: N8nAutomationService) {}

    @Post('enroll-user')
    @RequireScopes('enrollment')
    async enrollUser(@Body() dto: EnrollUserDto) {
        // n8n automation should use API token via Authorization: Bearer <api-token>.
        // DO NOT use login/password auth for automation; API token routes are throttling-exempt.
        return this.n8nService.enrollUser(dto);
    }

    @Post('generate-plan')
    @RequireScopes('plans')
    async createPlan(@Body() dto: CreatePlanDto) {
        return this.n8nService.createPlan(dto);
    }

    @Get('plans/:userId')
    @RequireScopes('plans')
    async getPlansForUser(@Param('userId') userId: string) {
        return this.n8nService.getPlansForUser(userId);
    }

    @Post('reminders')
    @RequireScopes('reminders')
    async createReminder(@Body() dto: CreateReminderDto) {
        return this.n8nService.createReminder(dto);
    }

    @Get('reminders/pending')
    @RequireScopes('reminders')
    async getPendingReminders(@Query('limit') limit?: string) {
        const limitNum = limit ? parseInt(limit, 10) : 50;
        return this.n8nService.getPendingReminders(limitNum);
    }

    @Patch('reminders/:id/sent')
    @RequireScopes('reminders')
    async markReminderSent(@Param('id') id: string) {
        return this.n8nService.markReminderSent(id);
    }
}
