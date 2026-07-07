import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PolicyReadingSession, PolicyReadingStatus } from './policy-reading-session.entity';
import { StaffService } from '../staff/staff.service';
import { Policy } from './policy.entity';
import { PolicyNotification } from './policy-notification.entity';

const MIN_SESSION_SECONDS = 30;

function toDateOnlyString(d: Date): string {
  // YYYY-MM-DD in server local time
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toWeekday(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(PolicyReadingSession)
    private sessionsRepo: Repository<PolicyReadingSession>,
    @InjectRepository(Policy)
    private policiesRepo: Repository<Policy>,
    @InjectRepository(PolicyNotification)
    private policyNotifsRepo: Repository<PolicyNotification>,
    private staffService: StaffService,
  ) {}

  async startReading(userId: string, policyId: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    const policy = await this.policiesRepo.findOne({ where: { id: policyId } });
    if (!policy) throw new NotFoundException('Policy not found');
    if (!policy.isActive) throw new ForbiddenException('Policy is not active');

    const now = new Date();
    const today = toDateOnlyString(now);

    // Cancel any other IN_PROGRESS sessions for this staff member (to prevent multiple active sessions)
    // But allow multiple COMPLETED sessions for the same policy on the same day
    const otherInProgress = await this.sessionsRepo.find({
      where: { staffId: staff.id, status: PolicyReadingStatus.IN_PROGRESS },
    });
    if (otherInProgress.length > 0) {
      await this.sessionsRepo.delete({
        id: In(otherInProgress.map(s => s.id)),
      });
    }

    // Always create a NEW session - each policy opening is a separate session
    const session = this.sessionsRepo.create({
      staffId: staff.id,
      policyId: policy.id,
      policyVersion: policy.version,
      startTime: now,
      endTime: null,
      totalDurationSeconds: null,
      date: today,
      day: toWeekday(now),
      status: PolicyReadingStatus.IN_PROGRESS,
    });

    return this.sessionsRepo.save(session);
  }

  async finishReading(userId: string, sessionId: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Reading session not found');

    if (session.staffId !== staff.id) {
      throw new ForbiddenException('You cannot finish another staff session');
    }

    // Prevent overwriting already completed sessions
    if (session.status === PolicyReadingStatus.COMPLETED || session.endTime) {
      return session;
    }

    const endTime = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000),
    );

    if (durationSeconds < MIN_SESSION_SECONDS) {
      throw new BadRequestException(
        `Reading session too short. Minimum is ${MIN_SESSION_SECONDS} seconds.`,
      );
    }

    // Complete this specific session - don't merge with others
    session.endTime = endTime;
    session.totalDurationSeconds = durationSeconds;
    session.status = PolicyReadingStatus.COMPLETED;

    // Mark policy notifications as read for this policy for this staff
    await this.policyNotifsRepo.update(
      { staffId: staff.id, policyId: session.policyId, isRead: false },
      { isRead: true },
    );

    return this.sessionsRepo.save(session);
  }

  async cancelReading(userId: string, sessionId: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) return { success: true };

    if (session.staffId !== staff.id) {
      throw new ForbiddenException('You cannot cancel another staff session');
    }

    // If already completed, don't delete (audit)
    if (session.status === PolicyReadingStatus.COMPLETED || session.endTime) {
      return { success: true };
    }

    await this.sessionsRepo.delete({ id: sessionId });
    return { success: true };
  }

  async completeSessionFromClient(userId: string, sessionId: string, endTimeIso: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Reading session not found');

    if (session.staffId !== staff.id) {
      throw new ForbiddenException('You cannot update another staff session');
    }

    // Prevent overwriting already completed sessions
    if (session.status === PolicyReadingStatus.COMPLETED || session.endTime) {
      return session;
    }

    const parsedEnd = new Date(endTimeIso);
    const endTime = isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;

    // Calculate duration for THIS specific session only
    const durationSeconds = Math.max(
      0,
      Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000),
    );

    // Complete this specific session - don't merge with others
    session.endTime = endTime;
    session.totalDurationSeconds = durationSeconds;
    session.status = PolicyReadingStatus.COMPLETED;

    // Mark notifications read for that policy for this staff
    await this.policyNotifsRepo.update(
      { staffId: staff.id, policyId: session.policyId, isRead: false },
      { isRead: true },
    );

    return this.sessionsRepo.save(session);
  }

  async mySessions(userId: string) {
    const staff = await this.staffService.getProfileByUserId(userId);
    return this.sessionsRepo.find({
      where: { staffId: staff.id },
      order: { startTime: 'DESC' },
      relations: { staff: { user: true }, policy: true } as any,
    });
  }

  async adminSessions() {
    // Fetch all sessions with relations - return each session individually
    return this.sessionsRepo.find({
      order: { startTime: 'DESC' },
      relations: { staff: { user: true }, policy: true } as any,
    });
  }

  async adminGetById(id: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id },
      relations: { staff: { user: true }, policy: true } as any,
    });
    if (!session) throw new NotFoundException('Reading session not found');
    return session;
  }

  async adminGetSessionsByStaffPolicyDate(staffId: string, policyId: string, date: string) {
    // Get all sessions for this staff + policy + date combination
    const sessions = await this.sessionsRepo.find({
      where: {
        staffId,
        policyId,
        date,
      },
      relations: { staff: { user: true }, policy: true } as any,
      order: { startTime: 'ASC' },
    });
    return sessions;
  }
}

