import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
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
import { isDashboardRole, normalizeUserRole } from '../users/role.utils';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@Injectable()
export class PoliciesCrudService implements OnModuleInit {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'policies');

  constructor(
    @InjectRepository(Policy) private policiesRepo: Repository<Policy>,
    @InjectRepository(PolicyNotification) private notifsRepo: Repository<PolicyNotification>,
    private staffService: StaffService,
  ) {}

  async onModuleInit() {
    ensureDir(this.uploadsDir);

    const sample = await this.policiesRepo.findOne({
      where: { title: 'Sample Safeguarding Policy' },
    });
    if (sample) {
      await this.deletePolicy(sample.id);
    }
  }

  async listPoliciesForRole(role: string) {
    if (isDashboardRole(normalizeUserRole(role))) {
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

  /**
   * Resolve the on-disk path for a policy PDF. Handles relative paths, bare filenames,
   * and Windows-style separators stored in the database.
   */
  resolvePolicyFilePath(policy: Policy): string {
    const raw = (policy.filePath || '').trim();
    if (!raw) {
      throw new BadRequestException('Policy file path not set');
    }

    const uploadsBase = path.resolve(this.uploadsDir);
    const normalized = raw.replace(/\\/g, '/');
    const candidates = new Set<string>();

    if (path.isAbsolute(raw)) {
      candidates.add(path.resolve(raw));
    }

    candidates.add(path.resolve(process.cwd(), normalized));
    candidates.add(path.join(uploadsBase, path.basename(normalized)));

    const withoutPrefix = normalized.replace(/^uploads\/policies\/?/i, '');
    if (withoutPrefix !== normalized) {
      candidates.add(path.join(uploadsBase, withoutPrefix));
    }
    candidates.add(path.join(uploadsBase, withoutPrefix || path.basename(normalized)));

    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(uploadsBase)) {
        continue;
      }
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    throw new BadRequestException('Policy file not found on server');
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

