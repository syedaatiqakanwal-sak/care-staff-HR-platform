/** Computed from expiryDate vs today and configurable warn thresholds. */
export type DocumentExpiryStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

/**
 * Parses DOCUMENT_EXPIRY_WARN_DAYS env (e.g. "30,60,90") into sorted unique positive integers.
 * Used for EXPIRING_SOON: document is expiring within max(days) but not yet expired.
 */
export function parseExpiryWarnDayTiers(envValue: string | undefined): number[] {
  const raw = (envValue || '30,60,90').split(',').map((s) => parseInt(s.trim(), 10));
  const tiers = [...new Set(raw.filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
  return tiers.length > 0 ? tiers : [30, 60, 90];
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00.000Z');
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

export function computeDocumentExpiryStatus(
  expiryDate: string | null | undefined,
  warnDayTiers: number[],
): DocumentExpiryStatus {
  if (!expiryDate) return 'NO_EXPIRY';
  const days = daysUntil(expiryDate);
  if (days === null) return 'NO_EXPIRY';
  if (days < 0) return 'EXPIRED';
  const maxSoon = Math.max(...warnDayTiers);
  if (days <= maxSoon) return 'EXPIRING_SOON';
  return 'VALID';
}

export function computeDbsRenewalStatus(
  renewalDate: string | null | undefined,
  warnDayTiers: number[],
): DocumentExpiryStatus {
  return computeDocumentExpiryStatus(renewalDate, warnDayTiers);
}
