export type AppRole = 'admin' | 'manager' | 'hr' | 'supervisor' | 'staff';

export const DASHBOARD_ROLES: AppRole[] = ['admin', 'manager', 'hr', 'supervisor'];
export const MANAGEMENT_ROLES: AppRole[] = ['admin', 'manager', 'hr'];
export const PAYROLL_ROLES: AppRole[] = ['admin', 'hr'];
/** Audit log viewer — admin and manager only */
export const AUDIT_VIEW_ROLES: AppRole[] = ['admin', 'manager'];

export function getStoredRole(): AppRole | null {
    const role = (localStorage.getItem('role') || '').toLowerCase();
    if (role === 'admin' || role === 'manager' || role === 'hr' || role === 'supervisor' || role === 'staff') {
        return role;
    }
    return null;
}

export function isReadOnlyUser(): boolean {
    return localStorage.getItem('readOnly') === 'true';
}

export function hasDashboardAccess(role: AppRole | null = getStoredRole()): boolean {
    return role !== null && DASHBOARD_ROLES.includes(role);
}

export function isManagementRole(role: AppRole | null = getStoredRole()): boolean {
    return role !== null && MANAGEMENT_ROLES.includes(role);
}

export function isPayrollRole(role: AppRole | null = getStoredRole()): boolean {
    return role !== null && PAYROLL_ROLES.includes(role);
}

export function canViewAuditLog(role: AppRole | null = getStoredRole()): boolean {
    return role !== null && AUDIT_VIEW_ROLES.includes(role);
}

/** @deprecated Use hasDashboardAccess — kept so existing `isAdmin` checks map to dashboard access */
export function isAdminPortalRole(role: AppRole | null = getStoredRole()): boolean {
    return role === 'admin';
}

export function isStrictAdmin(role: AppRole | null = getStoredRole()): boolean {
    return role === 'admin';
}

export function isStaffPortalRole(role: AppRole | null = getStoredRole()): boolean {
    return role === 'staff';
}

export function canMutate(role: AppRole | null = getStoredRole()): boolean {
    return !isReadOnlyUser();
}

export function roleLabel(role: AppRole | null = getStoredRole()): string {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
}
