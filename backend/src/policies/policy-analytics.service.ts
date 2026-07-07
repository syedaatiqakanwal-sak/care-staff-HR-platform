import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyReadingSession } from './policy-reading-session.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { Policy } from './policy.entity';

@Injectable()
export class PolicyAnalyticsService {
  constructor(
    @InjectRepository(StaffProfile)
    private staffRepo: Repository<StaffProfile>,
    @InjectRepository(PolicyReadingSession)
    private sessionsRepo: Repository<PolicyReadingSession>,
    @InjectRepository(Policy)
    private policiesRepo: Repository<Policy>,
  ) {}

  async getAllStaffAlphabetical() {
    return this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.user', 'user')
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('staff.firstName', 'ASC')
      .addOrderBy('staff.lastName', 'ASC')
      .getMany();
  }

  async getPolicyAnalyticsForStaff(staffId: string) {
    // Get all sessions for this staff member
    const sessions = await this.sessionsRepo.find({
      where: { staffId },
      relations: ['policy'],
      order: { startTime: 'DESC' },
    });

    // Group by policyId + date
    const grouped = new Map<string, {
      policyId: string;
      policyTitle: string;
      date: string;
      sessions: typeof sessions;
    }>();

    for (const session of sessions) {
      const date = this.toDateOnlyString(new Date(session.startTime));
      const key = `${session.policyId}_${date}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          policyId: session.policyId,
          policyTitle: (session.policy as any)?.title || session.policyId,
          date,
          sessions: [],
        });
      }

      grouped.get(key)!.sessions.push(session);
    }

    // Aggregate each group
    const aggregated = Array.from(grouped.values()).map((group) => {
      const sortedSessions = group.sessions.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

      const firstOpen = sortedSessions[0].startTime;
      const lastClose = sortedSessions
        .filter((s) => s.endTime)
        .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime())[0]?.endTime || null;

      const totalDurationSec = sortedSessions.reduce((sum, s) => {
        return sum + (s.totalDurationSeconds || 0);
      }, 0);

      const details = sortedSessions.map((s) => ({
        openedAt: s.startTime,
        closedAt: s.endTime,
        durationSec: s.totalDurationSeconds,
      }));

      return {
        policyId: group.policyId,
        policyTitle: group.policyTitle,
        date: group.date,
        totalOpens: group.sessions.length,
        firstOpen,
        lastClose,
        totalDurationSec,
        details,
      };
    });

    // Sort by date descending (newest first)
    aggregated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return aggregated;
  }

  private toDateOnlyString(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
