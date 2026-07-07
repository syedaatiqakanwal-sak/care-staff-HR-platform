import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private repo: Repository<Notification>,
    ) { }

    async createForUser(userId: string, title: string, message: string, metadata?: any) {
        const notification = this.repo.create({
            user: { id: userId } as any, // Save via relation
            title,
            message,
            metadata,
        });
        return this.repo.save(notification);
    }

    /**
     * Removes in-app notifications tied to a certificate (PostgreSQL JSON metadata).
     */
    async deleteByCertificateId(userId: string, certificateId: string): Promise<void> {
        await this.repo
            .createQueryBuilder()
            .delete()
            .from(Notification)
            .where('user_id = :userId', { userId })
            .andWhere("metadata->>'certificateId' = :certificateId", { certificateId })
            .execute();
    }

    async findAllForUser(userId: string) {
        return this.repo.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            take: 20, // Limit to recent 20
        });
    }

    async markRead(id: string, userId: string) {
        const notif = await this.repo.findOne({ where: { id, user: { id: userId } } });
        if (!notif) throw new NotFoundException('Notification not found');

        notif.isRead = true;
        return this.repo.save(notif);
    }

    async markAllRead(userId: string) {
        await this.repo.update({ user: { id: userId }, isRead: false }, { isRead: true });
        return { success: true };
    }
}
