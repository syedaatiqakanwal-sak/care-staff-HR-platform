import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PAYROLL_ROLES } from '../users/role.utils';
import { PayrollService } from './payroll.service';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { CreateStaffDocumentDto } from '../documents/dto/documents.dto';
import { isPayrollDocumentType } from './payroll.constants';
import { clientIpFromRequest } from '../audit/audit-request.util';
import type { Request as ExpressRequest } from 'express';

function ensureDocumentsDir() {
  const dir = path.join(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {
    ensureDocumentsDir();
  }

  @Get(':id/payroll')
  @Roles(...PAYROLL_ROLES)
  getPayroll(@Param('id') userId: string, @Request() req: ExpressRequest & { user: { userId: string; role: string } }) {
    return this.payrollService.getOrCreate(req.user, userId, clientIpFromRequest(req));
  }

  @Put(':id/payroll')
  @Roles(...PAYROLL_ROLES)
  updatePayroll(
    @Param('id') userId: string,
    @Body() dto: UpdatePayrollDto,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.payrollService.upsert(req.user, userId, dto, clientIpFromRequest(req));
  }

  @Get(':id/payroll/documents')
  @Roles(...PAYROLL_ROLES)
  listPayrollDocuments(@Param('id') userId: string, @Request() req: ExpressRequest & { user: { userId: string; role: string } }) {
    return this.payrollService.listPayrollDocuments(req.user, userId, clientIpFromRequest(req));
  }

  @Post(':id/payroll/documents')
  @Roles(...PAYROLL_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, ensureDocumentsDir()),
        filename: (_req, file, cb) =>
          cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadPayrollDocument(
    @Param('id') userId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
    @Body() dto: CreateStaffDocumentDto,
    @UploadedFile() file: { filename: string; originalname: string; size: number; mimetype?: string },
  ) {
    if (!isPayrollDocumentType(dto.documentType)) {
      throw new BadRequestException('documentType must be HMRC, P45, or P60');
    }
    return this.payrollService.uploadPayrollDocument(req.user, userId, dto, file, clientIpFromRequest(req));
  }
}
