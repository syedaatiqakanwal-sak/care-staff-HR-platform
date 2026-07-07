import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyNotification } from './policy-notification.entity';
import { StaffService } from '../staff/staff.service';

@Injectable()
export class PolicyNotificationsService {
  constructor(
    @InjectRepository(PolicyNotification) private repo: Repository<PolicyNotification>,
    private staffService: StaffService,
  ) {}

  async my(userId: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    return this.repo.find({
      where: { staffId: staff.id },
      order: { createdAt: 'DESC' },
      relations: { policy: true } as any,
      take: 100,
    });
  }

  async markRead(userId: string, notifId: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    const notif = await this.repo.findOne({ where: { id: notifId }, relations: { policy: true } as any });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.staffId !== staff.id) throw new ForbiddenException('Access denied');

    notif.isRead = true;
    return this.repo.save(notif);
  }
}

