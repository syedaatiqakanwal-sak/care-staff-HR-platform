import { Group, ActionIcon, Indicator, Avatar, Box, Text, Divider, TextInput, Menu, UnstyledButton } from '@mantine/core';
import { Bell, Search, Settings, User, LogOut, ShieldCheck, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { notifications as mantineNotifications } from '@mantine/notifications';

export const TopHeader = ({ searchQuery, onSearch }: { searchQuery?: string, onSearch?: (val: string) => void }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const knownIdsRef = useRef<Set<string>>(new Set());

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            console.log('Fetching notifications...'); // DEBUG
            const res = await axios.get('/api/v1/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Notifications fetched:', res.data); // DEBUG
            const fetched = res.data;
            setNotifications(fetched);
            setUnreadCount(fetched.filter((n: any) => !n.isRead).length);

            // Check for new unread notifications to popup
            // Check for new unread notifications to popup
            const newUnread = fetched.filter((n: any) => !n.isRead && !knownIdsRef.current.has(n.id));
            const certNotifications = newUnread.filter((n: any) => n.metadata?.certificateId);
            const otherNotifications = newUnread.filter((n: any) => !n.metadata?.certificateId);

            // 1. Handle Certificate Notifications
            if (certNotifications.length > 1) {
                // Grouped Notification
                mantineNotifications.show({
                    title: 'Certificates Ready',
                    message: (
                        <Box
                            onClick={() => navigate('/dashboard/me?tab=certificates')}
                            style={{ cursor: 'pointer' }}
                        >
                            {`${certNotifications.length} certificates are ready to download. Click here to view them.`}
                        </Box>
                    ),
                    color: 'brandBlue',
                    icon: <ShieldCheck size={18} />,
                    autoClose: 5000,
                    withCloseButton: true,
                });
                // Mark all as known so we don't show them again
                certNotifications.forEach((n: any) => knownIdsRef.current.add(n.id));
            } else if (certNotifications.length === 1) {
                // Single Notification
                const n = certNotifications[0];
                mantineNotifications.show({
                    title: n.title,
                    message: (
                        <Box
                            onClick={() => navigate('/dashboard/me?tab=certificates')}
                            style={{ cursor: 'pointer' }}
                        >
                            {n.message}
                        </Box>
                    ),
                    color: 'brandBlue',
                    icon: <ShieldCheck size={18} />,
                    autoClose: 5000,
                    withCloseButton: true,
                });
                knownIdsRef.current.add(n.id);
            }

            // 2. Handle Other Notifications (Show individual popups)
            otherNotifications.forEach((n: any) => {
                mantineNotifications.show({
                    title: n.title,
                    message: n.message, // Standard message for others
                    color: 'brandBlue',
                    icon: <Mail size={18} />,
                    autoClose: 5000,
                    withCloseButton: true,
                });
                knownIdsRef.current.add(n.id);
            });

            // 3. Mark existing read ones as known just in case
            fetched.forEach((n: any) => {
                if (n.isRead) knownIdsRef.current.add(n.id);
            });

        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    };

    // Polling every 60s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkRead = async (id: string, metadata?: any) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/v1/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            // Interaction logic
            if (metadata?.certificateId) {
                // Navigate to certificates or trigger download?
                // For now, let's navigate to dashboard/certificates (if that route existed) or just alert
                // Actually the user just wants to know "download it".
                // I'll assume navigating to the My Certificates page is best if it exists, or just root.
                // Assuming /dashboard loads My Certificates by default for staff.
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Failed to mark read');
        }
    };

    return (
        <Group justify="space-between" px={{ base: 'sm', md: 'xl' }} h="100%" style={{ background: 'transparent', width: '100%', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', gap: '12px', flexShrink: 0 }}>
                <Box
                    style={{
                        backgroundColor: 'white',
                        padding: '5px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    <img src="/assets/logo.png" alt="Inspire London College Logo" style={{ height: 36, width: 'auto' }} />
                </Box>
                <Box hiddenFrom="sm">
                    <Text fw={900} size="lg" c="#1A1A1A" style={{ lineHeight: 1, letterSpacing: '-0.5px' }}>Inspire London College</Text>
                </Box>
                <Box visibleFrom="sm">
                    <Text fw={900} size="24px" c="#1A1A1A" style={{ lineHeight: 1, letterSpacing: '-0.5px' }}>Inspire London College</Text>
                    <Text size="11px" c="#1EBAF2" opacity={0.9} fw={700} tt="uppercase" style={{ fontSize: '10px', letterSpacing: '1.5px', marginTop: '4px' }}>learning management portal</Text>
                </Box>
            </Link>

            {/* Search Bar - Center */}
            <TextInput
                placeholder="Search staff..."
                size="xs"
                radius="xl"
                leftSection={<Search size={14} color="white" />}
                value={searchQuery}
                onChange={(e) => onSearch?.(e.currentTarget.value)}
                style={{ flex: 1, maxWidth: 700, margin: '0 auto' }}
                styles={{
                    input: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(30, 186, 242, 0.35)',
                        color: '#333333',
                        '&::placeholder': { color: 'rgba(51, 51, 51, 0.6)' }
                    }
                }}
                visibleFrom="sm"
            />

            {/* Right Side - Bell and Profile */}
            <Group gap="sm" style={{ flexShrink: 0, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <Menu shadow="md" width={320} position="bottom-end" radius="md">
                    <Menu.Target>
                        <ActionIcon variant="filled" color="rgba(255,255,255,0.1)" size="lg" radius="xl">
                            <Indicator disabled={unreadCount === 0} color="#E51690" size={8} offset={2} withBorder processing>
                                <Bell size={18} color="#1A1A1A" />
                            </Indicator>
                        </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown p="xs">
                        <Menu.Label>Recent Notifications</Menu.Label>
                        {notifications.length === 0 ? (
                            <Text size="sm" c="dimmed" p="md" ta="center">No new notifications</Text>
                        ) : (
                            notifications.map((notif) => (
                                <Menu.Item
                                    key={notif.id}
                                    leftSection={
                                        notif.metadata?.certificateId ? <ShieldCheck size={16} color="#1EBAF2" /> : <Mail size={16} />
                                    }
                                    style={{ backgroundColor: notif.isRead ? 'transparent' : 'rgba(30, 186, 242, 0.1)' }}
                                    onClick={() => handleMarkRead(notif.id, notif.metadata)}
                                >
                                    <Text size="sm" fw={700} c={notif.isRead ? 'dimmed' : 'dark'}>{notif.title}</Text>
                                    <Text size="xs" c="dimmed" lineClamp={2}>{notif.message}</Text>
                                </Menu.Item>
                            ))
                        )}
                    </Menu.Dropdown>
                </Menu>

                <Divider orientation="vertical" h={32} my="auto" color="rgba(255,255,255,0.2)" visibleFrom="sm" />

                <Menu shadow="md" width={220} position="bottom-end" radius="md">
                    <Menu.Target>
                        <UnstyledButton>
                            <Group gap="xs" style={{ cursor: 'pointer' }}>
                                <Box visibleFrom="md" ta="right">
                                    <Text fw={800} size="13px" c="white" lh={1}>
                                        {localStorage.getItem('userName') || 'User'}
                                    </Text>
                                    <Text size="10px" c="white" opacity={0.7} fw={700} mt={2}>
                                        {(localStorage.getItem('role') || '').toLowerCase() === 'admin' ? 'Admin Portal 🚀' : 'Staff Portal'}
                                    </Text>
                                </Box>
                                <Avatar color="white" radius="xl" size="md" styles={{ placeholder: { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 900 } }}>
                                    {localStorage.getItem('userName')?.charAt(0) || 'U'}
                                </Avatar>
                            </Group>
                        </UnstyledButton>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Label>Account Management</Menu.Label>
                        {(localStorage.getItem('role') || '').toLowerCase() !== 'admin' && (
                            <Menu.Item
                                component={Link}
                                to="/dashboard/me"
                                leftSection={<User size={14} />}
                            >
                                View Profile
                            </Menu.Item>
                        )}
                        <Menu.Item
                            component={Link}
                            to="/settings"
                            leftSection={<Settings size={14} />}
                        >
                            Settings
                        </Menu.Item>

                        <Menu.Divider />

                        <Menu.Item
                            color="red"
                            leftSection={<LogOut size={14} />}
                            onClick={() => navigate('/')}
                        >
                            Sign Out
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Group>
    );
};

