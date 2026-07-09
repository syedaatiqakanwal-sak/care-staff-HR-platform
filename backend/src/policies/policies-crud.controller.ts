import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { DASHBOARD_ROLES, MANAGEMENT_ROLES } from '../users/role.utils';
import { PoliciesCrudService } from './policies-crud.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';

type UploadedPdfFile = {
  filename: string;
  mimetype: string;
  originalname: string;
  size: number;
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

@Controller('policies')
export class PoliciesCrudController {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'policies');

  constructor(
    private policiesCrudService: PoliciesCrudService,
    private jwtService: JwtService,
  ) {
    ensureDir(this.uploadsDir);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  list(@Request() req) {
    return this.policiesCrudService.listPoliciesForRole(req.user.role);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  @Roles(...MANAGEMENT_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'policies')),
        filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.includes('pdf')) return cb(new BadRequestException('Only PDF files allowed') as any, false);
        cb(null, true);
      },
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  create(@Request() req, @Body() dto: CreatePolicyDto, @UploadedFile() file: UploadedPdfFile) {
    if (!file) throw new BadRequestException('PDF file is required');
    
    // File validation
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      throw new BadRequestException('Sirf PDF aur images allowed hain!');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File 5MB se bari nahi honi chahiye!');
    }
    
    return this.policiesCrudService.createPolicy(req.user.userId, dto, file as any);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @Roles(...MANAGEMENT_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'policies')),
        filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.includes('pdf')) return cb(new BadRequestException('Only PDF files allowed') as any, false);
        cb(null, true);
      },
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  update(@Param('id') id: string, @Body() dto: UpdatePolicyDto, @UploadedFile() file?: UploadedPdfFile) {
    // File validation (only if file is provided)
    if (file) {
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileExt = path.extname(file.originalname).toLowerCase();

      if (!allowedTypes.includes(fileExt)) {
        throw new BadRequestException('Sirf PDF aur images allowed hain!');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('File 5MB se bari nahi honi chahiye!');
      }
    }
    
    return this.policiesCrudService.updatePolicy(id, dto, file as any);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @Roles(...MANAGEMENT_ROLES)
  remove(@Param('id') id: string) {
    return this.policiesCrudService.deletePolicy(id);
  }

  // --- Secure PDF Viewing ---

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/file')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  async file(
    @Param('id') id: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const policy = await this.policiesCrudService.getPolicyOrThrow(id);
    const userRole = String(req.user.role || '').toUpperCase();
    if (userRole === UserRole.STAFF && !policy.isActive) {
      throw new BadRequestException('Policy not active');
    }

    const absPath = this.policiesCrudService.resolvePolicyFilePath(policy);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${policy.title.replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60)}.pdf"`,
    );
    fs.createReadStream(absPath).pipe(res);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/view-token')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  async viewToken(@Param('id') id: string, @Request() req) {
    // Validate policy exists (and active if staff)
    const policy = await this.policiesCrudService.getPolicyOrThrow(id);
    if (req.user.role === UserRole.STAFF && !policy.isActive) {
      throw new BadRequestException('Policy not active');
    }

    const token = this.jwtService.sign(
      {
        policyId: id,
        userId: req.user.userId,
        role: req.user.role,
      },
      { expiresIn: '60s' },
    );

    return { token };
  }

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
    if (!token) throw new BadRequestException('token required');
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException('invalid token');
    }
    if (payload.policyId !== id) throw new BadRequestException('token mismatch');

    const policy = await this.policiesCrudService.getPolicyOrThrow(id);
    const payloadRole = String(payload.role || '').toUpperCase();
    if (payloadRole === UserRole.STAFF && !policy.isActive) {
      throw new BadRequestException('Policy not active');
    }

    const absPath = this.policiesCrudService.resolvePolicyFilePath(policy);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${policy.title.replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60)}.pdf"`);
    fs.createReadStream(absPath).pipe(res);
  }
}

