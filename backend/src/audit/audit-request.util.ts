import type { Request } from 'express';

export function clientIpFromRequest(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim();
  }
  return req.ip;
}

export type AuditActor = {
  userId: string;
  role: string;
};

export function auditActorFromRequest(req: { user?: AuditActor }): AuditActor {
  const u = req.user;
  if (!u?.userId) {
    return { userId: '00000000-0000-0000-0000-000000000000', role: 'UNKNOWN' };
  }
  return { userId: u.userId, role: String(u.role || 'UNKNOWN') };
}
