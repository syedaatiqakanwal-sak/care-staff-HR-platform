import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrCaseNote } from './hr-case-note.entity';
import { HrNotesAccessService } from './hr-notes-access.service';
import { CreateHrCaseNoteDto, UpdateHrCaseNoteDto } from './dto/hr-notes.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-action.enum';

const ENTITY_TYPE = 'hr_case_note';

@Injectable()
export class HrNotesService {
  constructor(
    @InjectRepository(HrCaseNote)
    private readonly notesRepo: Repository<HrCaseNote>,
    private readonly access: HrNotesAccessService,
    private readonly audit: AuditService,
  ) {}

  private assertAccess(requestUser: { userId: string; role: string }) {
    this.access.assertHrNotesRole(requestUser.role);
  }

  private serializeNote(note: HrCaseNote) {
    return {
      id: note.id,
      staffId: note.staffId,
      category: note.category,
      title: note.title,
      body: note.body,
      confidential: note.confidential,
      createdBy: note.createdBy,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      authorEmail: (note as HrCaseNote & { author?: { email?: string } }).author?.email,
    };
  }

  async listForStaffUser(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    ipAddress?: string,
  ) {
    this.assertAccess(requestUser);
    const profile = await this.access.resolveStaffProfileForHrNotes(requestUser, targetUserId);

    const notes = await this.notesRepo.find({
      where: { staffId: profile.id },
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.VIEW_RESTRICTED,
      entityType: ENTITY_TYPE,
      entityId: profile.id,
      summary: `Listed ${notes.length} HR case note(s) for staff user ${targetUserId}`,
      ipAddress,
    });

    for (const note of notes) {
      await this.audit.log({
        userId: requestUser.userId,
        userRole: requestUser.role,
        action: AuditAction.VIEW_RESTRICTED,
        entityType: ENTITY_TYPE,
        entityId: note.id,
        summary: `Viewed HR case note: ${note.title} (${note.category})`,
        ipAddress,
      });
    }

    return notes.map((n) => this.serializeNote(n));
  }

  async getOne(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    noteId: string,
    ipAddress?: string,
  ) {
    this.assertAccess(requestUser);
    const profile = await this.access.resolveStaffProfileForHrNotes(requestUser, targetUserId);

    const note = await this.notesRepo.findOne({
      where: { id: noteId, staffId: profile.id },
      relations: ['author'],
    });
    if (!note) {
      throw new NotFoundException('HR case note not found');
    }

    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.VIEW_RESTRICTED,
      entityType: ENTITY_TYPE,
      entityId: note.id,
      summary: `Viewed HR case note: ${note.title}`,
      ipAddress,
    });

    return this.serializeNote(note);
  }

  async create(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    dto: CreateHrCaseNoteDto,
    ipAddress?: string,
  ) {
    this.assertAccess(requestUser);
    const profile = await this.access.resolveStaffProfileForHrNotes(requestUser, targetUserId);

    const note = this.notesRepo.create({
      staffId: profile.id,
      category: dto.category,
      title: dto.title.trim(),
      body: dto.body.trim(),
      confidential: dto.confidential ?? true,
      createdBy: requestUser.userId,
    });
    const saved = await this.notesRepo.save(note);
    const withAuthor = await this.notesRepo.findOne({
      where: { id: saved.id },
      relations: ['author'],
    });

    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.CREATE,
      entityType: ENTITY_TYPE,
      entityId: saved.id,
      summary: `Created HR case note: ${saved.title} (${saved.category})`,
      ipAddress,
    });

    return this.serializeNote(withAuthor ?? saved);
  }

  async update(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    noteId: string,
    dto: UpdateHrCaseNoteDto,
    ipAddress?: string,
  ) {
    this.assertAccess(requestUser);
    const profile = await this.access.resolveStaffProfileForHrNotes(requestUser, targetUserId);

    const note = await this.notesRepo.findOne({
      where: { id: noteId, staffId: profile.id },
    });
    if (!note) {
      throw new NotFoundException('HR case note not found');
    }

    if (dto.category !== undefined) note.category = dto.category;
    if (dto.title !== undefined) note.title = dto.title.trim();
    if (dto.body !== undefined) note.body = dto.body.trim();
    if (dto.confidential !== undefined) note.confidential = dto.confidential;

    const saved = await this.notesRepo.save(note);

    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.UPDATE,
      entityType: ENTITY_TYPE,
      entityId: saved.id,
      summary: `Updated HR case note: ${saved.title}`,
      ipAddress,
    });

    return this.serializeNote(saved);
  }

  async remove(
    requestUser: { userId: string; role: string },
    targetUserId: string,
    noteId: string,
    ipAddress?: string,
  ) {
    this.assertAccess(requestUser);
    const profile = await this.access.resolveStaffProfileForHrNotes(requestUser, targetUserId);

    const note = await this.notesRepo.findOne({
      where: { id: noteId, staffId: profile.id },
    });
    if (!note) {
      throw new NotFoundException('HR case note not found');
    }

    await this.notesRepo.remove(note);

    await this.audit.log({
      userId: requestUser.userId,
      userRole: requestUser.role,
      action: AuditAction.DELETE,
      entityType: ENTITY_TYPE,
      entityId: noteId,
      summary: `Deleted HR case note: ${note.title}`,
      ipAddress,
    });

    return { success: true };
  }
}
