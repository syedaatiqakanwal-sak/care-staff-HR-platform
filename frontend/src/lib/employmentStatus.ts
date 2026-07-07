export const EMPLOYMENT_STATUS_OPTIONS = ['Active', 'Left', 'Paused', 'Suspended'] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUS_OPTIONS)[number];

const LEGACY_STATUS_MAP: Record<string, EmploymentStatus> = {
    Inactive: 'Suspended',
    'On Hold': 'Paused',
    Leaver: 'Left',
};

/** Normalize stored values (including legacy) to a current option when possible. */
export function normalizeEmploymentStatus(status: string | null | undefined): EmploymentStatus | null {
    if (!status) return null;
    if ((EMPLOYMENT_STATUS_OPTIONS as readonly string[]).includes(status)) {
        return status as EmploymentStatus;
    }
    return LEGACY_STATUS_MAP[status] ?? null;
}

/** Profile header banner status label */
export function getProfileHeaderStatusLabel(status: string | null | undefined): string {
    const normalized = normalizeEmploymentStatus(status) ?? status ?? 'Active';
    switch (normalized) {
        case 'Active':
            return 'Active & Verified';
        case 'Left':
            return 'Left';
        case 'Paused':
            return 'Paused';
        case 'Suspended':
            return 'Suspended';
        default:
            return normalized;
    }
}

/** Staff directory card badge label (uppercase). */
export function getDirectoryBadgeLabel(status: string | null | undefined): string {
    const normalized = normalizeEmploymentStatus(status) ?? status ?? 'Active';
    switch (normalized) {
        case 'Active':
            return 'ACTIVE';
        case 'Left':
            return 'LEFT';
        case 'Paused':
            return 'PAUSED';
        case 'Suspended':
            return 'SUSPENDED';
        default:
            return String(normalized).toUpperCase();
    }
}
