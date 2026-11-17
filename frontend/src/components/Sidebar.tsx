import {
    Stack,
    UnstyledButton,
    Group,
    Text,
    Box,
    Badge,
    ActionIcon,
    Tooltip,
    Divider,
} from '@mantine/core';
import {
    Users,
    LogOut,
    BookOpen,
    Settings,
    UserPlus,
    User,
    ClipboardCheck,
    FileBarChart,
    ScrollText,
    LayoutDashboard,
    BarChart3,
    Shield,
    Globe,
    PanelLeftClose,
    PanelLeft,
    Database,
    CalendarCheck,
    type LucideIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check } from 'lucide-react';
import { logout } from '../utils/auth';
import {
    canViewAuditLog,
    hasDashboardAccess,
    isStaffPortalRole,
    isStrictAdmin,
    roleLabel,
} from '../utils/roles';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSidebar } from '../contexts/SidebarContext';

const ICON_SIZE = 20;
const BRAND_GREEN = '#139639';
const INACTIVE_TEXT = '#374151';
const SECTION_LABEL_COLOR = '#9CA3AF';
const ACTIVE_GRADIENT = 'linear-gradient(90deg, #0e7a2d 0%, #139639 50%, #ffffff 100%)';
const ACTIVE_SHADOW = '0 6px 16px rgba(19, 150, 57, 0.22)';

type NavItem = {
    link: string;
    label: string;
    icon: LucideIcon;
};

type NavSection = {
    title: string;
    items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'MAIN',
        items: [
            { link: '/dashboard', label: 'Compliance', icon: LayoutDashboard },
            { link: '/dashboard/staff', label: 'Staff', icon: Users },
            { link: '/dashboard/staff?add=1', label: 'Add Staff', icon: UserPlus },
            { link: '/dashboard/me', label: 'View Profile', icon: User },
        ],
    },
    {
        title: 'LEARNING',
        items: [
            { link: '/courses', label: 'Courses', icon: BookOpen },
            // Policies temporarily hidden from HR sidebar — re-enable when needed:
            // { link: '/dashboard/policies', label: 'Policies', icon: FileText },
        ],
    },
    {
        title: 'HR',
        items: [
            { link: '/dashboard/references/analytics', label: 'Reference', icon: ClipboardCheck },
            { link: '/dashboard/dbs/analytics', label: 'DBS', icon: Shield },
            { link: '/dashboard/rtw/analytics', label: 'Right to Work', icon: Globe },
            { link: '/dashboard/schedules', label: 'Schedules', icon: CalendarCheck },
            { link: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
            { link: '/dashboard/reports/analytics', label: 'Analytics', icon: BarChart3 },
        ],
    },
    {
        title: 'SYSTEM',
        items: [
            { link: '/dashboard/audit-logs', label: 'Audit Log', icon: ScrollText },
            { link: '/dashboard/backup', label: 'Database Backup', icon: Database },
            { link: '/settings', label: 'Settings', icon: Settings },
        ],
    },
];

const sidebarStyles = `
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .sidebar-nav-item {
    display: block;
    width: 100%;
    box-sizing: border-box;
    position: relative;
    border-radius: 12px;
    transition: background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, transform 0.15s ease;
  }

  .sidebar-nav-item:hover:not([data-active="true"]) {
    background: #F3F4F6 !important;
  }

  .sidebar-nav-item[data-active="true"] {
    background: ${ACTIVE_GRADIENT} !important;
    box-shadow: ${ACTIVE_SHADOW};
    color: #ffffff !important;
  }

  .sidebar-nav-item[data-active="true"] svg {
    color: #ffffff !important;
    stroke: #ffffff !important;
    filter: drop-shadow(0 1px 1px rgba(14, 122, 45, 0.35));
  }

  .sidebar-nav-item[data-active="true"] .mantine-Text-root {
    color: #ffffff !important;
    text-shadow: 0 1px 2px rgba(14, 122, 45, 0.45);
  }

  .sidebar-signout {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border-radius: 14px;
    background: #F8FAFC;
    border: 1px solid #EEF2F7;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .sidebar-signout:hover {
    background: #FEF2F2;
    border-color: #FECACA;
  }
`;

function isNavItemActive(link: string, pathname: string, search: string): boolean {
    if (link.startsWith('http')) return false;
    if (link === '/dashboard') {
        return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    if (link === '/dashboard/staff?add=1') {
        return pathname === '/dashboard/staff' && search.includes('add=1');
    }
    if (link === '/dashboard/staff') {
        if (pathname === '/dashboard/staff' && search.includes('add=1')) return false;
        return pathname === '/dashboard/staff' || pathname.startsWith('/dashboard/staff/');
    }
    if (link === '/dashboard/me' && pathname.startsWith('/dashboard/me')) {
        return true;
    }
    if (link === '/dashboard/reports/analytics') {
        return pathname === '/dashboard/reports/analytics';
    }
    if (link === '/dashboard/reports') {
        return pathname === '/dashboard/reports';
    }
    return pathname === link.split('?')[0];
}

function shouldShowNavItem(item: NavItem, dashboardUser: boolean, strictAdmin: boolean): boolean {
    // Policies hidden from HR frontend for now
    if (item.label === 'Policies') return false;
    if (
        (item.label === 'Compliance' ||
            item.label === 'Staff' ||
            item.label === 'Add Staff' ||
            item.label === 'Reference' ||
            item.label === 'DBS' ||
            item.label === 'Right to Work' ||
            item.label === 'Reports' ||
            item.label === 'Analytics') &&
        !dashboardUser
    ) {
        return false;
    }
    if (item.label === 'Audit Log' && !canViewAuditLog()) return false;
    if (item.label === 'Database Backup' && !strictAdmin) return false;
    if (item.label === 'Settings' && !dashboardUser && !strictAdmin) return false;
    if (item.label === 'View Profile' && !isStaffPortalRole()) return false;
    return true;
}

export function Sidebar({ onLinkClick, hideHeader = false }: { onLinkClick?: () => void; hideHeader?: boolean } = {}) {
    const navigate = useNavigate();
    const location = useLocation();
    const { collapsed, toggle } = useSidebar();

    const role = (localStorage.getItem('role') || '').toLowerCase();
    const token = localStorage.getItem('token');
    const dashboardUser = hasDashboardAccess();
    const strictAdmin = isStrictAdmin();
    const portalTitle = dashboardUser ? 'Admin Portal' : 'Staff Portal';
    const portalSubtitle = roleLabel() === 'Admin' ? 'Administrator' : roleLabel();

    const [unreadPolicyCount, setUnreadPolicyCount] = useState(0);

    useEffect(() => {
        if (role !== 'staff' || !token) return;

        const fetchPolicyNotifs = async () => {
            try {
                const res = await axios.get('/api/v1/policy-notifications/my', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const unread = (res.data || []).filter((n: { isRead: boolean }) => !n.isRead).length;
                setUnreadPolicyCount(unread);
            } catch {
                // ignore
            }
        };

        fetchPolicyNotifs();
        const interval = setInterval(fetchPolicyNotifs, 60000);

        const onPolicyNotifsUpdated = () => fetchPolicyNotifs();
        window.addEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);
        };
    }, [role, token]);

    const visibleSections = NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => shouldShowNavItem(item, dashboardUser, strictAdmin)),
    })).filter((section) => section.items.length > 0);

    const handleNavigate = (link: string) => {
        if (link.startsWith('http')) {
            window.open(link, '_blank');
        } else if (link !== '#') {
            const [path, query] = link.split('?');
            navigate(query ? `${path}?${query}` : path);
        }
        onLinkClick?.();
    };

    const renderNavItem = (item: NavItem) => {
        const isActive = isNavItemActive(item.link, location.pathname, location.search);
        const Icon = item.icon;

        return (
            <Tooltip key={item.label} label={item.label} position="right" disabled={!collapsed}>
                <UnstyledButton
                    className="sidebar-nav-item"
                    data-active={isActive}
                    onClick={() => handleNavigate(item.link)}
                    style={{
                        padding: collapsed ? '11px 8px' : '11px 14px',
                        color: isActive ? '#ffffff' : INACTIVE_TEXT,
                        fontWeight: isActive ? 700 : 600,
                    }}
                >
                    <Group justify={collapsed ? 'center' : 'flex-start'} wrap="nowrap" gap={12}>
                        <Icon
                            size={ICON_SIZE}
                            strokeWidth={isActive ? 2.25 : 1.9}
                            color={isActive ? '#ffffff' : INACTIVE_TEXT}
                            style={{ flexShrink: 0 }}
                        />
                        {!collapsed && (
                            <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                                <Text fw={isActive ? 700 : 600} size="sm" c="inherit" lineClamp={1}>
                                    {item.label}
                                </Text>
                                {item.label === 'Policies' && role === 'staff' && unreadPolicyCount > 0 && (
                                    <Badge size="sm" color="red" variant="filled">
                                        {unreadPolicyCount}
                                    </Badge>
                                )}
                            </Group>
                        )}
                        {collapsed && item.label === 'Policies' && role === 'staff' && unreadPolicyCount > 0 && (
                            <Box
                                style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--mantine-color-red-6)',
                                }}
                            />
                        )}
                    </Group>
                </UnstyledButton>
            </Tooltip>
        );
    };

    return (
        <>
            <style>{sidebarStyles}</style>
            <Box
                px={collapsed ? 'sm' : 'md'}
                py="md"
                h="100%"
                miw={0}
                w="100%"
                maw="100%"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    minHeight: 0,
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '4px 0 18px rgba(15, 23, 42, 0.04)',
                }}
            >
                {!hideHeader && (
                    <Group
                        justify={collapsed ? 'center' : 'space-between'}
                        align="flex-start"
                        wrap="nowrap"
                        mb="lg"
                        gap="sm"
                        style={{ flexShrink: 0 }}
                    >
                        {!collapsed && (
                            <Box style={{ minWidth: 0 }}>
                                <Text
                                    fw={800}
                                    size="lg"
                                    style={{
                                        color: BRAND_GREEN,
                                        lineHeight: 1.15,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {portalTitle}
                                </Text>
                                <Text size="sm" c="#9CA3AF" fw={500} mt={2}>
                                    {portalSubtitle}
                                </Text>
                            </Box>
                        )}
                        <Tooltip
                            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            position="right"
                        >
                            <ActionIcon
                                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                onClick={toggle}
                                radius="xl"
                                variant="subtle"
                                color="gray"
                                style={{
                                    width: 34,
                                    height: 34,
                                    minWidth: 34,
                                    minHeight: 34,
                                    backgroundColor: '#F3F4F6',
                                    color: '#6B7280',
                                    border: '1px solid #E5E7EB',
                                    flexShrink: 0,
                                }}
                            >
                                {collapsed ? (
                                    <PanelLeft size={16} strokeWidth={2} />
                                ) : (
                                    <PanelLeftClose size={16} strokeWidth={2} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                )}

                <Stack
                    gap={collapsed ? 10 : 18}
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                    className="no-scrollbar"
                >
                    {visibleSections.map((section) => (
                        <Box key={section.title}>
                            {!collapsed && (
                                <Text
                                    size="xs"
                                    fw={700}
                                    c={SECTION_LABEL_COLOR}
                                    tt="uppercase"
                                    mb={8}
                                    pl={4}
                                    style={{ letterSpacing: '0.1em' }}
                                >
                                    {section.title}
                                </Text>
                            )}
                            <Stack gap={6}>{section.items.map(renderNavItem)}</Stack>
                        </Box>
                    ))}
                </Stack>

                <Divider color="#E5E7EB" mt="md" mb="md" style={{ flexShrink: 0 }} />

                <Box style={{ flexShrink: 0 }}>
                    <Tooltip label="Sign Out" position="right" disabled={!collapsed}>
                        <UnstyledButton
                            className="sidebar-signout"
                            onClick={() => {
                                logout();
                                notifications.show({
                                    title: 'Signed Out',
                                    message: 'You have been successfully logged out.',
                                    color: 'blue',
                                    icon: <Check size={16} />,
                                });
                                navigate('/');
                            }}
                            style={{
                                padding: collapsed ? '12px 8px' : '12px 14px',
                            }}
                        >
                            <Group justify={collapsed ? 'center' : 'flex-start'} wrap="nowrap" gap={12}>
                                <Box
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 10,
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
                                </Box>
                                {!collapsed && (
                                    <Box style={{ minWidth: 0 }}>
                                        <Text fw={700} size="sm" c="#EF4444" style={{ lineHeight: 1.2 }}>
                                            Sign Out
                                        </Text>
                                        <Text size="xs" c="#9CA3AF" fw={500} mt={2} style={{ lineHeight: 1.2 }}>
                                            End current session
                                        </Text>
                                    </Box>
                                )}
                            </Group>
                        </UnstyledButton>
                    </Tooltip>
                </Box>
            </Box>
        </>
    );
}
