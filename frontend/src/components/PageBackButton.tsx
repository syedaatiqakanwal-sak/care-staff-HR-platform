import { Button } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

function logicalParent(pathname: string): string {
  if (pathname.startsWith('/dashboard/staff/')) return '/dashboard/staff';
  if (pathname.startsWith('/settings/')) return '/settings';
  if (pathname.startsWith('/dashboard/policies/')) return '/dashboard/policies';
  if (pathname.startsWith('/dashboard/reports/')) return '/dashboard/reports';
  if (pathname.startsWith('/dashboard/') && pathname !== '/dashboard') return '/dashboard';
  if (pathname.startsWith('/settings')) return '/dashboard';
  return '/dashboard';
}

/**
 * Subtle back control for authenticated pages (hidden on main dashboard home).
 */
export function PageBackButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return null;
  }

  const handleBack = () => {
    // Prefer in-app history when the user navigated within the SPA
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    if (window.history.length > 1 && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          navigate(-1);
          return;
        }
      } catch {
        // fall through to logical parent
      }
    }
    navigate(logicalParent(pathname));
  };

  return (
    <Button
      variant="subtle"
      color="gray"
      size="compact-sm"
      leftSection={<ArrowLeft size={16} />}
      onClick={handleBack}
      mb="sm"
      styles={{
        root: {
          fontWeight: 600,
          color: '#6B7280',
          alignSelf: 'flex-start',
        },
      }}
    >
      Back
    </Button>
  );
}
