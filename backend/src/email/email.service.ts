import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    private transporter;

    constructor() {
        // Support both SMTP and Gmail service
        if (process.env.SMTP_HOST) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER || process.env.EMAIL_USER,
                    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
                },
            });
        } else {
            // Fallback to Gmail service
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        }
    }

    async sendOtp(to: string, otp: string) {
        const mailOptions = {
            from: `"CPD Group Support" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: 'Your Password Reset Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #00659D;">Password Reset Request</h2>
                    <p>You requested to reset your password. Please use the following code to verify your identity:</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email.</p>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Message sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }
    }

    async sendReferenceEmail(toEmail: string, pdfBuffer: Buffer, referenceType: string) {
        const mailOptions = {
            from: `"Lets Care All" <${process.env.EMAIL_USER || 'hr@letscareall.co.uk'}>`,
            to: toEmail,
            subject: 'Reference Request - Lets Care All',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #00659D;">Reference Request</h2>
                    <p>Dear Sir/Madam,</p>
                    <p>Please find attached a reference request form from Lets Care All.</p>
                    <p>We would appreciate your prompt response.</p>
                    <p>Thank you for your cooperation.</p>
                    <br>
                    <p>Best regards,<br>Lets Care All HR Team</p>
                </div>
            `,
            attachments: [
                {
                    filename: `reference-form-${referenceType}.pdf`,
                    content: pdfBuffer,
                },
            ],
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Reference email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending reference email:', error);
            throw new Error('Failed to send reference email');
        }
    }

    async sendReferenceLinkEmail(
        toEmail: string,
        referenceUrl: string,
        candidateName: string,
        referenceType: string,
    ) {
        const referenceTypeLabel = referenceType === 'personal' ? 'Character Reference' : 'Professional Reference';
        const isPersonal = referenceType === 'personal';

        // Professional Reference template (standardized brand styling + colored signature)
        const professionalHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #139639 0%, #0e7a2d 100%); padding: 20px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">LETS CARE ALL</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${referenceTypeLabel} Request</p>
                    </div>
                    
                    <p>Dear Sir/Madam,</p>
                    
                    <p>You have been listed as a referee for <strong>${candidateName}</strong>, who has applied for a Care Worker (Care Staff) position with Lets Care All Ltd.</p>
                    
                    <p>We would be grateful if you could complete the attached Professional Reference Request Form using the secure link provided below. Your response will be treated in strict confidence and processed in accordance with our Data Protection Policies and the General Data Protection Regulation (GDPR).</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${referenceUrl}" 
                           style="display: inline-block; background: #139639; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Complete Reference Form
                        </a>
                    </div>
                    
                    <p>Alternatively, if you are unable to use the online form, you may return the completed reference by email or post to: Lets Care All LTD Fairlawn, First Floor Office High Street, Southall, England, UB1 3HB</p>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">
                        <strong>Note:</strong> Please note that this link will expire in 14 days. If you have any questions or require further information, please contact us at hr@letscareall.org.uk
                    </p>
                    
                    <p>It should also be noted that, under Data Protection legislation, applicants may request access to information held about them.</p>
                    
                    <p style="margin-top: 30px;">Thank you for your cooperation and assistance. We would greatly appreciate a prompt response.</p>
                    
                    <p style="margin-top: 30px; color: #139639; font-weight: 600;">Kind regards,</p>
                    <p style="margin: 0;">
                        <span style="color: #267FBA; font-weight: 700;">Dalia Elsadany</span>
                        <span style="color: #333;"> | </span>
                        <span style="color: #139639; font-weight: 600;">HR &amp; Recruitment Manager</span>
                        <span style="color: #333;"> For and on behalf of </span>
                        <span style="color: #139639; font-weight: 600;">Lets Care All</span>
                        <span style="color: #333;"> | </span>
                        <a href="tel:+442038024114" style="color: #267FBA; text-decoration: none; font-weight: 600;">+44 (0) 20 3802 4114</a>
                        <span style="color: #333;"> | </span>
                        <a href="https://www.letscareall.org.uk" style="color: #267FBA; text-decoration: none; font-weight: 600;">www.letscareall.org.uk</a>
                    </p>
                    <p style="font-size: 11px; color: #333; margin-top: 12px;">
                        <strong>Lets Care All LTD. is a limited company registered in England and Wales with a registered number: 10468582. Registered office: Fairlawn, First Floor Office High Street, Southall, England, UB1 3HB.</strong>
                    </p>
                </div>
            `;

        // Approved Character Reference (personal) template
        const personalHtml = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #139639 0%, #0e7a2d 100%); padding: 20px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">LETS CARE ALL</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Character Reference Request</p>
                    </div>
                    
                    <p>Dear Sir/Madam,</p>
                    
                    <p>You have been listed as a referee for <strong>${candidateName}</strong>, who has applied for a Care Worker (Care Staff) position with Lets Care All Ltd.</p>
                    
                    <p>We would be grateful if you could complete the attached Character Reference Request Form using the secure link provided below. Your response will be treated in strict confidence and processed in accordance with our Data Protection Policies and the General Data Protection Regulation (GDPR).</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${referenceUrl}" 
                           style="display: inline-block; background: #139639; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Complete Reference Form
                        </a>
                    </div>
                    
                    <p>Alternatively, if you are unable to use the online form, you may return the completed reference by email or post to: Lets Care All LTD Fairlawn, First Floor Office High Street, Southall, England, UB1 3HB</p>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">
                        <strong>Note:</strong> Please note that this link will expire in 14 days. If you have any questions or require further information, please contact us at hr@letscareall.org.uk
                    </p>
                    
                    <p>It should also be noted that, under Data Protection legislation, applicants may request access to information held about them.</p>
                    
                    <p style="margin-top: 30px;">Thank you for your cooperation and assistance. We would greatly appreciate a prompt response.</p>
                    
                    <p style="margin-top: 30px; color: #139639; font-weight: 600;">Kind regards,</p>
                    <p style="margin: 0;">
                        <span style="color: #267FBA; font-weight: 700;">Dalia Elsadany</span>
                        <span style="color: #333;"> | </span>
                        <span style="color: #139639; font-weight: 600;">HR &amp; Recruitment Manager</span>
                        <span style="color: #333;"> For and on behalf of </span>
                        <span style="color: #139639; font-weight: 600;">Lets Care All</span>
                        <span style="color: #333;"> | </span>
                        <a href="tel:+442038024114" style="color: #267FBA; text-decoration: none; font-weight: 600;">+44 (0) 20 3802 4114</a>
                        <span style="color: #333;"> | </span>
                        <a href="https://www.letscareall.org.uk" style="color: #267FBA; text-decoration: none; font-weight: 600;">www.letscareall.org.uk</a>
                    </p>
                    <p style="font-size: 11px; color: #333; margin-top: 12px;">
                        <strong>Lets Care All LTD. is a limited company registered in England and Wales with a registered number: 10468582. Registered office: Fairlawn, First Floor Office High Street, Southall, England, UB1 3HB.</strong>
                    </p>
                </div>
            `;

        const mailOptions = {
            from: `"Lets Care All" <${process.env.EMAIL_USER || 'hr@letscareall.co.uk'}>`,
            to: toEmail,
            subject: isPersonal
                ? 'Character Reference Request'
                : 'Professional Reference Request',
            html: isPersonal ? personalHtml : professionalHtml,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Reference link email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending reference link email:', error);
            throw new Error('Failed to send reference link email');
        }
    }

    async sendReferenceReminderEmail(
        toEmail: string,
        referenceUrl: string,
        candidateName: string,
        referenceType: string,
        reminderNumber: number,
    ) {
        const mailOptions = {
            from: `"Lets Care All" <${process.env.EMAIL_USER || 'hr@letscareall.co.uk'}>`,
            to: toEmail,
            subject: 'Reference Request \u2013 Reminder',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #139639 0%, #0e7a2d 100%); padding: 20px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">LETS CARE ALL</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Reference Request &ndash; Reminder</p>
                    </div>
                    
                    <p>Dear Sir/Madam,</p>
                    
                    <p>We recently contacted you about providing a reference for <strong>${candidateName}</strong>, but we have yet to receive your response. This is reminder ${reminderNumber} of 4.</p>
                    
                    <p>We appreciate your attention to this request. Should you have any questions, do not hesitate to contact us.</p>
                    
                    <p>I would be grateful if you could complete the reference at your earliest convenience.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${referenceUrl}" 
                           style="display: inline-block; background: #139639; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Complete Reference Form
                        </a>
                    </div>
                    
                    <p style="margin-top: 30px;">Thank you in advance for your assistance.</p>
                    
                    <p style="margin-top: 30px; color: #139639; font-weight: 600;">Kind regards,</p>
                    <p style="margin: 0;">
                        <span style="color: #267FBA; font-weight: 700;">Dalia Elsadany</span>
                        <span style="color: #333;"> | </span>
                        <span style="color: #139639; font-weight: 600;">HR &amp; Recruitment Manager</span>
                        <span style="color: #333;"> For and on behalf of </span>
                        <span style="color: #139639; font-weight: 600;">Lets Care All</span>
                        <span style="color: #333;"> | </span>
                        <a href="tel:+442038024114" style="color: #267FBA; text-decoration: none; font-weight: 600;">+44 (0) 20 3802 4114</a>
                        <span style="color: #333;"> | </span>
                        <a href="https://www.letscareall.org.uk" style="color: #267FBA; text-decoration: none; font-weight: 600;">www.letscareall.org.uk</a>
                    </p>
                    <p style="font-size: 11px; color: #333; margin-top: 12px;">
                        <strong>Lets Care All LTD. is a limited company registered in England and Wales with a registered number: 10468582. Registered office: Fairlawn, First Floor Office High Street, Southall, England, UB1 3HB.</strong>
                    </p>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`Reference reminder email #${reminderNumber} sent: %s`, info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending reference reminder email:', error);
            throw new Error('Failed to send reference reminder email');
        }
    }

    async sendReviewScheduleEmail(
        toEmail: string,
        payload: {
            formType: string;
            staffName: string;
            reviewDate: string;
            notes?: string;
        },
    ) {
        const formLabel =
            payload.formType === 'appraisal'
                ? 'Appraisal'
                : payload.formType === 'supervision'
                  ? 'Supervision'
                  : 'Review';

        const mailOptions = {
            from: `"Lets Care All" <${process.env.EMAIL_USER || 'hr@letscareall.co.uk'}>`,
            to: toEmail,
            subject: `${formLabel} scheduled - Lets Care All`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #139639 0%, #0e7a2d 100%); padding: 20px; text-align: center; margin-bottom: 24px;">
                        <h1 style="color: white; margin: 0; font-size: 22px;">LETS CARE ALL</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0 0;">${formLabel} Scheduled</p>
                    </div>
                    <p>Hello ${payload.staffName},</p>
                    <p>Your <strong>${formLabel.toLowerCase()}</strong> has been scheduled for <strong>${payload.reviewDate}</strong>.</p>
                    ${
                        payload.notes
                            ? `<p><strong>Notes:</strong><br/>${payload.notes.replace(/\n/g, '<br/>')}</p>`
                            : ''
                    }
                    <p>Please log in to the HR platform for full details.</p>
                    <p style="margin-top: 24px;">Regards,<br/><strong>Lets Care All HR Team</strong></p>
                </div>
            `,
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Review schedule email sent: %s', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending review schedule email:', error);
            throw new Error('Failed to send review schedule email');
        }
    }
}
