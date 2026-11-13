import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { QueryFailedError, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffProfile } from './staff-profile.entity';
import { UsersService } from '../users/users.service';

import { AddressHistory } from './address-history.entity';
import { ReviewForm } from './review-form.entity';
import { CreateReviewFormDto } from './dto/create-review-form.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { TrainingRecord, TrainingStatus } from '../training/training-record.entity';
import { TrainingService } from '../training/training.service';
import { Course } from '../courses/course.entity';
import * as puppeteer from 'puppeteer';
import { EmailService } from '../email/email.service';
import { StaffDocument } from '../documents/staff-document.entity';
import { User, UserRole } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { pdfSemaphore, puppeteerLaunchOptions } from '../common/puppeteer-pool';
import { parsePagination, paginatedResult, PaginationQuery } from '../common/pagination';

/** Escape HTML special characters to prevent XSS in generated PDF templates */
function escapeHtml(unsafe: string | null | undefined): string {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export type StaffProfileResponse = StaffProfile & { inductionDate?: Date };

@Injectable()
export class StaffService {
    private readonly logger = new Logger(StaffService.name);
    constructor(
        @InjectRepository(StaffProfile)
        private staffRepository: Repository<StaffProfile>,
        @InjectRepository(AddressHistory)
        private addressRepository: Repository<AddressHistory>,
        @InjectRepository(ReviewForm)
        private reviewFormRepository: Repository<ReviewForm>,
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(StaffDocument)
        private readonly staffDocumentRepository: Repository<StaffDocument>,
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        private readonly trainingService: TrainingService,
        private readonly emailService: EmailService,
        private readonly notificationsService: NotificationsService,
        private usersService: UsersService,
    ) { }

    /** Next staff number after the highest LCACS number already stored, padded to 6 digits. */
    async peekNextLcaNumber(): Promise<string> {
        const rows = (await this.staffRepository.query(
            `SELECT "lcaNumber" AS n FROM staff_profiles WHERE "lcaNumber" ~* '^LCACS[0-9]+$'`,
        )) as Array<{ n: string }>;
        let max = 0;
        for (const row of rows) {
            const value = parseInt(String(row.n).replace(/^LCACS/i, ''), 10);
            if (Number.isFinite(value) && value > max) max = value;
        }
        return `LCACS${String(max + 1).padStart(6, '0')}`;
    }

    /** Use the typed number when it is free. Otherwise assign the next LCACS number. */
    async resolveLcaNumber(requested?: string): Promise<string> {
        const trimmed = requested?.trim();
        if (!trimmed) {
            return this.peekNextLcaNumber();
        }
        const taken = await this.staffRepository
            .createQueryBuilder('sp')
            .where('LOWER(sp.lcaNumber) = LOWER(:n)', { n: trimmed })
            .getOne();
        if (taken) {
            const next = await this.peekNextLcaNumber();
            throw new BadRequestException(
                `Staff number ${trimmed} is already used. Next available is ${next}.`,
            );
        }
        return trimmed;
    }

    async createProfile(
        user: User,
        firstName: string,
        lastName: string,
        phoneNumber?: string,
        ilccsNumber?: string,
        department?: string,
        lcaNumber?: string,
        middleName?: string,
    ) {
        const profile = this.staffRepository.create({
            user,
            firstName,
            lastName,
            middleName,
            phoneNumber,
            ilccsNumber,
            lcaNumber,
            department,
        });
        return this.staffRepository.save(profile);
    }

    /**
     * Admin-only: Completely delete a user (staff member) and dependent data.
     * Steps:
     * - Delete training_records by userId (no FK cascade configured)
     * - Delete certificates by userId (no FK cascade configured)
     * - Delete the user (cascades will remove staff_profile, addresses, review_forms, references, notifications)
     */
    async deleteUserCompletely(userId: string): Promise<void> {
        await this.staffRepository.manager.transaction(async (tx) => {
            // 1) Remove training records (no cascade on FK)
            await tx.getRepository(TrainingRecord).delete({ userId });

            // 2) Remove certificates (use direct SQL to avoid importing repository here)
            await tx.query('DELETE FROM certificates WHERE "userId" = $1', [userId]);

            // 3) Delete the user row (this triggers cascades on related entities that have ON DELETE CASCADE)
            const userRepo = tx.getRepository(User);
            const user = await userRepo.findOne({ where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }
            await userRepo.remove(user);
        });
    }

    // --- GET METHODS ---

    private serializeProfile(profile: StaffProfile): StaffProfileResponse {
        const { user, ...rest } = profile;
        const safeUser = user
            ? ({
                  id: user.id,
                  email: user.email,
                  role: user.role,
                  isActive: user.isActive,
                  lastLoginAt: user.lastLoginAt,
                  createdAt: user.createdAt,
                  updatedAt: user.updatedAt,
              } as User)
            : ({} as User);

        return {
            ...(rest as StaffProfile),
            user: safeUser,
            inductionDate: profile.inductionDate || user?.createdAt,
        };
    }

    async getProfileByUserId(userId: string): Promise<StaffProfileResponse> {
        if (!userId?.trim()) {
            throw new NotFoundException('Profile not found for this user');
        }

        try {
            const profile = await this.staffRepository.findOne({
                where: { user: { id: userId } },
                relations: ['user'],
            });
            if (!profile) {
                throw new NotFoundException('Profile not found for this user');
            }
            return this.serializeProfile(profile);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof QueryFailedError) {
                this.logger.error(
                    `Database error loading profile for user ${userId}: ${error.message}`,
                    error.stack,
                );
            }
            throw error;
        }
    }

    async getProfileByStaffId(staffId: string): Promise<StaffProfileResponse> {
        if (!staffId?.trim()) {
            throw new NotFoundException('Profile not found');
        }

        try {
            const profile = await this.staffRepository.findOne({
                where: { id: staffId },
                relations: ['user'],
            });
            if (!profile) {
                throw new NotFoundException('Profile not found');
            }
            return this.serializeProfile(profile);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            if (error instanceof QueryFailedError) {
                this.logger.error(
                    `Database error loading profile ${staffId}: ${error.message}`,
                    error.stack,
                );
            }
            throw error;
        }
    }

    // --- UPDATE METHODS ---

    async updateProfileByUserId(userId: string, data: Partial<StaffProfile> & { email?: string }): Promise<StaffProfile> {
        const profile = await this.staffRepository.findOne({
            where: { user: { id: userId } },
            relations: ['user']
        });
        if (!profile) throw new NotFoundException('Profile not found');

        return this.performUpdate(profile, data);
    }

    async updateProfileByStaffId(staffId: string, data: Partial<StaffProfile> & { email?: string }): Promise<StaffProfile> {
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user']
        });
        if (!profile) throw new NotFoundException('Profile not found');

        return this.performUpdate(profile, data);
    }

    private async performUpdate(profile: StaffProfile, data: Partial<StaffProfile> & { email?: string }) {
        const { email, ...profileFields } = data;

        if (email) {
            // Check for duplicate email
            const existingUser = await this.usersService.findByEmail(email);
            // profile.user.id is guaranteed to exist due to relations=['user']
            if (existingUser && existingUser.id !== profile.user.id) {
                throw new ConflictException('Email already in use by another user');
            }
            // Update User email
            await this.usersService.update(profile.user.id, { email });
        }

        Object.assign(profile, profileFields);
        return this.staffRepository.save(profile);
    }

    async findAll(query: PaginationQuery = {}) {
        const { page, limit, skip } = parsePagination(query, { limit: 50 });
        const [data, total] = await this.staffRepository.findAndCount({
            relations: ['user'],
            order: { firstName: 'ASC' },
            skip,
            take: limit,
        });
        return paginatedResult(data, total, page, limit);
    }

    /** Unpaginated list for internal callers that need full staff set (prefer aggregates). */
    async findAllUnpaginated(): Promise<StaffProfile[]> {
        return this.staffRepository.find({
            relations: ['user'],
            order: { firstName: 'ASC' },
        });
    }

    async getStats() {
        try {
            if (!this.staffRepository) {
                return { total: 0, active: 0 };
            }

            const rawTotal = await this.staffRepository.query('SELECT COUNT(*) as count FROM staff_profiles');
            const total = parseInt(rawTotal[0].count, 10);

            const rawActive = await this.staffRepository.query(`
                SELECT COUNT(*) as count 
                FROM staff_profiles sp
                LEFT JOIN users u ON sp."userId" = u.id
                WHERE u."lastLoginAt" >= NOW() - INTERVAL '20 days'
            `);
            const active = parseInt(rawActive[0].count, 10);

            return { total, active };
        } catch (error) {
            return { total: 0, active: 0 };
        }
    }

    async getDashboardStats() {
        const rawData = await this.staffRepository.query(`
            SELECT 
                u.id as "userId",
                u.email,
                u.role,
                u."isActive",
                u."lastLoginAt",
                sp."firstName",
                sp."lastName",
                sp.department,
                sp."ilccsNumber",
                sp."profilePicture",
                sp."employmentStatus"
            FROM users u
            INNER JOIN staff_profiles sp ON u.id = sp."userId"
            WHERE u.role = 'STAFF'
            ORDER BY u."createdAt" DESC
        `);

        const twentyDaysAgo = new Date();
        twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

        const users = rawData.map(row => {
            const lastLogin = row.lastLoginAt ? new Date(row.lastLoginAt) : null;

            // STRICT ACTIVE DEFINITION:
            // Must have logged in within last 20 days.
            // If never logged in, INACTIVE.
            const isActive = lastLogin && lastLogin >= twentyDaysAgo;

            const employmentStatus = row.employmentStatus || 'ACTIVE';
            const employmentStatusBadge = String(employmentStatus).toUpperCase();

            return {
                id: row.userId,
                fullName: [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.firstName || 'Staff',
                email: row.email,
                role: row.department || row.role, // Use department as display role if available
                status: isActive ? 'ACTIVE' : 'INACTIVE',
                employmentStatus,
                employmentStatusBadge,
                lastLoginAt: row.lastLoginAt,
                ilccsNumber: row.ilccsNumber,
                profilePicture: row.profilePicture
                    ? `/api/v1/staff/${row.userId}/profile-picture?v=${encodeURIComponent(
                          String(row.profilePicture).split('/').pop() || String(Date.now()),
                      )}`
                    : null
            };
        });

        // 3. Aggregate Counts
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
        const inactiveUsers = users.filter(u => u.status === 'INACTIVE').length;

        return {
            totalUsers,
            activeUsers,
            inactiveUsers,
            users
        };
    }

    async debugCounts() {
        const repoCount = await this.staffRepository.count();
        const rawCount = await this.staffRepository.query('SELECT COUNT(*) as count FROM staff_profiles');
        const tableName = this.staffRepository.metadata.tableName;

        console.log('--- LIVE DEBUG ---');
        console.log('Repo Table Name:', tableName);
        console.log('Repo Count:', repoCount);
        console.log('Raw Count:', rawCount);

        return {
            repoTableName: tableName,
            repoCount,
            rawCount: rawCount[0],
            message: 'Check console for details'
        };
    }

    // --- Address History Methods ---

    private detectAddressGaps(
        addresses: AddressHistory[],
    ): { hasGap: boolean; gapSummary: string | null } {
        if (addresses.length < 2) {
            return { hasGap: false, gapSummary: null };
        }

        const sorted = [...addresses]
            .filter((a) => a.dateFrom)
            .sort(
                (a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime(),
            );

        if (sorted.length < 2) {
            return { hasGap: false, gapSummary: null };
        }

        const missingYears: number[] = [];
        for (let i = 0; i < sorted.length - 1; i++) {
            if (!sorted[i].dateTo || !sorted[i + 1].dateFrom) continue;
            const endYear = new Date(sorted[i].dateTo).getFullYear();
            const startYear = new Date(sorted[i + 1].dateFrom).getFullYear();
            if (!Number.isFinite(endYear) || !Number.isFinite(startYear)) continue;
            if (startYear > endYear + 1) {
                for (let year = endYear + 1; year < startYear; year++) {
                    missingYears.push(year);
                }
            }
        }

        if (missingYears.length === 0) {
            return { hasGap: false, gapSummary: null };
        }

        const uniqueYears = [...new Set(missingYears)].sort((a, b) => a - b);
        const gapSummary =
            uniqueYears.length === 1
                ? `Year ${uniqueYears[0]} is not covered between address records`
                : `Years ${uniqueYears.join(', ')} are not covered between address records`;

        return { hasGap: true, gapSummary };
    }

    private async maybeNotifyAddressGap(
        profile: StaffProfile,
        hasGap: boolean,
        gapSummary: string | null,
        userId: string,
    ): Promise<void> {
        if (!hasGap || !gapSummary) {
            if (!hasGap && profile.addressGapNotifiedAt) {
                await this.staffRepository.update(profile.id, { addressGapNotifiedAt: null });
            }
            return;
        }

        const dedupeKey = `address-gap-${profile.id}-${gapSummary}`;
        const existingCount = await this.notificationRepository
            .createQueryBuilder('n')
            .where("n.metadata->>'dedupeKey' = :dedupeKey", { dedupeKey })
            .getCount();

        if (existingCount > 0) {
            return;
        }

        const admins = await this.usersRepository.find({
            where: { role: UserRole.ADMIN, isActive: true },
            select: ['id'],
        });
        if (!admins.length) {
            return;
        }

        const staffName = `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim();
        const lcacs = profile.lcaNumber || profile.ilccsNumber || 'N/A';
        const title = 'Address history gap detected';
        const message = `Gap detected in address history for ${staffName} (Staff Number: ${lcacs}). ${gapSummary}.`;

        for (const admin of admins) {
            await this.notificationsService.createForUser(admin.id, title, message, {
                kind: 'address_history_gap',
                dedupeKey,
                staffProfileId: profile.id,
                userId,
                staffName,
                lcacsNumber: lcacs,
                gapSummary,
            });
        }

        await this.staffRepository.update(profile.id, { addressGapNotifiedAt: new Date() });
    }

    private async enrichAddressesResponse(profile: StaffProfile, addresses: AddressHistory[], userId: string) {
        const proofIds = addresses
            .map((addr) => addr.proofDocumentId)
            .filter((id): id is string => Boolean(id));

        const proofDocs = new Map<string, { id: string; fileName: string }>();
        if (proofIds.length > 0) {
            const docs = await this.staffDocumentRepository.find({
                where: { id: In(proofIds) },
                select: ['id', 'fileName'],
            });
            for (const doc of docs) {
                proofDocs.set(doc.id, { id: doc.id, fileName: doc.fileName });
            }
        }

        const { hasGap, gapSummary } = this.detectAddressGaps(addresses);
        try {
            await this.maybeNotifyAddressGap(profile, hasGap, gapSummary, userId);
        } catch (notifyErr) {
            this.logger.warn(
                `Address gap notify failed: ${notifyErr instanceof Error ? notifyErr.message : notifyErr}`,
            );
        }

        return {
            addresses: addresses.map((addr) => ({
                ...addr,
                proofDocument: addr.proofDocumentId
                    ? proofDocs.get(addr.proofDocumentId) ?? null
                    : null,
            })),
            hasGap,
            gapSummary,
        };
    }

    async getAddresses(userId: string) {
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) {
            return { addresses: [], hasGap: false, gapSummary: null };
        }

        const addresses = await this.addressRepository.find({
            where: { staffProfile: { id: profile.id } },
            order: { dateFrom: 'DESC' },
        });

        return this.enrichAddressesResponse(profile, addresses, userId);
    }

    async addAddress(userId: string, data: CreateAddressDto) {
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        const trimOrNull = (v?: string | null) =>
            v != null && String(v).trim() !== '' ? String(v).trim() : null;

        // International addresses may omit postcode; never insert SQL NULL into NOT NULL cols
        // before migration, and prefer null after nullable migration.
        const line1 = trimOrNull(data.line1);
        const line2 = trimOrNull(data.line2);
        const town = trimOrNull(data.town);
        const postcode = trimOrNull(data.postcode);
        const dateFrom = trimOrNull(data.dateFrom);
        const dateTo = trimOrNull(data.dateTo);

        if (!dateFrom || !dateTo) {
            throw new BadRequestException('dateFrom and dateTo are required');
        }
        if (!town && !line1) {
            throw new BadRequestException('At least address line 1 or town is required');
        }

        const address = this.addressRepository.create({
            line1,
            line2: line2 ?? '',
            town: town ?? '',
            postcode,
            dateFrom,
            dateTo,
            staffProfile: profile,
            staffId: profile.id,
        });
        try {
            const saved = await this.addressRepository.save(address);
            const allAddresses = await this.addressRepository.find({
                where: { staffProfile: { id: profile.id } },
                order: { dateFrom: 'DESC' },
            });
            try {
                await this.enrichAddressesResponse(profile, allAddresses, userId);
            } catch (enrichErr) {
                // Gap notification must not fail the save
                this.logger.warn(
                    `Address gap enrich failed after save: ${enrichErr instanceof Error ? enrichErr.message : enrichErr}`,
                );
            }
            return saved;
        } catch (err: any) {
            if (err?.code === '23502' || err?.driverError?.code === '23502') {
                throw new BadRequestException(
                    'Address could not be saved: a required field is missing (check town/postcode/dates). For international addresses, postcode may be left blank.',
                );
            }
            throw err;
        }
    }

    async linkAddressProof(userId: string, addressId: string, proofDocumentId: string) {
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        const address = await this.addressRepository.findOne({
            where: { id: addressId, staffProfile: { id: profile.id } },
        });
        if (!address) throw new NotFoundException('Address not found');

        const doc = await this.staffDocumentRepository.findOne({
            where: { id: proofDocumentId, staffId: profile.id },
        });
        if (!doc) {
            throw new BadRequestException('Proof document must belong to this staff member');
        }

        address.proofDocumentId = proofDocumentId;
        return this.addressRepository.save(address);
    }

    async removeAddress(userId: string, addressId: string) {
        // Ensure ownership
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('access denied');

        const address = await this.addressRepository.findOne({
            where: { id: addressId, staffProfile: { id: profile.id } }
        });

        if (!address) throw new NotFoundException('Address not found');
        return this.addressRepository.remove(address);
    }

    async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        const address = await this.addressRepository.findOne({
            where: { id: addressId, staffProfile: { id: profile.id } },
        });
        if (!address) throw new NotFoundException('Address not found');

        const trim = (s?: string) => (s != null && String(s).trim() !== '' ? String(s).trim() : null);
        if (dto.line1 !== undefined) address.line1 = trim(dto.line1);
        if (dto.line2 !== undefined) address.line2 = trim(dto.line2) ?? '';
        if (dto.town !== undefined) address.town = trim(dto.town) ?? '';
        if (dto.postcode !== undefined) address.postcode = trim(dto.postcode) ?? '';
        if (dto.dateFrom !== undefined && trim(dto.dateFrom)) address.dateFrom = trim(dto.dateFrom)!;
        if (dto.dateTo !== undefined && trim(dto.dateTo)) address.dateTo = trim(dto.dateTo)!;

        return this.addressRepository.save(address);
    }

    // --- Review Form Methods ---

    // Convert empty strings to null for date columns so PostgreSQL doesn't reject them
    private sanitizeDateFields(dto: any): void {
        const dateFields = ['startDate', 'dateOfReview', 'careStaffDate', 'reviewerDate'];
        for (const field of dateFields) {
            if (dto[field] !== undefined && (dto[field] === '' || dto[field] === null)) {
                dto[field] = null;
            }
        }
    }

    async createReviewForm(staffId: string, dto: CreateReviewFormDto): Promise<ReviewForm> {
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        this.sanitizeDateFields(dto);

        const reviewForm = this.reviewFormRepository.create({
            ...dto,
            staff: profile,
        });
        const saved = await this.reviewFormRepository.save(reviewForm);

        const formLabel =
            dto.formType === 'appraisal'
                ? 'Appraisal'
                : dto.formType === 'supervision'
                  ? 'Supervision'
                  : 'Review';
        const dateLabel = dto.dateOfReview || 'TBC';

        if (profile.user?.email) {
            const toEmail = profile.user.email;
            const emailPayload = {
                formType: dto.formType,
                staffName: dto.staffName,
                reviewDate: dto.dateOfReview,
                notes: dto.documentationComments || undefined,
            };
            setImmediate(() => {
                this.emailService.sendReviewScheduleEmail(toEmail, emailPayload).catch((err) => {
                    this.logger.warn(
                        `Review schedule email failed (non-blocking) for staffId=${staffId}: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                });
            });
        }

        // In-app notifications for staff + management (non-blocking)
        setImmediate(() => {
            this.notifyScheduleCreated(saved, profile, formLabel, dateLabel).catch((err) => {
                this.logger.warn(
                    `Schedule notification failed (non-blocking): ${
                        err instanceof Error ? err.message : String(err)
                    }`,
                );
            });
        });

        return saved;
    }

    private async notifyScheduleCreated(
        form: ReviewForm,
        profile: StaffProfile,
        formLabel: string,
        dateLabel: string,
    ): Promise<void> {
        const staffName =
            form.staffName ||
            `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
            'Staff member';
        const title = `${formLabel} scheduled`;
        const message = `${staffName}: ${formLabel.toLowerCase()} (${form.formSubType}) scheduled for ${dateLabel}.`;
        const metadata = {
            kind: 'schedule_created',
            reviewFormId: form.id,
            formType: form.formType,
            formSubType: form.formSubType,
            dateOfReview: form.dateOfReview,
            staffProfileId: profile.id,
            staffName,
        };

        if (profile.user?.id) {
            await this.notificationsService.createForUser(
                profile.user.id,
                title,
                `Your ${formLabel.toLowerCase()} (${form.formSubType}) is scheduled for ${dateLabel}.`,
                metadata,
            );
        }

        const managers = await this.usersRepository.find({
            where: [
                { role: UserRole.ADMIN, isActive: true },
                { role: UserRole.HR, isActive: true },
                { role: UserRole.MANAGER, isActive: true },
            ],
            select: ['id'],
        });
        for (const mgr of managers) {
            if (profile.user?.id && mgr.id === profile.user.id) continue;
            await this.notificationsService.createForUser(mgr.id, title, message, metadata);
        }
    }

    /**
     * Upcoming/recent scheduled reviews, appraisals and supervisions with counts.
     * Also ensures due-today in-app notifications exist (idempotent).
     */
    async getScheduledFormsSummary(): Promise<{
        counts: {
            reviews: number;
            appraisals: number;
            supervisions: number;
            dueToday: number;
            totalUpcoming: number;
        };
        records: Array<{
            id: string;
            formType: string;
            formSubType: string;
            staffName: string;
            staffProfileId: string | null;
            userId: string | null;
            dateOfReview: string;
            status: 'upcoming' | 'due_today' | 'overdue';
            notes: string | null;
        }>;
    }> {
        await this.processDueScheduleNotifications();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const from = new Date(today);
        from.setDate(from.getDate() - 14);
        const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;

        const forms = await this.reviewFormRepository
            .createQueryBuilder('rf')
            .leftJoinAndSelect('rf.staff', 'staff')
            .leftJoinAndSelect('staff.user', 'user')
            .where('rf.dateOfReview IS NOT NULL')
            .andWhere('rf.dateOfReview >= :from', { from: fromStr })
            .orderBy('rf.dateOfReview', 'ASC')
            .addOrderBy('rf.createdAt', 'DESC')
            .take(150)
            .getMany();

        const records = forms.map((rf) => {
            const date = String(rf.dateOfReview).slice(0, 10);
            let status: 'upcoming' | 'due_today' | 'overdue' = 'upcoming';
            if (date === todayStr) status = 'due_today';
            else if (date < todayStr) status = 'overdue';
            const staffName =
                rf.staffName ||
                `${rf.staff?.firstName || ''} ${rf.staff?.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
                '—';
            return {
                id: rf.id,
                formType: rf.formType,
                formSubType: rf.formSubType,
                staffName,
                staffProfileId: rf.staff?.id || null,
                userId: rf.staff?.user?.id || null,
                dateOfReview: date,
                status,
                notes: rf.documentationComments || null,
            };
        });

        const upcomingOrToday = records.filter((r) => r.status !== 'overdue');
        return {
            counts: {
                reviews: upcomingOrToday.filter((r) => r.formType === 'review').length,
                appraisals: upcomingOrToday.filter((r) => r.formType === 'appraisal').length,
                supervisions: upcomingOrToday.filter((r) => r.formType === 'supervision').length,
                dueToday: records.filter((r) => r.status === 'due_today').length,
                totalUpcoming: upcomingOrToday.length,
            },
            records,
        };
    }

    /** Create in-app notifications for schedules due today (deduped per form+day). */
    async processDueScheduleNotifications(): Promise<{ notified: number }> {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const dueForms = await this.reviewFormRepository
            .createQueryBuilder('rf')
            .leftJoinAndSelect('rf.staff', 'staff')
            .leftJoinAndSelect('staff.user', 'user')
            .where('rf.dateOfReview = :today', { today: todayStr })
            .getMany();

        if (!dueForms.length) return { notified: 0 };

        const managers = await this.usersRepository.find({
            where: [
                { role: UserRole.ADMIN, isActive: true },
                { role: UserRole.HR, isActive: true },
                { role: UserRole.MANAGER, isActive: true },
            ],
            select: ['id'],
        });

        let notified = 0;
        for (const form of dueForms) {
            const formLabel =
                form.formType === 'appraisal'
                    ? 'Appraisal'
                    : form.formType === 'supervision'
                      ? 'Supervision'
                      : 'Review';
            const staffName =
                form.staffName ||
                `${form.staff?.firstName || ''} ${form.staff?.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
                'Staff member';
            const title = `${formLabel} due today`;
            const message = `${staffName}: ${formLabel.toLowerCase()} (${form.formSubType}) is due today (${todayStr}).`;
            const baseMeta = {
                kind: 'schedule_due',
                reviewFormId: form.id,
                formType: form.formType,
                formSubType: form.formSubType,
                dateOfReview: todayStr,
                staffName,
            };

            const recipients = new Map<string, string>();
            if (form.staff?.user?.id) {
                recipients.set(
                    form.staff.user.id,
                    `Your ${formLabel.toLowerCase()} (${form.formSubType}) is due today.`,
                );
            }
            for (const mgr of managers) {
                if (!recipients.has(mgr.id)) {
                    recipients.set(mgr.id, message);
                }
            }

            for (const [userId, msg] of recipients) {
                const dedupeKey = `schedule-due-${form.id}-${todayStr}-${userId}`;
                const existing = await this.notificationRepository
                    .createQueryBuilder('n')
                    .where("n.metadata->>'dedupeKey' = :dedupeKey", { dedupeKey })
                    .getCount();
                if (existing > 0) continue;

                await this.notificationsService.createForUser(userId, title, msg, {
                    ...baseMeta,
                    dedupeKey,
                });
                notified += 1;
            }
        }

        return { notified };
    }

    async getReviewFormsByStaffId(staffId: string): Promise<ReviewForm[]> {
        return this.reviewFormRepository.find({
            where: { staff: { id: staffId } },
            order: { dateOfReview: 'DESC', createdAt: 'DESC' },
        });
    }

    async getReviewFormById(id: string): Promise<ReviewForm> {
        const form = await this.reviewFormRepository.findOne({
            where: { id },
            relations: ['staff'],
        });
        if (!form) throw new NotFoundException('Review form not found');
        return form;
    }

    async updateReviewForm(id: string, dto: Partial<CreateReviewFormDto>, user?: any): Promise<ReviewForm> {
        const form = await this.reviewFormRepository.findOne({ 
            where: { id },
            relations: ['staff', 'staff.user']
        });
        if (!form) throw new NotFoundException('Review form not found');

        // If user is provided and is STAFF, check ownership and restrict updates
        if (user && user.role === 'STAFF') {
            // Verify the form belongs to the logged-in staff member
            if (form.staff.user.id !== user.userId) {
                throw new ForbiddenException('You can only update your own review forms.');
            }

            // For STAFF users, only allow updates to signature-related fields
            // For appraisal forms, signatures are stored in documentationComments as JSON
            if (form.formType === 'appraisal' && dto.documentationComments) {
                try {
                    // Parse the incoming data
                    const incomingData = JSON.parse(dto.documentationComments);
                    // Parse existing form data
                    let existingData: any = {};
                    if (form.documentationComments) {
                        try {
                            existingData = JSON.parse(form.documentationComments);
                        } catch (e) {
                            // If existing data is not JSON, create new structure
                            existingData = { type: 'firstYearAppraisal', data: {} };
                        }
                    }

                    // Merge only signature-related fields from incoming data
                    if (incomingData.data) {
                        const allowedSignatureFields = [
                            'appraiseeSignature',
                            'appraiserSignature',
                            'signatureDate'
                        ];
                        
                        // Initialize existingData.data if it doesn't exist
                        if (!existingData.data) {
                            existingData.data = {};
                        }
                        
                        // Preserve all existing data fields first
                        const mergedData = { ...existingData.data };
                        
                        // Update only signature fields from incoming data
                        allowedSignatureFields.forEach(field => {
                            if (incomingData.data[field] !== undefined) {
                                mergedData[field] = incomingData.data[field];
                            }
                        });

                        // Update existingData with merged data
                        existingData.data = mergedData;

                        // Preserve the type if it exists
                        if (incomingData.type) {
                            existingData.type = incomingData.type;
                        } else if (!existingData.type) {
                            existingData.type = 'firstYearAppraisal';
                        }

                        // Update dto to only contain the merged signature data
                        dto.documentationComments = JSON.stringify(existingData);
                    }
                } catch (e) {
                    // If parsing fails, allow the update (might be a different format)
                    console.error('Error parsing appraisal data for signature update:', e);
                }
            } else {
                // For non-appraisal forms, only allow care staff signature field updates
                const allowedFields: Partial<CreateReviewFormDto> = {};
                if (dto.careStaffSignature !== undefined) allowedFields.careStaffSignature = dto.careStaffSignature;
                if (dto.careStaffDate !== undefined) allowedFields.careStaffDate = dto.careStaffDate;
                if (dto.documentationComments !== undefined) {
                    // For supervision forms, allow documentationComments updates (signatures are stored there)
                    if (form.formType === 'supervision') {
                        allowedFields.documentationComments = dto.documentationComments;
                    }
                }
                // Replace dto with only allowed fields
                Object.keys(dto).forEach(key => {
                    if (!(key in allowedFields)) {
                        delete dto[key];
                    }
                });
                Object.assign(dto, allowedFields);
            }
        }

        // Sanitize empty date strings to null before saving
        this.sanitizeDateFields(dto);

        // Apply updates
        Object.assign(form, dto);
        return this.reviewFormRepository.save(form);
    }

    async deleteReviewForm(id: string): Promise<void> {
        const form = await this.reviewFormRepository.findOne({ where: { id } });
        if (!form) throw new NotFoundException('Review form not found');
        await this.reviewFormRepository.remove(form);
    }

    async generateMonthlyReport(staffId: string, year: number, month: number): Promise<Buffer> {
        // Get staff profile
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) {
            throw new NotFoundException('Staff profile not found');
        }

        const staffName = escapeHtml(`${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim());
        const jobTitle = escapeHtml(profile.department || 'Care Staff');

        // Calculate date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Fetch training records completed in this month
        const trainingRecords = await this.trainingRepository.find({
            where: {
                userId: profile.user.id,
                status: TrainingStatus.COMPLETED,
            },
        });

        const monthlyTrainings = trainingRecords.filter(tr => {
            if (!tr.completedAt) return false;
            const completedDate = new Date(tr.completedAt);
            return completedDate >= startDate && completedDate <= endDate;
        });

        // Fetch review forms completed in this month
        const reviewForms = await this.reviewFormRepository.find({
            where: { staff: { id: staffId } },
        });

        const monthlyReviews = reviewForms.filter(rf => {
            const reviewDate = new Date(rf.dateOfReview);
            return reviewDate >= startDate && reviewDate <= endDate;
        });

        // Generate HTML for the report
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[month - 1];

        // Build training table rows
        let trainingRows = '';
        monthlyTrainings.forEach(tr => {
            const dateStr = tr.completedAt ? new Date(tr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
            const courseName = escapeHtml(tr.subModule || tr.courseName);
            trainingRows += `<tr><td>${escapeHtml(dateStr)}</td><td>${courseName}</td></tr>`;
        });

        // Build review/appraisal/supervision table rows
        let activityRows = '';
        monthlyReviews.forEach(rf => {
            const dateStr = new Date(rf.dateOfReview).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formTypeLabel = rf.formType === 'review' ? 'Review' : rf.formType === 'appraisal' ? 'Appraisal' : 'Supervision';
            activityRows += `<tr><td>${escapeHtml(dateStr)}</td><td>${escapeHtml(rf.formSubType)} ${escapeHtml(formTypeLabel)}</td></tr>`;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Monthly Activity Report - ${monthName} ${year}</title>
                <style>
                    @page {
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        color: #000;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 4px solid #139639;
                        box-shadow: 0 4px 0 #267FBA;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #139639;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #267FBA;
                        font-weight: 700;
                        font-size: 14pt;
                        margin-top: 5px;
                    }
                    .logo-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        margin-bottom: 20px;
                    }
                    .logo {
                        width: 96px;
                        height: 96px;
                        object-fit: contain;
                        background: transparent;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #F4FBF6;
                        border-left: 4px solid #139639;
                    }
                    .staff-info p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 14pt;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #E8F6EC;
                        color: #0e7a2d;
                        border-left: 4px solid #139639;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #C5D9CE;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #139639;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #F4FBF6;
                    }
                    .no-data {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ccc;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-container">
                        <img class="logo" src="data:image/png;base64,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" alt="Lets Care All" />
                        <div>
                            <h1>LETS CARE ALL</h1>
                            <div class="subtitle">Monthly Activity Report</div>
                        </div>
                    </div>
                </div>

                <div class="staff-info">
                    <p><strong>Employee Name:</strong> ${staffName}</p>
                    <p><strong>Job Title:</strong> ${jobTitle}</p>
                    <p><strong>Report Period:</strong> ${monthName} ${year}</p>
                </div>

                <div class="section-title">Training Completed in ${monthName} ${year}</div>
                ${monthlyTrainings.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%;">Date Completed</th>
                                <th style="width: 75%;">Title - Training / Qualifications</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trainingRows}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-data">No training completed in this month.</div>
                `}

                <div class="section-title">Reviews, Appraisals & Supervision in ${monthName} ${year}</div>
                ${monthlyReviews.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 25%;">Date Completed</th>
                                <th style="width: 75%;">Form Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${activityRows}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-data">No reviews, appraisals or supervision forms completed in this month.</div>
                `}

                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Lets Care All - CPD Platform</p>
                </div>
            </body>
            </html>
        `;

        // Generate PDF using Puppeteer (concurrency-capped)
        return this.renderHtmlToPdf(html);
    }

    async generateYearlyReport(staffId: string, year: number): Promise<Buffer> {
        // Get staff profile
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) {
            throw new NotFoundException('Staff profile not found');
        }

        const staffName = escapeHtml(`${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim());
        const jobTitle = escapeHtml(profile.department || 'Care Staff');

        // Calculate date range for the year
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        // Fetch all training records completed in this year
        const trainingRecords = await this.trainingRepository.find({
            where: {
                userId: profile.user.id,
                status: TrainingStatus.COMPLETED,
            },
        });

        const yearlyTrainings = trainingRecords.filter(tr => {
            if (!tr.completedAt) return false;
            const completedDate = new Date(tr.completedAt);
            return completedDate >= startDate && completedDate <= endDate;
        });

        // Fetch all review forms completed in this year
        const reviewForms = await this.reviewFormRepository.find({
            where: { staff: { id: staffId } },
        });

        const yearlyReviews = reviewForms.filter(rf => {
            const reviewDate = new Date(rf.dateOfReview);
            return reviewDate >= startDate && reviewDate <= endDate;
        });

        // Group trainings by month
        const trainingsByMonth: Record<number, typeof yearlyTrainings> = {};
        yearlyTrainings.forEach(tr => {
            if (tr.completedAt) {
                const month = new Date(tr.completedAt).getMonth();
                if (!trainingsByMonth[month]) {
                    trainingsByMonth[month] = [];
                }
                trainingsByMonth[month].push(tr);
            }
        });

        // Group reviews by month
        const reviewsByMonth: Record<number, typeof yearlyReviews> = {};
        yearlyReviews.forEach(rf => {
            const month = new Date(rf.dateOfReview).getMonth();
            if (!reviewsByMonth[month]) {
                reviewsByMonth[month] = [];
            }
            reviewsByMonth[month].push(rf);
        });

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        // Build HTML with monthly breakdown
        let monthlySections = '';
        for (let month = 0; month < 12; month++) {
            const monthTrainings = trainingsByMonth[month] || [];
            const monthReviews = reviewsByMonth[month] || [];
            
            if (monthTrainings.length === 0 && monthReviews.length === 0) {
                continue; // Skip months with no activity
            }

            let trainingRows = '';
            monthTrainings.forEach(tr => {
                const dateStr = tr.completedAt ? new Date(tr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
                const courseName = escapeHtml(tr.subModule || tr.courseName);
                trainingRows += `<tr><td>${escapeHtml(dateStr)}</td><td>${courseName}</td></tr>`;
            });

            let activityRows = '';
            monthReviews.forEach(rf => {
                const dateStr = new Date(rf.dateOfReview).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formTypeLabel = rf.formType === 'review' ? 'Review' : rf.formType === 'appraisal' ? 'Appraisal' : 'Supervision';
                activityRows += `<tr><td>${escapeHtml(dateStr)}</td><td>${escapeHtml(rf.formSubType)} ${escapeHtml(formTypeLabel)}</td></tr>`;
            });

            monthlySections += `
                <div class="month-section" style="page-break-inside: avoid; margin-bottom: 30px;">
                    <div class="section-title">${monthNames[month]} ${year}</div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong>Training Completed:</strong>
                        ${monthTrainings.length > 0 ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 25%;">Date Completed</th>
                                        <th style="width: 75%;">Title - Training / Qualifications</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${trainingRows}
                                </tbody>
                            </table>
                        ` : `
                            <div class="no-data">No training completed in this month.</div>
                        `}
                    </div>

                    <div>
                        <strong>Reviews, Appraisals & Supervision:</strong>
                        ${monthReviews.length > 0 ? `
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 25%;">Date Completed</th>
                                        <th style="width: 75%;">Form Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${activityRows}
                                </tbody>
                            </table>
                        ` : `
                            <div class="no-data">No reviews, appraisals or supervision forms completed in this month.</div>
                        `}
                    </div>
                </div>
            `;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Yearly Activity Report - ${year}</title>
                <style>
                    @page {
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        color: #000;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 4px solid #139639;
                        box-shadow: 0 4px 0 #267FBA;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #139639;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #267FBA;
                        font-weight: 700;
                        font-size: 14pt;
                        margin-top: 5px;
                    }
                    .logo-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        margin-bottom: 20px;
                    }
                    .logo {
                        width: 96px;
                        height: 96px;
                        object-fit: contain;
                        background: transparent;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #F4FBF6;
                        border-left: 4px solid #139639;
                    }
                    .staff-info p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 16pt;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #E8F6EC;
                        color: #0e7a2d;
                        border-left: 4px solid #139639;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #C5D9CE;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #139639;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #F4FBF6;
                    }
                    .no-data {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ccc;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                    .summary {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #F4FBF6;
                        border-left: 4px solid #139639;
                    }
                    .summary p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-container">
                        <img class="logo" src="data:image/png;base64,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" alt="Lets Care All" />
                        <div>
                            <h1>LETS CARE ALL</h1>
                            <div class="subtitle">Yearly Activity Report</div>
                        </div>
                    </div>
                </div>

                <div class="staff-info">
                    <p><strong>Employee Name:</strong> ${staffName}</p>
                    <p><strong>Job Title:</strong> ${jobTitle}</p>
                    <p><strong>Report Period:</strong> ${year}</p>
                </div>

                <div class="summary">
                    <p><strong>Total Training Completed:</strong> ${yearlyTrainings.length}</p>
                    <p><strong>Total Reviews/Appraisals/Supervision:</strong> ${yearlyReviews.length}</p>
                </div>

                ${monthlySections || '<div class="no-data">No activity recorded for this year.</div>'}

                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Lets Care All - CPD Platform</p>
                </div>
            </body>
            </html>
        `;

        // Generate PDF using Puppeteer (concurrency-capped)
        return this.renderHtmlToPdf(html);
    }

    async generateEnrollmentCompletionReport(staffId: string): Promise<Buffer> {
        // Get staff profile
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        if (!profile) {
            throw new NotFoundException('Staff profile not found');
        }

        const staffName = escapeHtml(`${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.trim());
        const jobTitle = escapeHtml(profile.department || 'Care Staff');
        const ilccsNumber = escapeHtml(profile.ilccsNumber || 'N/A');

        // Sync first to ensure data consistency (matching TrainingService.findAllForUser / training tab)
        await this.trainingService.syncCertificatesToTraining(profile.user.id);

        const allCourses = await this.courseRepository.find({
            select: ['title'],
        });
        const validCourseTitles = new Set(allCourses.map((c) => c.title));

        const allTrainingRecords = await this.trainingRepository.find({
            where: {
                userId: profile.user.id,
            },
            order: {
                courseName: 'ASC',
                enrollmentDate: 'ASC',
            },
        });

        const trainingRecords = allTrainingRecords.filter((tr) =>
            validCourseTitles.has(tr.courseName),
        );

        // Build training table rows with enrollment and completion dates
        let trainingRows = '';
        trainingRecords.forEach(tr => {
            const courseName = escapeHtml(tr.subModule ? `${tr.courseName} - ${tr.subModule}` : tr.courseName);
            const enrollmentDate = escapeHtml(tr.enrollmentDate 
                ? new Date(tr.enrollmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Not Enrolled');
            const completionDate = escapeHtml(tr.completedAt 
                ? new Date(tr.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Not Completed');
            const status = tr.status === TrainingStatus.COMPLETED ? 'Completed' : 'Pending';
            
            trainingRows += `
                <tr>
                    <td>${courseName}</td>
                    <td>${enrollmentDate}</td>
                    <td>${completionDate}</td>
                    <td>${status}</td>
                </tr>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Enrollment and Completion Report</title>
                <style>
                    @page {
                        margin: 15mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 11pt;
                        color: #000;
                        line-height: 1.4;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 4px solid #139639;
                        box-shadow: 0 4px 0 #267FBA;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #139639;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #267FBA;
                        font-weight: 700;
                        font-size: 14pt;
                        margin-top: 5px;
                    }
                    .logo-container {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 20px;
                        margin-bottom: 20px;
                    }
                    .logo {
                        width: 96px;
                        height: 96px;
                        object-fit: contain;
                        background: transparent;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #F4FBF6;
                        border-left: 4px solid #139639;
                    }
                    .staff-info p {
                        margin: 5px 0;
                        font-size: 12pt;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 14pt;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #E8F6EC;
                        color: #0e7a2d;
                        border-left: 4px solid #139639;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #C5D9CE;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #139639;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #F4FBF6;
                    }
                    .no-data {
                        text-align: center;
                        padding: 20px;
                        color: #666;
                        font-style: italic;
                    }
                    .footer {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #ccc;
                        text-align: center;
                        font-size: 9pt;
                        color: #666;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-container">
                        <img class="logo" src="data:image/png;base64,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" alt="Lets Care All" />
                        <div>
                            <h1>LETS CARE ALL</h1>
                            <div class="subtitle">Enrollment and Completion Report</div>
                        </div>
                    </div>
                </div>

                <div class="staff-info">
                    <p><strong>Employee Name:</strong> ${staffName}</p>
                    <p><strong>Job Title:</strong> ${jobTitle}</p>
                    <p><strong>ILCCS Number:</strong> ${ilccsNumber}</p>
                    <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>

                <div class="section-title">Training Plan - Enrollment and Completion Status</div>
                ${trainingRecords.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40%;">Course Name</th>
                                <th style="width: 20%;">Enrollment Date</th>
                                <th style="width: 20%;">Completion Date</th>
                                <th style="width: 20%;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trainingRows}
                        </tbody>
                    </table>
                ` : `
                    <div class="no-data">No training records found.</div>
                `}

                <div class="footer">
                    <p>Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    <p>Lets Care All - CPD Platform</p>
                </div>
            </body>
            </html>
        `;

        // Generate PDF using Puppeteer (concurrency-capped)
        return this.renderHtmlToPdf(html);
    }

    private async renderHtmlToPdf(html: string): Promise<Buffer> {
        return pdfSemaphore.run(async () => {
            const browser = await puppeteer.launch(puppeteerLaunchOptions());
            try {
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '15mm',
                        right: '15mm',
                        bottom: '15mm',
                        left: '15mm',
                    },
                });
                return Buffer.from(pdfBuffer);
            } finally {
                await browser.close();
            }
        });
    }
}
