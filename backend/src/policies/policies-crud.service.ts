import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './policy.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StaffService } from '../staff/staff.service';
import { PolicyNotification } from './policy-notification.entity';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@Injectable()
export class PoliciesCrudService {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'policies');

  constructor(
    @InjectRepository(Policy) private policiesRepo: Repository<Policy>,
    @InjectRepository(PolicyNotification) private notifsRepo: Repository<PolicyNotification>,
    private staffService: StaffService,
  ) {}

  async listPoliciesForRole(role: 'ADMIN' | 'STAFF') {
    if (role === 'ADMIN') {
      return this.policiesRepo.find({ order: { createdAt: 'DESC' } });
    }
    return this.policiesRepo.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  async createPolicy(adminUserId: string, dto: CreatePolicyDto, file: any) {
    const relPath = path.join('uploads', 'policies', file.filename);
    const policy = await this.policiesRepo.save(
      this.policiesRepo.create({
        title: dto.title,
        description: dto.description || '',
        filePath: relPath,
        version: 1,
        isActive: dto.isActive ?? true,
        createdBy: adminUserId,
      }),
    );

    await this.createNotificationsForAllStaff(policy.id);
    return policy;
  }

  async updatePolicy(id: string, dto: UpdatePolicyDto, file?: any) {
    const policy = await this.policiesRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');

    const increment = dto.incrementVersion === true || !!file;
    if (increment) policy.version = (policy.version || 1) + 1;

    if (dto.title !== undefined) policy.title = dto.title;
    if (dto.description !== undefined) policy.description = dto.description;
    if (dto.isActive !== undefined) policy.isActive = dto.isActive;

    if (file) {
      // Optional: delete old file
      try {
        const oldAbs = path.join(process.cwd(), policy.filePath);
        if (fs.existsSync(oldAbs)) fs.unlinkSync(oldAbs);
      } catch {
        // ignore
      }
      policy.filePath = path.join('uploads', 'policies', file.filename);
    }

    const saved = await this.policiesRepo.save(policy);

    if (increment) {
      // on version bump, force re-read via new notifications
      await this.createNotificationsForAllStaff(saved.id);
    }

    return saved;
  }

  async deletePolicy(id: string) {
    const policy = await this.policiesRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');

    try {
      const abs = path.join(process.cwd(), policy.filePath);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      // ignore
    }

    await this.policiesRepo.remove(policy);
    return { success: true };
  }

  async getPolicyOrThrow(id: string) {
    const policy = await this.policiesRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async createNotificationsForAllStaff(policyId: string) {
    const staffProfiles = await this.staffService.findAll();
    const activeStaff = staffProfiles.filter((p: any) => p?.user?.isActive);

    const toInsert = activeStaff.map((p) =>
      this.notifsRepo.create({
        staffId: p.id,
        policyId,
        isRead: false,
      }),
    );
    if (toInsert.length > 0) await this.notifsRepo.save(toInsert);
  }

  createUploadedFilename(versionHint?: number) {
    const base = uuidv4();
    const v = versionHint ? `_v${versionHint}` : '';
    return `${base}${v}.pdf`;
  }
}

