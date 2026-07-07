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
            from: `"CPD Platform" <${process.env.EMAIL_USER}>`,
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
        
        const mailOptions = {
            from: `"CPD Platform" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `${referenceTypeLabel} Request - Lets Care All`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #00659D 0%, #004576 100%); padding: 20px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">LETS CARE ALL</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">${referenceTypeLabel} Request</p>
                    </div>
                    
                    <p>Dear Sir/Madam,</p>
                    
                    <p>You have been listed as a reference for <strong>${candidateName}</strong> who has applied for a position with Lets Care All.</p>
                    
                    <p>We would be grateful if you could complete the reference form using the secure link below. Your response will be kept in line with Data Protection Policies and the General Data Protection Regulations.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${referenceUrl}" 
                           style="display: inline-block; background: #00659D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Complete Reference Form
                        </a>
                    </div>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">
                        <strong>Note:</strong> This link will expire in 14 days. If you have any questions or concerns, please contact the HR team.
                    </p>
                    
                    <p style="margin-top: 30px;">Thank you for your cooperation.</p>
                    
                    <p>Best regards,<br>
                    <strong>Lets Care All HR Team</strong></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="font-size: 11px; color: #999; text-align: center;">
                        This is an automated email. Please do not reply to this message.
                    </p>
                </div>
            `,
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
        const referenceTypeLabel = referenceType === 'personal' ? 'Character Reference' : 'Professional Reference';
        
        const mailOptions = {
            from: `"CPD Platform" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Reminder: ${referenceTypeLabel} Request for ${candidateName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px;">
                    <div style="background: linear-gradient(135deg, #00659D 0%, #004576 100%); padding: 20px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">LETS CARE ALL</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Reference Request Reminder</p>
                    </div>
                    
                    <p>Dear Sir/Madam,</p>
                    
                    <p>This is a <strong>reminder</strong> that you have been listed as a reference for <strong>${candidateName}</strong> who has applied for a position with Lets Care All.</p>
                    
                    <p>We would be grateful if you could complete the reference form using the secure link below. Your response will be kept in line with Data Protection Policies and the General Data Protection Regulations.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${referenceUrl}" 
                           style="display: inline-block; background: #00659D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                            Complete Reference Form
                        </a>
                    </div>
                    
                    <p style="font-size: 12px; color: #666; margin-top: 20px;">
                        <strong>Note:</strong> This link will expire in 14 days. If you have any questions or concerns, please contact the HR team.
                    </p>
                    
                    <p style="margin-top: 30px;">Thank you for your cooperation.</p>
                    
                    <p>Best regards,<br>
                    <strong>Lets Care All HR Team</strong></p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="font-size: 11px; color: #999; text-align: center;">
                        This is an automated reminder email. Please do not reply to this message.
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
}
