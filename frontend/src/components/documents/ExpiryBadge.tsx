import { Badge } from '@mantine/core';
import type { DocumentExpiryStatus } from '../../types/documents';

const STATUS_CONFIG: Record<
  DocumentExpiryStatus,
  { color: string; label: string }
> = {
  VALID: { color: 'green', label: 'Valid' },
  EXPIRING_SOON: { color: 'yellow', label: 'Expiring soon' },
  EXPIRED: { color: 'red', label: 'Expired' },
  NO_EXPIRY: { color: 'gray', label: 'No expiry' },
};

export function ExpiryBadge({
  status,
  daysUntil,
}: {
  status: DocumentExpiryStatus;
  daysUntil?: number | null;
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NO_EXPIRY;
  const detail =
    daysUntil != null && status !== 'NO_EXPIRY'
      ? status === 'EXPIRED'
        ? `${Math.abs(daysUntil)}d overdue`
        : `${daysUntil}d left`
      : null;

  return (
    <Badge color={cfg.color} variant="filled" size="sm">
      {cfg.label}
      {detail ? ` · ${detail}` : ''}
    </Badge>
  );
}
