import { Controller, Get, Post, Param, UseGuards, Req, Res, BadRequestException, NotFoundException, UnauthorizedException, ForbiddenException, StreamableFile, Patch, Body, InternalServerErrorException, Query } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../users/user.entity';
import { Public } from '../auth/public.decorator';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import * as fs from 'fs';
import { join } from 'path';
import { CertificateStatus } from './certificate.entity';

@Controller('certificates')
export class CertificatesController {
    constructor(private readonly certificatesService: CertificatesService) { }

    @Get()
    @UseGuards(AuthGuard('jwt'))
    async findAll(@Req() req) {
        if (req.user.role === UserRole.ADMIN) {
            return this.certificatesService.findAll();
        } else {
            return this.certificatesService.findAllForUser(req.user.userId);
        }
    }

    @Get('staff/:userId')
    @UseGuards(AuthGuard('jwt'))
    async getForUser(@Param('userId') userId: string, @Req() req) {
        // Admin can view anyone, Staff can only view themselves
        if (req.user.role !== UserRole.ADMIN && req.user.userId !== userId) {
            throw new ForbiddenException('You can only view your own certificates');
        }
        return this.certificatesService.findAllForUser(userId);
    }

    @Patch(':id/complete')
    @UseGuards(AuthGuard('jwt'))
    async markComplete(
        @Param('id') id: string,
        @Body() body: { subModule?: string }, // UPDATED: Accept subModule
        @Req() req
    ) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can mark courses as complete');
        }
        // Pass the subModule to the service
        return this.certificatesService.markComplete(id, req.user, body.subModule);
    }

    // NEW ENDPOINT: Mark Incomplete
    @Patch(':id/incomplete')
    @UseGuards(AuthGuard('jwt'))
    async markIncomplete(@Param('id') id: string, @Req() req) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can mark courses as incomplete');
        }
        return this.certificatesService.markIncomplete(id);
    }

    @Post()
    @UseGuards(AuthGuard('jwt'))
    async create(@Body() createDto: { userId: string, courseName: string, provider: string, subModule?: string }, @Req() req) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can assign courses');
        }
        return this.certificatesService.create(createDto);
    }

    @Get(':id/view')
    @UseGuards(AuthGuard('jwt'))
    async view(@Param('id') id: string, @Req() req, @Res() res: Response) {
        return this.serveFile(id, req, res, { inline: true });
    }

    @Get(':id/view-token')
    @UseGuards(AuthGuard('jwt'))
    async getViewToken(@Param('id') id: string, @Req() req) {
        // Basic ownership check
        const cert = await this.certificatesService.findOne(id);
        if (!cert) throw new NotFoundException('Certificate not found');
        if (req.user.role !== UserRole.ADMIN && cert.userId !== req.user.userId) {
            throw new ForbiddenException('Access denied');
        }
        const token = await this.certificatesService.generateViewToken(id, req.user);
        return { token };
    }

    @Post(':id/view-token')
    @UseGuards(AuthGuard('jwt'))
    async createViewToken(@Param('id') id: string, @Req() req) {
        return this.getViewToken(id, req);
    }

    @Post(':id/force-regenerate')
    @UseGuards(AuthGuard('jwt'))
    async forceRegenerateEndpoint(@Param('id') id: string, @Req() req) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admins can force-regenerate certificates');
        }
        const result = await this.certificatesService.forceRegenerate(id);
        return { success: true, ...result };
    }

    // --- FIX: NO @UseGuards HERE ---
    // This allows the browser to load the PDF using the ?token= parameter
    @Get(':id/stream')
    @Public()
    async stream(@Param('id') id: string, @Query('token') token: string, @Res() res: Response) {
        console.log(`[CERT-STREAM] request certId=${id} tokenPresent=${Boolean(token)}`);
        const payload = await this.certificatesService.verifyViewToken(token);
        if (!payload || payload.certId !== id) {
            console.warn(`[CERT-STREAM] unauthorized certId=${id} reason=invalid-token-or-cert-mismatch`);
            throw new UnauthorizedException('Invalid or expired view token');
        }

        // Mock a request object for serveFile or just use the payload data
        const mockReq = {
            user: {
                userId: payload.userId,
                role: payload.role
            }
        };

        console.log(`[CERT-STREAM] authorized certId=${id} userId=${payload.userId} role=${payload.role}`);
        return this.serveFile(id, mockReq, res, { inline: true, secureStream: true });
    }

    @Get(':id/download')
    @UseGuards(AuthGuard('jwt'))
    async download(@Param('id') id: string, @Query('inline') inline: string, @Req() req, @Res() res: Response) {
        if (req.user.role === UserRole.STAFF) {
            throw new ForbiddenException('Staff members are not allowed to download certificates directly');
        }
        const isInline = inline === 'true';
        return this.serveFile(id, req, res, { inline: isInline });
    }

    private async serveFile(id: string, req: any, res: Response, options: { inline: boolean, secureStream?: boolean }) {
        const cert = await this.certificatesService.findOne(id, true); // true = include filePath
        if (!cert) throw new NotFoundException('Certificate not found');

        // Security Check: Owner or Admin
        if (req.user.role !== UserRole.ADMIN && cert.userId !== req.user.userId) {
            throw new ForbiddenException('Access denied');
        }

        if (cert.status !== CertificateStatus.COMPLETED) {
            throw new ForbiddenException('Certificate is not ready for viewing or download');
        }

        // Check file existence
        try {
            await fs.promises.access(cert.filePath);
        } catch (e) {
            console.warn(`Certificate file missing for ID ${id}. Attempting to regenerate...`);
            try {
                // Auto-recover. Pass undefined for subModule as we don't have it in this context easily,
                // relying on what is saved in DB if logic allows, or standard regeneration.
                // NOTE: markComplete now expects user + optional subModule.
                // For regeneration, we just assume existing metadata is enough or pass null for subModule if not changing it.
                await this.certificatesService.markComplete(id, req.user);

                // Re-fetch
                const updatedCert = await this.certificatesService.findOne(id, true);
                if (updatedCert && updatedCert.filePath) {
                    cert.filePath = updatedCert.filePath;
                }
            } catch (regenError) {
                console.error('Failed to regenerate certificate:', regenError);
                throw new InternalServerErrorException('Certificate file missing and generation failed');
            }
        }

        const file = createReadStream(cert.filePath);
        const disposition = options.inline ? 'inline' : 'attachment';

        const headers: any = {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `${disposition}; filename="${cert.courseName.replace(/\s/g, '_')}_Certificate.pdf"`,
        };

        if (options.secureStream) {
            headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private';
            headers['Pragma'] = 'no-cache';
            headers['Expires'] = '0';
        }

        res.set(headers);

        file.on('error', (err) => {
            console.error('Stream error:', err);
            res.status(500).send('Could not serve file');
        });

        file.pipe(res);
    }
}
