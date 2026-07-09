import { useState, useEffect, Fragment } from 'react';
import {
    Box,
    Group,
    Text,
    ThemeIcon,
    Button,
    Table,
    Select,
    TextInput,
    Badge,
    Paper,
    Stack,
    LoadingOverlay,
    FileButton,
    ActionIcon,
    Tooltip,
} from '@mantine/core';
import { ClipboardList, Upload, Download, Save, Plus } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

const BRAND_GREEN = '#139639';
const BRAND_GREEN_DARK = '#0e7a2d';

type InHouseRecord = {
    id: string;
    staffId: string;
    templateId: string | null;
    title: string;
    group: string;
    sortOrder: number;
    enrollmentDate: string | null;
    completionDate: string | null;
    status: string | null;
    documentPath: string | null;
    documentName: string | null;
};

const STATUS_OPTIONS = [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'progressing', label: 'Progressing' },
    { value: 'completed', label: 'Completed' },
];

const STATUS_COLORS: Record<string, string> = {
    enrolled: 'blue',
    progressing: 'yellow',
    completed: 'green',
};

interface InHouseTrainingTabProps {
    profile: any;
    canEdit: boolean;
}

export const InHouseTrainingTab = ({ profile, canEdit }: InHouseTrainingTabProps) => {
    const [records, setRecords] = useState<InHouseRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const targetId = profile?.user?.id || profile?.id;
    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    const fetchRecords = async () => {
        if (!targetId) return;
        try {
            setLoading(true);
            const res = await axios.get(`/api/v1/staff/${targetId}/inhouse-training`, {
                headers: authHeader(),
            });
            setRecords(res.data?.records || []);
        } catch (error) {
            console.error('Failed to fetch in-house training records', error);
            notifications.show({
                title: 'Error',
                message: 'Could not load the in-house training plan.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetId]);

    const handleInitialize = async () => {
        if (!targetId) return;
        try {
            setInitializing(true);
            const res = await axios.post(
                `/api/v1/staff/${targetId}/inhouse-training/init`,
                {},
                { headers: authHeader() },
            );
            setRecords(res.data?.records || []);
            notifications.show({
                title: 'Training plan initialized',
                message: 'All standard in-house training items have been added.',
                color: 'green',
            });
        } catch (error) {
            console.error('Failed to initialize in-house training plan', error);
            notifications.show({
                title: 'Error',
                message: 'Could not initialize the training plan.',
                color: 'red',
            });
        } finally {
            setInitializing(false);
        }
    };

    const updateLocalField = (recordId: string, field: keyof InHouseRecord, value: any) => {
        setRecords((prev) =>
            prev.map((r) => (r.id === recordId ? { ...r, [field]: value } : r)),
        );
    };

    const handleSaveRow = async (record: InHouseRecord) => {
        if (!targetId) return;
        try {
            setSavingId(record.id);
            const res = await axios.patch(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}`,
                {
                    enrollmentDate: record.enrollmentDate || null,
                    completionDate: record.completionDate || null,
                    status: record.status || null,
                },
                { headers: authHeader() },
            );
            const updated = res.data?.record;
            if (updated) {
                setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            }
            notifications.show({
                title: 'Saved',
                message: 'Training record updated.',
                color: 'green',
            });
        } catch (error) {
            console.error('Failed to save in-house training record', error);
            notifications.show({
                title: 'Error',
                message: 'Could not save the training record.',
                color: 'red',
            });
        } finally {
            setSavingId(null);
        }
    };

    const handleUpload = async (record: InHouseRecord, file: File | null) => {
        if (!file || !targetId) return;
        try {
            setUploadingId(record.id);
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}/upload`,
                formData,
                { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } },
            );
            const updated = res.data?.record;
            if (updated) {
                setRecords((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
            }
            notifications.show({
                title: 'Document uploaded',
                message: 'The assessment/certificate has been attached.',
                color: 'green',
            });
        } catch (error) {
            console.error('Failed to upload document', error);
            notifications.show({
                title: 'Upload failed',
                message: 'Could not upload the document. Allowed: PDF, DOC, DOCX, images (max 10MB).',
                color: 'red',
            });
        } finally {
            setUploadingId(null);
        }
    };

    const handleViewDocument = async (record: InHouseRecord) => {
        if (!targetId || !record.documentPath) return;
        try {
            const res = await axios.get(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}/document`,
                { headers: authHeader(), responseType: 'blob' },
            );
            const url = window.URL.createObjectURL(new Blob([res.data]));
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch (error) {
            console.error('Failed to open document', error);
            notifications.show({
                title: 'Error',
                message: 'Could not open the document.',
                color: 'red',
            });
        }
    };

    // Group records preserving sortOrder
    const groups: { group: string; items: InHouseRecord[] }[] = [];
    for (const rec of records) {
        let bucket = groups.find((g) => g.group === rec.group);
        if (!bucket) {
            bucket = { group: rec.group, items: [] };
            groups.push(bucket);
        }
        bucket.items.push(rec);
    }

    const completedCount = records.filter((r) => r.status === 'completed').length;

    return (
        <Box mb="xl" pos="relative">
            <LoadingOverlay visible={loading} />

            {/* Header banner */}
            <Box
                p="lg"
                mb="md"
                style={{
                    background: `linear-gradient(135deg, ${BRAND_GREEN} 0%, ${BRAND_GREEN_DARK} 100%)`,
                    borderRadius: '16px',
                    minWidth: '100%',
                    boxShadow: '0 4px 12px rgba(19, 150, 57, 0.2)',
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="md">
                        <ThemeIcon
                            variant="filled"
                            size={48}
                            radius="md"
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                            }}
                        >
                            <ClipboardList size={24} color="white" />
                        </ThemeIcon>
                        <Box>
                            <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                In-House Training Plan
                            </Text>
                            <Text size="sm" c="rgba(255,255,255,0.9)" fw={500} mt={4}>
                                Manage assigned In House training
                            </Text>
                        </Box>
                    </Group>
                    {records.length > 0 && (
                        <Badge size="lg" variant="white" c={BRAND_GREEN}>
                            {completedCount} / {records.length} Completed
                        </Badge>
                    )}
                </Group>
            </Box>

            {records.length === 0 && !loading ? (
                <Paper p="xl" radius="16px" shadow="xs" bg="white" ta="center">
                    <Stack align="center" gap="md">
                        <ThemeIcon size={64} radius="xl" color="green" variant="light">
                            <ClipboardList size={32} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={700} size="lg">No training plan yet</Text>
                            <Text size="sm" c="dimmed">
                                {canEdit
                                    ? 'Initialize the standard In-House Training Plan for this staff member.'
                                    : 'This staff member does not have an In-House Training Plan yet.'}
                            </Text>
                        </Box>
                        {canEdit && (
                            <Button
                                leftSection={<Plus size={16} />}
                                color="green"
                                loading={initializing}
                                onClick={handleInitialize}
                            >
                                Initialize Training Plan
                            </Button>
                        )}
                    </Stack>
                </Paper>
            ) : (
                <Paper radius="16px" shadow="xs" bg="white" style={{ overflow: 'hidden' }}>
                    <Table.ScrollContainer minWidth={900}>
                        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th style={{ minWidth: 320 }}>
                                        In House Training / Assessments / Competency Title
                                    </Table.Th>
                                    <Table.Th style={{ minWidth: 150 }}>Enrollment Date</Table.Th>
                                    <Table.Th style={{ minWidth: 150 }}>Completion Date</Table.Th>
                                    <Table.Th style={{ minWidth: 150 }}>Status</Table.Th>
                                    <Table.Th style={{ minWidth: 180 }}>View Document</Table.Th>
                                    {canEdit && <Table.Th style={{ minWidth: 90 }}>Action</Table.Th>}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {groups.map((g) => (
                                    <Fragment key={`group-${g.group}`}>
                                        <Table.Tr>
                                            <Table.Td
                                                colSpan={canEdit ? 6 : 5}
                                                style={{
                                                    background: BRAND_GREEN,
                                                    color: 'white',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.5px',
                                                }}
                                            >
                                                {g.group}
                                            </Table.Td>
                                        </Table.Tr>
                                        {g.items.map((record) => (
                                            <Table.Tr key={record.id}>
                                                <Table.Td>
                                                    <Text size="sm" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                        {record.title}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <TextInput
                                                        type="date"
                                                        size="xs"
                                                        value={record.enrollmentDate || ''}
                                                        disabled={!canEdit}
                                                        onChange={(e) =>
                                                            updateLocalField(record.id, 'enrollmentDate', e.currentTarget.value)
                                                        }
                                                    />
                                                </Table.Td>
                                                <Table.Td>
                                                    <TextInput
                                                        type="date"
                                                        size="xs"
                                                        value={record.completionDate || ''}
                                                        disabled={!canEdit}
                                                        onChange={(e) =>
                                                            updateLocalField(record.id, 'completionDate', e.currentTarget.value)
                                                        }
                                                    />
                                                </Table.Td>
                                                <Table.Td>
                                                    {canEdit ? (
                                                        <Select
                                                            size="xs"
                                                            placeholder="Not started"
                                                            data={STATUS_OPTIONS}
                                                            value={record.status}
                                                            clearable
                                                            onChange={(value) =>
                                                                updateLocalField(record.id, 'status', value)
                                                            }
                                                        />
                                                    ) : record.status ? (
                                                        <Badge color={STATUS_COLORS[record.status] || 'gray'} variant="light">
                                                            {STATUS_OPTIONS.find((o) => o.value === record.status)?.label || record.status}
                                                        </Badge>
                                                    ) : (
                                                        <Text size="xs" c="dimmed">Not started</Text>
                                                    )}
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs" wrap="nowrap">
                                                        {record.documentPath && (
                                                            <Tooltip label={record.documentName || 'View document'}>
                                                                <ActionIcon
                                                                    variant="light"
                                                                    color="green"
                                                                    onClick={() => handleViewDocument(record)}
                                                                >
                                                                    <Download size={16} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                        )}
                                                        {canEdit && (
                                                            <FileButton
                                                                onChange={(file) => handleUpload(record, file)}
                                                                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                                                            >
                                                                {(props) => (
                                                                    <Button
                                                                        {...props}
                                                                        size="xs"
                                                                        variant="light"
                                                                        color="green"
                                                                        leftSection={<Upload size={14} />}
                                                                        loading={uploadingId === record.id}
                                                                    >
                                                                        {record.documentPath ? 'Replace' : 'Upload'}
                                                                    </Button>
                                                                )}
                                                            </FileButton>
                                                        )}
                                                        {!record.documentPath && !canEdit && (
                                                            <Text size="xs" c="dimmed">—</Text>
                                                        )}
                                                    </Group>
                                                </Table.Td>
                                                {canEdit && (
                                                    <Table.Td>
                                                        <Button
                                                            size="xs"
                                                            color="green"
                                                            leftSection={<Save size={14} />}
                                                            loading={savingId === record.id}
                                                            onClick={() => handleSaveRow(record)}
                                                        >
                                                            Save
                                                        </Button>
                                                    </Table.Td>
                                                )}
                                            </Table.Tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>
            )}
        </Box>
    );
};

export default InHouseTrainingTab;
