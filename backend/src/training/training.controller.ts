import { Controller, Get, Param, UseGuards, Patch, Body, Delete } from '@nestjs/common';
import { TrainingService } from './training.service';
import { RolesGuard } from '../auth/roles.guard';
import { JwtOrApiTokenGuard } from '../staff/jwt-or-api-token.guard';

@Controller('training')
@UseGuards(JwtOrApiTokenGuard, RolesGuard)
export class TrainingController {
    constructor(private readonly trainingService: TrainingService) { }

    @Get('staff/:userId')
    async getTrainingForUser(@Param('userId') userId: string) {
        return this.trainingService.findAllForUser(userId);
    }

    @Patch('staff/:userId/record')
    async updateTrainingRecord(
        @Param('userId') userId: string,
        @Body() body: { courseName: string, enrollmentDate?: string, completedAt?: string, subModule?: string }
    ) {
        return this.trainingService.upsertRecord(userId, body.courseName, {
            enrollmentDate: body.enrollmentDate ? new Date(body.enrollmentDate) : (body.enrollmentDate === null ? null : undefined),
            completedAt: body.completedAt ? new Date(body.completedAt) : (body.completedAt === null ? null : undefined),
            subModule: body.subModule // Include subModule in the update payload
        });
    }

    @Delete('staff/:userId/record/:recordId')
    async deleteTrainingRecord(
        @Param('userId') userId: string,
        @Param('recordId') recordId: string
    ) {
        return this.trainingService.deleteRecord(userId, recordId);
    }
}
