import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import * as fs from 'fs';
import * as path from 'path';
import { Certificate, CertificateStatus } from './certificate.entity';
import { User } from '../users/user.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { TrainingRecord, TrainingStatus } from '../training/training-record.entity';
import { v4 as uuidv4 } from 'uuid';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class CertificatesService {
    private readonly logger = new Logger(CertificatesService.name);

    constructor(
        @InjectRepository(Certificate)
        private certificatesRepository: Repository<Certificate>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(StaffProfile)
        private staffProfileRepository: Repository<StaffProfile>,
        @InjectRepository(TrainingRecord)
        private trainingRepository: Repository<TrainingRecord>,
        private notificationsService: NotificationsService, // Injected dependency
        private jwtService: JwtService,
    ) { }

    // Group certificates by month
    async findAllForUser(userId: string) {
        const certs = await this.certificatesRepository.find({ where: { userId }, order: { monthNumber: 'ASC', createdAt: 'DESC' } });

        // Group by month - UPDATED to include Month 0 (Specialist)
        // We create an array [0, 1, 2, ... 12] to ensure Month 0 is checked
        const months = [0, ...Array.from({ length: 12 }, (_, i) => i + 1)];

        const grouped = months.map(m => ({
            month: m,
            certificates: certs.filter(c => c.monthNumber === m)
        }));

        return grouped;
    }

    async findAll() {
        const certs = await this.certificatesRepository.find({ order: { monthNumber: 'ASC', createdAt: 'DESC' }, relations: ['user'] });

        // Group by month - UPDATED to include Month 0 (Specialist)
        const months = [0, ...Array.from({ length: 12 }, (_, i) => i + 1)];

        const grouped = months.map(m => ({
            month: m,
            certificates: certs.filter(c => c.monthNumber === m)
        }));

        return grouped;
    }

    async create(dto: { userId: string, courseName: string, provider: string, monthNumber?: number, subModule?: string }) {
        const cert = this.certificatesRepository.create({
            userId: dto.userId,
            courseName: dto.courseName,
            provider: dto.provider,
            monthNumber: dto.monthNumber !== undefined ? dto.monthNumber : 1, // Allow 0, default to 1 if undefined
            status: CertificateStatus.PENDING, // Default
            subModule: dto.subModule // FIXED: Removed "|| null" to satisfy DeepPartial<Certificate> type
        });
        return this.certificatesRepository.save(cert);
    }

    async findOne(id: string, includeFile = false) {
        if (includeFile) {
            return this.certificatesRepository.findOne({
                where: { id },
                select: {
                    id: true,
                    status: true,
                    userId: true,
                    courseName: true,
                    subModule: true, // Select subModule
                    provider: true,
                    monthNumber: true,
                    registrationNo: true,
                    issuedAt: true,
                    verificationCode: true,
                    filePath: true, // Explicitly select
                    createdAt: true
                }
            });
        }
        return this.certificatesRepository.findOne({ where: { id } });
    }

    // NEW: Mark Incomplete Logic
    async markIncomplete(id: string) {
        const cert = await this.certificatesRepository.findOne({ where: { id } });
        if (!cert) throw new NotFoundException('Certificate record not found');

        // 1. Delete the PDF file if it exists
        if (cert.filePath && fs.existsSync(cert.filePath)) {
            try {
                fs.unlinkSync(cert.filePath);
                this.logger.log(`Deleted certificate file: ${cert.filePath}`);
            } catch (err) {
                this.logger.error(`Failed to delete certificate file: ${err.message}`);
            }
        }

        // 2. Reset Certificate Status
        cert.status = CertificateStatus.PENDING;
        // FIXED: Cast to any to allow assigning null to a strict string field (TypeORM handles the null correctly)
        (cert as any).filePath = null;
        (cert as any).verificationCode = null;
        // FIX APPLIED HERE: Reset issuedAt so a new date is generated next time
        (cert as any).issuedAt = null; 
        
        // Keep registration number reserved? Usually yes, to reuse it if they complete again, or clear it.
        // For now, let's keep RegNo to avoid gaps, but clear verification code.

        await this.certificatesRepository.save(cert);

        // 3. Delete the "Certificate Ready" notification
        try {
            await this.notificationsService.deleteByCertificateId(cert.userId, cert.id);
            this.logger.log(`Deleted certificate notification for cert: ${cert.id}`);
        } catch (err: any) {
            this.logger.error(`Failed to delete certificate notification: ${err?.message ?? err}`);
        }

        // 4. Sync Training Record Back to Pending
        // We need to find the record. If it's a sub-module, we search by subModule + CourseName + User
        const searchCriteria: any = {
            userId: cert.userId,
            courseName: cert.courseName
        };

        // If cert has subModule, try to find exact training record match
        if (cert.subModule) {
            // Logic: TrainingRecord stores subModule if it's an 'Other' course usually
            searchCriteria.subModule = cert.subModule;
        }

        const trainingRecord = await this.trainingRepository.findOne({ where: searchCriteria });

        if (trainingRecord) {
            trainingRecord.status = TrainingStatus.PENDING;
            trainingRecord.completedAt = null; // Clear completion date
            await this.trainingRepository.save(trainingRecord);
            this.logger.log(`Training Record reverted to PENDING for User ${cert.userId}, Course ${cert.courseName}`);
        }

        return { message: 'Certificate marked as incomplete' };
    }

    /**
     * Deletes the existing PDF (if present) and regenerates it using the current HTML template,
     * same learner/course/date/reg display rules as markComplete.
     */
    async forceRegenerate(certificateId: string): Promise<{ filePath: string; regNo: string }> {
        const cert = await this.certificatesRepository.findOne({
            where: { id: certificateId },
            relations: ['user'],
            select: {
                id: true,
                status: true,
                userId: true,
                courseName: true,
                subModule: true,
                provider: true,
                monthNumber: true,
                registrationNo: true,
                issuedAt: true,
                verificationCode: true,
                filePath: true,
                createdAt: true,
                user: {
                    id: true,
                    email: true
                } as any
            }
        });
        if (!cert) throw new NotFoundException('Certificate record not found');

        if (cert.status !== CertificateStatus.COMPLETED) {
            throw new InternalServerErrorException('Certificate must be Completed before force-regenerate');
        }

        const staffProfile = await this.staffProfileRepository.findOne({ where: { user: { id: cert.userId } } });
        const firstName = staffProfile?.firstName || '';
        const lastName = staffProfile?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) {
            throw new InternalServerErrorException('Certificate Generation Failed: Student Name is missing in Staff Profile');
        }
        if (!cert.courseName) {
            throw new InternalServerErrorException('Certificate Generation Failed: Course Name is missing');
        }

        const regNo = cert.registrationNo;
        if (!regNo) {
            throw new InternalServerErrorException('Certificate has no registration number; complete the certificate flow first');
        }

        const searchCriteria: any = {
            userId: cert.userId,
            courseName: cert.courseName
        };
        if (cert.subModule) {
            searchCriteria.subModule = cert.subModule;
        }

        const trainingRecord = await this.trainingRepository.findOne({
            where: searchCriteria
        });

        let issuedAt = cert.issuedAt;
        if (!issuedAt) {
            if (trainingRecord && trainingRecord.completedAt) {
                issuedAt = trainingRecord.completedAt;
            } else {
                issuedAt = new Date();
            }
        }

        const verificationCode = cert.verificationCode || uuidv4();
        const fileName = `${cert.id}.pdf`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'certificates', cert.userId);
        const filePath = cert.filePath && cert.filePath.length > 0
            ? cert.filePath
            : path.join(uploadDir, fileName);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        if (cert.filePath && fs.existsSync(cert.filePath)) {
            fs.unlinkSync(cert.filePath);
            this.logger.log('[CERT-DEBUG] Deleted old PDF: ' + cert.filePath);
        }

        const displayRegNo = staffProfile?.ilccsNumber || staffProfile?.lcaNumber || regNo;

        await this.generatePdf(cert, filePath, verificationCode, issuedAt, fullName, displayRegNo);
        this.logger.log('[CERT-DEBUG] Regenerated PDF at ' + filePath);

        cert.filePath = filePath;
        cert.verificationCode = verificationCode;
        cert.issuedAt = issuedAt;
        await this.certificatesRepository.save(cert);

        return { filePath, regNo: displayRegNo };
    }

    async markComplete(id: string, adminUser: any, subModule?: string) {
        // Need filePath to check existence
        let cert = await this.certificatesRepository.findOne({
            where: { id },
            relations: ['user'],
            select: {
                id: true,
                status: true,
                userId: true,
                courseName: true,
                subModule: true,
                provider: true,
                monthNumber: true,
                registrationNo: true,
                issuedAt: true,
                verificationCode: true,
                filePath: true,
                createdAt: true,
                user: {
                    id: true,
                    email: true
                } as any
            }
        });
        if (!cert) throw new NotFoundException('Certificate record not found');

        // UPDATE SUBMODULE IF PROVIDED (First time completion or correction)
        if (subModule && !cert.subModule) {
            cert.subModule = subModule;
            await this.certificatesRepository.save(cert);
        }

        // Idempotency check: If already completed, return it.
        if (cert.status === CertificateStatus.COMPLETED && cert.filePath && fs.existsSync(cert.filePath)) {
            // STILL SEND NOTIFICATION (for testing/re-notifying)
            try {
                await this.notificationsService.createForUser(
                    cert.userId,
                    'Certificate Ready',
                    `Your certificate for "${cert.subModule || cert.courseName}" is ready for download.`,
                    { certificateId: cert.id }
                );
            } catch (notifErr) {
                this.logger.error('Failed to create notification', notifErr);
            }
            return cert;
        }

        // Fetch Staff Profile for names
        const staffProfile = await this.staffProfileRepository.findOne({ where: { user: { id: cert.userId } } });
        const firstName = staffProfile?.firstName || '';
        const lastName = staffProfile?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // STRICT VALIDATION
        if (!fullName) {
            this.logger.error(`Certificate Generation Failed: Student Name is missing for userId ${cert.userId}`);
            throw new InternalServerErrorException('Certificate Generation Failed: Student Name is missing in Staff Profile');
        }
        if (!cert.courseName) {
            this.logger.error(`Certificate Generation Failed: Course Name is missing for certificate ${cert.id}`);
            throw new InternalServerErrorException('Certificate Generation Failed: Course Name is missing');
        }
        // Date is generated now, so always present.
        // RegNo generated below.


        // --- STEP 1: Reserve Registration Number (Concurrency Safe) ---
        let regNo = cert.registrationNo;

        if (!regNo) {
            let reserved = false;
            let attempts = 0;
            const maxAttempts = 5;

            while (!reserved && attempts < maxAttempts) {
                attempts++;
                try {
                    // Generate Candidate
                    const candidateRegNo = await this.generateRegistrationNumber();

                    // Attempt to reserve directly in DB
                    await this.certificatesRepository.update(
                        { id: cert.id, registrationNo: IsNull() },
                        { registrationNo: candidateRegNo }
                    );

                    // Refetch to confirm we got it (and handle race where update returned success but barely missed)
                    // actually update() result tells us if we modified a row.

                    // Let's just refetch to be sure we have the locked value
                    const checkCert = await this.certificatesRepository.findOne({ where: { id: cert.id } });

                    if (checkCert?.registrationNo === candidateRegNo) {
                        regNo = candidateRegNo;
                        cert.registrationNo = candidateRegNo; // Update local obj
                        reserved = true;
                    } else if (checkCert?.registrationNo) {
                        // Someone else set it? Or we failed?
                        // If it has a value, use it.
                        regNo = checkCert.registrationNo;
                        cert.registrationNo = checkCert.registrationNo;
                        reserved = true;
                    }
                } catch (error) {
                    // Unique constraint violation likely
                    this.logger.warn(`RegNo reservation attempt ${attempts} failed: ${error.message}`);
                    if (attempts === maxAttempts) throw new InternalServerErrorException('Failed to generate unique Registration Number. Please try again.');
                }
            }
        }

        // --- PRE-FETCH: Get Training Record for Date ---
        const searchCriteria: any = {
            userId: cert.userId,
            courseName: cert.courseName
        };
        if (cert.subModule) {
            searchCriteria.subModule = cert.subModule;
        }

        const trainingRecord = await this.trainingRepository.findOne({
            where: searchCriteria
        });

        // --- STEP 2: Generate PDF ---
        // Use existing cert date -> OR Training Plan Date -> OR Current Date
        let issuedAt = cert.issuedAt;
        if (!issuedAt) {
            if (trainingRecord && trainingRecord.completedAt) {
                issuedAt = trainingRecord.completedAt;
                this.logger.debug(`Using Training Plan Completion Date: ${issuedAt}`);
            } else {
                issuedAt = new Date();
                this.logger.debug(`Using Current Date: ${issuedAt}`);
            }
        }

        const verificationCode = cert.verificationCode || uuidv4();

        const fileName = `${cert.id}.pdf`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'certificates', cert.userId);
        const filePath = path.join(uploadDir, fileName);

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        if (!regNo) {
            throw new InternalServerErrorException('Certificate Generation Failed: Registration Number could not be generated.');
        }

        try {
            // Generate PDF
            // Use LCA Number (Manual) -> ILCCS Number (Signup) -> Generated ID (Fallback)
            // Use ILCCS Number (Strict Request) -> LCA Number -> Generated ID (Fallback)
            const displayRegNo = staffProfile?.ilccsNumber || staffProfile?.lcaNumber || regNo;
            this.logger.debug(`Certificate Generation: Using RegNo="${displayRegNo}" (Source: ${staffProfile?.ilccsNumber ? 'ILCCS' : (staffProfile?.lcaNumber ? 'LCA' : 'Generated')})`);

            await this.generatePdf(cert, filePath, verificationCode, issuedAt, fullName, displayRegNo);
        } catch (pdfErr) {
            this.logger.error(`PDF Generation Error: ${pdfErr.message}`, pdfErr.stack);
            throw new InternalServerErrorException(`Certificate Generation Failed (PDF Engine): ${pdfErr.message}`);
        }

        // --- STEP 3: Finalize Record ---
        cert.status = CertificateStatus.COMPLETED;
        cert.issuedAt = issuedAt;
        cert.verificationCode = verificationCode;
        cert.filePath = filePath;

        const savedCert = await this.certificatesRepository.save(cert);

        try {
            const adminId = adminUser.userId || adminUser.id || 'system';
            const adminEmail = adminUser.email || 'system-auto-regen';
            this.logger.log(`Certificate Certified | ID: ${cert.id} | RegNo: ${regNo} | Admin: ${adminEmail} (${adminId})`);
        } catch (logErr) {
            console.warn('Failed to log certificate event', logErr);
        }

        // --- NEW SYNC LOGIC ---
        // Sync with Training Plan
        try {
            // we already fetched 'trainingRecord' at the top

            if (trainingRecord) {
                trainingRecord.status = TrainingStatus.COMPLETED;
                // Only update date if it was missing
                if (!trainingRecord.completedAt) {
                    trainingRecord.completedAt = issuedAt;
                }
                await this.trainingRepository.save(trainingRecord);
                this.logger.log(`Training Plan Synced | User: ${cert.userId} | Course: ${cert.courseName} | Status: COMPLETED`);
            } else {
                // Record missing - Create it
                const newRecord = this.trainingRepository.create({
                    userId: cert.userId,
                    courseName: cert.courseName,
                    status: TrainingStatus.COMPLETED,
                    completedAt: issuedAt,
                    subModule: cert.subModule || null
                } as any);
                await this.trainingRepository.save(newRecord);
                this.logger.log(`Training Plan Synced (Created) | User: ${cert.userId} | Course: ${cert.courseName}`);
            }
        } catch (syncErr) {
            this.logger.error(`Training Plan Sync Failed | User: ${cert.userId} | Course: ${cert.courseName}`, syncErr);
            // Per requirements: Certificate flow must still succeed.
        }

        // --- STEP 4: Send Notification ---
        try {
            console.log(`Attempting to send notification to user ${cert.userId}`); // DEBUG
            const notif = await this.notificationsService.createForUser(
                cert.userId,
                'Certificate Ready',
                `Your certificate for "${cert.subModule || cert.courseName}" is ready for download.`,
                { certificateId: cert.id }
            );
            console.log('Notification created successfully'); // DEBUG
        } catch (notifErr) {
            console.error('Failed to create notification', notifErr); // DEBUG
            this.logger.error('Failed to create notification', notifErr);
        }
        // ---------------------------------

        return savedCert;
    }

    private async generateRegistrationNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `LCA-CERT-${year}`;

        // Find latest cert for this year to increment
        const lastCert = await this.certificatesRepository
            .createQueryBuilder('certificate')
            .where('certificate.registrationNo LIKE :prefix', { prefix: `${prefix}-%` })
            .orderBy('certificate.registrationNo', 'DESC')
            .getOne();

        let sequence = 1;
        if (lastCert && lastCert.registrationNo) {
            const parts = lastCert.registrationNo.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        const seqStr = sequence.toString().padStart(3, '0');
        return `${prefix}-${seqStr}`;
    }

    private async generatePdf(cert: Certificate, filePath: string, code: string, date: Date, studentName: string, regNo: string): Promise<void> {
        let browser;
        try {
            // Dynamic import for Puppeteer
            const puppeteerMod = await import('puppeteer');
            const puppeteer = puppeteerMod.default || puppeteerMod;

            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            });
            const page = await browser.newPage();

            // Set timeout for all page operations
            page.setDefaultNavigationTimeout(30000);
            page.setDefaultTimeout(30000);

            await page.setViewport({ width: 1123, height: 794 });

            // Load Template
            // Use __dirname to find templates relative to this file, works in both src and dist
            const templatePath = path.join(__dirname, '..', 'templates', 'certificate.html');
            this.logger.debug(`Loading certificate template from: ${templatePath}`);

            if (!fs.existsSync(templatePath)) {
                this.logger.error(`Template NOT found at: ${templatePath}`);
                throw new Error(`Template file not found at ${templatePath}`);
            }
            let htmlContent = fs.readFileSync(templatePath, 'utf8');
            this.logger.log('[CERT-DEBUG] Loading template from: ' + templatePath);
            this.logger.log('[CERT-DEBUG] Has TPL-V2-DEBUG: ' + htmlContent.includes('TPL-V2-DEBUG'));
            this.logger.log('[CERT-DEBUG] Has new top:132px: ' + htmlContent.includes('top: 132px'));
            this.logger.log('[CERT-DEBUG] Has OLD top:118px: ' + htmlContent.includes('top: 118px'));
            this.logger.debug(`Template loaded, length: ${htmlContent.length}`);

            // Inject Background Image
            const base64Path = path.join(__dirname, '..', 'templates', 'bg-base64.txt');
            if (fs.existsSync(base64Path)) {
                const base64Data = fs.readFileSync(base64Path, 'utf8');
                htmlContent = htmlContent.replace('{{BACKGROUND_IMAGE}}', base64Data);
            } else {
                this.logger.warn('Background base64 file not found. Certificate might miss background.');
            }

            // Replace Placeholders STRICTLY
            // If subModule exists, use it as Course Name. Else use generic name.
            const displayCourseName = cert.subModule || cert.courseName;

            const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

            htmlContent = htmlContent
                .replace(/{Learner_Name}/g, studentName)
                .replace(/{Course_Name}/g, displayCourseName) // UPDATED
                .replace(/{Reg_no}/g, regNo)
                .replace(/{Date}/g, dateStr);

            // setContent with 'load' instead of 'networkidle0' to be less sensitive to external font delays
            this.logger.debug('Setting page content...');
            await page.setContent(htmlContent, { waitUntil: 'load' });

            // Optional: wait for fonts to load or just proceed if 'load' is enough
            try {
                this.logger.debug('Waiting for fonts to load...');
                await page.evaluateHandle('document.fonts.ready');
            } catch (fontErr) {
                this.logger.warn(`Font loading timed out or failed: ${fontErr.message}, proceeding anyway`);
            }

            this.logger.debug(`Generating PDF to: ${filePath}`);

            // Generate PDF
            await page.pdf({
                path: filePath,
                printBackground: true,
                preferCSSPageSize: true,
                width: '1123px',
                height: '794px',
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });
            this.logger.log(`PDF generated successfully: ${filePath}`);
        } catch (error) {
            this.logger.error(`Error in generatePdf: ${error.message}`, error.stack);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
                this.logger.debug('Browser closed');
            }
        }
    }

    // --- SECURE VIEWER METHODS ---

    async generateViewToken(certId: string, user: any): Promise<string> {
        const streamTokenTtl = (process.env.CERT_VIEW_TOKEN_TTL || '5m') as any;
        return this.jwtService.sign({
            certId,
            userId: user.userId || user.id,
            role: user.role,
            userName: user.userName || user.name
        }, { expiresIn: streamTokenTtl });
    }

    async verifyViewToken(token?: string): Promise<any> {
        if (!token) {
            this.logger.warn('View token verification failed: token missing');
            return null;
        }
        try {
            return this.jwtService.verify(token);
        } catch (error: any) {
            this.logger.error(`View token verification failed: ${error?.message || 'unknown error'}`);
            return null;
        }
    }
}
