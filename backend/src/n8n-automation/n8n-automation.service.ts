import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';
import { Reminder } from '../reminders/reminder.entity';
import { TrainingRecord } from '../training/training-record.entity';
import { EnrollUserDto } from './dto/enroll-user.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class N8nAutomationService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Plan)
        private planRepository: Repository<Plan>,
        @InjectRepository(Reminder)
        private reminderRepository: Repository<Reminder>,
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
    ) {}

    async enrollUser(dto: EnrollUserDto) {
        // Find user by email
        const user = await this.userRepository.findOne({
            where: { email: dto.email },
        });

        if (!user) {
            throw new NotFoundException(`User with email ${dto.email} not found`);
        }

        // Verify plan exists
        const plan = await this.planRepository.findOne({
            where: { id: dto.planId },
        });

        if (!plan) {
            throw new NotFoundException(`Plan with id ${dto.planId} not found`);
        }

        // Assign plan to user (update plan's userId)
        plan.userId = user.id;
        await this.planRepository.save(plan);

        return {
            success: true,
            userId: user.id,
            planId: plan.id,
            enrolledAt: new Date(),
        };
    }

    async createPlan(dto: CreatePlanDto) {
        // Verify user exists
        const user = await this.userRepository.findOne({
            where: { id: dto.userId },
        });

        if (!user) {
            throw new NotFoundException(`User with id ${dto.userId} not found`);
        }

        const plan = this.planRepository.create({
            userId: dto.userId,
            planType: dto.planType,
            startDate: new Date(dto.startDate),
            metadata: dto.metadata || {},
        });

        await this.planRepository.save(plan);

        return {
            success: true,
            planId: plan.id,
            userId: plan.userId,
            planType: plan.planType,
            startDate: plan.startDate,
        };
    }

    async getPlansForUser(userId: string) {
        const plans = await this.planRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });

        return {
            success: true,
            plans,
        };
    }

    async createReminder(dto: CreateReminderDto) {
        // Verify user exists
        const user = await this.userRepository.findOne({
            where: { id: dto.userId },
        });

        if (!user) {
            throw new NotFoundException(`User with id ${dto.userId} not found`);
        }

        const reminder = this.reminderRepository.create({
            userId: dto.userId,
            type: dto.type || null,
            message: dto.message || null,
            scheduledAt: new Date(dto.scheduledAt),
            metadata: dto.metadata || {},
            sent: false,
        } as Partial<Reminder>);

        await this.reminderRepository.save(reminder);

        return {
            success: true,
            reminderId: reminder.id,
            scheduledAt: reminder.scheduledAt,
        };
    }

    async getPendingReminders(limit: number = 50) {
        const now = new Date();
        
        const reminders = await this.reminderRepository.find({
            where: {
                sent: false,
            },
            take: limit,
            order: {
                scheduledAt: 'ASC',
            },
        });

        // Filter to only those where scheduledAt <= now
        const pending = reminders.filter(r => r.scheduledAt <= now);

        return {
            success: true,
            reminders: pending,
        };
    }

    async markReminderSent(id: string) {
        const reminder = await this.reminderRepository.findOne({
            where: { id },
        });

        if (!reminder) {
            throw new NotFoundException(`Reminder with id ${id} not found`);
        }

        if (reminder.sent) {
            throw new BadRequestException('Reminder already marked as sent');
        }

        reminder.sent = true;
        reminder.sentAt = new Date();
        await this.reminderRepository.save(reminder);

        return {
            success: true,
            reminderId: reminder.id,
            sentAt: reminder.sentAt,
        };
    }
}
