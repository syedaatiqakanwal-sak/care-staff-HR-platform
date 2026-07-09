import {
    Controller,
    Get,
    Put,
    Patch,
    Post,
    Delete,
    Body,
    UseGuards,
    Request,
    Param,
    ForbiddenException,
    Res,
    Query,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
    Logger,
    HttpException,
    InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { StaffService } from './staff.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';
import { clientIpFromRequest } from '../audit/audit-request.util';
import { AuthGuard } from '@nestjs/passport';
import { JwtOrApiTokenGuard } from './jwt-or-api-token.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import {
    DASHBOARD_ROLES,
    MANAGEMENT_ROLES,
    canEditOtherStaffProfiles,
    canViewOtherStaffProfiles,
} from '../users/role.utils';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateReviewFormDto } from './dto/create-review-form.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { LinkAddressProofDto } from './dto/link-address-proof.dto';
import { HttpCode } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import * as path from 'path';

type UploadedImageFile = {
    filename: string;
    mimetype: string;
    originalname: string;
    path: string;
    size: number;
};

@Controller('staff')
@UseGuards(JwtOrApiTokenGuard, RolesGuard)
export class StaffController {
    private readonly logger = new Logger(StaffController.name);

    constructor(
        private staffService: StaffService,
        private jwtService: JwtService,
        private audit: AuditService,
    ) { }

    @Get('me')
    @Roles(UserRole.STAFF)
    async getMyProfile(@Request() req) {
        if (!req.user?.userId) {
            throw new UnauthorizedException('Authentication required');
        }
        try {
            return await this.staffService.getProfileByUserId(req.user.userId);
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`GET /staff/me failed for user ${req.user.userId}`, error instanceof Error ? error.stack : error);
            throw new InternalServerErrorException('Failed to load staff profile');
        }
    }

    @Put('me')
    @Roles(UserRole.STAFF)
    updateMyProfile(@Request() req, @Body() body: UpdateStaffDto) {
        // ValidationPipe will whitelist only allowed fields from DTO
        // Check for disallowed fields for Staff logic if needed, but DTO handles structure.
        // For 'me', maybe we restrict some fields?
        // Previously we stripped employmentStatus, ilccsNumber, etc.
        // We can create a separate UpdateStaffSelfDto if we want restricted access, 
        // or just manually strip the sensitive ones again if using the same DTO.

        // Let's strip sensitive admin-only fields for self-update:
        const { employmentStatus, ilccsNumber, lcaNumber, startDate, inductionDate, rapidInductionDate, role, ...allowed } = body as any;
        return this.staffService.updateProfileByUserId(req.user.userId, allowed);
    }

    @Get(':id')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    async getProfileById(@Param('id') id: string, @Request() req) {
        // :id is the USER id (see dashboard stats — staff.id === users.id)
        const loggedInUser = req.user;
        if (!loggedInUser?.userId) {
            throw new UnauthorizedException('Authentication required');
        }

        try {
            const requestedProfile = await this.staffService.getProfileByUserId(id);
            if (!requestedProfile) {
                throw new NotFoundException('Staff not found');
            }

            const staffId = requestedProfile.id;
            const canViewOthers = canViewOtherStaffProfiles(loggedInUser.role);

            if (!canViewOthers) {
                const loggedInProfile = await this.staffService.getProfileByUserId(loggedInUser.userId);
                if (!loggedInProfile || loggedInProfile.id !== staffId) {
                    throw new ForbiddenException('Aap doosron ka data nahi dekh sakte!');
                }
            }

            return requestedProfile;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(
                `GET /staff/${id} failed`,
                error instanceof Error ? error.stack : error,
            );
            throw new InternalServerErrorException('Failed to load staff profile');
        }
    }

    @Put(':id')
    @Roles(...MANAGEMENT_ROLES)
    updateProfileById(@Param('id') id: string, @Body() body: UpdateStaffDto) {
        return this.staffService.updateProfileByUserId(id, body);
    }

    @Get()
    @Roles(...DASHBOARD_ROLES)
    getAllStaff() {
        return this.staffService.findAll();
    }

    @Get('stats')
    @Roles(...DASHBOARD_ROLES)
    async getStats() {
        return this.staffService.getStats();
    }

    // --- Address History Endpoints ---

    @Get(':id/addresses')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    getAddresses(@Param('id') id: string, @Request() req) {
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.getAddresses(id);
    }

    @Post(':id/addresses')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    addAddress(@Param('id') id: string, @Body() body: CreateAddressDto, @Request() req) {
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.addAddress(id, body);
    }

    @Delete(':id/addresses/:addressId')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    removeAddress(@Param('id') id: string, @Param('addressId') addressId: string, @Request() req) {
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.removeAddress(id, addressId);
    }

    @Patch(':id/addresses/:addressId')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    updateAddress(
        @Param('id') id: string,
        @Param('addressId') addressId: string,
        @Body() body: UpdateAddressDto,
        @Request() req,
    ) {
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.updateAddress(id, addressId, body);
    }

    @Put(':id/addresses/:addressId/proof')
    @Roles(...MANAGEMENT_ROLES)
    linkAddressProof(
        @Param('id') id: string,
        @Param('addressId') addressId: string,
        @Body() body: LinkAddressProofDto,
        @Request() req,
    ) {
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && req.user.userId !== id) {
            throw new ForbiddenException('Access denied');
        }
        return this.staffService.linkAddressProof(id, addressId, body.proofDocumentId);
    }

    // --- Review Form Endpoints ---

    @Post(':id/review-forms')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    createReviewForm(@Param('id') id: string, @Body() body: CreateReviewFormDto, @Request() req) {
        const isSelf = req.user.userId === id;
        const canManageOthers = canEditOtherStaffProfiles(req.user.role);
        if (!canManageOthers && !isSelf) {
            throw new ForbiddenException('You can only create review forms for yourself.');
        }

        // id is userId, need to get staffProfile id
        return this.staffService.getProfileByUserId(id).then(profile => {
            return this.staffService.createReviewForm(profile.id, body);
        });
    }

    @Get(':id/review-forms')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    getReviewForms(@Param('id') id: string, @Request() req) {
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.getProfileByUserId(id).then(profile => {
            return this.staffService.getReviewFormsByStaffId(profile.id);
        });
    }

    @Get('review-forms/:formId')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    async getReviewForm(@Param('formId') formId: string, @Request() req) {
        const form = await this.staffService.getReviewFormById(formId);
        if (!canViewOtherStaffProfiles(req.user.role)) {
            const profile = await this.staffService.getProfileByUserId(req.user.userId);
            if (form.staff && form.staff.id !== profile.id) {
                throw new ForbiddenException('Access denied');
            }
        }
        return form;
    }

    @Put('review-forms/:formId')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    updateReviewForm(@Param('formId') formId: string, @Body() body: Partial<CreateReviewFormDto>, @Request() req) {
        return this.staffService.updateReviewForm(formId, body, req.user);
    }

    @Delete('review-forms/:formId')
    @Roles(...MANAGEMENT_ROLES)
    deleteReviewForm(@Param('formId') formId: string) {
        return this.staffService.deleteReviewForm(formId);
    }

    // --- Admin: Delete Staff/User ---
    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    async deleteStaffUser(@Param('id') id: string, @Request() req) {
        await this.staffService.deleteUserCompletely(id);
        await this.audit.log({
            userId: req.user.userId,
            userRole: req.user.role,
            action: AuditAction.DELETE,
            entityType: 'user',
            entityId: id,
            summary: `Deleted staff user ${id} and dependent records`,
            ipAddress: clientIpFromRequest(req),
        });
        return;
    }

    // --- Monthly Report Endpoint ---
    @Get(':id/monthly-report')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    async downloadMonthlyReport(
        @Param('id') id: string,
        @Query('year') year: string,
        @Query('month') month: string,
        @Request() req,
        @Res() res: Response,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) {
            throw new ForbiddenException('Access denied');
        }

        // Get profile to access staffId
        const profile = await this.staffService.getProfileByUserId(id);
        
        // Parse year and month (default to current month if not provided)
        const reportYear = year ? parseInt(year, 10) : new Date().getFullYear();
        const reportMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;

        // Validate month
        if (reportMonth < 1 || reportMonth > 12) {
            throw new Error('Invalid month. Must be between 1 and 12.');
        }

        // Generate PDF
        const pdfBuffer = await this.staffService.generateMonthlyReport(profile.id, reportYear, reportMonth);

        // Set response headers (sanitize filename to prevent header injection)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[reportMonth - 1];
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `Monthly_Report_${sanitize(profile.firstName)}_${sanitize(profile.lastName ?? '')}_${monthName}_${reportYear}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    }

    @Get(':id/enrollment-completion-report')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    async downloadEnrollmentCompletionReport(
        @Param('id') id: string,
        @Request() req,
        @Res() res: Response,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) {
            throw new ForbiddenException('Access denied');
        }

        // Get profile to access staffId
        const profile = await this.staffService.getProfileByUserId(id);

        // Generate PDF
        const pdfBuffer = await this.staffService.generateEnrollmentCompletionReport(profile.id);

        // Set response headers
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `Enrollment_Completion_Report_${sanitize(profile.firstName)}_${sanitize(profile.lastName ?? '')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    }

    @Get(':id/yearly-report')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    async downloadYearlyReport(
        @Param('id') id: string,
        @Query('year') year: string,
        @Request() req,
        @Res() res: Response,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) {
            throw new ForbiddenException('Access denied');
        }

        // Get profile to access staffId
        const profile = await this.staffService.getProfileByUserId(id);
        
        // Parse year (default to current year if not provided)
        const reportYear = year ? parseInt(year, 10) : new Date().getFullYear();

        // Generate PDF
        const pdfBuffer = await this.staffService.generateYearlyReport(profile.id, reportYear);

        // Set response headers
        const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `Yearly_Report_${sanitize(profile.firstName)}_${sanitize(profile.lastName ?? '')}_${reportYear}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    }

    // --- Profile Picture Upload Endpoint ---
    @Post(':id/profile-picture')
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, cb) => {
                    const uploadDir = `uploads/profile-pictures`;
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    cb(null, uploadDir);
                },
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, `${req.params.id}-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
            },
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                    return cb(new BadRequestException('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
        })
    )
    async uploadProfilePicture(
        @Param('id') id: string,
        @Request() req,
        @UploadedFile() file: UploadedImageFile,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const canViewOthers = canViewOtherStaffProfiles(req.user.role);
        if (!canViewOthers && !isSelf) {
            throw new ForbiddenException('You can only upload your own profile picture.');
        }

        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // File validation - only images allowed for profile pictures
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
        const fileExt = path.extname(file.originalname).toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
            throw new BadRequestException('Only image files are allowed for profile pictures!');
        }

        if (file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('File must not exceed 5MB!');
        }

        // Get profile to access staffId
        const profile = await this.staffService.getProfileByUserId(id);
        
        // Delete old profile picture if exists
        if (profile.profilePicture) {
            const oldPath = profile.profilePicture.startsWith('/') 
                ? profile.profilePicture 
                : path.join(process.cwd(), profile.profilePicture);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Update profile with new picture path (store relative path from project root)
        const relativePath = file.path.startsWith(process.cwd())
            ? file.path.replace(process.cwd() + path.sep, '').replace(/\\/g, '/')
            : file.path.replace(/\\/g, '/');
        await this.staffService.updateProfileByUserId(id, { profilePicture: relativePath });

        return {
            success: true,
            message: 'Profile picture uploaded successfully',
            path: `/api/v1/staff/${id}/profile-picture`,
        };
    }

    // --- Profile Picture Get Endpoint ---
    @Get(':id/profile-picture')
    async getProfilePicture(@Param('id') id: string, @Request() req, @Query('token') token: string, @Res() res: Response) {
        // Allow access for authenticated users (both admin and staff can view any profile picture)
        // Support both Authorization header and query token for <img src="..."> usage.
        const authHeader = req.headers?.authorization as string | undefined;
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
        const rawToken = bearerToken || token;
        if (!rawToken) {
            throw new UnauthorizedException('Authentication required');
        }
        try {
            this.jwtService.verify(rawToken);
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
        
        const profile = await this.staffService.getProfileByUserId(id);
        
        if (!profile.profilePicture) {
            return res.status(404).json({ message: 'Profile picture not found' });
        }

        // Construct full path and validate it's within allowed directory
        const uploadsBase = path.resolve(process.cwd(), 'uploads', 'profile-pictures');
        const filePath = path.resolve(
            profile.profilePicture.startsWith('/')
                ? profile.profilePicture
                : path.join(process.cwd(), profile.profilePicture)
        );

        // Prevent path traversal: ensure resolved path is within uploads directory
        if (!filePath.startsWith(uploadsBase)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Profile picture file not found' });
        }

        // Set proper content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        return res.sendFile(filePath);
    }
}
