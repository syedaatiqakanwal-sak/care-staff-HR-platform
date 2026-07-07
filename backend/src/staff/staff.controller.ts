import { Controller, Get, Put, Post, Delete, Body, UseGuards, Request, Param, ForbiddenException, Res, Query, UseInterceptors, UploadedFile, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { StaffService } from './staff.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtOrApiTokenGuard } from './jwt-or-api-token.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { CreateReviewFormDto } from './dto/create-review-form.dto';
import { CreateAddressDto } from './dto/create-address.dto';
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
    constructor(
        private staffService: StaffService,
        private jwtService: JwtService,
    ) { }

    @Get('me')
    @Roles(UserRole.STAFF)
    getMyProfile(@Request() req) {
        return this.staffService.getProfileByUserId(req.user.userId);
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
        const { employmentStatus, ilccsNumber, lcaNumber, inductionDate, rapidInductionDate, role, ...allowed } = body as any;
        return this.staffService.updateProfileByUserId(req.user.userId, allowed);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.STAFF) // Allow both to hit endpoint
    async getProfileById(@Param('id') id: string, @Request() req) {
        // Access Control Logic
        // We assume :id is the USER ID (consistent with Dashboard and isSelf check)
        const loggedInUser = req.user;
        
        // Get requested staff profile to get staffId
        const requestedProfile = await this.staffService.getProfileByUserId(id);
        const staffId = requestedProfile.id;
        
        if (loggedInUser.role !== 'ADMIN') {
            // Get logged-in user's staff profile to get their staffId
            const loggedInProfile = await this.staffService.getProfileByUserId(loggedInUser.userId);
            if (loggedInProfile.id !== staffId) {
                throw new ForbiddenException('Aap doosron ka data nahi dekh sakte!');
            }
        }

        // Use ByUserId for both Admin and Self (if accessing via ID)
        return requestedProfile;
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    updateProfileById(@Param('id') id: string, @Body() body: UpdateStaffDto) {
        return this.staffService.updateProfileByUserId(id, body);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    getAllStaff() {
        return this.staffService.findAll();
    }

    @Get('stats')
    @Roles(UserRole.ADMIN)
    async getStats() {
        return this.staffService.getStats();
    }

    // --- Address History Endpoints ---

    @Get(':id/addresses')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    getAddresses(@Param('id') id: string, @Request() req) {
        // Access Control
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.getAddresses(id);
    }

    @Post(':id/addresses')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    addAddress(@Param('id') id: string, @Body() body: CreateAddressDto, @Request() req) {
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.addAddress(id, body);
    }

    @Delete(':id/addresses/:addressId')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    removeAddress(@Param('id') id: string, @Param('addressId') addressId: string, @Request() req) {
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.removeAddress(id, addressId);
    }

    // --- Review Form Endpoints ---

    @Post(':id/review-forms')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    createReviewForm(@Param('id') id: string, @Body() body: CreateReviewFormDto, @Request() req) {
        // Access Control: Staff can only create forms for themselves
        const isSelf = req.user.userId === id;
        // Normalize role comparison (handle both uppercase and lowercase)
        const userRole = typeof req.user.role === 'string' ? req.user.role.toUpperCase() : req.user.role;
        const isAdmin = userRole === UserRole.ADMIN || userRole === 'ADMIN';
        if (!isAdmin && !isSelf) {
            throw new ForbiddenException('You can only create review forms for yourself.');
        }

        // id is userId, need to get staffProfile id
        return this.staffService.getProfileByUserId(id).then(profile => {
            return this.staffService.createReviewForm(profile.id, body);
        });
    }

    @Get(':id/review-forms')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    getReviewForms(@Param('id') id: string, @Request() req) {
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) throw new ForbiddenException('Access denied');

        return this.staffService.getProfileByUserId(id).then(profile => {
            return this.staffService.getReviewFormsByStaffId(profile.id);
        });
    }

    @Get('review-forms/:formId')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    async getReviewForm(@Param('formId') formId: string, @Request() req) {
        const form = await this.staffService.getReviewFormById(formId);
        // Staff can only view their own review forms
        if (req.user.role !== UserRole.ADMIN) {
            const profile = await this.staffService.getProfileByUserId(req.user.userId);
            if (form.staff && form.staff.id !== profile.id) {
                throw new ForbiddenException('Access denied');
            }
        }
        return form;
    }

    @Put('review-forms/:formId')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    updateReviewForm(@Param('formId') formId: string, @Body() body: Partial<CreateReviewFormDto>, @Request() req) {
        return this.staffService.updateReviewForm(formId, body, req.user);
    }

    @Delete('review-forms/:formId')
    @Roles(UserRole.ADMIN)
    deleteReviewForm(@Param('formId') formId: string) {
        return this.staffService.deleteReviewForm(formId);
    }

    // --- Admin: Delete Staff/User ---
    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    async deleteStaffUser(@Param('id') id: string) {
        await this.staffService.deleteUserCompletely(id);
        return;
    }

    // --- Monthly Report Endpoint ---
    @Get(':id/monthly-report')
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    async downloadMonthlyReport(
        @Param('id') id: string,
        @Query('year') year: string,
        @Query('month') month: string,
        @Request() req,
        @Res() res: Response,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) {
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
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    async downloadEnrollmentCompletionReport(
        @Param('id') id: string,
        @Request() req,
        @Res() res: Response,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) {
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
    @Roles(UserRole.ADMIN, UserRole.STAFF)
    async downloadYearlyReport(
        @Param('id') id: string,
        @Query('year') year: string,
        @Request() req,
        @Res() res: Response,
    ) {
        // Access Control
        const isSelf = req.user.userId === id;
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) {
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
    @Roles(UserRole.ADMIN, UserRole.STAFF)
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
        const isAdmin = req.user.role === UserRole.ADMIN;
        if (!isAdmin && !isSelf) {
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
