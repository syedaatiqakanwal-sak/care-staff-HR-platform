import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar,
    Badge,
    Box,
    Button,
    Container,
    Group,
    Modal,
    Paper,
    SegmentedControl,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from '@mantine/core';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { ChevronRight, Search, UserPlus, Users } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { useRole } from '../hooks/useRole';
import api from '../utils/api';

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';
const PAGE_SIZE = 12;

const CARD_GRADIENTS = [
    { bg: `linear-gradient(145deg, ${BRAND_GREEN} 0%, #0e7a2d 100%)`, shadow: 'rgba(19, 150, 57, 0.3)' },
    { bg: `linear-gradient(145deg, ${BRAND_BLUE} 0%, ${BRAND_BLUE} 100%)`, shadow: 'rgba(38, 127, 186, 0.3)' },
    { bg: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1d6a9e 100%)`, shadow: 'rgba(38, 127, 186, 0.3)' },
];

const METRIC_FILTER_LABELS: Record<string, string> = {
    active: 'Total Active',
    new_starters: 'New Starters',
    on_shadow: 'On Shadow',
    dbs_expiring: 'DBS Expiring',
    dbs_declaration_due: 'DBS Declaration Due',
    share_code_expiring: 'Share Code Expiring',
    visa_expiring: 'Visa Expiring',
    training_due: 'Training Due',
    reviews_due: 'Reviews Due',
    supervisions_due: 'Supervisions Due',
    appraisals_due: 'Appraisals Due',
};

type StaffMember = {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    department?: string;
    ilccsNumber?: string;
    lcaNumber?: string;
    profilePicture?: string | null;
    employmentStatus?: string;
    isActive: boolean;
};

type RawStaffProfile = {
    user?: { id: string; email: string; isActive?: boolean };
    firstName: string;
    lastName: string;
    middleName?: string;
    department?: string;
    ilccsNumber?: string;
    lcaNumber?: string;
    profilePicture?: string | null;
    employmentStatus?: string;
};

function staffDisplayName(s: StaffMember) {
    return [s.firstName, s.lastName].filter(Boolean).join(' ').trim() || (s.firstName || '').trim() || 'Staff';
}

function fullName(s: StaffMember) {
    return [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || staffDisplayName(s);
}

function displayId(s: StaffMember) {
    return s.lcaNumber || s.ilccsNumber || 'N/A';
}

export const StaffDirectoryPage = ({ searchQuery = '' }: { searchQuery?: string }) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const listFilter = searchParams.get('filter') || '';
    const addOpen = searchParams.get('add') === '1';

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [filterUserIds, setFilterUserIds] = useState<Set<string> | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(addOpen);
    const [localSearch, setLocalSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusTab, setStatusTab] = useState<string>('all');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string>>({});
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { canMutate, isAdmin } = useRole();

    // Tracks staff ids we've already requested a profile picture for (or are ineligible),
    // so re-renders don't keep re-issuing the same picture request.
    const fetchedPictureIdsRef = useRef<Set<string>>(new Set());
    // All object URLs ever created, revoked only on unmount to avoid invalidating
    // images that are still being displayed.
    const pictureObjectUrlsRef = useRef<string[]>([]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(localSearch.trim()), 300);
        return () => clearTimeout(t);
    }, [localSearch]);

    // Keep page search box in sync when the header search drives navigation/filtering.
    useEffect(() => {
        const q = searchQuery.trim();
        if (q && q !== localSearch.trim()) {
            setLocalSearch(q);
        }
    }, [searchQuery]);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const limit = 200;
            const res = await api.get('/api/v1/staff', { params: { page: 1, limit } });
            const payload = res.data;
            const isPaginated = payload && typeof payload === 'object' && Array.isArray(payload.data);
            // Tolerate the legacy bare-array response shape as well as the new { data, meta } shape.
            let rawRows: RawStaffProfile[] = isPaginated ? payload.data : Array.isArray(payload) ? payload : [];
            const totalPages = isPaginated ? Number(payload.meta?.totalPages) || 1 : 1;

            if (isPaginated && totalPages > 1) {
                const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
                const batches = await Promise.all(
                    remainingPages.map((page) =>
                        api
                            .get('/api/v1/staff', { params: { page, limit } })
                            .then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
                    ),
                );
                batches.forEach((b) => {
                    rawRows = rawRows.concat(b);
                });
            }

            const rows: StaffMember[] = rawRows
                .map(
                    (p: RawStaffProfile) => ({
                        id: p.user?.id ?? '',
                        firstName: p.firstName,
                        lastName: p.lastName,
                        middleName: p.middleName,
                        email: p.user?.email ?? '',
                        department: p.department,
                        ilccsNumber: p.ilccsNumber,
                        lcaNumber: p.lcaNumber,
                        // Only request the profile-picture endpoint when the DB actually has a stored profilePicture path.
                        // Otherwise the backend correctly returns 404 and the browser logs become noisy.
                        profilePicture: p.profilePicture && p.user?.id
                            ? `/api/v1/staff/${p.user.id}/profile-picture?v=${encodeURIComponent(
                                  String(p.profilePicture).split('/').pop() || String(Date.now()),
                              )}`
                            : null,
                        employmentStatus: p.employmentStatus,
                        isActive: p.user?.isActive !== false,
                    }),
                )
                .filter((r: StaffMember) => r.id);
            setStaff(rows);
            // New staff list means previous picture fetches/urls are no longer relevant.
            fetchedPictureIdsRef.current = new Set();
            setProfilePictureUrls({});
        } catch (err) {
            console.error('Failed to load staff list', err);
            setStaff([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    // Revoke all created object URLs only when the component unmounts.
    useEffect(() => {
        const urlsRef = pictureObjectUrlsRef;
        return () => {
            urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    useEffect(() => {
        setModalOpen(addOpen);
    }, [addOpen]);

    useEffect(() => {
        if (!listFilter) {
            setFilterUserIds(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await api.get('/api/v1/dashboard/hr-stats');
                const ids = new Set<string>(
                    (res.data?.users || [])
                        .filter((u: { filters?: string[] }) =>
                            (u.filters || []).includes(listFilter),
                        )
                        .map((u: { id: string }) => u.id),
                );
                if (!cancelled) setFilterUserIds(ids);
            } catch {
                if (!cancelled) setFilterUserIds(new Set());
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [listFilter]);

    const counts = useMemo(() => {
        const total = staff.length;
        const active = staff.filter((s) => s.isActive).length;
        const inactive = staff.filter((s) => !s.isActive).length;
        return { total, active, inactive };
    }, [staff]);

    const combinedSearch = debouncedSearch || searchQuery.trim().toLowerCase();

    const filteredStaff = useMemo(() => {
        const q = combinedSearch.toLowerCase();
        return staff.filter((s) => {
            if (filterUserIds && !filterUserIds.has(s.id)) return false;
            if (statusTab === 'active' && !s.isActive) return false;
            if (statusTab === 'inactive' && s.isActive) return false;
            if (!q) return true;
            const hay = `${fullName(s)} ${s.email} ${displayId(s)} ${s.department || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [staff, combinedSearch, filterUserIds, statusTab]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [combinedSearch, statusTab, listFilter]);

    const visibleStaff = filteredStaff.slice(0, visibleCount);
    const hasMore = visibleCount < filteredStaff.length;

    // Only fetch profile pictures for the rows currently visible on screen, with a small
    // concurrency cap, instead of an unbounded Promise.all across the whole staff list.
    useEffect(() => {
        const toFetch = visibleStaff.filter(
            (m) => m.profilePicture && !fetchedPictureIdsRef.current.has(m.id),
        );
        if (toFetch.length === 0) return;
        toFetch.forEach((m) => fetchedPictureIdsRef.current.add(m.id));

        let cancelled = false;
        const CONCURRENCY = 4;

        (async () => {
            for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
                if (cancelled) return;
                const batch = toFetch.slice(i, i + CONCURRENCY);
                const results = await Promise.all(
                    batch.map(async (member) => {
                        try {
                            const imgRes = await api.get(member.profilePicture as string, {
                                responseType: 'blob',
                                headers: {
                                    'Cache-Control': 'no-cache',
                                    Pragma: 'no-cache',
                                },
                            });
                            return { id: member.id, url: URL.createObjectURL(imgRes.data) };
                        } catch {
                            return null;
                        }
                    }),
                );
                if (cancelled) return;
                setProfilePictureUrls((prev) => {
                    const next = { ...prev };
                    results.forEach((r) => {
                        if (r) {
                            next[r.id] = r.url;
                            pictureObjectUrlsRef.current.push(r.url);
                        }
                    });
                    return next;
                });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [visibleStaff]);

    const closeModal = () => {
        setModalOpen(false);
        if (searchParams.get('add')) {
            const next = new URLSearchParams(searchParams);
            next.delete('add');
            setSearchParams(next, { replace: true });
        }
    };

    const openModal = () => {
        setModalOpen(true);
        const next = new URLSearchParams(searchParams);
        next.set('add', '1');
        setSearchParams(next, { replace: true });
    };

    const clearListFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('filter');
        setSearchParams(next, { replace: true });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/api/v1/staff/${deleteTarget.id}`);
            setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : 'Failed to delete user';
            notifications.show({
                title: 'Error',
                message: (Array.isArray(msg) ? msg.join(' ') : msg) || 'Failed to delete user',
                color: 'red',
            });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box p="md" pb={24}>
            <Container size="xl" p={0}>
                <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
                    <Box>
                        <Group align="center" gap="xs" mb={4}>
                            <ThemeIcon variant="light" size="md" radius="md" color="brandGreen.6">
                                <Users size={16} />
                            </ThemeIcon>
                            <Text fw={700} c="brandGreen.6" tt="uppercase" size="xs" style={{ letterSpacing: '0.5px' }}>
                                Team
                            </Text>
                        </Group>
                        <Title order={1} size={28} fw={900} c="dark.4">
                            Staff Directory
                            {!loading && (
                                <Text span c="dimmed" fw={700} size="lg" ml="sm">
                                    ({filteredStaff.length}
                                    {filteredStaff.length !== counts.total ? ` of ${counts.total}` : ''})
                                </Text>
                            )}
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Browse and manage staff profiles.
                        </Text>
                    </Box>
                    <Button
                        color="brandGreen.6"
                        leftSection={<UserPlus size={18} />}
                        onClick={openModal}
                    >
                        Add Staff
                    </Button>
                </Group>

                <Paper p="md" radius="lg" withBorder mb="lg">
                    <Stack gap="md">
                        <TextInput
                            placeholder="Search by name, staff number, or email…"
                            leftSection={<Search size={18} />}
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.currentTarget.value)}
                            size="md"
                            radius="md"
                        />
                        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                            <SegmentedControl
                                value={statusTab}
                                onChange={setStatusTab}
                                data={[
                                    { label: `All (${counts.total})`, value: 'all' },
                                    { label: `Active (${counts.active})`, value: 'active' },
                                    { label: `Inactive (${counts.inactive})`, value: 'inactive' },
                                ]}
                                radius="xl"
                                color="brandBlue"
                            />
                            {listFilter && (
                                <Group gap="xs">
                                    <Badge size="lg" color="brandBlue.6" variant="light">
                                        {METRIC_FILTER_LABELS[listFilter] || listFilter}
                                    </Badge>
                                    <Button variant="subtle" size="xs" onClick={clearListFilter}>
                                        Clear filter
                                    </Button>
                                </Group>
                            )}
                        </Group>
                    </Stack>
                </Paper>

                {loading ? (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} height={220} radius="lg" />
                        ))}
                    </SimpleGrid>
                ) : visibleStaff.length > 0 ? (
                    <>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                            {visibleStaff.map((member, index) => {
                                const style = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
                                const name = staffDisplayName(member);
                                const initials = name
                                    .split(' ')
                                    .map((w) => w[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2);

                                return (
                                    <Paper
                                        key={member.id}
                                        p={0}
                                        radius="lg"
                                        style={{
                                            overflow: 'hidden',
                                            background: style.bg,
                                            boxShadow: `0 10px 40px ${style.shadow}`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minHeight: 220,
                                        }}
                                    >
                                        <Box p="md" style={{ flex: 1 }}>
                                            <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                                                <Avatar
                                                    size={52}
                                                    radius="md"
                                                    src={profilePictureUrls[member.id]}
                                                    styles={{ placeholder: { color: 'white', fontWeight: 800 } }}
                                                >
                                                    {initials}
                                                </Avatar>
                                                <Stack gap={4} align="flex-end">
                                                    <Badge
                                                        size="sm"
                                                        variant="filled"
                                                        style={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {member.employmentStatus || 'ACTIVE'}
                                                    </Badge>
                                                    {!member.isActive && (
                                                        <Badge size="xs" color="gray" variant="light">
                                                            Account inactive
                                                        </Badge>
                                                    )}
                                                </Stack>
                                            </Group>
                                            <Text size="md" fw={800} c="white" lineClamp={2} mb={4}>
                                                {name}
                                            </Text>
                                            <Text size="xs" c="white" opacity={0.85} fw={600} lineClamp={1}>
                                                {member.department || 'Staff'}
                                            </Text>
                                            <Text size="xs" c="white" opacity={0.75} mt={4}>
                                                Staff Number: {displayId(member)}
                                            </Text>
                                        </Box>
                                        <Box
                                            p="sm"
                                            bg="rgba(0,0,0,0.12)"
                                            style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
                                        >
                                            <Stack gap="xs">
                                                <Button
                                                    component={Link}
                                                    to={`/dashboard/staff/${member.id}`}
                                                    variant="filled"
                                                    size="xs"
                                                    fullWidth
                                                    rightSection={<ChevronRight size={14} />}
                                                    styles={{
                                                        root: {
                                                            backgroundColor: 'rgba(255,255,255,0.22)',
                                                            border: '1px solid rgba(255,255,255,0.35)',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                        },
                                                    }}
                                                >
                                                    View Profile
                                                </Button>
                                                {canMutate && isAdmin && (
                                                    <Button
                                                        variant="filled"
                                                        size="xs"
                                                        color="red"
                                                        fullWidth
                                                        onClick={() => setDeleteTarget(member)}
                                                        styles={{
                                                            root: {
                                                                backgroundColor: 'rgba(180, 0, 0, 0.35)',
                                                                color: 'white',
                                                                fontWeight: 700,
                                                            },
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </Stack>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </SimpleGrid>
                        {hasMore && (
                            <Group justify="center" mt="xl">
                                <Button
                                    variant="light"
                                    color="brandBlue.6"
                                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                                >
                                    Load more ({filteredStaff.length - visibleCount} remaining)
                                </Button>
                            </Group>
                        )}
                    </>
                ) : (
                    <Paper p={48} radius="lg" withBorder ta="center" bg="gray.0">
                        <ThemeIcon size={56} radius="xl" color="gray" variant="light" mb="md" mx="auto">
                            <Search size={28} />
                        </ThemeIcon>
                        <Title order={4} c="dimmed">
                            No staff found
                        </Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Try adjusting your search or filters.
                        </Text>
                    </Paper>
                )}
            </Container>

            <AddStaffModal
                opened={modalOpen}
                onClose={closeModal}
                onCreated={(userId) => {
                    closeModal();
                    fetchStaff();
                    if (userId) navigate(`/dashboard/staff/${userId}`);
                }}
            />

            <Modal
                opened={!!deleteTarget}
                onClose={() => !deleting && setDeleteTarget(null)}
                title="Delete staff member"
                centered
            >
                <Text size="sm">
                    Delete <strong>{deleteTarget ? fullName(deleteTarget) : ''}</strong>? This cannot be undone.
                </Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button color="red" loading={deleting} onClick={handleDelete}>
                        Delete
                    </Button>
                </Group>
            </Modal>
        </Box>
    );
};
