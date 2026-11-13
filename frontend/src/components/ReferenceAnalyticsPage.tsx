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
import { ReferenceSubmissionView } from './references/ReferenceSubmissionView';
import { AppConfirmModal } from './AppConfirmModal';

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
    lastReminderSentAt?: string | null;
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
    const [remindingId, setRemindingId] = useState<string | null>(null);
    const [confirmReminderRef, setConfirmReminderRef] = useState<Reference | null>(null);

    const MAX_REMINDERS = 4;

    useEffect(() => {
        loadData();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') loadData(true);
        }, 10000);
        const onVisible = () => {
            if (document.visibilityState === 'visible') loadData(true);
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    const loadData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
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
            if (!silent) {
                notifications.show({
                    title: 'Error',
                    message: 'Failed to load reference analytics',
                    color: 'red',
                });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
            pending: { color: 'yellow', label: 'Pending' },
            opened: { color: 'blue', label: 'Opened' },
            submitted: { color: '#267FBA', label: 'Submitted' },
            completed: { color: '#267FBA', label: 'Completed' },
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
                color: '#267FBA',
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
                        message: 'No references are currently eligible for reminders. A reference must be pending/opened (not submitted), under the 4-reminder cap, and either 7+ days since the request (first reminder) or 7+ days since the last reminder (reminders 2–4).',
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

    const handleSendSingleReminder = (ref: Reference) => {
        setConfirmReminderRef(ref);
    };

    const confirmSendSingleReminder = async () => {
        const ref = confirmReminderRef;
        if (!ref) return;
        setConfirmReminderRef(null);
        try {
            setRemindingId(ref.id);
            const token = localStorage.getItem('token');
            await axios.post(`/api/v1/references/${ref.id}/remind`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            notifications.show({
                title: 'Reminder sent',
                message: `Reminder email sent to ${ref.email}.`,
                color: 'green',
            });
            await loadData();
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Failed to send reminder';
            notifications.show({
                title: 'Error',
                message: Array.isArray(message) ? message.join(' ') : message,
                color: 'red',
            });
        } finally {
            setRemindingId(null);
        }
    };

    // Reminder-eligible — must match backend processAutomatedReminders():
    // - not submitted
    // - under 4-reminder cap
    // - reminder 1: 7 days after createdAt (pending) or openedAt (opened)
    // - reminders 2–4: 7 days after lastReminderSentAt
    const getReminderReferences = () => {
        const DAY_MS = 1000 * 60 * 60 * 24;
        const now = Date.now();
        const daysSince = (date: string | Date) =>
            Math.floor((now - new Date(date).getTime()) / DAY_MS);

        return references.filter((ref) => {
            const reminderCount = ref.reminderCount || 0;
            if (reminderCount >= MAX_REMINDERS) return false;
            if (ref.submittedAt || ref.status.toLowerCase() === 'submitted') return false;

            const normalizedStatus = ref.status.toLowerCase();
            if (normalizedStatus !== 'pending' && normalizedStatus !== 'opened') return false;

            if (reminderCount === 0) {
                const anchor =
                    normalizedStatus === 'opened' && ref.openedAt ? ref.openedAt : ref.createdAt;
                return daysSince(anchor) >= 7;
            }

            if (ref.lastReminderSentAt) {
                return daysSince(ref.lastReminderSentAt) >= 7;
            }

            // Fallback if a prior reminder lacked a timestamp
            return daysSince(ref.createdAt) >= 7;
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
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                        {[
                            {
                                label: 'Total References',
                                value: analytics.totalReferences,
                                color: 'blue',
                                icon: FileText,
                            },
                            {
                                label: 'Submitted',
                                value: analytics.totalSubmitted,
                                color: 'teal',
                                icon: CheckCircle,
                            },
                            {
                                label: 'Pending',
                                value: analytics.pendingReferences,
                                color: 'yellow',
                                icon: Clock,
                            },
                            {
                                label: 'Opened (Not Submitted)',
                                value: analytics.openedNotSubmitted,
                                color: 'indigo',
                                icon: Eye,
                            },
                            {
                                label: 'Not Opened',
                                value: analytics.notOpened,
                                color: 'gray',
                                icon: XCircle,
                            },
                            {
                                label: 'Reminders Sent',
                                value: analytics.reminderEmailsSent,
                                color: 'orange',
                                icon: Mail,
                            },
                            {
                                label: 'Reminder Due',
                                value: reminderReferences.length,
                                color: 'red',
                                icon: Send,
                            },
                        ].map((card) => {
                            const Icon = card.icon;
                            return (
                                <Paper
                                    key={card.label}
                                    withBorder
                                    p="md"
                                    radius="lg"
                                    style={{
                                        borderLeft: `4px solid var(--mantine-color-${card.color}-6)`,
                                        background: 'white',
                                    }}
                                >
                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <Box style={{ minWidth: 0 }}>
                                            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={4} lineClamp={2}>
                                                {card.label}
                                            </Text>
                                            <Text size="xl" fw={900} c="dark.8" lh={1}>
                                                {card.value}
                                            </Text>
                                        </Box>
                                        <ThemeIcon variant="light" color={card.color} size="lg" radius="md">
                                            <Icon size={18} />
                                        </ThemeIcon>
                                    </Group>
                                </Paper>
                            );
                        })}
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
                                                                    color="#267FBA"
                                                                    onClick={() => handleDownloadReference(ref)}
                                                                    loading={downloading === ref.id}
                                                                >
                                                                    <Download size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                    {ref.status !== 'submitted' && ref.status.toLowerCase() !== 'completed' && (
                                                        <Group gap={6} wrap="nowrap" align="center">
                                                            <Text size="xs" c="dimmed">
                                                                {ref.reminderCount || 0} of {MAX_REMINDERS} sent
                                                            </Text>
                                                            <Tooltip
                                                                label={
                                                                    (ref.reminderCount || 0) >= MAX_REMINDERS
                                                                        ? `Maximum of ${MAX_REMINDERS} reminders already sent`
                                                                        : 'Send reminder now'
                                                                }
                                                            >
                                                                <Button
                                                                    size="xs"
                                                                    variant="light"
                                                                    color="orange"
                                                                    leftSection={<Send size={14} />}
                                                                    loading={remindingId === ref.id}
                                                                    disabled={(ref.reminderCount || 0) >= MAX_REMINDERS}
                                                                    onClick={() => handleSendSingleReminder(ref)}
                                                                >
                                                                    Send Reminder
                                                                </Button>
                                                            </Tooltip>
                                                        </Group>
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
                    <Title order={3} style={{ color: '#1A1D21' }}>
                        {selectedReference?.referenceType === 'personal'
                            ? 'Character Reference Request Form'
                            : 'Professional Reference Form'}
                    </Title>
                }
                size="1000px"
                centered
                radius="md"
                padding="lg"
                styles={{
                    header: { borderBottom: '1px solid #EEF2F6', marginBottom: 8, paddingBottom: 12 },
                    body: { paddingTop: 8 },
                }}
            >
                {selectedReference && (
                    <ScrollArea.Autosize mah="70vh" offsetScrollbars>
                        <ReferenceSubmissionView
                            referenceType={selectedReference.referenceType}
                            candidateName={getCandidateName(selectedReference)}
                            refereeName={selectedReference.name}
                            refereeEmail={selectedReference.email}
                            submittedAtLabel={formatDate(selectedReference.submittedAt)}
                            submissionData={selectedReference.submissionData}
                        />
                    </ScrollArea.Autosize>
                )}
            </Modal>

            <AppConfirmModal
                opened={!!confirmReminderRef}
                options={
                    confirmReminderRef
                        ? {
                              title: 'Send reminder',
                              message: `Send a reference reminder email to ${confirmReminderRef.email}?`,
                              confirmLabel: 'Send reminder',
                              confirmColor: 'orange',
                          }
                        : null
                }
                onCancel={() => setConfirmReminderRef(null)}
                onConfirm={confirmSendSingleReminder}
            />
        </Container>
    );
};
