import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { DASHBOARD_ROLES, MANAGEMENT_ROLES, PAYROLL_ROLES } from '../users/role.utils';
import { DocumentsService } from './documents.service';
import { DocumentsAccessService } from './documents-access.service';
import {
  CreateStaffDocumentDto,
  CreateDbsRecordDto,
  UpdateDbsRecordDto,
} from './dto/documents.dto';

function ensureDocumentsDir() {
  const dir = path.join(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StaffDocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly access: DocumentsAccessService,
  ) {
    ensureDocumentsDir();
  }

  @Post(':id/documents')
  @Roles(...MANAGEMENT_ROLES)
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
  async upload(
    @Param('id') userId: string,
    @Request() req,
    @Body() dto: CreateStaffDocumentDto,
    @UploadedFile() file: { filename: string; originalname: string; size: number; mimetype?: string },
  ) {
    const profile = await this.access.assertCanWriteStaffDocuments(
      req.user,
      userId,
      dto.documentType,
    );
    const doc = await this.documentsService.uploadDocument(
      profile.id,
      req.user.userId,
      dto,
      file,
      req.user,
      req.ip,
    );
    return { success: true, document: doc };
  }

  @Get(':id/documents')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  async list(@Param('id') userId: string, @Request() req) {
    const profile = await this.access.assertCanViewStaffDocuments(req.user, userId);
    const documents = await this.documentsService.listForStaffProfile(profile.id);
    return {
      success: true,
      documents: this.access.filterDocumentsForRole(documents, req.user.role),
    };
  }

  @Post(':id/dbs')
  @Roles(...MANAGEMENT_ROLES)
  async createDbs(
    @Param('id') userId: string,
    @Request() req,
    @Body() dto: CreateDbsRecordDto,
  ) {
    const profile = await this.access.assertCanWriteStaffDocuments(req.user, userId);
    const record = await this.documentsService.createDbs(profile.id, dto);
    return { success: true, dbs: record };
  }

  @Get(':id/dbs')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  async getDbs(@Param('id') userId: string, @Request() req) {
    const profile = await this.access.assertCanViewStaffDocuments(req.user, userId);
    const dbs = await this.documentsService.getDbsForStaff(profile.id);
    return { success: true, dbs };
  }

}

@Controller('documents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly access: DocumentsAccessService,
  ) {}

  @Get('expiring')
  @Roles(...DASHBOARD_ROLES)
  async expiring(
    @Query('withinDays', new DefaultValuePipe(30), ParseIntPipe) withinDays: number,
  ) {
    const items = await this.documentsService.findExpiring(withinDays);
    return { success: true, withinDays, items };
  }

  @Delete(':id')
  @Roles(...MANAGEMENT_ROLES, ...PAYROLL_ROLES)
  async remove(@Param('id') id: string, @Request() req) {
    await this.documentsService.deleteDocument(id, req.user);
    return { success: true };
  }

  @Get(':id/download')
  @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const { doc, absPath } = await this.documentsService.getDocumentForDownload(
      id,
      req.user,
    );
    const safeName = doc.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(absPath).pipe(res);
  }
}

@Controller('dbs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DbsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Patch(':id')
  @Roles(...MANAGEMENT_ROLES)
  async update(@Param('id') id: string, @Body() dto: UpdateDbsRecordDto) {
    const dbs = await this.documentsService.updateDbs(id, dto);
    return { success: true, dbs };
  }
}
