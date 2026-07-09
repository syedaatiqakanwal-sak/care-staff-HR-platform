import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MANAGEMENT_ROLES } from '../users/role.utils';
import { HrNotesService } from './hr-notes.service';
import { CreateHrCaseNoteDto, UpdateHrCaseNoteDto } from './dto/hr-notes.dto';

function clientIp(req: ExpressRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
  return req.ip;
}

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class HrNotesController {
  constructor(private readonly hrNotesService: HrNotesService) {}

  @Get(':id/hr-notes')
  @Roles(...MANAGEMENT_ROLES)
  list(@Param('id') userId: string, @Request() req: ExpressRequest & { user: { userId: string; role: string } }) {
    return this.hrNotesService.listForStaffUser(req.user, userId, clientIp(req));
  }

  @Get(':id/hr-notes/:noteId')
  @Roles(...MANAGEMENT_ROLES)
  getOne(
    @Param('id') userId: string,
    @Param('noteId') noteId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.hrNotesService.getOne(req.user, userId, noteId, clientIp(req));
  }

  @Post(':id/hr-notes')
  @Roles(...MANAGEMENT_ROLES)
  create(
    @Param('id') userId: string,
    @Body() dto: CreateHrCaseNoteDto,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.hrNotesService.create(req.user, userId, dto, clientIp(req));
  }

  @Patch(':id/hr-notes/:noteId')
  @Roles(...MANAGEMENT_ROLES)
  update(
    @Param('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateHrCaseNoteDto,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.hrNotesService.update(req.user, userId, noteId, dto, clientIp(req));
  }

  @Delete(':id/hr-notes/:noteId')
  @Roles(...MANAGEMENT_ROLES)
  remove(
    @Param('id') userId: string,
    @Param('noteId') noteId: string,
    @Request() req: ExpressRequest & { user: { userId: string; role: string } },
  ) {
    return this.hrNotesService.remove(req.user, userId, noteId, clientIp(req));
  }
}
