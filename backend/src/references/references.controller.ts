import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ForbiddenException, HttpException, HttpStatus, Ip, Res, UnauthorizedException } from '@nestjs/common';
import { ReferencesService } from './references.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { MANAGEMENT_ROLES, canViewOtherStaffProfiles } from '../users/role.utils';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import type { Response } from 'express';

@Controller('references')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReferencesController {
    constructor(private readonly referencesService: ReferencesService) { }

    @Post('send')
    async send(
        @Body() body: {
            staffId: string;
            referenceType: string;
            name: string;
            email: string;
            phone?: string;
            relationship?: string;
            yearsKnown?: string;
            message?: string;
        },
        @Req() req: any,
    ) {
        try {
            // Extract base URL from request headers as fallback
            let requestBaseUrl = '';
            const origin = req.headers?.origin;
            const referer = req.headers?.referer;
            
            if (origin) {
                requestBaseUrl = origin;
            } else if (referer) {
                try {
                    const url = new URL(referer);
                    requestBaseUrl = `${url.protocol}//${url.host}`;
                } catch {
                    // Invalid referer, ignore
                }
            } else if (req.headers?.host) {
                // Fallback to constructing from request
                const protocol = req.protocol || (req.secure ? 'https' : 'http');
                requestBaseUrl = `${protocol}://${req.headers.host}`;
            }

            // Use new secure link method instead of PDF attachment
            const reference = await this.referencesService.sendReferenceWithSecureLink(body, requestBaseUrl);
            return { success: true, reference };
        } catch (error: any) {
            // Return error with proper HTTP status code
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to send reference request',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('analytics')
    @Roles(...MANAGEMENT_ROLES)
    async getAnalytics() {
        try {
            const analytics = await this.referencesService.getAnalytics();
            return { success: true, analytics };
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to fetch analytics',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('analytics/all')
    @Roles(...MANAGEMENT_ROLES)
    async getAllReferencesForAnalytics() {
        try {
            const references = await this.referencesService.getAllReferencesForAnalytics();
            return { success: true, references };
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to fetch references',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('process-reminders')
    @Roles(...MANAGEMENT_ROLES)
    async processReminders(@Req() req: any) {
        try {
            // Extract base URL from request headers as fallback
            let requestBaseUrl = '';
            const origin = req.headers?.origin;
            const referer = req.headers?.referer;
            
            if (origin) {
                requestBaseUrl = origin;
            } else if (referer) {
                try {
                    const url = new URL(referer);
                    requestBaseUrl = `${url.protocol}//${url.host}`;
                } catch {
                    // Invalid referer, ignore
                }
            } else if (req.headers?.host) {
                const protocol = req.protocol || (req.secure ? 'https' : 'http');
                requestBaseUrl = `${protocol}://${req.headers.host}`;
            }

            const result = await this.referencesService.processAutomatedReminders(requestBaseUrl);
            return {
                success: true,
                message: `Reminder processing completed. Reviewed ${result.totalCandidates || 0} references, qualified ${result.processed}, sent ${result.sent}, errors: ${result.errors}`,
                result,
            };
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to process reminders',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('send-reminders-opened')
    @Roles(...MANAGEMENT_ROLES)
    async sendRemindersToOpenedNotSubmitted(@Req() req: any) {
        try {
            // Extract base URL from request headers as fallback
            let requestBaseUrl = '';
            const origin = req.headers?.origin;
            const referer = req.headers?.referer;
            
            if (origin) {
                requestBaseUrl = origin;
            } else if (referer) {
                try {
                    const url = new URL(referer);
                    requestBaseUrl = `${url.protocol}//${url.host}`;
                } catch {
                    // Invalid referer, ignore
                }
            } else if (req.headers?.host) {
                const protocol = req.protocol || (req.secure ? 'https' : 'http');
                requestBaseUrl = `${protocol}://${req.headers.host}`;
            }

            const result = await this.referencesService.sendManualReminders(requestBaseUrl);
            return {
                success: true,
                message: `Manual reminders completed. Reviewed ${result.totalCandidates || 0} references, qualified ${result.processed}, sent ${result.sent}, errors: ${result.errors}`,
                result,
            };
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to send reminders',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Patch(':id')
    @Roles(...MANAGEMENT_ROLES)
    update(@Param('id') id: string, @Body() body) {
        return this.referencesService.update(id, body);
    }

    @Delete(':id')
    @Roles(...MANAGEMENT_ROLES)
    remove(@Param('id') id: string) {
        return this.referencesService.remove(id);
    }

    @Get(':id')
    @Roles(...MANAGEMENT_ROLES)
    async getReference(@Param('id') id: string) {
        try {
            const reference = await this.referencesService.findOne(id);
            if (!reference) {
                throw new HttpException(
                    {
                        success: false,
                        message: 'Reference not found',
                    },
                    HttpStatus.NOT_FOUND
                );
            }
            // Ensure all fields are included, especially submissionData
            return { 
                success: true, 
                reference: {
                    ...reference,
                    submissionData: reference.submissionData || null,
                }
            };
        } catch (error: any) {
            // Log the error for debugging
            console.error(`[GET Reference] Error fetching reference ${id}:`, error);
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to fetch reference',
                    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get(':id/download')
    @Roles(...MANAGEMENT_ROLES)
    async downloadReferencePDF(@Param('id') id: string, @Res() res: Response) {
        try {
            const pdfBuffer = await this.referencesService.generateSubmittedReferencePDF(id);
            
            const reference = await this.referencesService.findOne(id);
            const candidateName = reference?.staff 
                ? `${reference.staff.firstName || ''} ${reference.staff.middleName || ''} ${reference.staff.lastName || ''}`.trim().replace(/\s+/g, '_')
                : 'Unknown';
            const refName = reference?.name?.replace(/\s+/g, '_') || 'Unknown';
            const dateStr = reference?.submittedAt 
                ? new Date(reference.submittedAt).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Reference_${candidateName}_${refName}_${dateStr}.pdf"`);
            res.send(pdfBuffer);
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to generate PDF',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post(':id/remind')
    @Roles(...MANAGEMENT_ROLES)
    async sendReminder(
        @Param('id') id: string,
        @Req() req: any,
    ) {
        try {
            // Extract base URL from request headers as fallback
            let requestBaseUrl = '';
            const origin = req.headers?.origin;
            const referer = req.headers?.referer;
            
            if (origin) {
                requestBaseUrl = origin;
            } else if (referer) {
                try {
                    const url = new URL(referer);
                    requestBaseUrl = `${url.protocol}//${url.host}`;
                } catch {
                    // Invalid referer, ignore
                }
            } else if (req.headers?.host) {
                const protocol = req.protocol || (req.secure ? 'https' : 'http');
                requestBaseUrl = `${protocol}://${req.headers.host}`;
            }

            // Try new secure link method first, fallback to legacy if no token
            try {
                return await this.referencesService.sendReminderWithSecureLink(id, requestBaseUrl);
            } catch (error: any) {
                // Fallback to legacy PDF method if token doesn't exist
                if (error.message?.includes('secure token')) {
                    return await this.referencesService.sendReminder(id);
                }
                throw error;
            }
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to send reminder',
                },
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

// Public controller for reference submission (no auth required)
@Controller('reference')
export class ReferenceSubmissionController {
    constructor(private readonly referencesService: ReferencesService) { }

    // Alias route for convenience: GET /api/v1/reference/:token
    @Public()
    @Get(':token')
    async getReferenceFormByToken(@Param('token') token: string, @Ip() ipAddress: string) {
        return this.getReferenceForm(token, ipAddress);
    }

    @Public()
    @Get('submit/:token')
    async getReferenceForm(@Param('token') token: string, @Ip() ipAddress: string) {
        try {
            const reference = await this.referencesService.validateAndOpenToken(token, ipAddress);
            
            // Return reference data for form rendering
            const staff = await (this.referencesService as any).staffRepository.findOne({
                where: { id: reference.staffId },
                relations: ['user'],
            });
            const candidateName = staff
                ? `${staff.firstName || ''} ${staff.middleName || ''} ${staff.lastName || ''}`.trim()
                : 'N/A';

            return {
                success: true,
                reference: {
                    id: reference.id,
                    token: reference.token,
                    referenceType: reference.referenceType,
                    candidateName,
                    name: reference.name,
                    email: reference.email,
                    status: reference.status,
                },
            };
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Invalid or expired reference link',
                },
                error.status || HttpStatus.BAD_REQUEST
            );
        }
    }

    @Public()
    @Post('submit/:token')
    async submitReference(
        @Param('token') token: string,
        @Body() submissionData: any,
        @Ip() ipAddress: string,
    ) {
        try {
            const reference = await this.referencesService.submitReference(token, submissionData, ipAddress);
            return {
                success: true,
                message: 'Thank you. Your reference has been successfully submitted.',
                reference: {
                    id: reference.id,
                    status: reference.status,
                    submittedAt: reference.submittedAt,
                },
            };
        } catch (error: any) {
            throw new HttpException(
                {
                    success: false,
                    message: error.message || 'Failed to submit reference',
                },
                error.status || HttpStatus.BAD_REQUEST
            );
        }
    }
}

@Controller('staff/:staffId/references')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StaffReferencesController {
    constructor(private readonly referencesService: ReferencesService) { }

    @Post()
    @Roles(...MANAGEMENT_ROLES)
    create(@Param('staffId') staffId: string, @Body() body) {
        return this.referencesService.create({
            ...body,
            staffId: staffId,
        });
    }

    @Get('received')
    async findReceived(@Param('staffId') staffId: string, @Req() req) {
        const user = req.user;
        const resolvedStaffId = await this.referencesService.resolveStaffProfileId(staffId);
        if (!canViewOtherStaffProfiles(user.role)) {
            const isOwner = await this.referencesService.verifyStaffOwnership(resolvedStaffId, user.userId);
            if (!isOwner) {
                throw new ForbiddenException('You can only view your own references');
            }
        }
        return this.referencesService.findReceived(resolvedStaffId);
    }

    @Get()
    async findAll(@Param('staffId') staffId: string, @Req() req) {
        const user = req.user;
        if (!canViewOtherStaffProfiles(user.role)) {
            const isOwner = await this.referencesService.verifyStaffOwnership(staffId, user.userId);
            if (!isOwner) {
                throw new ForbiddenException('You can only view your own references');
            }
        }

        return this.referencesService.findAll(staffId);
    }
}
