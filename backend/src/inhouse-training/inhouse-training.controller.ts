import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Res,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    NotFoundException,
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
import { InHouseTrainingService } from './inhouse-training.service';
import { UpdateInHouseTrainingDto } from './dto/update-inhouse-training.dto';

function ensureInHouseDir() {
    const dir = path.join(process.cwd(), 'uploads', 'inhouse-documents');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

const ALLOWED_MIME = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
];

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InHouseTrainingController {
    constructor(private readonly service: InHouseTrainingService) {
        ensureInHouseDir();
    }

    @Get(':id/inhouse-training')
    @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
    async list(@Param('id') staffId: string) {
        const records = await this.service.findForStaff(staffId);
        return { success: true, records };
    }

    @Post(':id/inhouse-training/init')
    @Roles(UserRole.ADMIN, UserRole.HR)
    async init(@Param('id') staffId: string) {
        const records = await this.service.initForStaff(staffId);
        return { success: true, records };
    }

    @Patch(':id/inhouse-training/:recordId')
    @Roles(UserRole.ADMIN, UserRole.HR)
    async update(
        @Param('id') staffId: string,
        @Param('recordId') recordId: string,
        @Body() dto: UpdateInHouseTrainingDto,
    ) {
        const record = await this.service.updateRecord(staffId, recordId, dto);
        return { success: true, record };
    }

    @Post(':id/inhouse-training/:recordId/upload')
    @Roles(UserRole.ADMIN, UserRole.HR)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureInHouseDir()),
                filename: (_req, file, cb) =>
                    cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
            }),
            limits: { fileSize: 10 * 1024 * 1024 },
            fileFilter: (_req, file, cb) => {
                if (ALLOWED_MIME.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Unsupported file type. Allowed: PDF, DOC, DOCX, images.'), false);
                }
            },
        }),
    )
    async upload(
        @Param('id') staffId: string,
        @Param('recordId') recordId: string,
        @UploadedFile() file: { filename: string; originalname: string },
    ) {
        if (!file) throw new BadRequestException('No file uploaded');
        const record = await this.service.setDocument(
            staffId,
            recordId,
            file.originalname,
            file.filename,
        );
        return { success: true, record };
    }

    @Get(':id/inhouse-training/:recordId/document')
    @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
    async download(
        @Param('id') staffId: string,
        @Param('recordId') recordId: string,
        @Res() res: Response,
    ) {
        const record = await this.service.getRecord(staffId, recordId);
        if (!record.documentPath) {
            throw new NotFoundException('No document attached to this record');
        }
        const absPath = path.join(ensureInHouseDir(), record.documentPath);
        if (!fs.existsSync(absPath)) {
            throw new NotFoundException('Document file is missing on the server');
        }
        const safeName = (record.documentName || record.documentPath).replace(/[^a-zA-Z0-9._-]/g, '_');
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        fs.createReadStream(absPath).pipe(res);
    }
}
