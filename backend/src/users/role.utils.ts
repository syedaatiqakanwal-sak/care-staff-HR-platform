import { UserRole } from './user.entity';

/** Roles that use the management dashboard (not the staff self-service portal). */
export const DASHBOARD_ROLES: UserRole[] = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.HR,
    UserRole.SUPERVISOR,
];

/** Roles that may change HR records (staff profiles, policies, courses, certificates, references). */
export const MANAGEMENT_ROLES: UserRole[] = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.HR,
];

/** Payroll & bank details — Admin and HR only (not Manager or Supervisor). */
export const PAYROLL_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.HR];

export const STAFF_PORTAL_ROLES: UserRole[] = [UserRole.STAFF];

export const MANAGEMENT_LOGIN_ROLES: UserRole[] = [
    UserRole.MANAGER,
    UserRole.HR,
    UserRole.SUPERVISOR,
];

export function normalizeUserRole(role: string | UserRole): UserRole {
    return (typeof role === 'string' ? role.toUpperCase() : role) as UserRole;
}

export function isDashboardRole(role: string | UserRole): boolean {
    return DASHBOARD_ROLES.includes(normalizeUserRole(role));
}

export function isManagementRole(role: string | UserRole): boolean {
    return MANAGEMENT_ROLES.includes(normalizeUserRole(role));
}

export function isPayrollRole(role: string | UserRole): boolean {
    return PAYROLL_ROLES.includes(normalizeUserRole(role));
}

export function isStrictAdmin(role: string | UserRole): boolean {
    return normalizeUserRole(role) === UserRole.ADMIN;
}

export function isStaffRole(role: string | UserRole): boolean {
    return normalizeUserRole(role) === UserRole.STAFF;
}

/** May open any staff profile by user id (dashboard / supervisory access). */
export function canViewOtherStaffProfiles(role: string | UserRole): boolean {
    return isDashboardRole(role);
}

/** May edit another user's staff profile fields. */
export function canEditOtherStaffProfiles(role: string | UserRole): boolean {
    return isManagementRole(role);
}
