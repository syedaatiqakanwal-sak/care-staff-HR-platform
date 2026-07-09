import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecruitmentRecord } from './recruitment-record.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { EmploymentStatus } from '../staff/employment-status.enum';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';

const SHADOW_PERIOD_DAYS = 14;

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(RecruitmentRecord)
    private readonly recruitmentRepo: Repository<RecruitmentRecord>,
    @InjectRepository(StaffProfile)
    private readonly staffRepo: Repository<StaffProfile>,
  ) {}

  async getByStaffProfileId(staffProfileId: string): Promise<RecruitmentRecord> {
    let record = await this.recruitmentRepo.findOne({
      where: { staffId: staffProfileId },
    });
    if (!record) {
      record = this.recruitmentRepo.create({ staffId: staffProfileId });
      record = await this.recruitmentRepo.save(record);
    }
    return record;
  }

  async upsertForStaffProfileId(
    staffProfileId: string,
    dto: UpdateRecruitmentDto,
  ): Promise<{ record: RecruitmentRecord; profile: StaffProfile }> {
    const profile = await this.staffRepo.findOne({ where: { id: staffProfileId } });
    if (!profile) {
      throw new NotFoundException('Staff profile not found');
    }

    let record = await this.recruitmentRepo.findOne({ where: { staffId: staffProfileId } });
    if (!record) {
      record = this.recruitmentRepo.create({ staffId: staffProfileId });
    }

    Object.assign(record, dto);

    if (dto.interviewRecorded === true && !record.interviewRecordedDate) {
      record.interviewRecordedDate = todayIso();
    }
    if (dto.offerLetterIssued === true && !record.offerLetterIssuedDate) {
      record.offerLetterIssuedDate = todayIso();
    }
    if (dto.contractIssued === true && !record.contractIssuedDate) {
      record.contractIssuedDate = todayIso();
    }
    if (dto.contractSigned === true && !record.contractSignedDate) {
      record.contractSignedDate = todayIso();
    }
    if (dto.inductionCompleted === true && !record.inductionCompletedDate) {
      record.inductionCompletedDate = todayIso();
    }

    if (record.shadowStartDate) {
      record.shadowEndDate = addDays(record.shadowStartDate, SHADOW_PERIOD_DAYS);
    } else if (record.shadowStarted === false) {
      record.shadowEndDate = null;
    }

    const saved = await this.recruitmentRepo.save(record);
    await this.syncEmploymentStatus(profile, saved);

    const updatedProfile = await this.staffRepo.findOne({ where: { id: staffProfileId } });
    return { record: saved, profile: updatedProfile! };
  }

  /** Keep staff_profiles.employmentStatus aligned with recruitment progress */
  private async syncEmploymentStatus(
    profile: StaffProfile,
    record: RecruitmentRecord,
  ): Promise<void> {
    if (profile.employmentStatus === EmploymentStatus.LEAVER) {
      return;
    }

    if (record.shadowStarted && record.shadowStartDate) {
      profile.employmentStatus = EmploymentStatus.ON_SHADOW;
    } else if (record.inductionCompleted && record.contractSigned) {
      profile.employmentStatus = EmploymentStatus.ACTIVE;
    } else if (
      !record.interviewRecorded &&
      !record.offerLetterIssued &&
      !record.contractIssued &&
      !record.contractSigned &&
      !record.inductionCompleted
    ) {
      profile.employmentStatus = EmploymentStatus.APPLICANT;
    }

    await this.staffRepo.save(profile);
  }
}
