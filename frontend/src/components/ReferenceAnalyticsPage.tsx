import { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Table,
    Badge,
    Group,
    Stack,
    SimpleGrid,
    Card,
    Button,
    Loader,
    Alert,
    Select,
    Box,
    ThemeIcon,
    Modal,
    ScrollArea,
    ActionIcon,
    Tooltip,
    SimpleGrid as MantineSimpleGrid,
} from '@mantine/core';
import {
    FileText,
    CheckCircle,
    Clock,
    Mail,
    Eye,
    XCircle,
    RefreshCw,
    Download,
    Send,
} from 'lucide-react';
import axios from 'axios';
import { notifications } from '@mantine/notifications';

interface Reference {
    id: string;
    staffId: string;
    staff?: {
        firstName: string;
        lastName: string;
        middleName?: string;
    };
    referenceType: string;
    name: string;
    email: string;
    status: string;
    createdAt: string;
    openedAt: string | null;
    submittedAt: string | null;
    reminderCount: number;
    ipAddress: string | null;
    submissionData?: any;
}

interface Analytics {
    totalReferences: number;
    totalSubmitted: number;
    pendingReferences: number;
    openedNotSubmitted: number;
    notOpened: number;
    threeDaysPassed: number;
    reminderEmailsSent: number;
}

export const ReferenceAnalyticsPage = () => {
    const [loading, setLoading] = useState(true);
    const [references, setReferences] = useState<Reference[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [viewModalOpened, setViewModalOpened] = useState(false);
    const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [sendingReminders, setSendingReminders] = useState(false);
    const [reminderResult, setReminderResult] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [analyticsRes, referencesRes] = await Promise.all([
                axios.get('/api/v1/references/analytics', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
                axios.get('/api/v1/references/analytics/all', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }),
            ]);

            if (analyticsRes.data.success) {
                setAnalytics(analyticsRes.data.analytics);
            }

            if (referencesRes.data.success) {
                setReferences(referencesRes.data.references);
            }
        } catch (error: any) {
            console.error('Failed to load analytics:', error);
            notifications.show({
                title: 'Error',
                message: 'Failed to load reference analytics',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
            pending: { color: 'yellow', label: 'Pending' },
            opened: { color: 'blue', label: 'Opened' },
            submitted: { color: '#E51690', label: 'Submitted' },
            completed: { color: '#E51690', label: 'Completed' },
            failed: { color: 'red', label: 'Failed' },
        };

        const config = statusConfig[status.toLowerCase()] || { color: 'gray', label: status };
        return <Badge color={config.color}>{config.label}</Badge>;
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getCandidateName = (ref: Reference) => {
        if (ref.staff) {
            return `${ref.staff.firstName || ''} ${ref.staff.middleName || ''} ${ref.staff.lastName || ''}`.trim();
        }
        return 'N/A';
    };

    const filteredReferences = statusFilter
        ? references.filter((ref) => ref.status.toLowerCase() === statusFilter.toLowerCase())
        : references;

    const handleViewReference = async (ref: Reference) => {
        try {
            // Fetch full reference data including submissionData
            const response = await axios.get(`/api/v1/references/${ref.id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            
            if (response.data.success) {
                setSelectedReference(response.data.reference);
                setViewModalOpened(true);
            }
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: 'Failed to load reference details',
                color: 'red',
            });
        }
    };

    const handleDownloadReference = async (ref: Reference) => {
        try {
            setDownloading(ref.id);
            const response = await axios.get(`/api/v1/references/${ref.id}/download`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                responseType: 'blob',
            });

            // Create blob and download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const candidateName = getCandidateName(ref).replace(/\s+/g, '_');
            const refName = ref.name.replace(/\s+/g, '_');
            link.setAttribute('download', `Reference_${candidateName}_${refName}_${new Date(ref.submittedAt || ref.createdAt).toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            notifications.show({
                title: 'Success',
                message: 'Reference PDF downloaded successfully',
                color: '#E51690',
            });
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: 'Failed to download reference PDF',
                color: 'red',
            });
        } finally {
            setDownloading(null);
        }
    };

    const handleSendReminders = async () => {
        try {
            setSendingReminders(true);
            const response = await axios.post(
                '/api/v1/references/send-reminders-opened',
                {},
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                }
            );

            if (response.data.success) {
                const result = response.data.result;
                setReminderResult(result);
                
                let notificationMessage = `Reviewed ${result.totalCandidates || 0} reference(s). `;
                notificationMessage += `${result.processed} reference(s) qualified for reminders. `;
                
                if (result.sent > 0) {
                    const sentDetails = result.details?.filter((d: any) => d.status === 'sent') || [];
                    if (sentDetails.length > 0) {
                        notificationMessage += `\n\n✅ Sent ${result.sent} reminder(s) to:\n`;
                        sentDetails.forEach((d: any) => {
                            notificationMessage += `   • ${d.email} (${d.candidateName || 'Unknown'})\n`;
                        });
                    }
                }
                
                if (result.excluded && result.excluded.length > 0) {
                    notificationMessage += `\n\n⚠️ Excluded ${result.excluded.length} reference(s):\n`;
                    result.excluded.forEach((ex: any) => {
                        notificationMessage += `   • ${ex.email} (${ex.candidateName || 'Unknown'}): ${ex.reason}\n`;
                    });
                }
                
                if (result.errors > 0) {
                    notificationMessage += `\n\n❌ ${result.errors} error(s) occurred.`;
                }

                notifications.show({
                    title: 'Reminders Sent',
                    message: notificationMessage,
                    color: result.sent > 0 ? 'green' : result.processed > 0 ? 'yellow' : 'blue',
                    autoClose: result.sent > 0 ? 8000 : 10000,
                });

                if (result.processed === 0) {
                    notifications.show({
                        title: 'No Reminders to Send',
                        message: 'No references are currently in the 3 Days Passed category. Only pending references older than 3 days, or opened but not submitted references older than 3 days, can receive reminders.',
                        color: 'blue',
                        autoClose: 8000,
                    });
                }

                await loadData();
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to send reminders';
            notifications.show({
                title: 'Error Sending Reminders',
                message: errorMessage,
                color: 'red',
                autoClose: 10000,
            });
            console.error('Send reminders error:', error);
        } finally {
            setSendingReminders(false);
        }
    };

    // 3 Days Passed category:
    // - pending and older than 3 days
    // - opened and not submitted, older than 3 days from opened time
    // - exclude records that already reached 3 reminders
    const getReminderReferences = () => {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        return references.filter(ref => {
            if ((ref.reminderCount || 0) >= 3) return false;
            if (ref.submittedAt || ref.status.toLowerCase() === 'submitted') return false;

            const normalizedStatus = ref.status.toLowerCase();
            if (normalizedStatus === 'pending') {
                return new Date(ref.createdAt) < threeDaysAgo;
            }

            if (normalizedStatus === 'opened') {
                return !!ref.openedAt && new Date(ref.openedAt) < threeDaysAgo;
            }

            return false;
        });
    };

    const reminderReferences = getReminderReferences();

    if (loading) {
        return (
            <Container size="xl" py="xl">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text>Loading analytics...</Text>
                </Stack>
            </Container>
        );
    }

    return (
        <Container size="xl" py="xl" px={{ base: 'md', sm: 'xl' }}>
            <Stack gap="xl">
                {/* Header */}
                <Group justify="space-between" align="center" wrap="wrap">
                    <Box>
                        <Title order={1}>Reference Analytics Dashboard</Title>
                        <Text c="dimmed" mt={4}>
                            Track and manage reference requests
                        </Text>
                    </Box>
                    <Group gap="sm" wrap="wrap">
                        <Button 
                            leftSection={<Send size={16} />} 
                            onClick={handleSendReminders} 
                            variant="filled"
                            color="orange"
                            loading={sendingReminders}
                            title={`Send reminders to ${reminderReferences.length} eligible reference(s)`}
                            w={{ base: '100%', xs: 'auto' }}
                        >
                            Send Reminders ({reminderReferences.length})
                        </Button>
                        <Button leftSection={<RefreshCw size={16} />} onClick={loadData} variant="light" w={{ base: '100%', xs: 'auto' }}>
                            Refresh
                        </Button>
                    </Group>
                </Group>

                {reminderResult && (
                    <Alert color={reminderResult.sent > 0 ? 'green' : reminderResult.errors > 0 ? 'red' : 'blue'} title="Last Reminder Run">
                        <Text size="sm">
                            Reviewed: {reminderResult.totalCandidates || 0} references | Pending: {reminderResult.pendingCandidates || 0} | Opened: {reminderResult.openedCandidates || 0} | Qualified: {reminderResult.processed} | Sent: {reminderResult.sent} | Errors: {reminderResult.errors}
                        </Text>

                        {reminderResult.details && reminderResult.details.length > 0 && (
                            <Box mt="sm">
                                <Text size="sm" fw={600} mb={6}>Reminder Details</Text>
                                {reminderResult.details.map((detail: any, idx: number) => (
                                    <Box key={idx} mb="xs">
                                        <Text size="sm" c={detail.status === 'sent' ? 'green' : 'red'}>
                                            • {detail.email} ({detail.candidateName || 'Unknown'}) - {detail.status === 'sent' ? 'Sent' : `Failed: ${detail.error || 'Error'}`}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Sent time: {formatDate(detail.reminderSentAt)} | Opened time: {formatDate(detail.openedAt)} | Submitted time: {formatDate(detail.submittedAt)}
                                        </Text>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {reminderResult.excluded && reminderResult.excluded.length > 0 && (
                            <Box mt="sm">
                                <Text size="sm" fw={600} mb={6}>Excluded References</Text>
                                {reminderResult.excluded.map((ex: any, idx: number) => (
                                    <Box key={idx} mb="xs">
                                        <Text size="sm" c="dimmed">
                                            • {ex.email} ({ex.candidateName || 'Unknown'}) - {ex.reason}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            Opened time: {formatDate(ex.openedAt)} | Submitted time: {formatDate(ex.submittedAt)}
                                        </Text>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Alert>
                )}

                {/* Analytics Summary Cards */}
                {analytics && (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 6 }} spacing="md">
                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="blue" size="lg" radius="md">
                                    <FileText size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        Total References
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.totalReferences}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>

                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="#E51690" size="lg" radius="md">
                                    <CheckCircle size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        Submitted
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.totalSubmitted}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>

                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="yellow" size="lg" radius="md">
                                    <Clock size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        Pending
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.pendingReferences}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>

                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="blue" size="lg" radius="md">
                                    <Eye size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        Opened (Not Submitted)
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.openedNotSubmitted}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>

                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="gray" size="lg" radius="md">
                                    <XCircle size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        Not Opened
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.notOpened}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>

                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="orange" size="lg" radius="md">
                                    <Mail size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        Reminders Sent
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.reminderEmailsSent}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>

                        <Card withBorder p="md" radius="md">
                            <Group gap="xs" mb="xs">
                                <ThemeIcon variant="light" color="red" size="lg" radius="md">
                                    <Send size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        3 Days Passed
                                    </Text>
                                    <Text size="xl" fw={700}>
                                        {analytics.threeDaysPassed}
                                    </Text>
                                </Box>
                            </Group>
                        </Card>
                    </SimpleGrid>
                )}

                {/* References Table */}
                <Paper p="md" radius="md" withBorder>
                    <Group justify="space-between" mb="md" wrap="wrap">
                        <Title order={3}>All References</Title>
                        <Select
                            placeholder="Filter by status"
                            data={[
                                { value: '', label: 'All Statuses' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'opened', label: 'Opened' },
                                { value: 'submitted', label: 'Submitted' },
                            ]}
                            value={statusFilter}
                            onChange={(value) => setStatusFilter(value || null)}
                            clearable
                            w={{ base: '100%', sm: 220 }}
                        />
                    </Group>

                    <Table.ScrollContainer minWidth={900}>
                        <Table
                            striped
                            highlightOnHover
                            fz="xs"
                            horizontalSpacing="xs"
                        >
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Learner Name</Table.Th>
                                    <Table.Th>Reference Name</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Type</Table.Th>
                                    <Table.Th>Email Sent</Table.Th>
                                    <Table.Th>Opened</Table.Th>
                                    <Table.Th>Submitted</Table.Th>
                                    <Table.Th>Status</Table.Th>
                                    <Table.Th>Reminders</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredReferences.length === 0 ? (
                                    <Table.Tr>
                                        <Table.Td colSpan={10} style={{ textAlign: 'center' }}>
                                            <Text c="dimmed" py="xl">
                                                No references found
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ) : (
                                    filteredReferences.map((ref) => (
                                        <Table.Tr key={ref.id}>
                                            <Table.Td>
                                                <Text fw={500}>{getCandidateName(ref)}</Text>
                                            </Table.Td>
                                            <Table.Td>{ref.name}</Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{ref.email}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color={ref.referenceType === 'personal' ? 'blue' : 'purple'}>
                                                    {ref.referenceType === 'personal' ? 'Personal' : 'Professional'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(ref.createdAt)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(ref.openedAt)}</Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="sm">{formatDate(ref.submittedAt)}</Text>
                                            </Table.Td>
                                            <Table.Td>{getStatusBadge(ref.status)}</Table.Td>
                                            <Table.Td>
                                                <Badge variant="light" color="orange">
                                                    {ref.reminderCount || 0}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    {ref.status === 'submitted' && (
                                                        <>
                                                            <Tooltip label="View Reference Form">
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="blue"
                                                                    onClick={() => handleViewReference(ref)}
                                                                >
                                                                    <Eye size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Tooltip label="Download PDF">
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="#E51690"
                                                                    onClick={() => handleDownloadReference(ref)}
                                                                    loading={downloading === ref.id}
                                                                >
                                                                    <Download size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    {ref.status !== 'submitted' && (
                                                        <Text size="xs" c="dimmed">-</Text>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                )}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>
            </Stack>

            {/* View Reference Modal */}
            <Modal
                opened={viewModalOpened}
                onClose={() => setViewModalOpened(false)}
                title={
                    <Title order={3}>
                        {selectedReference?.referenceType === 'personal' 
                            ? 'Character Reference Form' 
                            : 'Professional Reference Form'}
                    </Title>
                }
                size="xl"
                centered
            >
                {selectedReference && (
                    <ScrollArea h={600}>
                        <Stack gap="md">
                            {/* Header Info */}
                            <Paper p="md" withBorder>
                                <MantineSimpleGrid cols={2} spacing="md">
                                    <Box>
                                        <Text size="sm" fw={600} c="dimmed" mb={4}>
                                            Candidate Name
                                        </Text>
                                        <Text>{getCandidateName(selectedReference)}</Text>
                                    </Box>
                                    <Box>
                                        <Text size="sm" fw={600} c="dimmed" mb={4}>
                                            Referee Name
                                        </Text>
                                        <Text>{selectedReference.name}</Text>
                                    </Box>
                                    <Box>
                                        <Text size="sm" fw={600} c="dimmed" mb={4}>
                                            Referee Email
                                        </Text>
                                        <Text>{selectedReference.email}</Text>
                                    </Box>
                                    <Box>
                                        <Text size="sm" fw={600} c="dimmed" mb={4}>
                                            Submitted Date
                                        </Text>
                                        <Text>{formatDate(selectedReference.submittedAt)}</Text>
                                    </Box>
                                </MantineSimpleGrid>
                            </Paper>

                            {/* Submitted Form Data */}
                            {selectedReference.submissionData ? (
                                <Paper p="md" withBorder>
                                    <Title order={4} mb="md">Submitted Reference Information</Title>
                                    <Stack gap="md">
                                        {selectedReference.submissionData.relationship && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    Relationship to Candidate
                                                </Text>
                                                <Text>{selectedReference.submissionData.relationship}</Text>
                                            </Box>
                                        )}
                                        {selectedReference.submissionData.yearsKnown && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    How Long Known
                                                </Text>
                                                <Text>{selectedReference.submissionData.yearsKnown}</Text>
                                            </Box>
                                        )}
                                        {selectedReference.submissionData.positionHeld && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    Position(s) Held
                                                </Text>
                                                <Text>{selectedReference.submissionData.positionHeld}</Text>
                                            </Box>
                                        )}
                                        {(selectedReference.submissionData.employmentStartDate || selectedReference.submissionData.employmentEndDate) && (
                                            <MantineSimpleGrid cols={2} spacing="md">
                                                {selectedReference.submissionData.employmentStartDate && (
                                                    <Box>
                                                        <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                            Employment Start Date
                                                        </Text>
                                                        <Text>{selectedReference.submissionData.employmentStartDate}</Text>
                                                    </Box>
                                                )}
                                                {selectedReference.submissionData.employmentEndDate && (
                                                    <Box>
                                                        <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                            Employment End Date
                                                        </Text>
                                                        <Text>{selectedReference.submissionData.employmentEndDate}</Text>
                                                    </Box>
                                                )}
                                            </MantineSimpleGrid>
                                        )}
                                        {selectedReference.submissionData.comments && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    Comments
                                                </Text>
                                                <Text>{selectedReference.submissionData.comments}</Text>
                                            </Box>
                                        )}
                                        {selectedReference.submissionData.additionalComments && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    Additional Comments
                                                </Text>
                                                <Text>{selectedReference.submissionData.additionalComments}</Text>
                                            </Box>
                                        )}
                                        {selectedReference.submissionData.recommendation !== null && selectedReference.submissionData.recommendation !== undefined && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    Would You Recommend This Candidate?
                                                </Text>
                                                <Badge color={selectedReference.submissionData.recommendation ? 'green' : 'red'}>
                                                    {selectedReference.submissionData.recommendation ? 'Yes' : 'No'}
                                                </Badge>
                                            </Box>
                                        )}
                                        {selectedReference.submissionData.criteriaRatings && Object.keys(selectedReference.submissionData.criteriaRatings).length > 0 && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb="md">
                                                    Criteria Ratings
                                                </Text>
                                                <Table>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Criteria</Table.Th>
                                                            <Table.Th>Rating</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {Object.entries(selectedReference.submissionData.criteriaRatings).map(([criteria, rating]: [string, any]) => (
                                                            <Table.Tr key={criteria}>
                                                                <Table.Td>{criteria}</Table.Td>
                                                                <Table.Td>
                                                                    <Badge variant="light">{rating}</Badge>
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            </Box>
                                        )}
                                        {selectedReference.submissionData.signature && (
                                            <Box>
                                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                                    Signature
                                                </Text>
                                                <Box p="md" style={{ border: '1px solid #dee2e6', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                                                    <img 
                                                        src={selectedReference.submissionData.signature} 
                                                        alt="Signature" 
                                                        style={{ maxWidth: '100%', height: 'auto' }}
                                                    />
                                                </Box>
                                                {selectedReference.submissionData.signatureDate && (
                                                    <Text size="xs" c="dimmed" mt={4}>
                                                        Signed: {selectedReference.submissionData.signatureDate}
                                                    </Text>
                                                )}
                                            </Box>
                                        )}
                                    </Stack>
                                </Paper>
                            ) : (
                                <Alert color="yellow">
                                    No submission data available for this reference.
                                </Alert>
                            )}
                        </Stack>
                    </ScrollArea>
                )}
            </Modal>
        </Container>
    );
};
