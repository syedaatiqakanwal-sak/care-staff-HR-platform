import { useState, useEffect, Fragment, useRef } from 'react';
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
} from '@mantine/core';
import { ClipboardList, Upload, Eye, Save, Plus } from 'lucide-react';
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
    filterGroup: string | null;
    categoryHeader: string | null;
    enrollmentDate: string | null;
    completionDate: string | null;
    status: string | null;
    documentPath: string | null;
    documentName: string | null;
};

const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'day1', label: 'Day 1' },
    { value: 'day7', label: 'Day 7' },
    { value: 'day8', label: 'Day 8' },
    { value: 'day9', label: 'Day 9' },
    { value: 'day13', label: 'Day 13' },
    { value: 'day14', label: 'Day 14' },
    { value: 'day20', label: 'Day 20' },
    { value: 'additional', label: 'Additional Specialist Training' },
    { value: 'mandatory', label: 'Mandatory' },
    { value: 'oliver', label: 'Oliver McGowan Training' },
    { value: 'year1', label: 'After 1 Year' },
    { value: 'year2', label: 'After 2 Years' },
    { value: 'year3', label: 'After 3 Years' },
];

const FILTER_LABELS = Object.fromEntries(
    FILTER_OPTIONS.map((opt) => [opt.value, opt.label]),
) as Record<string, string>;

/** Normalize any date / ISO string to YYYY-MM-DD for HTML date inputs. */
const toDateInputValue = (value: unknown): string | null => {
    if (value == null || value === '') return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const datePart = trimmed.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return null;
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return null;
};

/** Resolve filter group from field or infer from sortOrder / group name (API fallback). */
const resolveFilterGroup = (rec: InHouseRecord): string | null => {
    if (rec.filterGroup) return rec.filterGroup;
    const g = rec.group ?? '';
    if (g.includes('Year 3') || (rec.sortOrder >= 170 && rec.sortOrder <= 183)) return 'year3';
    if (g.includes('Year 2') || (rec.sortOrder >= 150 && rec.sortOrder <= 163)) return 'year2';
    if (g === 'After 1 Year' || g.includes('Year 1') || (rec.sortOrder >= 130 && rec.sortOrder <= 143)) return 'year1';
    if (rec.sortOrder >= 10 && rec.sortOrder <= 20) return 'day1';
    if (rec.sortOrder === 30) return 'day7';
    if (rec.sortOrder === 40) return 'day8';
    if (rec.sortOrder === 50) return 'day9';
    if (rec.sortOrder === 60) return 'day13';
    if (rec.sortOrder === 70) return 'day14';
    if (rec.sortOrder === 80) return 'day20';
    if (rec.sortOrder >= 100 && rec.sortOrder <= 105) return 'additional';
    if (rec.sortOrder >= 110 && rec.sortOrder <= 111) return 'mandatory';
    if (rec.sortOrder >= 120 && rec.sortOrder <= 121) return 'oliver';
    return null;
};

const getSectionHeader = (rec: InHouseRecord, viewingAll: boolean): string => {
    if (rec.categoryHeader) {
        const fg = resolveFilterGroup(rec);
        const periodLabel = fg ? FILTER_LABELS[fg] : null;
        if (viewingAll && periodLabel) {
            return `${periodLabel} — ${rec.categoryHeader}`;
        }
        return rec.categoryHeader;
    }
    return rec.group;
};

const normalizeRecords = (
    rows: (InHouseRecord & { filter_group?: string; category_header?: string })[],
): InHouseRecord[] =>
    rows.map((r) => ({
        ...r,
        filterGroup: r.filterGroup ?? r.filter_group ?? null,
        categoryHeader: r.categoryHeader ?? r.category_header ?? null,
        enrollmentDate: toDateInputValue(r.enrollmentDate),
        completionDate: toDateInputValue(r.completionDate),
    }));

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
    const [activeFilters, setActiveFilters] = useState<string[]>(['all']);

    const toggleFilter = (value: string) => {
        if (value === 'all') {
            setActiveFilters(['all']);
            return;
        }
        setActiveFilters((prev) => {
            const withoutAll = prev.filter((f) => f !== 'all');
            if (withoutAll.includes(value)) {
                const updated = withoutAll.filter((f) => f !== value);
                return updated.length === 0 ? ['all'] : updated;
            } else {
                return [...withoutAll, value];
            }
        });
    };

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const recordsRef = useRef<InHouseRecord[]>([]);

    const targetId = profile?.user?.id || profile?.id;
    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

    useEffect(() => {
        recordsRef.current = records;
    }, [records]);

    const fetchRecords = async () => {
        if (!targetId) return;
        try {
            setLoading(true);
            const res = await axios.get(`/api/v1/staff/${targetId}/inhouse-training`, {
                headers: authHeader(),
            });
            setRecords(normalizeRecords(res.data?.records || []));
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
            setRecords(normalizeRecords(res.data?.records || []));
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
        const enrollmentDate = toDateInputValue(record.enrollmentDate);
        const completionDate = toDateInputValue(record.completionDate);
        const status = record.status || null;
        try {
            setSavingId(record.id);
            const res = await axios.patch(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}`,
                {
                    enrollmentDate,
                    completionDate,
                    status,
                },
                { headers: authHeader() },
            );
            const updated = res.data?.record;
            if (updated) {
                setRecords((prev) =>
                    prev.map((r) =>
                        r.id === updated.id
                            ? {
                                  ...r,
                                  ...updated,
                                  enrollmentDate:
                                      toDateInputValue(updated.enrollmentDate) ?? enrollmentDate,
                                  completionDate:
                                      toDateInputValue(updated.completionDate) ?? completionDate,
                                  status: updated.status ?? status,
                              }
                            : r,
                    ),
                );
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

    const handleUpload = async (recordId: string, file: File | null) => {
        if (!file || !targetId) return;
        const latest =
            recordsRef.current.find((r) => r.id === recordId) ||
            records.find((r) => r.id === recordId);
        if (!latest) return;
        const enrollmentDate = toDateInputValue(latest.enrollmentDate);
        const completionDate = toDateInputValue(latest.completionDate);
        const status = latest.status || null;
        try {
            setUploadingId(recordId);
            const formData = new FormData();
            formData.append('file', file);
            if (enrollmentDate) formData.append('enrollmentDate', enrollmentDate);
            if (completionDate) formData.append('completionDate', completionDate);
            if (status) formData.append('status', status);
            const res = await axios.post(
                `/api/v1/staff/${targetId}/inhouse-training/${recordId}/upload`,
                formData,
                { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } },
            );
            const updated = res.data?.record;
            if (updated) {
                setRecords((prev) =>
                    prev.map((r) => {
                        if (r.id !== updated.id) return r;
                        return {
                            ...r,
                            ...updated,
                            enrollmentDate:
                                toDateInputValue(updated.enrollmentDate) ??
                                toDateInputValue(r.enrollmentDate),
                            completionDate:
                                toDateInputValue(updated.completionDate) ??
                                toDateInputValue(r.completionDate),
                            status: updated.status ?? r.status,
                        };
                    }),
                );
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
            const contentType =
                (res.headers['content-type'] as string) ||
                (res.data instanceof Blob && res.data.type) ||
                'application/octet-stream';
            const blob = new Blob([res.data], { type: contentType.split(';')[0].trim() });
            const url = window.URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win) {
                const a = document.createElement('a');
                a.href = url;
                a.download = record.documentName || 'document';
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
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

    const filteredRecords = (activeFilters.includes('all')
        ? records
        : records.filter((r) => activeFilters.includes(resolveFilterGroup(r) ?? ''))
    ).slice().sort((a, b) => a.sortOrder - b.sortOrder);

    // Group by group+categoryHeader (unique per year) so refresher blocks never merge
    const grouped: { key: string; displayHeader: string; items: InHouseRecord[] }[] = [];
    const viewingAll = activeFilters.includes('all');
    for (const rec of filteredRecords) {
        const bucketKey = rec.categoryHeader
            ? `${rec.group}::${rec.categoryHeader}`
            : `standalone::${rec.group}`;
        const displayHeader = getSectionHeader(rec, viewingAll);

        let bucket = grouped.find((g) => g.key === bucketKey);
        if (!bucket) {
            bucket = { key: bucketKey, displayHeader, items: [] };
            grouped.push(bucket);
        }
        bucket.items.push(rec);
    }
    grouped.sort(
        (a, b) => (a.items[0]?.sortOrder ?? 0) - (b.items[0]?.sortOrder ?? 0),
    );

    const filteredCount = activeFilters.includes('all') ? records.length : filteredRecords.length;

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
                            {records.filter((r) => r.status === 'completed').length} / {filteredCount} Completed
                            {!activeFilters.includes('all')
                                ? ` (${activeFilters.map((f) => FILTER_LABELS[f]).filter(Boolean).join(', ')})`
                                : ''}
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
                    <Box p="md" pb={0}>
                        <Box mb={16}>
                            <Group gap={8} style={{ flexWrap: 'wrap' }}>
                                {FILTER_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        size="xs"
                                        variant={activeFilters.includes(opt.value) ? 'filled' : 'light'}
                                        color={activeFilters.includes(opt.value) ? 'green' : 'gray'}
                                        onClick={() => toggleFilter(opt.value)}
                                        style={{ borderRadius: 20 }}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </Group>
                        </Box>
                    </Box>
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
                                {grouped.map((g) => (
                                    <Fragment key={`group-${g.key}`}>
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
                                                {g.displayHeader}
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
                                                            <Button
                                                                size="xs"
                                                                variant="light"
                                                                color="green"
                                                                leftSection={<Eye size={14} />}
                                                                onClick={() => handleViewDocument(record)}
                                                            >
                                                                View
                                                            </Button>
                                                        )}
                                                        {canEdit && (
                                                            <FileButton
                                                                onChange={(file) => handleUpload(record.id, file)}
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
