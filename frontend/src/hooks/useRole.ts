import type { AppRole } from '../utils/roles';
import {
    canMutate,
    getStoredRole,
    hasDashboardAccess,
    isManagementRole,
    isReadOnlyUser,
    isStaffPortalRole,
    isStrictAdmin,
    roleLabel,
} from '../utils/roles';

export function useRole() {
    const role = getStoredRole();

    return {
        role,
        roleLabel: roleLabel(role),
        readOnly: isReadOnlyUser(),
        canMutate: canMutate(role),
        hasDashboardAccess: hasDashboardAccess(role),
        isManagement: isManagementRole(role),
        isStrictAdmin: isStrictAdmin(role),
        isStaff: isStaffPortalRole(role),
        /** Legacy alias: dashboard roles (admin, manager, hr, supervisor) */
        isAdmin: hasDashboardAccess(role),
    };
}
