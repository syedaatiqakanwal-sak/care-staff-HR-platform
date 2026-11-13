import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Center,
    Group,
    Loader,
    Paper,
    SimpleGrid,
    Table,
    Text,
    Title,
    UnstyledButton,
    Alert,
} from '@mantine/core';
import { Calendar, ClipboardList, RefreshCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';

type ScheduledFormRecord = {
    id: string;
    formType: string;
    formSubType: string;
    staffName: string;
    staffProfileId: string | null;
    userId: string | null;
    dateOfReview: string;
    status: 'upcoming' | 'due_today' | 'overdue';
    notes: string | null;
};

type ScheduledFormsSummary = {
    counts: {
        reviews: number;
        appraisals: number;
        supervisions: number;
        dueToday: number;
        totalUpcoming: number;
    };
    records: ScheduledFormRecord[];
};

const ScheduledFormsPage = () => {
    const [summary, setSummary] = useState<ScheduledFormsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'appraisal' | 'supervision' | 'review' | 'due_today'>('all');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/dashboard/scheduled-forms');
            setSummary(res.data);
        } catch {
            setError('Failed to load scheduled appraisals, reviews and supervisions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const records = useMemo(() => {
        const rows = summary?.records ?? [];
        if (filter === 'all') return rows;
        if (filter === 'due_today') return rows.filter((row) => row.status === 'due_today');
        return rows.filter((row) => row.formType === filter);
    }, [summary, filter]);

    const chooseFilter = (next: typeof filter) => {
        setFilter((current) => (current === next ? 'all' : next));
    };

    const cardStyle = (active: boolean, color: string) => ({
        cursor: 'pointer',
        outline: active ? `2px solid ${color}` : 'none',
        outlineOffset: 2,
    });

    return (
        <Box p={{ base: 'md', sm: 'lg', md: 'xl' }} style={{ width: '100%' }}>
            <Group justify="space-between" mb="lg" align="flex-start" wrap="wrap">
                <Box>
                    <Title order={2}>Scheduled appraisals & supervisions</Title>
                    <Text c="dimmed" size="sm">
                        Staff booked for a review, appraisal or supervision — notifications fire when the date arrives
                    </Text>
                </Box>
                <Button
                    leftSection={<RefreshCw size={16} />}
                    variant="light"
                    color="green"
                    loading={loading}
                    onClick={() => void load()}
                >
                    Refresh
                </Button>
            </Group>

            {error && (
                <Alert color="red" mb="md">
                    {error}
                </Alert>
            )}

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
                <Paper withBorder p="md" radius="md" onClick={() => chooseFilter('appraisal')} style={cardStyle(filter === 'appraisal', BRAND_GREEN)}>
                    <Group gap="sm">
                        <Calendar size={22} color={BRAND_GREEN} />
                        <Box>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                Appraisals
                            </Text>
                            <Title order={3}>{loading ? '—' : summary?.counts.appraisals ?? 0}</Title>
                        </Box>
                    </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" onClick={() => chooseFilter('supervision')} style={cardStyle(filter === 'supervision', BRAND_BLUE)}>
                    <Group gap="sm">
                        <Users size={22} color={BRAND_BLUE} />
                        <Box>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                Supervisions
                            </Text>
                            <Title order={3}>{loading ? '—' : summary?.counts.supervisions ?? 0}</Title>
                        </Box>
                    </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" onClick={() => chooseFilter('review')} style={cardStyle(filter === 'review', '#64748b')}>
                    <Group gap="sm">
                        <ClipboardList size={22} color="#64748b" />
                        <Box>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                Reviews
                            </Text>
                            <Title order={3}>{loading ? '—' : summary?.counts.reviews ?? 0}</Title>
                        </Box>
                    </Group>
                </Paper>
                <Paper withBorder p="md" radius="md" onClick={() => chooseFilter('due_today')} style={cardStyle(filter === 'due_today', '#ea580c')}>
                    <Group gap="sm">
                        <Calendar size={22} color="#ea580c" />
                        <Box>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                                Due today
                            </Text>
                            <Title order={3} c="orange.7">
                                {loading ? '—' : summary?.counts.dueToday ?? 0}
                            </Title>
                        </Box>
                    </Group>
                </Paper>
            </SimpleGrid>

            <Paper withBorder p="md" radius="md">
                <Text fw={800} mb="md">
                    {filter === 'all'
                        ? 'Schedule details'
                        : filter === 'due_today'
                          ? 'Due today'
                          : filter === 'appraisal'
                            ? 'Appraisals'
                            : filter === 'supervision'
                              ? 'Supervisions'
                              : 'Reviews'}
                </Text>
                {loading ? (
                    <Center py="xl">
                        <Loader color="green" />
                    </Center>
                ) : !records.length ? (
                    <Text c="dimmed" ta="center" py="xl" size="sm">
                        {summary?.records?.length
                            ? 'Nothing matches this card. Click it again to show every scheduled item.'
                            : 'No scheduled items yet. Use Schedule Appraisal / Review / Supervision from the Compliance dashboard Quick Actions.'}
                    </Text>
                ) : (
                    <Table.ScrollContainer minWidth={700}>
                        <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Staff</Table.Th>
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Subtype</Table.Th>
                                    <Table.Th>Date</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {records.map((row) => (
                                    <Table.Tr key={row.id}>
                                        <Table.Td>
                                            {row.userId ? (
                                                <UnstyledButton
                                                    component={Link}
                                                    to={`/dashboard/staff/${row.userId}`}
                                                    style={{ fontWeight: 700, fontSize: 13, color: BRAND_BLUE }}
                                                >
                                                    {row.staffName}
                                                </UnstyledButton>
                                            ) : (
                                                <Text size="sm" fw={700}>
                                                    {row.staffName}
                                                </Text>
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                variant="light"
                                                color={
                                                    row.formType === 'appraisal'
                                                        ? 'green'
                                                        : row.formType === 'supervision'
                                                          ? 'blue'
                                                          : 'gray'
                                                }
                                            >
                                                {row.formType}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{row.formSubType}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" fw={600}>
                                                {new Date(row.dateOfReview).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                color={
                                                    row.status === 'due_today'
                                                        ? 'orange'
                                                        : row.status === 'overdue'
                                                          ? 'red'
                                                          : 'teal'
                                                }
                                                variant="light"
                                            >
                                                {row.status === 'due_today'
                                                    ? 'Due today'
                                                    : row.status === 'overdue'
                                                      ? 'Overdue'
                                                      : 'Upcoming'}
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>
        </Box>
    );
};

export default ScheduledFormsPage;
