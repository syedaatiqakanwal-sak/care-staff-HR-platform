import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Brackets } from 'typeorm';
import { StaffReference, ReferenceStatus } from './reference.entity';
import { StaffProfile } from '../staff/staff-profile.entity';
import { EmailService } from '../email/email.service';
import * as crypto from 'crypto';
import * as puppeteer from 'puppeteer';

// Reminder policy: up to 4 reminders total.
// Reminder 1 fires 7 days after the initial request (creation/open);
// reminders 2-4 fire 7 days after the previous reminder.
const MAX_REMINDERS = 4;
const FIRST_REMINDER_AFTER_DAYS = 7;
const SUBSEQUENT_REMINDER_INTERVAL_DAYS = 7;

@Injectable()
export class ReferencesService {
    constructor(
        @InjectRepository(StaffReference)
        private referencesRepository: Repository<StaffReference>,
        @InjectRepository(StaffProfile)
        private staffRepository: Repository<StaffProfile>,
        private emailService: EmailService,
    ) { }

    async resolveStaffProfileId(staffIdOrUserId: string): Promise<string> {
        if (!staffIdOrUserId) {
            throw new BadRequestException('staffId is required');
        }

        const directProfile = await this.staffRepository.findOne({
            where: { id: staffIdOrUserId },
            select: ['id'],
        });
        if (directProfile?.id) {
            return directProfile.id;
        }

        const profileByUser = await this.staffRepository.findOne({
            where: { user: { id: staffIdOrUserId } },
            relations: ['user'],
        });
        if (profileByUser?.id) {
            return profileByUser.id;
        }

        throw new NotFoundException(`Staff profile not found for identifier ${staffIdOrUserId}`);
    }

    async findAll(staffId: string): Promise<StaffReference[]> {
        const resolvedStaffId = await this.resolveStaffProfileId(staffId);
        return this.referencesRepository.find({
            where: { staffId: resolvedStaffId },
            order: { createdAt: 'DESC' },
        });
    }

    async findReceived(staffId: string): Promise<StaffReference[]> {
        const resolvedStaffId = await this.resolveStaffProfileId(staffId);
        const results = await this.referencesRepository
            .createQueryBuilder('ref')
            .where('ref.staffId = :staffId', { staffId: resolvedStaffId })
            .andWhere(
                new Brackets((qb) => {
                    qb.where('ref.status IN (:...statuses)', {
                        statuses: ['submitted', 'completed'],
                    }).orWhere('ref.submissionData IS NOT NULL');
                }),
            )
            .orderBy('ref.submittedAt', 'DESC', 'NULLS LAST')
            .getMany();

        console.log(`[findReceived] staffId=${staffId} resolved=${resolvedStaffId} found=${results.length}`);
        return results;
    }

    async createUploadedReference(
        staffId: string,
        data: {
            file: { path: string; originalname: string; filename?: string; size?: number; mimetype?: string };
            referenceType: string;
            refereeName: string;
            refereeEmail: string | null;
        }
    ): Promise<StaffReference> {
        const resolvedStaffId = await this.resolveStaffProfileId(staffId);

        const reference = this.referencesRepository.create({
            staffId: resolvedStaffId,
            name: data.refereeName,
            email: data.refereeEmail || '',
            referenceType: data.referenceType as any,
            status: 'submitted' as any,
            uploadedFilePath: data.file.path,
            uploadedFileName: data.file.originalname,
            submittedAt: new Date(),
        });

        return this.referencesRepository.save(reference);
    }

    /** Verify that a staff profile belongs to a given userId (for authorization checks) */
    async verifyStaffOwnership(staffId: string, userId: string): Promise<boolean> {
        const profile = await this.staffRepository.findOne({
            where: { id: staffId },
            relations: ['user'],
        });
        return profile?.user?.id === userId;
    }

    async findOne(id: string): Promise<StaffReference> {
        try {
            const reference = await this.referencesRepository.findOne({ 
                where: { id },
                relations: ['staff', 'staff.user'],
            });
            if (!reference) {
                throw new NotFoundException(`Reference with ID ${id} not found`);
            }
            return reference;
        } catch (error: any) {
            // If relation loading fails, try without relations
            if (error.message?.includes('relation') || error.message?.includes('join')) {
                console.warn(`[findOne] Failed to load relations for reference ${id}, trying without relations:`, error.message);
                const reference = await this.referencesRepository.findOne({ 
                    where: { id },
                });
                if (!reference) {
                    throw new NotFoundException(`Reference with ID ${id} not found`);
                }
                return reference;
            }
            throw error;
        }
    }

    async create(data: Partial<StaffReference>): Promise<StaffReference> {
        const reference = this.referencesRepository.create(data);
        return this.referencesRepository.save(reference);
    }

    async update(id: string, data: Partial<StaffReference>): Promise<StaffReference> {
        await this.referencesRepository.update(id, data);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.referencesRepository.delete(id);
    }

    async generateReferencePDF(reference: StaffReference): Promise<Buffer> {
        // Use staff relation if loaded, otherwise load it
        let staff: StaffProfile | null = reference.staff || null;
        if (!staff) {
            staff = await this.staffRepository.findOne({
                where: { id: reference.staffId },
                relations: ['user'],
            });
        }

        const candidateName = staff
            ? `${staff.firstName || ''} ${staff.middleName || ''} ${staff.lastName || ''}`.trim()
            : 'N/A';
        const positionApplied = 'Care Assistant (CARE Staff)'; // Default position

        // Generate different PDF based on reference type
        let html = '';
        
        if (reference.referenceType === 'personal') {
            // Personal Reference Form (Character Reference Request Form)
            html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
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
                        margin-bottom: 20px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 24pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 10pt;
                        margin-top: 5px;
                    }
                    .form-section {
                        margin-bottom: 20px;
                    }
                    .form-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    .form-label {
                        display: table-cell;
                        width: 35%;
                        font-weight: bold;
                        padding-right: 10px;
                        vertical-align: top;
                    }
                    .form-value {
                        display: table-cell;
                        width: 65%;
                        border-bottom: 1px solid #ccc;
                        min-height: 20px;
                        padding-bottom: 2px;
                    }
                    .form-row-full {
                        margin-bottom: 15px;
                    }
                    .form-row-full .form-label {
                        display: block;
                        width: 100%;
                        margin-bottom: 5px;
                    }
                    .form-row-full .form-value {
                        display: block;
                        width: 100%;
                        border: 1px solid #ccc;
                        min-height: 60px;
                        padding: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .checkbox-cell {
                        text-align: center;
                        width: 80px;
                    }
                    .checkbox {
                        display: inline-block;
                        width: 15px;
                        height: 15px;
                        border: 2px solid #000;
                        margin: 0 5px;
                    }
                    .yes-no-group {
                        display: inline-block;
                        margin-right: 30px;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 12pt;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        padding: 5px;
                        background-color: #e8e8e8;
                    }
                    .privacy-notice {
                        margin-top: 30px;
                        padding: 15px;
                        background-color: #f9f9f9;
                        border: 1px solid #ccc;
                        font-size: 9pt;
                    }
                    .office-use {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: #fffacd;
                        border: 1px solid #ccc;
                    }
                    .signature-section {
                        margin-top: 30px;
                        margin-bottom: 30px;
                    }
                    .signature-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 15px;
                    }
                    .signature-label {
                        display: table-cell;
                        width: 30%;
                        font-weight: bold;
                    }
                    .signature-line {
                        display: table-cell;
                        width: 70%;
                        border-bottom: 1px solid #000;
                        min-height: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>LETS CARE ALL</h1>
                    <div class="subtitle">CHARACTER REFERENCE REQUEST FORM</div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Name of Referee:</div>
                        <div class="form-value">${reference.name || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Candidate Name:</div>
                        <div class="form-value">${candidateName}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Position Applied For:</div>
                        <div class="form-value">${positionApplied}</div>
                    </div>
                </div>

                <div class="form-section">
                    <p>The above person has applied for the Care Worker and has named you as a character referee. I would be grateful if you could express your opinion on the suitability of the Candidate for the specified post. Your reply will be kept in line with Data Protection Policies and the General Data Protection Regulations.</p>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Relation Candidate is known to you: i.e. Working Colleague, Study Fellow, Study & Work Colleague, etc.</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">How long have you known the Candidate? i.e. Over 10 years or 5 Years Plus</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                </div>

                <div class="form-row-full">
                    <div class="form-label">Please state here your views on the person's ability to work in this role and detail:</div>
                    <div class="form-value" style="min-height: 120px;">&nbsp;</div>
                </div>

                <div class="section-title">Please advise on the following aspects of the Candidate's character (where applicable) by ticking the relevant box to indicate the level in each category, and add any comments you feel are appropriate.</div>

                <table>
                    <thead>
                        <tr>
                            <th>Criteria: Assign (✔ or X) to the applicant's performance</th>
                            <th class="checkbox-cell">Excellent</th>
                            <th class="checkbox-cell">Good</th>
                            <th class="checkbox-cell">Average</th>
                            <th class="checkbox-cell">Unable to comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Dignity and respect</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Hard-working</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Honest and Trustworthy</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Compassion and empathy</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Motivation, commitment and attitude</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Attitude</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Relationship with others</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Caring and Friendly</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Ability to engage others</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                    </tbody>
                </table>

                <div class="signature-section">
                    <div class="signature-row">
                        <div class="signature-label">Referee Signature:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Date:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Telephone No:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Email:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Your Position:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                </div>

                <div class="privacy-notice">
                    <div class="section-title">Privacy Notice:</div>
                    <p>Individuals have a right under the General Data Protection Regulations to see copies of references received about them. Therefore, we cannot guarantee the complete confidentiality of any reference received.</p>
                    <p>We will only collect data for specified, explicit and legitimate use in relation to the recruitment process. By signing this document, you consent to hold the information contained.</p>
                    <p>We are required to keep this information within the Candidate's personnel file. We cannot estimate the exact time period it will be held for. When that period is over, we will delete your data.</p>
                    <p>We have privacy policies that you can request for further information. Please be assured that your data will be securely stored by the Data Protection Officer (DPO) and used only for the successful recruitment of the Candidate.</p>
                    <p>You have the right to have your data forgotten, to rectify or access your data, to restrict processing, to withdraw your consent, and to be kept informed about the processing of your data. If you would like to discuss this further or withdraw your consent at any time, don't hesitate to get in touch with us via email DPO at info@letscareall.org.uk</p>
                </div>

                <div class="office-use">
                    <div class="section-title">OFFICE USE ONLY</div>
                    <div class="form-row">
                        <div class="form-label">Reference verified via email by Name:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Date:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Additional Note:</div>
                        <div class="form-value" style="min-height: 40px;">&nbsp;</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        } else {
            // Professional Reference Form (Reference Request Form) - existing code
            html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
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
                        margin-bottom: 20px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 24pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 10pt;
                        margin-top: 5px;
                    }
                    .form-section {
                        margin-bottom: 20px;
                    }
                    .form-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    .form-label {
                        display: table-cell;
                        width: 35%;
                        font-weight: bold;
                        padding-right: 10px;
                        vertical-align: top;
                    }
                    .form-value {
                        display: table-cell;
                        width: 65%;
                        border-bottom: 1px solid #ccc;
                        min-height: 20px;
                        padding-bottom: 2px;
                    }
                    .form-row-full {
                        margin-bottom: 15px;
                    }
                    .form-row-full .form-label {
                        display: block;
                        width: 100%;
                        margin-bottom: 5px;
                    }
                    .form-row-full .form-value {
                        display: block;
                        width: 100%;
                        border: 1px solid #ccc;
                        min-height: 60px;
                        padding: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .checkbox-cell {
                        text-align: center;
                        width: 80px;
                    }
                    .checkbox {
                        display: inline-block;
                        width: 15px;
                        height: 15px;
                        border: 2px solid #000;
                        margin: 0 5px;
                    }
                    .yes-no-group {
                        display: inline-block;
                        margin-right: 30px;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 12pt;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        padding: 5px;
                        background-color: #e8e8e8;
                    }
                    .privacy-notice {
                        margin-top: 30px;
                        padding: 15px;
                        background-color: #f9f9f9;
                        border: 1px solid #ccc;
                        font-size: 9pt;
                    }
                    .office-use {
                        margin-top: 20px;
                        padding: 15px;
                        background-color: #fffacd;
                        border: 1px solid #ccc;
                    }
                    .signature-section {
                        margin-top: 30px;
                        margin-bottom: 30px;
                    }
                    .signature-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 15px;
                    }
                    .signature-label {
                        display: table-cell;
                        width: 30%;
                        font-weight: bold;
                    }
                    .signature-line {
                        display: table-cell;
                        width: 70%;
                        border-bottom: 1px solid #000;
                        min-height: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>LETS CARE ALL</h1>
                    <div class="subtitle">REFERENCE REQUEST FORM</div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Name of Referee:</div>
                        <div class="form-value">${reference.name || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Candidate Name:</div>
                        <div class="form-value">${candidateName}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Position Applied for:</div>
                        <div class="form-value">${positionApplied}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Position(s) Held:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Employment start date:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Final Salary:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Employment end date:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                </div>

                <div class="section-title">Main Duties / Responsibilities</div>
                <div class="form-row-full">
                    <div class="form-value" style="min-height: 80px;">&nbsp;</div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Capacity in which Candidate is known<br>(e.g, Employee, Co-Worker, Colleague):</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">How long have you known the Candidate?</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Reason for leaving:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Was the Candidate subject to any formal form of performance management/safeguarding / disciplinary action within the last 12 months? Please tick (✔ or X) Appropriate:</div>
                        <div class="form-value">
                            <span class="yes-no-group">Yes <span class="checkbox"></span></span>
                            <span class="yes-no-group">No <span class="checkbox"></span></span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">If yes, please give further details:</div>
                        <div class="form-value" style="min-height: 40px;">&nbsp;</div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Would you employ the Candidate again? Please tick (✔ or X) Appropriate:</div>
                        <div class="form-value">
                            <span class="yes-no-group">Yes <span class="checkbox"></span></span>
                            <span class="yes-no-group">No <span class="checkbox"></span></span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">If No, please give further details:</div>
                        <div class="form-value" style="min-height: 40px;">&nbsp;</div>
                    </div>
                </div>

                <div class="section-title">Please advise on the following aspects of the Candidate's Employment (where applicable) by ticking the relevant box to indicate the level in each category - please add any comments you feel appropriate.</div>

                <table>
                    <thead>
                        <tr>
                            <th>Criteria: Assign (✔ or X) to the Candidate's performance</th>
                            <th class="checkbox-cell">Excellent</th>
                            <th class="checkbox-cell">Good</th>
                            <th class="checkbox-cell">Average</th>
                            <th class="checkbox-cell">Unable to Comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Attendance Record</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Dignity and respect</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Compassion, empathy, ability to empower others</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Motivation, commitment and attitude to work</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Learning and development interest</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Team working ability</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Lone working. Ability to work on Own initiative</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                    </tbody>
                </table>

                <table>
                    <thead>
                        <tr>
                            <th>Criteria: Assign X to the Candidate's performance</th>
                            <th class="checkbox-cell">Excellent</th>
                            <th class="checkbox-cell">Good</th>
                            <th class="checkbox-cell">Average</th>
                            <th class="checkbox-cell">Unable to comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Understanding and compliance with quality and safety</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Attitude</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Relationship with Colleagues & Peers</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Ability to engage with clients, service users & their families</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                        <tr>
                            <td>Overall contribution as a member of staff</td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                            <td class="checkbox-cell"><span class="checkbox"></span></td>
                        </tr>
                    </tbody>
                </table>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Did you find the applicant honest and trustworthy?</div>
                        <div class="form-value">
                            <span class="yes-no-group">Yes <span class="checkbox"></span></span>
                            <span class="yes-no-group">No <span class="checkbox"></span></span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Did you find the Candidate to be reliable/trustworthy in carrying out their duties?</div>
                        <div class="form-value">
                            <span class="yes-no-group">Yes <span class="checkbox"></span></span>
                            <span class="yes-no-group">No <span class="checkbox"></span></span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Was the applicant's attendance/timekeeping acceptable?</div>
                        <div class="form-value">
                            <span class="yes-no-group">Yes <span class="checkbox"></span></span>
                            <span class="yes-no-group">No <span class="checkbox"></span></span>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Do you think the Candidate is a suitable person to undertake this post?</div>
                        <div class="form-value">
                            <span class="yes-no-group">Yes <span class="checkbox"></span></span>
                            <span class="yes-no-group">No <span class="checkbox"></span></span>
                        </div>
                    </div>
                </div>

                <div class="section-title">We welcome any additional comments you may have below. Please include anything not previously mentioned which would help or hinder this person's application to Lets Care All; please include any in-house training:</div>
                <div class="form-row-full">
                    <div class="form-value" style="min-height: 100px;">&nbsp;</div>
                </div>
                <div class="form-row">
                    <div class="form-label">Please provide any additional comments here (continue on an additional sheet if necessary):</div>
                    <div class="form-value" style="min-height: 80px;">&nbsp;</div>
                </div>

                <div class="signature-section">
                    <div class="signature-row">
                        <div class="signature-label">Referee Signature:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Date:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Company Name:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Company Address:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Telephone No:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Email:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Your Position:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                </div>

                <div style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; text-align: center;">
                    <p><strong>This reference response form must be sent by official email or endorsed with an official stamp/compliment slip, or if this form is not used, a reference must be supplied on official letterheaded paper.</strong></p>
                    <div style="margin-top: 20px; min-height: 50px; border: 1px solid #ccc;">
                        <p style="margin: 5px;">Official Stamp</p>
                    </div>
                </div>

                <div class="privacy-notice">
                    <div class="section-title">PRIVACY NOTICE:</div>
                    <p><strong>Individuals have a right under the General Data Protection Regulations to see copies of references received about them. Therefore, we cannot guarantee the complete confidentiality of any reference received.</strong></p>
                    <p>We will only collect data for specified, explicit and legitimate use in relation to the recruitment process. By signing this document, you consent to hold the information contained.</p>
                    <p>We are required to keep this information within the Candidate's personnel file. We cannot estimate the exact time period it will be held for. When that period is over, we will delete your data.</p>
                    <p>We have privacy policies that you can request for further information. Please be assured that your data will be securely stored by the Data Protection Officer (DPO) and used only for the successful recruitment of the Candidate.</p>
                    <p>You have the right to have your data forgotten, to rectify or access your data, to restrict processing, to withdraw your consent, and to be kept informed about the processing of your data. If you would like to discuss this further or withdraw your consent at any time, please get in touch with us via email at DPO at info@letscareall.org.uk.</p>
                </div>

                <div class="office-use">
                    <div class="section-title">OFFICE USE ONLY</div>
                    <div class="form-row">
                        <div class="form-label">Reference verified via email by Name:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Verbal Reference Taken By:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Only if it is not possible by email or by post</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Date:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Reason Stated:</div>
                        <div class="form-value">&nbsp;</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Additional Note:</div>
                        <div class="form-value" style="min-height: 40px;">&nbsp;</div>
                    </div>
                </div>
            </body>
            </html>
        `;
        }

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

        // Convert Uint8Array to Buffer
        return Buffer.from(pdfBuffer);
    }

    async generateSubmittedReferencePDF(id: string): Promise<Buffer> {
        const reference = await this.findOne(id);
        
        if (!reference.submissionData) {
            throw new BadRequestException('Reference has not been submitted yet');
        }

        if (reference.status !== ReferenceStatus.SUBMITTED) {
            throw new BadRequestException('Reference is not in submitted status');
        }

        // Use staff relation if loaded, otherwise load it
        let staff: StaffProfile | null = reference.staff || null;
        if (!staff) {
            staff = await this.staffRepository.findOne({
                where: { id: reference.staffId },
                relations: ['user'],
            });
        }

        const candidateName = staff
            ? `${staff.firstName || ''} ${staff.middleName || ''} ${staff.lastName || ''}`.trim()
            : 'N/A';
        const positionApplied = 'Care Assistant (CARE Staff)'; // Default position
        const submissionData = reference.submissionData;

        // Generate different PDF based on reference type
        let html = '';
        
        if (reference.referenceType === 'personal') {
            // Personal Reference Form with submitted data
            html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
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
                        margin-bottom: 20px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 24pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 10pt;
                        margin-top: 5px;
                    }
                    .form-section {
                        margin-bottom: 20px;
                    }
                    .form-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    .form-label {
                        display: table-cell;
                        width: 35%;
                        font-weight: bold;
                        padding-right: 10px;
                        vertical-align: top;
                    }
                    .form-value {
                        display: table-cell;
                        width: 65%;
                        border-bottom: 1px solid #ccc;
                        min-height: 20px;
                        padding-bottom: 2px;
                    }
                    .form-row-full {
                        margin-bottom: 15px;
                    }
                    .form-row-full .form-label {
                        display: block;
                        width: 100%;
                        margin-bottom: 5px;
                    }
                    .form-row-full .form-value {
                        display: block;
                        width: 100%;
                        border: 1px solid #ccc;
                        min-height: 60px;
                        padding: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .checkbox-cell {
                        text-align: center;
                        width: 80px;
                    }
                    .checkbox {
                        display: inline-block;
                        width: 15px;
                        height: 15px;
                        border: 2px solid #000;
                        margin: 0 5px;
                    }
                    .checkbox.checked {
                        background-color: #000;
                    }
                    .yes-no-group {
                        display: inline-block;
                        margin-right: 30px;
                    }
                    .section-title {
                        font-weight: bold;
                        font-size: 12pt;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        padding: 5px;
                        background-color: #e8e8e8;
                    }
                    .signature-section {
                        margin-top: 30px;
                        margin-bottom: 30px;
                    }
                    .signature-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 15px;
                    }
                    .signature-label {
                        display: table-cell;
                        width: 30%;
                        font-weight: bold;
                    }
                    .signature-line {
                        display: table-cell;
                        width: 70%;
                        border-bottom: 1px solid #000;
                        min-height: 30px;
                    }
                    .signature-img {
                        max-width: 200px;
                        max-height: 80px;
                        border: 1px solid #ccc;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>LETS CARE ALL</h1>
                    <div class="subtitle">CHARACTER REFERENCE REQUEST FORM</div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Name of Referee:</div>
                        <div class="form-value">${reference.name || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Candidate Name:</div>
                        <div class="form-value">${candidateName}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Position Applied For:</div>
                        <div class="form-value">${positionApplied}</div>
                    </div>
                </div>

                <div class="form-section">
                    <p>The above person has applied for the Care Worker and has named you as a character referee. I would be grateful if you could express your opinion on the suitability of the Candidate for the specified post. Your reply will be kept in line with Data Protection Policies and the General Data Protection Regulations.</p>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Relation Candidate is known to you: i.e. Working Colleague, Study Fellow, Study & Work Colleague, etc.</div>
                        <div class="form-value">${submissionData.relationship || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">How long have you known the Candidate? i.e. Over 10 years or 5 Years Plus</div>
                        <div class="form-value">${submissionData.yearsKnown || ''}</div>
                    </div>
                </div>

                <div class="form-row-full">
                    <div class="form-label">Please state here your views on the person's ability to work in this role and detail:</div>
                    <div class="form-value" style="min-height: 120px;">${submissionData.comments || ''}</div>
                </div>

                ${submissionData.additionalComments ? `
                <div class="form-row-full">
                    <div class="form-label">Additional Comments:</div>
                    <div class="form-value" style="min-height: 80px;">${submissionData.additionalComments}</div>
                </div>
                ` : ''}

                <div class="section-title">Please advise on the following aspects of the Candidate's character (where applicable) by ticking the relevant box to indicate the level in each category, and add any comments you feel are appropriate.</div>

                <table>
                    <thead>
                        <tr>
                            <th>Criteria: Assign (✔ or X) to the applicant's performance</th>
                            <th class="checkbox-cell">Excellent</th>
                            <th class="checkbox-cell">Good</th>
                            <th class="checkbox-cell">Average</th>
                            <th class="checkbox-cell">Unable to comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateCriteriaRows(submissionData.criteriaRatings || {}, [
                            'Dignity and respect',
                            'Hard-working',
                            'Honest and Trustworthy',
                            'Compassion and empathy',
                            'Motivation, commitment and attitude',
                            'Attitude',
                            'Relationship with others',
                            'Caring and Friendly',
                            'Ability to engage others',
                        ])}
                    </tbody>
                </table>

                ${submissionData.recommendation !== null && submissionData.recommendation !== undefined ? `
                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Would you recommend this candidate?</div>
                        <div class="form-value">${submissionData.recommendation ? 'Yes' : 'No'}</div>
                    </div>
                </div>
                ` : ''}

                <div class="signature-section">
                    ${submissionData.signature ? `
                    <div class="signature-row">
                        <div class="signature-label">Referee Signature:</div>
                        <div class="signature-line">
                            <img src="${submissionData.signature}" class="signature-img" />
                        </div>
                    </div>
                    ` : `
                    <div class="signature-row">
                        <div class="signature-label">Referee Signature:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    `}
                    <div class="signature-row">
                        <div class="signature-label">Date:</div>
                        <div class="signature-line">${submissionData.signatureDate || ''}</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Telephone No:</div>
                        <div class="signature-line">${reference.phone || ''}</div>
                    </div>
                </div>
            </body>
            </html>
            `;
        } else {
            // Professional Reference Form with submitted data
            html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
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
                        margin-bottom: 20px;
                        border-bottom: 3px solid #00659D;
                        padding-bottom: 15px;
                    }
                    .header h1 {
                        color: #00659D;
                        font-size: 24pt;
                        font-weight: bold;
                        margin: 0;
                        padding: 0;
                    }
                    .header .subtitle {
                        color: #666;
                        font-size: 10pt;
                        margin-top: 5px;
                    }
                    .form-section {
                        margin-bottom: 20px;
                    }
                    .form-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 8px;
                    }
                    .form-label {
                        display: table-cell;
                        width: 35%;
                        font-weight: bold;
                        padding-right: 10px;
                        vertical-align: top;
                    }
                    .form-value {
                        display: table-cell;
                        width: 65%;
                        border-bottom: 1px solid #ccc;
                        min-height: 20px;
                        padding-bottom: 2px;
                    }
                    .form-row-full {
                        margin-bottom: 15px;
                    }
                    .form-row-full .form-label {
                        display: block;
                        width: 100%;
                        margin-bottom: 5px;
                    }
                    .form-row-full .form-value {
                        display: block;
                        width: 100%;
                        border: 1px solid #ccc;
                        min-height: 60px;
                        padding: 5px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        font-size: 10pt;
                    }
                    table th, table td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    table th {
                        background-color: #f0f0f0;
                        font-weight: bold;
                    }
                    .checkbox-cell {
                        text-align: center;
                        width: 80px;
                    }
                    .checkbox {
                        display: inline-block;
                        width: 15px;
                        height: 15px;
                        border: 2px solid #000;
                        margin: 0 5px;
                    }
                    .checkbox.checked {
                        background-color: #000;
                    }
                    .signature-section {
                        margin-top: 30px;
                        margin-bottom: 30px;
                    }
                    .signature-row {
                        display: table;
                        width: 100%;
                        margin-bottom: 15px;
                    }
                    .signature-label {
                        display: table-cell;
                        width: 30%;
                        font-weight: bold;
                    }
                    .signature-line {
                        display: table-cell;
                        width: 70%;
                        border-bottom: 1px solid #000;
                        min-height: 30px;
                    }
                    .signature-img {
                        max-width: 200px;
                        max-height: 80px;
                        border: 1px solid #ccc;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>LETS CARE ALL</h1>
                    <div class="subtitle">REFERENCE REQUEST FORM</div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Name of Referee:</div>
                        <div class="form-value">${reference.name || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Company Name:</div>
                        <div class="form-value">${submissionData.companyName || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Position:</div>
                        <div class="form-value">${submissionData.position || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Candidate Name:</div>
                        <div class="form-value">${candidateName}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Position Applied For:</div>
                        <div class="form-value">${positionApplied}</div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-row">
                        <div class="form-label">Position(s) Held:</div>
                        <div class="form-value">${submissionData.positionHeld || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Employment Start Date:</div>
                        <div class="form-value">${submissionData.employmentStartDate || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Employment End Date:</div>
                        <div class="form-value">${submissionData.employmentEndDate || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Final Salary:</div>
                        <div class="form-value">${submissionData.finalSalary || ''}</div>
                    </div>
                    <div class="form-row-full">
                        <div class="form-label">Main Duties / Responsibilities:</div>
                        <div class="form-value">${submissionData.mainDuties || ''}</div>
                    </div>
                    <div class="form-row">
                        <div class="form-label">Reason for leaving:</div>
                        <div class="form-value">${submissionData.reasonForLeaving || ''}</div>
                    </div>
                </div>

                <div class="section-title">Please advise on the following aspects of the Candidate's performance (where applicable) by ticking the relevant box to indicate the level in each category.</div>

                <table>
                    <thead>
                        <tr>
                            <th>Criteria</th>
                            <th class="checkbox-cell">Excellent</th>
                            <th class="checkbox-cell">Good</th>
                            <th class="checkbox-cell">Average</th>
                            <th class="checkbox-cell">Unable to comment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.generateCriteriaRows(submissionData.criteriaRatings || {}, [
                            'Attendance Record',
                            'Dignity and respect',
                            'Compassion, empathy, ability to empower others',
                            'Motivation, commitment and attitude to work',
                            'Learning and development interest',
                            'Team working ability',
                            'Lone working. Ability to work on Own initiative',
                            'Understanding and compliance with quality and safety',
                            'Attitude',
                            'Relationship with Colleagues & Peers',
                            'Ability to engage with clients, service users & their families',
                            'Overall contribution as a member of staff',
                        ])}
                    </tbody>
                </table>

                ${submissionData.comments ? `
                <div class="form-row-full">
                    <div class="form-label">Additional Comments:</div>
                    <div class="form-value">${submissionData.comments}</div>
                </div>
                ` : ''}

                <div class="signature-section">
                    ${submissionData.signature ? `
                    <div class="signature-row">
                        <div class="signature-label">Referee Signature:</div>
                        <div class="signature-line">
                            <img src="${submissionData.signature}" class="signature-img" />
                        </div>
                    </div>
                    ` : `
                    <div class="signature-row">
                        <div class="signature-label">Referee Signature:</div>
                        <div class="signature-line">&nbsp;</div>
                    </div>
                    `}
                    <div class="signature-row">
                        <div class="signature-label">Date:</div>
                        <div class="signature-line">${submissionData.signatureDate || ''}</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Company Address:</div>
                        <div class="signature-line">${submissionData.companyAddress || ''}</div>
                    </div>
                    <div class="signature-row">
                        <div class="signature-label">Telephone No:</div>
                        <div class="signature-line">${submissionData.telephone || reference.phone || ''}</div>
                    </div>
                </div>
            </body>
            </html>
            `;
        }

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

    private generateCriteriaRows(criteriaRatings: Record<string, string>, criteriaList: string[]): string {
        const ratings = ['Excellent', 'Good', 'Average', 'Unable to comment'];
        return criteriaList.map(criteria => {
            const rating = criteriaRatings[criteria] || '';
            return `
                <tr>
                    <td>${criteria}</td>
                    ${ratings.map(r => `
                        <td class="checkbox-cell">
                            <span class="checkbox ${rating === r ? 'checked' : ''}"></span>
                        </td>
                    `).join('')}
                </tr>
            `;
        }).join('');
    }

    async sendReference(data: {
        staffId: string;
        referenceType: string;
        name: string;
        email: string;
        phone?: string;
        relationship?: string;
        yearsKnown?: string;
        message?: string;
    }): Promise<StaffReference> {
        const staffProfileId = await this.resolveStaffProfileId(data.staffId);
        // Create reference entry in database
        const savedReference = this.referencesRepository.create({
            staffId: staffProfileId,
            referenceType: data.referenceType,
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            relationship: data.relationship || undefined,
            yearsKnown: data.yearsKnown || undefined,
            message: data.message || undefined,
            emailStatus: 'pending',
        });
        (savedReference as any).staffId = staffProfileId; // Explicit assignment for TypeORM
        const reference = await this.referencesRepository.save(savedReference);

        try {
            // Generate PDF
            const pdfBuffer = await this.generateReferencePDF(reference);

            // Send email with PDF attachment
            await this.emailService.sendReferenceEmail(
                data.email,
                pdfBuffer,
                data.referenceType,
            );

            // Update email status to 'sent'
            reference.emailStatus = 'sent';
            await this.referencesRepository.save(reference);

            return reference;
        } catch (error) {
            // Rollback: delete the reference entry if email sending fails
            await this.referencesRepository.delete(reference.id);
            throw error;
        }
    }

    async sendReminder(id: string): Promise<{ success: boolean; message: string }> {
        // Get the reference
        const reference = await this.findOne(id);
        
        // Generate PDF and resend email (legacy support)
        const pdfBuffer = await this.generateReferencePDF(reference);
        await this.emailService.sendReferenceEmail(
            reference.email,
            pdfBuffer,
            reference.referenceType,
        );
        
        // Update reminder count
        const reminderCount = (reference.reminderCount || 0) + 1;
        await this.update(id, { reminderCount });
        
        return { success: true, message: 'Reminder sent successfully' };
    }

    // New secure token-based methods
    private generateSecureToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private getReferenceUrl(token: string, requestBaseUrl?: string): string {
        // IMPORTANT:
        // - In production, APP_BASE_URL MUST be set to the PUBLIC frontend URL (e.g. https://cpd.yourdomain.com)
        // - Do not allow sending localhost links to real referees.

        const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
        const configured = (process.env.APP_BASE_URL || '').trim();

        // Backward compatibility for older environments, but ONLY used when APP_BASE_URL is not set.
        const fallback = (process.env.FRONTEND_URL || process.env.APP_URL || '').trim();

        // Use request base URL as last resort if provided (from frontend request)
        const requestUrl = requestBaseUrl ? requestBaseUrl.trim() : '';

        // Priority: APP_BASE_URL > FRONTEND_URL/APP_URL > requestBaseUrl > localhost (dev only)
        const rawBaseUrl = configured || fallback || requestUrl || 'http://localhost:5173';
        const baseUrl = rawBaseUrl.replace(/\/+$/, ''); // trim trailing slashes

        if (isProd) {
            // In production, we need a valid public URL
            if (!configured && !fallback && !requestUrl) {
                throw new BadRequestException(
                    'APP_BASE_URL is not configured on the backend. Set APP_BASE_URL to your public frontend URL (e.g. http://72.62.199.119:81) in backend/.env file and restart the server.',
                );
            }
            if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                throw new BadRequestException(
                    'APP_BASE_URL is misconfigured (localhost). Set APP_BASE_URL to your public frontend URL (e.g. http://72.62.199.119:81) in backend/.env file so referees can open the link.',
                );
            }
        } else {
            // Dev warning only (do not block).
            if (!configured || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                // eslint-disable-next-line no-console
                console.warn(
                    'Reference link base URL is using localhost or is not set. In production, set APP_BASE_URL to the public domain so referees can access the link.',
                );
            }
        }

        return `${baseUrl}/reference/submit/${token}`;
    }

    private isTokenExpired(createdAt: Date, lastReminderSentAt?: Date | null): boolean {
        // Validity is anchored to the most recent contact (last reminder if any, else creation),
        // so sending a reminder extends the link's lifetime by another expiration window.
        const referenceDate = lastReminderSentAt || createdAt;
        const expirationDays = 14;
        const expirationDate = new Date(referenceDate);
        expirationDate.setDate(expirationDate.getDate() + expirationDays);
        return new Date() > expirationDate;
    }

    async findByToken(token: string): Promise<StaffReference> {
        const reference = await this.referencesRepository.findOne({ where: { token } });
        if (!reference) {
            throw new NotFoundException('Invalid reference token');
        }
        return reference;
    }

    async validateAndOpenToken(token: string, ipAddress?: string): Promise<StaffReference> {
        const reference = await this.findByToken(token);

        // Check if token is expired
        if (this.isTokenExpired(reference.createdAt, reference.lastReminderSentAt)) {
            throw new BadRequestException('This reference link has expired. Please contact the administrator.');
        }

        // Check if already submitted
        if (reference.status === ReferenceStatus.SUBMITTED) {
            throw new BadRequestException('This reference has already been submitted.');
        }

        // Mark as opened if not already opened
        if (!reference.openedAt) {
            reference.openedAt = new Date();
            reference.status = ReferenceStatus.OPENED;
            await this.referencesRepository.save(reference);
        }

        return reference;
    }

    async submitReference(token: string, submissionData: any, ipAddress?: string): Promise<StaffReference> {
        const reference = await this.findByToken(token);

        // Check if token is expired
        if (this.isTokenExpired(reference.createdAt, reference.lastReminderSentAt)) {
            throw new BadRequestException('This reference link has expired.');
        }

        // Check if already submitted
        if (reference.status === ReferenceStatus.SUBMITTED) {
            throw new BadRequestException('This reference has already been submitted.');
        }

        // Update reference with submission data
        reference.submissionData = submissionData;
        reference.status = ReferenceStatus.SUBMITTED;
        reference.submittedAt = new Date();
        if (ipAddress) {
            reference.ipAddress = ipAddress;
        }

        await this.referencesRepository.save(reference);
        return reference;
    }

    async sendReferenceWithSecureLink(
        data: {
            staffId: string;
            referenceType: string;
            name: string;
            email: string;
            phone?: string;
            relationship?: string;
            yearsKnown?: string;
            message?: string;
        },
        requestBaseUrl?: string,
    ): Promise<StaffReference> {
        const staffProfileId = await this.resolveStaffProfileId(data.staffId);
        // Generate secure token
        const token = this.generateSecureToken();

        // Create reference entry in database
        const savedReference = this.referencesRepository.create({
            staffId: staffProfileId,
            referenceType: data.referenceType,
            name: data.name,
            email: data.email,
            phone: data.phone || undefined,
            relationship: data.relationship || undefined,
            yearsKnown: data.yearsKnown || undefined,
            message: data.message || undefined,
            token,
            status: ReferenceStatus.PENDING,
            emailStatus: 'pending',
        });
        (savedReference as any).staffId = staffProfileId;
        const reference = await this.referencesRepository.save(savedReference);

        try {
            // Generate secure link (use request base URL as fallback if APP_BASE_URL not set)
            const referenceUrl = this.getReferenceUrl(token, requestBaseUrl);

            // Get staff information for email
            const staff = await this.staffRepository.findOne({
                where: { id: staffProfileId },
                relations: ['user'],
            });
            const candidateName = staff
                ? `${staff.firstName || ''} ${staff.middleName || ''} ${staff.lastName || ''}`.trim()
                : 'the candidate';

            // Send email with secure link
            await this.emailService.sendReferenceLinkEmail(
                data.email,
                referenceUrl,
                candidateName,
                data.referenceType,
            );

            // Update email status to 'sent'
            reference.emailStatus = 'sent';
            await this.referencesRepository.save(reference);

            return reference;
        } catch (error) {
            // Rollback: delete the reference entry if email sending fails
            await this.referencesRepository.delete(reference.id);
            throw error;
        }
    }

    async sendReminderWithSecureLink(id: string, requestBaseUrl?: string): Promise<{ success: boolean; message: string }> {
        const reference = await this.findOne(id);

        if (!reference.token) {
            throw new BadRequestException('This reference does not have a secure token. Please use the legacy reminder method.');
        }

        if (reference.status === ReferenceStatus.SUBMITTED || reference.status === ReferenceStatus.COMPLETED) {
            throw new BadRequestException('This reference has already been submitted.');
        }

        // Cap reminders at 4 per client requirement.
        if ((reference.reminderCount || 0) >= MAX_REMINDERS) {
            throw new BadRequestException(`Maximum of ${MAX_REMINDERS} reminders already sent for this reference.`);
        }

        const referenceUrl = this.getReferenceUrl(reference.token, requestBaseUrl);

        // Get staff information for email
        const staff = await this.staffRepository.findOne({
            where: { id: reference.staffId },
            relations: ['user'],
        });
        const candidateName = staff
            ? `${staff.firstName || ''} ${staff.middleName || ''} ${staff.lastName || ''}`.trim()
            : 'the candidate';

        // Send reminder email with secure link
        console.log(`[REMINDER] Attempting to send reminder email to: ${reference.email}`);
        console.log(`[REMINDER] Reference URL: ${referenceUrl}`);
        console.log(`[REMINDER] Candidate: ${candidateName}`);
        console.log(`[REMINDER] Reminder number: ${reference.reminderCount + 1}`);
        
        try {
            await this.emailService.sendReferenceReminderEmail(
                reference.email,
                referenceUrl,
                candidateName,
                reference.referenceType,
                reference.reminderCount + 1,
            );
            console.log(`[REMINDER] Email sent successfully to ${reference.email}`);
        } catch (emailError: any) {
            console.error(`[REMINDER] Email service error:`, emailError);
            throw new BadRequestException(`Failed to send email: ${emailError.message}`);
        }

        // Update reminder count and last-sent timestamp
        const reminderCount = (reference.reminderCount || 0) + 1;
        await this.update(id, { reminderCount, lastReminderSentAt: new Date() });

        return { success: true, message: 'Reminder sent successfully' };
    }

    async getAnalytics(): Promise<{
        totalReferences: number;
        totalSubmitted: number;
        pendingReferences: number;
        openedNotSubmitted: number;
        notOpened: number;
        threeDaysPassed: number;
        reminderEmailsSent: number;
    }> {
        const [
            totalReferences,
            totalSubmitted,
            rawPendingReferences,
            openedNotSubmitted,
            notOpened,
        ] = await Promise.all([
            this.referencesRepository.count(),
            this.referencesRepository.count({ where: { status: ReferenceStatus.SUBMITTED } }),
            this.referencesRepository.count({ where: { status: ReferenceStatus.PENDING } }),
            this.referencesRepository.count({ where: { status: ReferenceStatus.OPENED } }),
            this.referencesRepository.count({ where: { openedAt: IsNull(), status: ReferenceStatus.PENDING } }),
        ]);

        const allReferences = await this.referencesRepository.find();
        
        // Calculate 3 days ago at midnight (start of day) for proper day-based comparison
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0); // Set to midnight for day-based comparison
        
        // Helper function to normalize date to midnight for comparison
        const normalizeToMidnight = (date: Date): Date => {
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };
        
        const reminderEmailsSent = allReferences.reduce((sum, ref) => sum + (ref.reminderCount || 0), 0);
        
        // Debug: Log the threshold date
        console.log(`[ANALYTICS] Calculating 3 Days Passed. Threshold date: ${threeDaysAgo.toISOString()}`);
        
        const threeDaysPassed = allReferences.filter((ref) => {
            // Exclude submitted references
            if (ref.status === ReferenceStatus.SUBMITTED || ref.submittedAt) {
                return false;
            }

            // NOTE: We DON'T exclude references with reminderCount >= 3 here
            // because "3 Days Passed" should show ALL references that are 3+ days old,
            // regardless of whether they can receive more reminders.
            // The reminder count check only applies when actually SENDING reminders.

            // For OPENED references: check if openedAt is 3 or more days old
            if (ref.status === ReferenceStatus.OPENED) {
                if (!ref.openedAt) {
                    return false;
                }
                const openedDate = normalizeToMidnight(new Date(ref.openedAt));
                const isOldEnough = openedDate <= threeDaysAgo; // <= to include exactly 3 days old
                console.log(`[ANALYTICS] Reference ${ref.id} (${ref.email}): Status=OPENED, OpenedAt=${openedDate.toISOString()}, Threshold=${threeDaysAgo.toISOString()}, IsOldEnough=${isOldEnough}, ReminderCount=${ref.reminderCount || 0}`);
                return isOldEnough;
            }

            // For PENDING references: check if createdAt is 3 or more days old
            if (ref.status === ReferenceStatus.PENDING) {
                const createdDate = normalizeToMidnight(new Date(ref.createdAt));
                const isOldEnough = createdDate <= threeDaysAgo; // <= to include exactly 3 days old
                console.log(`[ANALYTICS] Reference ${ref.id} (${ref.email}): Status=PENDING, CreatedAt=${createdDate.toISOString()}, Threshold=${threeDaysAgo.toISOString()}, IsOldEnough=${isOldEnough}, ReminderCount=${ref.reminderCount || 0}`);
                return isOldEnough;
            }

            return false;
        }).length;
        
        console.log(`[ANALYTICS] Total references: ${allReferences.length}, ThreeDaysPassed count: ${threeDaysPassed}`);

        return {
            totalReferences,
            totalSubmitted,
            pendingReferences: rawPendingReferences + openedNotSubmitted,
            openedNotSubmitted,
            notOpened,
            threeDaysPassed,
            reminderEmailsSent,
        };
    }

    async getAllReferencesForAnalytics(): Promise<StaffReference[]> {
        return this.referencesRepository.find({
            relations: ['staff', 'staff.user'],
            order: { createdAt: 'DESC' },
        });
    }

    async processAutomatedReminders(requestBaseUrl?: string): Promise<{
        processed: number;
        sent: number;
        errors: number;
        details?: any[];
        excluded?: any[];
        totalCandidates?: number;
        pendingCandidates?: number;
        openedCandidates?: number;
    }> {
        const DAY_MS = 1000 * 60 * 60 * 24;
        const now = Date.now();
        const daysSince = (date: Date) => Math.floor((now - new Date(date).getTime()) / DAY_MS);

        const referencesToReview = await this.referencesRepository.find({
            where: [
                { status: ReferenceStatus.PENDING },
                { status: ReferenceStatus.OPENED },
            ],
            relations: ['staff'],
        });

        const referencesNeedingReminder: StaffReference[] = [];
        const excludedReferences: Array<{ ref: StaffReference; reason: string }> = [];

        referencesToReview.forEach((ref) => {
            if (ref.status === ReferenceStatus.SUBMITTED || ref.status === ReferenceStatus.COMPLETED || ref.submittedAt) {
                excludedReferences.push({ ref, reason: 'Already submitted' });
                return;
            }

            const reminderCount = ref.reminderCount || 0;

            // Cap: stop once 4 reminders have been sent.
            if (reminderCount >= MAX_REMINDERS) {
                excludedReferences.push({ ref, reason: `Maximum ${MAX_REMINDERS} reminders already sent` });
                return;
            }

            if (reminderCount === 0) {
                // Reminder 1: 7 days after the initial request (use openedAt if opened, else createdAt).
                const anchor = ref.status === ReferenceStatus.OPENED && ref.openedAt ? ref.openedAt : ref.createdAt;
                const days = daysSince(anchor);
                if (days < FIRST_REMINDER_AFTER_DAYS) {
                    excludedReferences.push({
                        ref,
                        reason: `First reminder not due yet (${days} of ${FIRST_REMINDER_AFTER_DAYS} days since request)`,
                    });
                    return;
                }
                referencesNeedingReminder.push(ref);
                return;
            }

            // Reminders 2-4: spaced SUBSEQUENT_REMINDER_INTERVAL_DAYS after the previous reminder.
            if (!ref.lastReminderSentAt) {
                // Fallback anchor if a prior reminder didn't record a timestamp.
                const days = daysSince(ref.createdAt);
                if (days < FIRST_REMINDER_AFTER_DAYS) {
                    excludedReferences.push({ ref, reason: `Next reminder not due yet (${days} days since request)` });
                    return;
                }
                referencesNeedingReminder.push(ref);
                return;
            }

            const daysSinceLast = daysSince(ref.lastReminderSentAt);
            if (daysSinceLast < SUBSEQUENT_REMINDER_INTERVAL_DAYS) {
                excludedReferences.push({
                    ref,
                    reason: `Next reminder not due yet (${daysSinceLast} of ${SUBSEQUENT_REMINDER_INTERVAL_DAYS} days since last reminder)`,
                });
                return;
            }
            referencesNeedingReminder.push(ref);
        });

        let sent = 0;
        let errors = 0;
        const details: any[] = [];
        const baseUrl = requestBaseUrl || process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://72.62.199.119:81';

        for (const reference of referencesNeedingReminder) {
            try {
                await this.sendReminderWithSecureLink(reference.id, baseUrl);
                sent++;
                details.push({
                    referenceId: reference.id,
                    email: reference.email,
                    status: 'sent',
                    candidateName: reference.staff ? `${reference.staff.firstName || ''} ${reference.staff.lastName || ''}`.trim() : 'Unknown',
                    referenceStatus: reference.status,
                    reminderSentAt: new Date(),
                    createdAt: reference.createdAt,
                    openedAt: reference.openedAt,
                    submittedAt: reference.submittedAt,
                    reminderCountBefore: reference.reminderCount || 0,
                    reminderCountAfter: (reference.reminderCount || 0) + 1,
                });
            } catch (error: any) {
                errors++;
                details.push({
                    referenceId: reference.id,
                    email: reference.email,
                    status: 'error',
                    error: error.message || 'Unknown error',
                    candidateName: reference.staff ? `${reference.staff.firstName || ''} ${reference.staff.lastName || ''}`.trim() : 'Unknown',
                    referenceStatus: reference.status,
                    reminderSentAt: new Date(),
                    createdAt: reference.createdAt,
                    openedAt: reference.openedAt,
                    submittedAt: reference.submittedAt,
                    reminderCountBefore: reference.reminderCount || 0,
                });
            }
        }

        return {
            processed: referencesNeedingReminder.length,
            sent,
            errors,
            details,
            excluded: excludedReferences.map(({ ref, reason }) => ({
                referenceId: ref.id,
                email: ref.email,
                candidateName: ref.staff ? `${ref.staff.firstName || ''} ${ref.staff.lastName || ''}`.trim() : 'Unknown',
                reason,
                referenceStatus: ref.status,
                reminderCount: ref.reminderCount || 0,
                createdAt: ref.createdAt,
                openedAt: ref.openedAt,
                submittedAt: ref.submittedAt,
            })),
            totalCandidates: referencesToReview.length,
            pendingCandidates: referencesToReview.filter((ref) => ref.status === ReferenceStatus.PENDING).length,
            openedCandidates: referencesToReview.filter((ref) => ref.status === ReferenceStatus.OPENED).length,
        };
    }

    async sendManualReminders(requestBaseUrl?: string): Promise<{
        processed: number;
        sent: number;
        errors: number;
        details?: any[];
        excluded?: any[];
        totalCandidates?: number;
        pendingCandidates?: number;
        openedCandidates?: number;
    }> {
        return this.processAutomatedReminders(requestBaseUrl);
    }

    async sendRemindersToOpenedNotSubmitted(requestBaseUrl?: string): Promise<{ processed: number; sent: number; errors: number; details?: any[]; excluded?: any[]; totalFound?: number }> {
        // Find references that are opened but not submitted and older than 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0); // Set to midnight for day-based comparison
        
        // Helper function to normalize date to midnight for comparison
        const normalizeToMidnight = (date: Date): Date => {
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };

        console.log(`[REMINDER] Checking for opened but not submitted references older than: ${threeDaysAgo.toISOString()}`);

        const allReferences = await this.referencesRepository.find({
            where: [
                { status: ReferenceStatus.OPENED },
            ],
            relations: ['staff'],
        });

        console.log(`[REMINDER] Found ${allReferences.length} opened references`);

        const referencesNeedingReminder: StaffReference[] = [];
        const excludedReferences: Array<{ref: StaffReference, reason: string}> = [];

        allReferences.forEach(ref => {
            // Must be opened but not submitted
            if (ref.status === ReferenceStatus.SUBMITTED) {
                excludedReferences.push({ ref, reason: 'Already submitted' });
                return;
            }

            // Must have been opened
            if (!ref.openedAt) {
                excludedReferences.push({ ref, reason: 'Not yet opened' });
                return;
            }

            // Must be older than 3 days from when it was opened
            const openedDate = normalizeToMidnight(new Date(ref.openedAt));
            const isOldEnough = openedDate <= threeDaysAgo;
            
            // REMOVED: Reminder capacity check - send reminders until submission
            // References will continue to receive reminders until they submit

            console.log(`[REMINDER] Reference ${ref.id} (${ref.email}): Opened ${openedDate.toISOString()}, Old enough: ${isOldEnough}, ReminderCount: ${ref.reminderCount || 0}`);
            
            if (!isOldEnough) {
                const daysSinceOpened = Math.round((Date.now() - new Date(ref.openedAt).getTime()) / (1000 * 60 * 60 * 24));
                excludedReferences.push({ ref, reason: `Opened less than 3 days ago (${daysSinceOpened} days ago)` });
            } else {
                referencesNeedingReminder.push(ref);
            }
        });

        console.log(`[REMINDER] ${referencesNeedingReminder.length} opened references need reminders`);

        let sent = 0;
        let errors = 0;
        const details: any[] = [];

        const baseUrl = requestBaseUrl || process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://72.62.199.119:81';

        for (const reference of referencesNeedingReminder) {
            try {
                console.log(`[REMINDER] Sending reminder for opened reference ${reference.id} to ${reference.email}`);
                await this.sendReminderWithSecureLink(reference.id, baseUrl);
                console.log(`[REMINDER] Successfully sent reminder to ${reference.email}`);
                sent++;
                details.push({
                    referenceId: reference.id,
                    email: reference.email,
                    status: 'sent',
                    candidateName: reference.staff ? `${reference.staff.firstName || ''} ${reference.staff.lastName || ''}`.trim() : 'Unknown',
                });
            } catch (error: any) {
                console.error(`[REMINDER] Failed to send reminder for reference ${reference.id}:`, error);
                errors++;
                details.push({
                    referenceId: reference.id,
                    email: reference.email,
                    status: 'error',
                    error: error.message || 'Unknown error',
                    candidateName: reference.staff ? `${reference.staff.firstName || ''} ${reference.staff.lastName || ''}`.trim() : 'Unknown',
                });
            }
        }

        return {
            processed: referencesNeedingReminder.length,
            sent,
            errors,
            details,
            excluded: excludedReferences.map(({ ref, reason }) => ({
                referenceId: ref.id,
                email: ref.email,
                candidateName: ref.staff ? `${ref.staff.firstName || ''} ${ref.staff.lastName || ''}`.trim() : 'Unknown',
                reason,
                reminderCount: ref.reminderCount || 0,
                openedAt: ref.openedAt,
            })),
            totalFound: allReferences.length,
        };
    }

}
