import {
    Stack,
    UnstyledButton,
    Group,
    Text,
    ThemeIcon,
    rem,
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
    FileText,
    User,
    ClipboardCheck,
    FileBarChart,
    ScrollText,
    LayoutDashboard,
    BarChart3,
    Shield,
    Globe,
    ChevronLeft,
    ChevronRight,
    type LucideIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check } from 'lucide-react';
import { logout } from '../utils/auth';
import { canViewAuditLog, hasDashboardAccess, isStaffPortalRole, isStrictAdmin } from '../utils/roles';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSidebar } from '../contexts/SidebarContext';

const ICON_SIZE = 20;
const BRAND_GREEN = '#139639';
const INACTIVE_TEXT = '#4B5563';
const SECTION_LABEL_COLOR = '#9CA3AF';
const SIDEBAR_WIDTH_EXPANDED = 272;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const TOGGLE_SIZE = 26;
const TOGGLE_EDGE_INSET = 8;

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
            { link: '/dashboard/policies', label: 'Policies', icon: FileText },
        ],
    },
    {
        title: 'HR',
        items: [
            { link: '/dashboard/references/analytics', label: 'Reference', icon: ClipboardCheck },
            { link: '/dashboard/dbs/analytics', label: 'DBS', icon: Shield },
            { link: '/dashboard/rtw/analytics', label: 'Right to Work', icon: Globe },
            { link: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
            { link: '/dashboard/reports/analytics', label: 'Analytics', icon: BarChart3 },
        ],
    },
    {
        title: 'SYSTEM',
        items: [
            { link: '/dashboard/audit-logs', label: 'Audit Log', icon: ScrollText },
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
                    onClick={() => handleNavigate(item.link)}
                    style={{
                        display: 'block',
                        width: '100%',
                        boxSizing: 'border-box',
                        position: 'relative',
                        padding: collapsed ? `${rem(10)} ${rem(8)}` : `${rem(10)} ${rem(12)}`,
                        borderRadius: rem(12),
                        transition: 'background-color 0.2s ease, color 0.2s ease',
                        color: isActive ? '#ffffff' : INACTIVE_TEXT,
                        backgroundColor: isActive ? BRAND_GREEN : 'transparent',
                        fontWeight: isActive ? 700 : 600,
                        boxShadow: isActive ? '0 4px 12px rgba(19, 150, 57, 0.22)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                        if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'rgba(19, 150, 57, 0.1)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }
                    }}
                >
                    <Group justify={collapsed ? 'center' : 'flex-start'} wrap="nowrap" gap={10}>
                        <Icon
                            size={ICON_SIZE}
                            strokeWidth={2}
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
                p="md"
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
                }}
            >
                {!hideHeader && (
                    <Tooltip
                        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        position="right"
                    >
                        <ActionIcon
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            onClick={toggle}
                            radius="xl"
                            style={{
                                position: 'fixed',
                                top: '50vh',
                                left: (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED) - TOGGLE_SIZE - TOGGLE_EDGE_INSET,
                                transform: 'translateY(-50%)',
                                zIndex: 200,
                                width: TOGGLE_SIZE,
                                height: TOGGLE_SIZE,
                                minWidth: TOGGLE_SIZE,
                                minHeight: TOGGLE_SIZE,
                                padding: 0,
                                backgroundColor: BRAND_GREEN,
                                border: `1px solid ${BRAND_GREEN}`,
                                color: '#ffffff',
                                boxShadow: '0 1px 6px rgba(19, 150, 57, 0.22)',
                            }}
                        >
                            {collapsed ? (
                                <ChevronRight size={14} strokeWidth={2.5} />
                            ) : (
                                <ChevronLeft size={14} strokeWidth={2.5} />
                            )}
                        </ActionIcon>
                    </Tooltip>
                )}

                <Stack
                    gap={collapsed ? 'xs' : 'lg'}
                    style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                    className="no-scrollbar"
                >
                    {visibleSections.map((section, sectionIndex) => (
                        <Box key={section.title}>
                            {!collapsed && (
                                <Text
                                    size="xs"
                                    fw={700}
                                    c={SECTION_LABEL_COLOR}
                                    tt="uppercase"
                                    mb="xs"
                                    pl={4}
                                    style={{ letterSpacing: '0.08em' }}
                                >
                                    {section.title}
                                </Text>
                            )}
                            <Stack gap={6}>{section.items.map(renderNavItem)}</Stack>
                            {!collapsed && sectionIndex < visibleSections.length - 1 && (
                                <Box mt="sm" />
                            )}
                        </Box>
                    ))}
                </Stack>

                <Divider color="#E5E7EB" mt="md" mb="md" style={{ flexShrink: 0 }} />

                <Box style={{ flexShrink: 0 }}>
                    <Tooltip label="Signout" position="right" disabled={!collapsed}>
                        <UnstyledButton
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
                                display: 'block',
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: collapsed ? `${rem(10)} ${rem(8)}` : `${rem(10)} ${rem(12)}`,
                                borderRadius: rem(12),
                                transition: 'background-color 0.2s ease',
                                color: 'var(--mantine-color-red-6)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(250, 82, 82, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <Group justify={collapsed ? 'center' : 'flex-start'} wrap="nowrap" gap={10}>
                                <ThemeIcon variant="light" color="red" size="lg" radius="md">
                                    <LogOut size={ICON_SIZE} />
                                </ThemeIcon>
                                {!collapsed && (
                                    <Text fw={700} size="sm" c="red.6">
                                        Signout
                                    </Text>
                                )}
                            </Group>
                        </UnstyledButton>
                    </Tooltip>
                </Box>
            </Box>
        </>
    );
}
