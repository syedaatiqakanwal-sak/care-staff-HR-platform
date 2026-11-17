import { Box, UnstyledButton } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

/** Parent route for common nested pages; otherwise history back or dashboard. */
function getFallbackPath(pathname: string): string {
    if (pathname.startsWith('/dashboard/staff/')) return '/dashboard/staff';
    if (pathname === '/dashboard/staff') return '/dashboard';
    if (pathname === '/dashboard/me') return '/dashboard';
    if (pathname.startsWith('/dashboard/policies/')) return '/dashboard/policies';
    if (pathname === '/dashboard/policies') return '/dashboard';
    if (pathname.startsWith('/dashboard/references/')) return '/dashboard';
    if (pathname.startsWith('/dashboard/dbs/')) return '/dashboard';
    if (pathname.startsWith('/dashboard/rtw/')) return '/dashboard';
    if (pathname === '/dashboard/schedules') return '/dashboard';
    if (pathname.startsWith('/dashboard/reports')) return '/dashboard';
    if (pathname === '/dashboard/audit-logs') return '/dashboard';
    if (pathname === '/settings/api-tokens') return '/dashboard';
    if (pathname === '/settings') return '/dashboard';
    if (pathname === '/courses') return '/dashboard';
    return '/dashboard';
}

const HOME_PATHS = new Set(['/dashboard', '/dashboard/']);

/**
 * In-app Back control shown on every authenticated page except the main dashboard home
 * and staff profile pages (those render their own Back control above the profile header).
 */
export function PageBackButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const { pathname } = location;

    if (HOME_PATHS.has(pathname)) return null;
    if (pathname.startsWith('/dashboard/staff/') || pathname === '/dashboard/me') return null;

    const handleBack = () => {
        // Direct load / refresh has no in-app history → go to parent page
        if (location.key === 'default') {
            navigate(getFallbackPath(pathname));
            return;
        }
        navigate(-1);
    };

    return (
        <Box mb="xs" style={{ alignSelf: 'flex-start' }}>
            <UnstyledButton
                onClick={handleBack}
                aria-label="Go back"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#139639',
                    fontWeight: 600,
                    fontSize: 14,
                    lineHeight: 1,
                    padding: '6px 10px',
                    borderRadius: 8,
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(19, 150, 57, 0.08)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
            >
                <ArrowLeft size={16} strokeWidth={2.25} />
                Back
            </UnstyledButton>
        </Box>
    );
}
