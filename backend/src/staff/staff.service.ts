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

    async findAll(): Promise<StaffProfile[]> {
        return this.staffRepository.find({
            relations: ['user'],
            order: { firstName: 'ASC' }
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
                profilePicture: row.profilePicture ? `/api/v1/staff/${row.userId}/profile-picture` : null
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

        const sorted = [...addresses].sort(
            (a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime(),
        );

        const missingYears: number[] = [];
        for (let i = 0; i < sorted.length - 1; i++) {
            const endYear = new Date(sorted[i].dateTo).getFullYear();
            const startYear = new Date(sorted[i + 1].dateFrom).getFullYear();
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
                staffName,
                lcacsNumber: lcacs,
                gapSummary,
            });
        }

        await this.staffRepository.update(profile.id, { addressGapNotifiedAt: new Date() });
    }

    private async enrichAddressesResponse(profile: StaffProfile, addresses: AddressHistory[]) {
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
        await this.maybeNotifyAddressGap(profile, hasGap, gapSummary);

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

        return this.enrichAddressesResponse(profile, addresses);
    }

    async addAddress(userId: string, data: CreateAddressDto) {
        const profile = await this.staffRepository.findOne({ where: { user: { id: userId } } });
        if (!profile) throw new NotFoundException('Staff Profile not found');

        const line1 =
            data.line1 != null && String(data.line1).trim() !== '' ? String(data.line1).trim() : null;

        const address = this.addressRepository.create({
            ...data,
            line1,
            staffProfile: profile,
            staffId: profile.id
        });
        const saved = await this.addressRepository.save(address);
        const allAddresses = await this.addressRepository.find({
            where: { staffProfile: { id: profile.id } },
            order: { dateFrom: 'DESC' },
        });
        await this.enrichAddressesResponse(profile, allAddresses);
        return saved;
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

        return saved;
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
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
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
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        background-color: #00659D;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #00659D;
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
                        background-color: #e8e8e8;
                        border-left: 4px solid #00659D;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #00659D;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9f9f9;
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
                        <div class="logo">LCA</div>
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

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
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
        await browser.close();

        return Buffer.from(pdfBuffer);
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
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
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
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        background-color: #00659D;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #00659D;
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
                        background-color: #e8e8e8;
                        border-left: 4px solid #00659D;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #00659D;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9f9f9;
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
                        background-color: #e8f4f8;
                        border-left: 4px solid #00659D;
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
                        <div class="logo">LCA</div>
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

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
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
        await browser.close();

        return Buffer.from(pdfBuffer);
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
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 28pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
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
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        background-color: #00659D;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: bold;
                    }
                    .staff-info {
                        margin-bottom: 30px;
                        padding: 15px;
                        background-color: #f5f5f5;
                        border-left: 4px solid #00659D;
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
                        background-color: #e8e8e8;
                        border-left: 4px solid #00659D;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 10px;
                        text-align: left;
                    }
                    table th {
                        background-color: #00659D;
                        color: white;
                        font-weight: bold;
                    }
                    table tr:nth-child(even) {
                        background-color: #f9f9f9;
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
                        <div class="logo">LCA</div>
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

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
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
        await browser.close();

        return Buffer.from(pdfBuffer);
    }
}
