import { useState, useEffect, useRef, Fragment } from 'react';
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
    Tooltip,
    Modal,
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

/** HTML date inputs require YYYY-MM-DD; API/Date values often come as ISO timestamps. */
const toDateInputValue = (value: unknown): string | null => {
    if (value == null || value === '') return null;
    if (typeof value === 'string') {
        const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
        }
        return null;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
    }
    return null;
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

type DocumentViewerState = {
    name: string;
    loading: boolean;
    kind: 'pdf' | 'image' | 'html' | 'unsupported';
    url: string | null;
};

function decodeXml(value: string): string {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function readZipEntry(buffer: ArrayBuffer, entryName: string): Promise<Uint8Array | null> {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    let eocd = -1;
    const scanFrom = Math.max(0, bytes.length - 22 - 65535);
    for (let i = bytes.length - 22; i >= scanFrom; i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) return null;
    const count = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    for (let n = 0; n < count; n++) {
        if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) return null;
        const method = view.getUint16(offset + 10, true);
        const compSize = view.getUint32(offset + 20, true);
        const nameLen = view.getUint16(offset + 28, true);
        const extraLen = view.getUint16(offset + 30, true);
        const commentLen = view.getUint16(offset + 32, true);
        const localOffset = view.getUint32(offset + 42, true);
        const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
        if (name === entryName) {
            if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) return null;
            const localNameLen = view.getUint16(localOffset + 26, true);
            const localExtraLen = view.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + localNameLen + localExtraLen;
            const data = bytes.subarray(dataStart, dataStart + compSize);
            if (method === 0) return data;
            if (method === 8) {
                const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
                return new Uint8Array(await new Response(stream).arrayBuffer());
            }
            return null;
        }
        offset += 46 + nameLen + extraLen + commentLen;
    }
    return null;
}

async function docxToHtml(buffer: ArrayBuffer): Promise<string> {
    const xmlBytes = await readZipEntry(buffer, 'word/document.xml');
    if (!xmlBytes) return '';
    const xml = new TextDecoder().decode(xmlBytes);
    const token = /<w:t\b[^>]*>([^<]*)<\/w:t>|<w:br\b[^>]*\/?>|<w:tab\b[^>]*\/?>/g;
    const html: string[] = [];
    for (const chunk of xml.split(/<w:p\b/).slice(1)) {
        const end = chunk.indexOf('</w:p>');
        const body = end >= 0 ? chunk.slice(0, end) : chunk;
        token.lastIndex = 0;
        let text = '';
        let match: RegExpExecArray | null;
        while ((match = token.exec(body))) {
            if (match[1] != null) text += match[1];
            else if (match[0].startsWith('<w:br')) text += '\n';
            else text += '\t';
        }
        const plain = decodeXml(text).replace(/\u00a0/g, ' ');
        if (!plain.trim()) continue;
        html.push(`<p>${escapeHtml(plain).replace(/\n/g, '<br>')}</p>`);
    }
    return html.join('');
}

function documentKind(name: string, rawType: string): 'pdf' | 'image' | 'docx' | 'other' {
    const ext = String(name || '').split('.').pop()?.toLowerCase() || '';
    const type = String(rawType || '').split(';')[0].trim().toLowerCase();
    if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
    if (ext === 'docx' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    return 'other';
}


interface InHouseTrainingTabProps {
    profile: any;
    canEdit: boolean;
}

export const InHouseTrainingTab = ({ profile, canEdit }: InHouseTrainingTabProps) => {
    const [records, setRecords] = useState<InHouseRecord[]>([]);
    const recordsRef = useRef<InHouseRecord[]>([]);
    recordsRef.current = records;
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
    const [viewer, setViewer] = useState<DocumentViewerState | null>(null);

    const targetId = profile?.user?.id || profile?.id;
    const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

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

    const handleSaveRow = async (recordId: string) => {
        if (!targetId) return;
        const record = recordsRef.current.find((r) => r.id === recordId);
        if (!record) return;
        try {
            setSavingId(record.id);
            const enrollmentDate = toDateInputValue(record.enrollmentDate);
            const completionDate = toDateInputValue(record.completionDate);
            const res = await axios.patch(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}`,
                {
                    enrollmentDate,
                    completionDate,
                    status: record.status || null,
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
                                  enrollmentDate: toDateInputValue(updated.enrollmentDate) ?? enrollmentDate,
                                  completionDate: toDateInputValue(updated.completionDate) ?? completionDate,
                                  filterGroup: updated.filterGroup ?? r.filterGroup,
                                  categoryHeader: updated.categoryHeader ?? r.categoryHeader,
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
        // Always use latest form values (avoids stale closure when FileButton opens)
        const record = recordsRef.current.find((r) => r.id === recordId);
        if (!record) return;
        try {
            setUploadingId(record.id);
            const enrollmentDate = toDateInputValue(record.enrollmentDate);
            const completionDate = toDateInputValue(record.completionDate);
            const formData = new FormData();
            formData.append('file', file);
            if (enrollmentDate) formData.append('enrollmentDate', enrollmentDate);
            if (completionDate) formData.append('completionDate', completionDate);
            if (record.status) formData.append('status', record.status);
            const res = await axios.post(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}/upload`,
                formData,
                { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } },
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
                                      toDateInputValue(updated.enrollmentDate) ?? enrollmentDate ?? r.enrollmentDate,
                                  completionDate:
                                      toDateInputValue(updated.completionDate) ?? completionDate ?? r.completionDate,
                                  status: updated.status ?? record.status ?? r.status,
                                  filterGroup: updated.filterGroup ?? r.filterGroup,
                                  categoryHeader: updated.categoryHeader ?? r.categoryHeader,
                              }
                            : r,
                    ),
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

    const closeViewer = () => {
        setViewer((current) => {
            if (current?.url) window.URL.revokeObjectURL(current.url);
            return null;
        });
    };

    const handleViewDocument = async (record: InHouseRecord) => {
        if (!targetId || !record.documentPath) return;
        const name = record.documentName || 'Document';
        setViewer({ name, loading: true, kind: 'html', url: null });
        try {
            const res = await axios.get(
                `/api/v1/staff/${targetId}/inhouse-training/${record.id}/document`,
                { headers: authHeader(), responseType: 'blob' },
            );
            const rawType = String(res.headers['content-type'] || '');
            const blob: Blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
            const kind = documentKind(name, rawType);
            if (kind === 'pdf' || kind === 'image') {
                const mime = kind === 'pdf'
                    ? 'application/pdf'
                    : rawType.split(';')[0].trim().startsWith('image/')
                      ? rawType.split(';')[0].trim()
                      : blob.type || 'image/jpeg';
                const url = window.URL.createObjectURL(new Blob([blob], { type: mime }));
                setViewer({ name, loading: false, kind, url });
                return;
            }
            if (kind === 'docx') {
                const html = await docxToHtml(await blob.arrayBuffer());
                const page = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff;color:#1a1a1a;font:16px/1.6 "Segoe UI",Arial,sans-serif}body{padding:32px 40px}p{margin:0 0 12px}</style></head><body>${html || '<p>This Word document has no readable text.</p>'}</body></html>`;
                const url = window.URL.createObjectURL(new Blob([page], { type: 'text/html' }));
                setViewer({ name, loading: false, kind: 'html', url });
                return;
            }
            setViewer({ name, loading: false, kind: 'unsupported', url: null });
        } catch (error) {
            console.error('Failed to open document', error);
            setViewer(null);
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
                                                            <Tooltip label={record.documentName || 'View document'}>
                                                                <Button
                                                                    size="xs"
                                                                    variant="light"
                                                                    color="green"
                                                                    leftSection={<Eye size={14} />}
                                                                    onClick={() => handleViewDocument(record)}
                                                                >
                                                                    View
                                                                </Button>
                                                            </Tooltip>
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
                                                            onClick={() => handleSaveRow(record.id)}
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
            <Modal
                opened={!!viewer}
                onClose={closeViewer}
                title={viewer?.name || 'Document'}
                size="xl"
                centered
                zIndex={400}
                styles={{ body: { padding: 0, height: '75vh', background: '#F4F6F8' } }}
            >
                {viewer?.loading ? (
                    <Box style={{ height: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text c="dimmed">Opening document...</Text>
                    </Box>
                ) : viewer?.kind === 'image' && viewer.url ? (
                    <Box style={{ height: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <img src={viewer.url} alt={viewer.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </Box>
                ) : viewer?.url && (viewer.kind === 'pdf' || viewer.kind === 'html') ? (
                    <iframe
                        title={viewer.name}
                        src={viewer.url}
                        style={{ width: '100%', height: '75vh', border: 'none', background: '#fff' }}
                    />
                ) : (
                    <Box style={{ height: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                        <Text c="dimmed" ta="center">This file cannot be shown in the browser.</Text>
                    </Box>
                )}
            </Modal>
        </Box>
    );
};

export default InHouseTrainingTab;
