import { Navigate } from 'react-router-dom';
import type { AppRole } from '../utils/roles';
import { getStoredRole, hasDashboardAccess } from '../utils/roles';

type RoleRouteProps = {
    children: React.ReactNode;
    /** Allowed roles (lowercase). Defaults to dashboard roles if omitted. */
    allowedRoles?: AppRole[];
    /** Where to send users who lack permission */
    fallbackTo?: string;
};

export const RoleRoute = ({
    children,
    allowedRoles,
    fallbackTo = '/dashboard/me',
}: RoleRouteProps) => {
    const role = getStoredRole();

    if (!role) {
        return <Navigate to="/login" replace />;
    }

    const allowed = allowedRoles ?? (
        hasDashboardAccess(role) ? (['admin', 'manager', 'hr', 'supervisor'] as AppRole[]) : []
    );

    if (allowed.length === 0 || !allowed.includes(role)) {
        return <Navigate to={fallbackTo} replace />;
    }

    return <>{children}</>;
};

/** Admin dashboard routes — all management portal roles except staff */
export const AdminRoute = ({ children }: { children: React.ReactNode }) => (
    <RoleRoute allowedRoles={['admin', 'manager', 'hr', 'supervisor']} fallbackTo="/dashboard/me">
        {children}
    </RoleRoute>
);

/** Strict administrator-only routes (API tokens, destructive ops) */
export const StrictAdminRoute = ({ children }: { children: React.ReactNode }) => (
    <RoleRoute allowedRoles={['admin']} fallbackTo="/dashboard">
        {children}
    </RoleRoute>
);

/** Audit log — admin and manager only */
export const AuditViewRoute = ({ children }: { children: React.ReactNode }) => (
    <RoleRoute allowedRoles={['admin', 'manager']} fallbackTo="/dashboard">
        {children}
    </RoleRoute>
);
