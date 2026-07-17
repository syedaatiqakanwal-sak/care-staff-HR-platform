import { useState, useEffect, useCallback } from 'react';
import {
    Container, Paper, Title, Text, Table, Badge,
    Card, SimpleGrid, Button, Group, Box, Loader,
    Center, Alert, Select
} from '@mantine/core';
import {
    Shield, CheckCircle, Clock, AlertTriangle,
    RefreshCw, Globe
} from 'lucide-react';
import axios from 'axios';

interface RtwAnalytics {
    total: number;
    ukNationals: number;
    eeaNationals: number;
    rtwCompleted: number;
    rtwNotCompleted: number;
    shareCodeExpiring30: number;
    shareCodeExpiring90: number;
    shareCodeExpired: number;
}

interface RtwRecord {
    id: string;
    staffName: string;
    isUkNational: boolean;
    isEeaNational: boolean;
    visaType: string | null;
    visaOrBrpNumber: string | null;
    visaExpiryDate: string | null;
    shareCode: string | null;
    shareCodeGeneratedDate: string | null;
    rightToWorkStatus: string | null;
    rightToWorkCheckCompleted: boolean;
    rightToWorkCheckDate: string | null;
    rightToWorkCheckExpiryDate: string | null;
}

const RtwAnalyticsPage = () => {
    const [analytics, setAnalytics] = useState<RtwAnalytics | null>(null);
    const [records, setRecords] = useState<RtwRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const [analyticsRes, recordsRes] = await Promise.all([
                axios.get('/api/v1/reports/hr/rtw-analytics', { headers }),
                axios.get('/api/v1/reports/hr/rtw-analytics/all', { headers }),
            ]);
            setAnalytics(analyticsRes.data);
            setRecords(recordsRes.data || []);
        } catch {
            setError('Failed to load Right to Work analytics data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const getShareCodeStatus = (expiryDate: string | null) => {
        if (!expiryDate) return { label: 'No Date', color: 'gray' };
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysLeft = Math.ceil(
            (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft < 0) return { label: 'Expired', color: 'red' };
        if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: 'red' };
        if (daysLeft <= 90) return { label: `${daysLeft}d left`, color: 'orange' };
        return { label: 'Valid', color: 'green' };
    };

    const getNationalityLabel = (record: RtwRecord) => {
        if (record.isUkNational) return { label: 'UK National', color: 'blue' };
        if (record.isEeaNational) return { label: 'EEA National', color: 'cyan' };
        return { label: 'Other', color: 'gray' };
    };

    const filteredRecords = records.filter(r => {
        if (!statusFilter) return true;
        if (statusFilter === 'uk') return r.isUkNational;
        if (statusFilter === 'eea') return r.isEeaNational;
        if (statusFilter === 'completed') return r.rightToWorkCheckCompleted;
        if (statusFilter === 'not_completed') return !r.rightToWorkCheckCompleted;
        if (statusFilter === 'expired') {
            return getShareCodeStatus(r.visaExpiryDate).label === 'Expired';
        }
        if (statusFilter === 'expiring30') {
            const s = getShareCodeStatus(r.visaExpiryDate);
            return s.color === 'red' && s.label !== 'Expired';
        }
        return true;
    });

    if (loading) {
        return (
            <Center h={400}>
                <Loader color="green" />
            </Center>
        );
    }

    return (
        <Container size="xl" py="md">
            <Group justify="space-between" mb="lg">
                <Box>
                    <Title order={2}>Right to Work Analytics Dashboard</Title>
                    <Text c="dimmed" size="sm">
                        Track and manage right to work checks across all staff
                    </Text>
                </Box>
                <Button
                    leftSection={<RefreshCw size={16} />}
                    variant="light"
                    color="green"
                    onClick={fetchData}
                >
                    Refresh
                </Button>
            </Group>

            {error && (
                <Alert color="red" mb="md">{error}</Alert>
            )}

            {analytics && (
                <SimpleGrid cols={4} spacing="md" mb="lg">
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Globe size={24} color="#2e7d32" />
                            <Box>
                                <Text size="xs" c="dimmed">Total Staff</Text>
                                <Title order={3}>{analytics.total}</Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Shield size={24} color="#1976d2" />
                            <Box>
                                <Text size="xs" c="dimmed">UK Nationals</Text>
                                <Title order={3} c="blue">
                                    {analytics.ukNationals}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Shield size={24} color="#0097a7" />
                            <Box>
                                <Text size="xs" c="dimmed">EEA Nationals</Text>
                                <Title order={3} c="cyan">
                                    {analytics.eeaNationals}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <CheckCircle size={24} color="#2e7d32" />
                            <Box>
                                <Text size="xs" c="dimmed">RTW Check Completed</Text>
                                <Title order={3} c="green">
                                    {analytics.rtwCompleted}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <AlertTriangle size={24} color="#f44336" />
                            <Box>
                                <Text size="xs" c="dimmed">RTW Check Pending</Text>
                                <Title order={3} c="red">
                                    {analytics.rtwNotCompleted}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <AlertTriangle size={24} color="#f44336" />
                            <Box>
                                <Text size="xs" c="dimmed">Share Code Expired</Text>
                                <Title order={3} c="red">
                                    {analytics.shareCodeExpired}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Clock size={24} color="#ff9800" />
                            <Box>
                                <Text size="xs" c="dimmed">
                                    Share Code Expiring 30d
                                </Text>
                                <Title order={3} c="orange">
                                    {analytics.shareCodeExpiring30}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Clock size={24} color="#ff9800" />
                            <Box>
                                <Text size="xs" c="dimmed">
                                    Share Code Expiring 90d
                                </Text>
                                <Title order={3} c="orange">
                                    {analytics.shareCodeExpiring90}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                </SimpleGrid>
            )}

            <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>All Right to Work Records</Title>
                    <Select
                        placeholder="Filter by status"
                        clearable
                        value={statusFilter}
                        onChange={setStatusFilter}
                        data={[
                            { value: 'uk', label: 'UK Nationals' },
                            { value: 'eea', label: 'EEA Nationals' },
                            { value: 'completed', label: 'RTW Check Completed' },
                            { value: 'not_completed', label: 'RTW Check Pending' },
                            { value: 'expired', label: 'Share Code Expired' },
                            { value: 'expiring30', label: 'Expiring in 30 days' },
                        ]}
                        w={220}
                    />
                </Group>

                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Staff Name</Table.Th>
                            <Table.Th>Nationality</Table.Th>
                            <Table.Th>Visa Type</Table.Th>
                            <Table.Th>Share Code</Table.Th>
                            <Table.Th>Share Code Expiry</Table.Th>
                            <Table.Th>RTW Check</Table.Th>
                            <Table.Th>RTW Expiry</Table.Th>
                            <Table.Th>Status</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredRecords.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={8} ta="center">
                                    <Text c="dimmed" py="md">
                                        No records found
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            filteredRecords.map((record) => {
                                const nationality = getNationalityLabel(record);
                                const scStatus = getShareCodeStatus(
                                    record.visaExpiryDate
                                );
                                return (
                                    <Table.Tr key={record.id}>
                                        <Table.Td fw={500}>
                                            {record.staffName}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={nationality.color}
                                                size="sm"
                                            >
                                                {nationality.label}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {record.visaType || '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {record.shareCode || '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {formatDate(record.visaExpiryDate)}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={record.rightToWorkCheckCompleted
                                                    ? 'green' : 'red'}
                                                size="sm"
                                            >
                                                {record.rightToWorkCheckCompleted
                                                    ? 'Completed' : 'Pending'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {formatDate(
                                                record.rightToWorkCheckExpiryDate
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={scStatus.color}
                                                size="sm"
                                            >
                                                {scStatus.label}
                                            </Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>
        </Container>
    );
};

export default RtwAnalyticsPage;
