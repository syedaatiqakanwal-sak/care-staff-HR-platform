import { useState, useEffect, useCallback } from 'react';
import {
    Container, Paper, Title, Text, Table, Badge,
    Card, SimpleGrid, Button, Group, Box, Loader,
    Center, Alert, Select
} from '@mantine/core';
import {
    Shield, CheckCircle, Clock, AlertTriangle,
    RefreshCw, FileCheck
} from 'lucide-react';
import axios from 'axios';

interface DbsAnalytics {
    total: number;
    updateServiceEnrolled: number;
    expiringIn30Days: number;
    expiringIn90Days: number;
    expired: number;
    noRenewalDate: number;
}

interface DbsRecord {
    id: string;
    staffId: string;
    staffName: string;
    dbsNumber: string;
    dbsCertificateNumber: string | null;
    issueDate: string | null;
    renewalDate: string | null;
    lastDeclarationDate: string | null;
    nextDeclarationDate: string | null;
    updateServiceStatus: boolean;
    enrolledDate: string | null;
}

const DbsAnalyticsPage = () => {
    const [analytics, setAnalytics] = useState<DbsAnalytics | null>(null);
    const [records, setRecords] = useState<DbsRecord[]>([]);
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
                axios.get('/api/v1/documents/dbs/analytics', { headers }),
                axios.get('/api/v1/documents/dbs/analytics/all', { headers }),
            ]);
            setAnalytics(analyticsRes.data);
            setRecords(recordsRes.data || []);
        } catch {
            setError('Failed to load DBS analytics data.');
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

    const getExpiryStatus = (renewalDate: string | null) => {
        if (!renewalDate) return { label: 'No Date', color: 'gray' };
        const today = new Date();
        const renewal = new Date(renewalDate);
        const daysLeft = Math.ceil(
            (renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft < 0) return { label: 'Expired', color: 'red' };
        if (daysLeft <= 30) return { label: `${daysLeft}d left`, color: 'red' };
        if (daysLeft <= 90) return { label: `${daysLeft}d left`, color: 'orange' };
        return { label: 'Valid', color: 'green' };
    };

    const filteredRecords = records.filter(r => {
        if (!statusFilter) return true;
        const status = getExpiryStatus(r.renewalDate);
        if (statusFilter === 'expired') return status.label === 'Expired';
        if (statusFilter === 'expiring30') return status.color === 'red' && status.label !== 'Expired';
        if (statusFilter === 'expiring90') return status.color === 'orange';
        if (statusFilter === 'enrolled') return r.updateServiceStatus;
        if (statusFilter === 'valid') return status.color === 'green';
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
                    <Title order={2}>DBS Analytics Dashboard</Title>
                    <Text c="dimmed" size="sm">
                        Track and manage DBS records across all staff
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
                <SimpleGrid cols={3} spacing="md" mb="lg">
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <FileCheck size={24} color="#2e7d32" />
                            <Box>
                                <Text size="xs" c="dimmed">Total DBS Records</Text>
                                <Title order={3}>{analytics.total}</Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <CheckCircle size={24} color="#2e7d32" />
                            <Box>
                                <Text size="xs" c="dimmed">Update Service Enrolled</Text>
                                <Title order={3}>{analytics.updateServiceEnrolled}</Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <AlertTriangle size={24} color="#f44336" />
                            <Box>
                                <Text size="xs" c="dimmed">Expired</Text>
                                <Title order={3} c="red">{analytics.expired}</Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Clock size={24} color="#ff9800" />
                            <Box>
                                <Text size="xs" c="dimmed">Expiring in 30 Days</Text>
                                <Title order={3} c="orange">
                                    {analytics.expiringIn30Days}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Clock size={24} color="#ff9800" />
                            <Box>
                                <Text size="xs" c="dimmed">Expiring in 90 Days</Text>
                                <Title order={3} c="orange">
                                    {analytics.expiringIn90Days}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                    <Card withBorder p="md" radius="md">
                        <Group>
                            <Shield size={24} color="#9e9e9e" />
                            <Box>
                                <Text size="xs" c="dimmed">No Renewal Date Set</Text>
                                <Title order={3} c="dimmed">
                                    {analytics.noRenewalDate}
                                </Title>
                            </Box>
                        </Group>
                    </Card>
                </SimpleGrid>
            )}

            <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="md">
                    <Title order={4}>All DBS Records</Title>
                    <Select
                        placeholder="Filter by status"
                        clearable
                        value={statusFilter}
                        onChange={setStatusFilter}
                        data={[
                            { value: 'expired', label: 'Expired' },
                            { value: 'expiring30', label: 'Expiring in 30 days' },
                            { value: 'expiring90', label: 'Expiring in 90 days' },
                            { value: 'enrolled', label: 'Update Service Enrolled' },
                            { value: 'valid', label: 'Valid' },
                        ]}
                        w={220}
                    />
                </Group>

                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Staff Name</Table.Th>
                            <Table.Th>DBS Number</Table.Th>
                            <Table.Th>Issue Date</Table.Th>
                            <Table.Th>Renewal Date</Table.Th>
                            <Table.Th>Last Declaration</Table.Th>
                            <Table.Th>Next Declaration</Table.Th>
                            <Table.Th>Update Service</Table.Th>
                            <Table.Th>Status</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredRecords.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={8} ta="center">
                                    <Text c="dimmed" py="md">
                                        No DBS records found
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            filteredRecords.map((record) => {
                                const status = getExpiryStatus(record.renewalDate);
                                return (
                                    <Table.Tr key={record.id}>
                                        <Table.Td fw={500}>
                                            {record.staffName}
                                        </Table.Td>
                                        <Table.Td>
                                            {record.dbsNumber || '—'}
                                        </Table.Td>
                                        <Table.Td>
                                            {formatDate(record.issueDate)}
                                        </Table.Td>
                                        <Table.Td>
                                            {formatDate(record.renewalDate)}
                                        </Table.Td>
                                        <Table.Td>
                                            {formatDate(record.lastDeclarationDate)}
                                        </Table.Td>
                                        <Table.Td>
                                            {formatDate(record.nextDeclarationDate)}
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={record.updateServiceStatus
                                                    ? 'green' : 'gray'}
                                                size="sm"
                                            >
                                                {record.updateServiceStatus
                                                    ? 'Enrolled' : 'No'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={status.color}
                                                size="sm"
                                            >
                                                {status.label}
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

export default DbsAnalyticsPage;
