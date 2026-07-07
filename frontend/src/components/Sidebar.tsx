import { Stack, UnstyledButton, Group, Text, ThemeIcon, rem, Box, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { Users, Phone, LogOut, BookOpen, Settings, UserPlus, FileText, Menu, X, User, ClipboardCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check } from 'lucide-react';
import { logout } from '../utils/auth';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSidebar } from '../contexts/SidebarContext';

// CSS to hide scrollbar
const sidebarStyles = `
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

const data = [
    { link: '/dashboard', label: 'Staff', icon: Users },
    { link: '/register', label: 'Add Staff', icon: UserPlus }, // New Link
    { link: '/dashboard/me', label: 'View Profile', icon: User },
    { link: '/courses', label: 'Courses', icon: BookOpen },
    { link: '/dashboard/policies', label: 'Policies', icon: FileText },
    { link: '/dashboard/references/analytics', label: 'Reference', icon: ClipboardCheck },
    { link: 'https://wa.me/447999378090', label: 'Contact', icon: Phone },
    { link: '/settings', label: 'Settings', icon: Settings },
];

function isNavItemActive(link: string, pathname: string): boolean {
    if (link.startsWith('http')) return false;
    if (link === '/dashboard') {
        return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    if (link === '/dashboard/me' && pathname.startsWith('/dashboard/me')) {
        return true;
    }
    return pathname === link;
}

export function Sidebar({ onLinkClick, hideHeader = false }: { onLinkClick?: () => void; hideHeader?: boolean } = {}) {
    const navigate = useNavigate();
    const location = useLocation();
    const { collapsed, toggle } = useSidebar();

    const role = (localStorage.getItem('role') || '').toLowerCase();
    const token = localStorage.getItem('token');

    const [unreadPolicyCount, setUnreadPolicyCount] = useState(0);

    useEffect(() => {
        if (role !== 'staff' || !token) return;

        const fetchPolicyNotifs = async () => {
            try {
                const res = await axios.get('/api/v1/policy-notifications/my', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const unread = (res.data || []).filter((n: any) => !n.isRead).length;
                setUnreadPolicyCount(unread);
            } catch {
                // ignore
            }
        };

        // Initial + polling
        fetchPolicyNotifs();
        const interval = setInterval(fetchPolicyNotifs, 60000);

        // Immediate refresh when policy reader marks notifications read
        const onPolicyNotifsUpdated = () => fetchPolicyNotifs();
        window.addEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);
        };
    }, [role, token]);

    // Filter links based on role
    const filteredLinks = data.filter(item => {
        // Admin-only links
        if ((item.label === 'Staff' || item.label === 'Add Staff' || item.label === 'Settings' || item.label === 'Reference') && role !== 'admin') return false;
        // Staff-only links
        if (item.label === 'View Profile' && role !== 'staff') return false;
        return true;
    });

    const links = filteredLinks.map((item) => {
        const isActive = isNavItemActive(item.link, location.pathname);
        return (
        <Tooltip
            key={item.label}
            label={item.label}
            position="right"
            disabled={!collapsed}
        >
            <UnstyledButton
                onClick={() => {
                    if (item.link.startsWith('http')) {
                        window.open(item.link, '_blank');
                    } else if (item.link !== '#') {
                        navigate(item.link);
                    }
                    // Close mobile drawer when link is clicked
                    if (onLinkClick) {
                        onLinkClick();
                    }
                }}
                style={(theme) => ({
                    display: 'block',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    position: 'relative',
                    padding: theme.spacing.sm,
                    borderRadius: theme.radius.md,
                    transition: 'all 0.2s ease',
                    color: isActive ? 'white' : 'var(--mantine-color-gray-7)',
                    background: isActive
                        ? 'linear-gradient(135deg, #1EBAF2, #E51690)'
                        : 'transparent',
                    fontWeight: isActive ? 800 : 700,
                    boxShadow: isActive ? '0 6px 16px rgba(30, 186, 242, 0.28)' : 'none',
                    '&:hover': {
                        backgroundColor: isActive ? undefined : 'rgba(30, 186, 242, 0.12)',
                        transform: 'translateY(-2px)', // Slight lift
                    },
                })}
            >
                <Group justify={collapsed ? 'center' : 'flex-start'} wrap="nowrap" gap="sm">
                    <ThemeIcon
                        variant="transparent"
                        color={isActive ? 'white' : 'gray'}
                        size="lg"
                    >
                        <item.icon style={{ width: rem(20), height: rem(20), color: isActive ? 'white' : 'inherit' }} />
                    </ThemeIcon>
                    {!collapsed && (
                        <Group gap={8}>
                            <Text fw={700} size="sm">{item.label}</Text>
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
                                top: 4,
                                right: 4,
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
    });

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
                }}
            >
            {!hideHeader && (
                <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
                    {!collapsed && (
                        <Text fw={900} size="lg" c="brandBlue">
                            Menu
                        </Text>
                    )}
                    <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right">
                        <ActionIcon
                            variant="subtle"
                            color="brandBlue"
                            onClick={toggle}
                            size="lg"
                            style={{ marginLeft: collapsed ? 0 : 'auto' }}
                        >
                            {collapsed ? <Menu size={20} /> : <X size={20} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>
            )}
            <Stack
                gap="sm"
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
                className="no-scrollbar"
            >
                {links}
            </Stack>

            <Box style={{ borderTop: `${rem(1)} solid var(--mantine-color-gray-3)`, paddingTop: rem(16), marginTop: rem(16), flexShrink: 0 }}>
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
                        style={(theme) => ({
                            display: 'block',
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            padding: theme.spacing.sm,
                            borderRadius: theme.radius.md,
                            transition: 'all 0.3s ease',
                            color: 'var(--mantine-color-red-6)',
                            '&:hover': {
                                backgroundColor: 'rgba(250, 82, 82, 0.08)',
                                transform: 'translateX(4px)',
                            },
                        })}
                    >
                        <Group justify={collapsed ? 'center' : 'flex-start'}>
                            <ThemeIcon variant="light" color="red" size="lg" radius="md">
                                <LogOut style={{ width: rem(20), height: rem(20) }} />
                            </ThemeIcon>
                            {!collapsed && <Text fw={700} size="sm">Signout</Text>}
                        </Group>
                    </UnstyledButton>
                </Tooltip>
            </Box>
        </Box>
        </>
    );
}

