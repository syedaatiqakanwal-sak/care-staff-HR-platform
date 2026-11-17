import { Button, Group, Text, Box, Paper, Stack, SimpleGrid, Modal, TextInput, LoadingOverlay, ThemeIcon, Textarea, Badge, Avatar, ActionIcon, Title, ScrollArea, Alert, Table } from '@mantine/core';
import { Plus, Briefcase, User, Mail, Phone, Calendar, CheckCircle, XCircle, Clock, Trash, FileCheck, Upload } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { ReferenceSubmissionView } from '../references/ReferenceSubmissionView';
import { AppConfirmModal } from '../AppConfirmModal';

interface ReferencesTabProps {
    isEditing: boolean;
    // We might need profile ID if not from param, but let's try reading from local context or parent if needed.
    // Actually, PersonalInformationTab passes "profile" but we didn't receive it in props in previous version.
    // We should update PersonalInformationTab to pass "profile" to us, OR we rely on useParams if we are on global profile page.
    // BUT PersonalInformationTab is used inside StaffProfilePage which has the ID.
    // Let's rely on useParams for now as it's cleaner than drilling if we are sure we are under a route with ID (or "me").
    // Wait, "me" doesn't have ID in param.
    // Better to accept profile as prop.
    profile?: any;
}

// Update the interface in the file to accept profile
export const ReferencesTab = ({ isEditing, profile }: ReferencesTabProps) => {
    const { id } = useParams();
    const [savedReferences, setSavedReferences] = useState<any[]>([]);
    const [loadingReferences, setLoadingReferences] = useState(false);
    const [receivedReferences, setReceivedReferences] = useState<any[]>([]);
    const [loadingReceived, setLoadingReceived] = useState(false);
    const [selectedReceivedRef, setSelectedReceivedRef] = useState<any | null>(null);
    const [receivedModalOpen, setReceivedModalOpen] = useState(false);
    const [officeUse, setOfficeUse] = useState({ verifiedBy: '', verbalTakenBy: '', date: '', reasonStated: '', note: '' });
    const [savingOfficeUse, setSavingOfficeUse] = useState(false);

    // Reference request modals state (for sending reference requests)
    const [typeSelectionModalOpen, setTypeSelectionModalOpen] = useState(false);
    const [referenceFormModalOpen, setReferenceFormModalOpen] = useState(false);
    const [referenceType, setReferenceType] = useState<'personal' | 'professional' | null>(null);
    const [referenceFormData, setReferenceFormData] = useState({
        name: '',
        email: '',
        phone: '',
        relationship: '',
        yearsKnown: '',
        message: '',
    });
    const [sendingReference, setSendingReference] = useState(false);

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadRefType, setUploadRefType] = useState<'professional' | 'personal'>('professional');
    const [uploadRefereeName, setUploadRefereeName] = useState('');
    const [uploadRefereeEmail, setUploadRefereeEmail] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [confirmDeleteRefId, setConfirmDeleteRefId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedReferences, setUploadedReferences] = useState<any[]>([]);
    const uploadFileRef = useRef<HTMLInputElement>(null);
    const [viewerModalOpen, setViewerModalOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerFileName, setViewerFileName] = useState<string>('');
    const [viewerLoading, setViewerLoading] = useState(false);

    // Fetch saved references
    const fetchSavedReferences = async () => {
        try {
            setLoadingReferences(true);
            const token = localStorage.getItem('token');
            const targetId = profile?.id || profile?.user?.id || id;

            if (!targetId) {
                setLoadingReferences(false);
                return;
            }

            const res = await axios.get(`/api/v1/staff/${targetId}/references`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allRefs = res.data || [];
            // Separate uploaded references (have uploadedFilePath)
            const uploaded = allRefs.filter(
                (r: any) => r.uploadedFilePath !== null &&
                            r.uploadedFilePath !== undefined
            );
            setUploadedReferences(uploaded);
            // Keep savedReferences as non-uploaded ones only
            setSavedReferences(
                allRefs.filter(
                    (r: any) => !r.uploadedFilePath
                )
            );

            setLoadingReceived(true);
            try {
                const receivedRes = await axios.get(`/api/v1/staff/${targetId}/references/received`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Only show referee form responses (never manual uploads or pending sends)
                setReceivedReferences(
                    (receivedRes.data || []).filter(
                        (r: any) =>
                            !r.uploadedFilePath &&
                            r.submissionData &&
                            (r.status === 'submitted' || r.status === 'completed'),
                    ),
                );
            } catch (err) {
                console.error('Failed to fetch received references', err);
            } finally {
                setLoadingReceived(false);
            }
        } catch (error) {
            console.error('Failed to fetch saved references', error);
        } finally {
            setLoadingReferences(false);
        }
    };

    useEffect(() => {
        fetchSavedReferences();
    }, [profile, id]);

    const handleDelete = (refId: string) => {
        setConfirmDeleteRefId(refId);
    };

    const confirmDeleteReference = async () => {
        const refId = confirmDeleteRefId;
        if (!refId) return;
        setConfirmDeleteRefId(null);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/references/${refId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            notifications.show({ title: 'Deleted', message: 'Reference removed.', color: 'blue' });
            fetchSavedReferences();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' });
        }
    };

    const handleSendReminder = async (refId: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/v1/references/${refId}/remind`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            notifications.show({ title: 'Success', message: 'Reminder sent.', color: '#267FBA' });
            fetchSavedReferences();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to send reminder.', color: 'red' });
        }
    };

    const formatReceivedDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleViewReceivedRef = async (ref: any) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`/api/v1/references/${ref.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const apply = (record: any) => {
                setSelectedReceivedRef(record);
                const office = record?.submissionData?.officeUse || {};
                setOfficeUse({
                    verifiedBy: office.verifiedBy || '',
                    verbalTakenBy: office.verbalTakenBy || '',
                    date: office.date || '',
                    reasonStated: office.reasonStated || '',
                    note: office.note || '',
                });
            };
            if (response.data.success) {
                apply(response.data.reference);
            } else {
                apply(ref);
            }
        } catch {
            setSelectedReceivedRef(ref);
            const office = ref?.submissionData?.officeUse || {};
            setOfficeUse({ verifiedBy: office.verifiedBy || '', verbalTakenBy: office.verbalTakenBy || '', date: office.date || '', reasonStated: office.reasonStated || '', note: office.note || '' });
        }
        setReceivedModalOpen(true);
    };

    const handleReferenceFileUpload = async () => {
        if (!uploadFile) {
            notifications.show({
                title: 'Error',
                message: 'Please select a file to upload',
                color: 'red',
            });
            return;
        }
        if (!uploadRefereeName.trim()) {
            notifications.show({
                title: 'Error',
                message: 'Please enter referee name',
                color: 'red',
            });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('referenceType', uploadRefType);
        formData.append('refereeName', uploadRefereeName);
        if (uploadRefereeEmail) formData.append('refereeEmail', uploadRefereeEmail);

        try {
            const token = localStorage.getItem('token');
            const staffId = profile?.id || profile?.user?.id || id;
            const response = await axios.post(
                `/api/v1/staff/${staffId}/references/upload`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            setUploadedReferences(prev => [...prev, response.data]);
            setUploadModalOpen(false);
            setUploadFile(null);
            setUploadRefereeName('');
            setUploadRefereeEmail('');
            setUploadRefType('professional');
            notifications.show({
                title: 'Success',
                message: 'Reference uploaded successfully',
                color: 'green',
            });
            fetchSavedReferences();
        } catch {
            notifications.show({
                title: 'Error',
                message: 'Failed to upload reference. Please try again.',
                color: 'red',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleViewUploadedRef = async (ref: any) => {
        setViewerLoading(true);
        setViewerModalOpen(true);
        setViewerFileName(ref.uploadedFileName || 'Document');

        try {
            const token = localStorage.getItem('token');
            const staffId = profile?.id || profile?.user?.id || id;
            const response = await axios.get(
                `/api/v1/staff/${staffId}/references/${ref.id}/download-uploaded`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            const rawType = response.headers['content-type'];
            const contentType = typeof rawType === 'string' ? rawType.split(';')[0] : '';
            const fileName = ref.uploadedFileName || 'Document';
            const ext = String(fileName).split('.').pop()?.toLowerCase() || '';
            const mime =
                contentType && contentType !== 'application/octet-stream'
                    ? contentType
                    : ext === 'pdf'
                      ? 'application/pdf'
                      : ext === 'png'
                        ? 'image/png'
                        : ext === 'jpg' || ext === 'jpeg'
                          ? 'image/jpeg'
                          : 'application/pdf';
            const blob = new Blob([response.data], { type: mime });
            const url = window.URL.createObjectURL(blob);
            setViewerUrl(url);
        } catch (err) {
            setViewerModalOpen(false);
            notifications.show({
                title: 'Error',
                message: 'Failed to load document. Please try again.',
                color: 'red',
            });
        } finally {
            setViewerLoading(false);
        }
    };

    return (
        <Stack gap="lg" style={{ position: 'relative', minHeight: 200 }}>
            {/* Saved References Section */}
            <Box>
                <Group justify="space-between" align="center" mb="lg" wrap="wrap">
                    <Box>
                        <Text size="xl" fw={900} c="dark.8" mb={4}>
                            Saved Reference Requests
                        </Text>
                        <Text size="sm" c="dimmed">
                            View and manage all sent reference requests
                        </Text>
                    </Box>
                    <Group gap="md" wrap="wrap">
                        {savedReferences.length > 0 && (
                            <Badge 
                                size="lg" 
                                variant="gradient" 
                                gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }}
                                radius="md"
                                p="md"
                            >
                                {savedReferences.length} {savedReferences.length === 1 ? 'Reference' : 'References'}
                            </Badge>
                        )}
                        {isEditing && (
                            <>
                                <Button
                                    variant="light"
                                    color="green"
                                    leftSection={<Upload size={16} />}
                                    onClick={() => setUploadModalOpen(true)}
                                    size="md"
                                    radius="md"
                                    w={{ base: '100%', xs: 'auto' }}
                                >
                                    Upload Reference
                                </Button>
                                <Button 
                                    onClick={() => setTypeSelectionModalOpen(true)} 
                                    leftSection={<Plus size={18} />} 
                                    size="md"
                                    variant="filled"
                                    color="brandBlue"
                                    radius="md"
                                    w={{ base: '100%', xs: 'auto' }}
                                >
                                    Add Reference
                                </Button>
                            </>
                        )}
                    </Group>
                </Group>

            {loadingReferences ? (
                <Paper 
                    p="xl" 
                    radius="xl" 
                    withBorder={false}
                    style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        boxShadow: '0 2px 10px rgba(19, 150, 57, 0.08)',
                    }}
                    ta="center"
                >
                    <Text c="dimmed" fw={500}>Loading references...</Text>
                </Paper>
            ) : savedReferences.length === 0 ? (
                <Paper 
                    p="xl" 
                    radius="xl" 
                    withBorder={false}
                    style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        boxShadow: '0 2px 10px rgba(19, 150, 57, 0.08)',
                        borderStyle: 'dashed', 
                        border: '2px dashed #dee2e6',
                    }} 
                    ta="center"
                >
                    <ThemeIcon size={64} radius="xl" color="gray" variant="light" mb="md">
                        <FileCheck size={32} />
                    </ThemeIcon>
                    <Text c="dimmed" fw={600} size="lg" mb={4}>No reference requests sent yet</Text>
                    <Text c="dimmed" size="sm">Click "Add Reference" above to send your first reference request</Text>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={{ base: 'md', md: 'md' }}>
                    {savedReferences.map((ref: any, index: number) => {
                        // Match staff profile card gradients
                        const cardStyles = [
                            {
                                bg: 'linear-gradient(145deg, #139639 0%, #0e7a2d 100%)',
                                shadow: 'rgba(19, 150, 57, 0.3)'
                            },
                            {
                                bg: 'linear-gradient(145deg, #267FBA 0%, #267FBA 100%)',
                                shadow: 'rgba(38, 127, 186, 0.3)'
                            },
                            {
                                bg: 'linear-gradient(145deg, #267FBA 0%, #1d6a9e 100%)',
                                shadow: 'rgba(38, 127, 186, 0.3)'
                            },
                            {
                                bg: 'linear-gradient(145deg, #6A1B9A 0%, #8E24AA 100%)',
                                shadow: 'rgba(106, 27, 154, 0.3)'
                            },
                            {
                                bg: 'linear-gradient(145deg, #F57C00 0%, #FF9800 100%)',
                                shadow: 'rgba(245, 124, 0, 0.3)'
                            }
                        ];
                        const style = cardStyles[index % cardStyles.length];
                        const initials = ref.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                        return (
                            <Paper
                                key={ref.id}
                                p={0}
                                radius="24"
                                withBorder={false}
                                style={{
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    background: style.bg,
                                    boxShadow: `0 10px 40px ${style.shadow}`,
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = `0 20px 50px ${style.shadow}`;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = `0 10px 40px ${style.shadow}`;
                                }}
                            >
                                {/* Decorative Circles */}
                                <Box style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                                <Box style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                                <Box p="md" style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Header with Avatar and Badges */}
                                    <Group justify="space-between" align="flex-start" mb="sm" wrap="wrap">
                                        <Avatar
                                            size={56}
                                            radius="md"
                                            variant="filled"
                                            styles={{
                                                root: {
                                                    background: 'rgba(0, 0, 0, 0.25)',
                                                    backdropFilter: 'blur(4px)',
                                                    border: '1px solid rgba(255, 255, 255, 0.25)',
                                                    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)',
                                                },
                                                placeholder: {
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '20px',
                                                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                                                }
                                            }}
                                        >
                                            {initials}
                                        </Avatar>
                                        <Stack gap="xs" align="flex-end">
                                            <Badge
                                                size="sm"
                                                variant="filled"
                                                radius="sm"
                                                style={{
                                                    backgroundColor: 'rgba(0, 0, 0, 0.15)',
                                                    color: 'white',
                                                    fontWeight: 700,
                                                    backdropFilter: 'blur(4px)',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}
                                            >
                                                {ref.referenceType === 'personal' ? 'Character' : 'Professional'}
                                            </Badge>
                                            <Badge
                                                size="sm"
                                                variant="filled"
                                                radius="sm"
                                                style={{
                                                    backgroundColor: ref.emailStatus === 'sent' 
                                                        ? 'rgba(38, 127, 186, 0.8)' 
                                                        : ref.emailStatus === 'failed' 
                                                        ? 'rgba(198, 40, 40, 0.8)' 
                                                        : 'rgba(245, 124, 0, 0.8)',
                                                    color: 'white',
                                                    fontWeight: 700,
                                                    backdropFilter: 'blur(4px)',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}
                                                leftSection={
                                                    ref.emailStatus === 'sent' ? <CheckCircle size={12} /> : 
                                                    ref.emailStatus === 'failed' ? <XCircle size={12} /> : 
                                                    <Clock size={12} />
                                                }
                                            >
                                                {ref.emailStatus === 'sent' ? 'Sent' : ref.emailStatus === 'failed' ? 'Failed' : 'Pending'}
                                            </Badge>
                                        </Stack>
                                    </Group>

                                    {/* Name */}
                                    <Text size="sm" fw={800} c="white" mb="xs" lineClamp={1}>
                                        {ref.name}
                                    </Text>

                                    {/* Details */}
                                    <Stack gap="xs" mb="sm">
                                        <Group gap={4}>
                                            <Mail size={14} color="rgba(255,255,255,0.8)" />
                                            <Text size="xs" c="white" opacity={0.9} lineClamp={1}>
                                                {ref.email}
                                            </Text>
                                        </Group>
                                        {ref.phone && (
                                            <Group gap={4}>
                                                <Phone size={14} color="rgba(255,255,255,0.8)" />
                                                <Text size="xs" c="white" opacity={0.9}>
                                                    {ref.phone}
                                                </Text>
                                            </Group>
                                        )}
                                        {ref.relationship && (
                                            <Text size="xs" c="white" opacity={0.8} lineClamp={1}>
                                                {ref.relationship}
                                            </Text>
                                        )}
                                        {ref.yearsKnown && (
                                            <Text size="xs" c="white" opacity={0.8}>
                                                Known: {ref.yearsKnown}
                                            </Text>
                                        )}
                                        <Group gap={4}>
                                            <Calendar size={14} color="rgba(255,255,255,0.8)" />
                                            <Text size="xs" c="white" opacity={0.8}>
                                                {ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : 'N/A'}
                                            </Text>
                                        </Group>
                                    </Stack>

                                    {/* Message Preview */}
                                    {ref.message && (
                                        <Box
                                            p="xs"
                                            mb="sm"
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.15)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}
                                        >
                                            <Text size="xs" c="white" opacity={0.9} lineClamp={2} style={{ whiteSpace: 'pre-wrap' }}>
                                                {ref.message}
                                            </Text>
                                        </Box>
                                    )}
                                </Box>

                                {/* Action Buttons Footer */}
                                {isEditing && (
                                    <Box
                                        p="sm"
                                        bg="rgba(0,0,0,0.1)"
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <Group justify="flex-end" gap="xs" wrap="wrap">
                                            {(() => {
                                                const refStatus = String(ref.status || '').toLowerCase();
                                                if (refStatus === 'submitted' || refStatus === 'completed') return null;
                                                const reminderCount = ref.reminderCount || 0;
                                                const capReached = reminderCount >= 4;
                                                return (
                                                    <Group gap={6} wrap="nowrap" align="center">
                                                        <Text size="xs" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                                            {reminderCount} of 4 sent
                                                        </Text>
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            color="white"
                                                            onClick={() => handleSendReminder(ref.id)}
                                                            disabled={capReached}
                                                            title={capReached ? 'Maximum of 4 reminders already sent' : 'Send reminder now'}
                                                            style={{ color: 'white' }}
                                                            w={{ base: '100%', xs: 'auto' }}
                                                        >
                                                            <Clock size={14} style={{ marginRight: 4 }} />
                                                            Remind
                                                        </Button>
                                                    </Group>
                                                );
                                            })()}
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                size="md"
                                                onClick={() => handleDelete(ref.id)}
                                                style={{ color: 'white' }}
                                            >
                                                <Trash size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Box>
                                )}
                            </Paper>
                        );
                    })}
                </SimpleGrid>
            )}
            </Box>

            {/* Received Reference Responses */}
            <Box mt={32}>
                <Group gap="sm" mb={4} align="center">
                    <Box
                        style={{
                            width: 8,
                            height: 22,
                            borderRadius: 4,
                            background: '#139639',
                        }}
                    />
                    <Title order={4} style={{ color: '#1A1D21' }}>
                        Received Reference Responses
                    </Title>
                </Group>
                <Text size="sm" c="dimmed" mb={16} ml={16}>
                    Reference forms submitted by referees
                </Text>

                {loadingReceived ? (
                    <Text size="sm" c="dimmed">Loading...</Text>
                ) : receivedReferences.length === 0 ? (
                    <Paper
                        p="lg"
                        radius="md"
                        withBorder
                        style={{ borderColor: '#E6EBF0', background: '#FAFBFC' }}
                    >
                        <Text size="sm" c="dimmed" ta="center">
                            No reference responses received yet.
                        </Text>
                    </Paper>
                ) : (
                    <Stack gap="sm">
                        {receivedReferences.map((ref) => {
                            const isPersonal = ref.referenceType === 'personal';
                            const accent = isPersonal ? '#139639' : '#267FBA';
                            const soft = isPersonal ? '#F0FAF4' : '#F0F7FC';
                            const border = isPersonal ? '#C8E6D0' : '#BFD9EE';
                            const typeLabel = isPersonal ? 'Character' : 'Professional';

                            return (
                                <Paper
                                    key={ref.id}
                                    p="md"
                                    radius="md"
                                    style={{
                                        background: '#fff',
                                        border: `1px solid ${border}`,
                                        borderLeft: `4px solid ${accent}`,
                                    }}
                                >
                                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                                        <Group gap="md" align="flex-start" wrap="nowrap" style={{ flex: 1, minWidth: 220 }}>
                                            <Box
                                                style={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 12,
                                                    background: soft,
                                                    border: `1px solid ${border}`,
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <User size={18} color={accent} />
                                            </Box>
                                            <Box style={{ minWidth: 0 }}>
                                                <Group gap={8} mb={4} wrap="wrap">
                                                    <Text fw={700} size="sm" style={{ color: '#1A1D21' }}>
                                                        {ref.refereeName || ref.referee_name || ref.name || 'Referee'}
                                                    </Text>
                                                    <Badge
                                                        size="xs"
                                                        variant="light"
                                                        style={{
                                                            color: accent,
                                                            backgroundColor: soft,
                                                            border: `1px solid ${border}`,
                                                        }}
                                                    >
                                                        {typeLabel}
                                                    </Badge>
                                                </Group>
                                                <Text size="sm" c="dimmed" style={{ wordBreak: 'break-word' }}>
                                                    {ref.refereeEmail || ref.referee_email || ref.email || 'No email provided'}
                                                </Text>
                                                <Text size="xs" mt={6} fw={600} style={{ color: isPersonal ? '#2F6B45' : '#1F5A85' }}>
                                                    Submitted:{' '}
                                                    {ref.submittedAt
                                                        ? new Date(ref.submittedAt).toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })
                                                        : 'Not provided'}
                                                </Text>
                                            </Box>
                                        </Group>
                                        <Button
                                            size="sm"
                                            radius="md"
                                            onClick={() => handleViewReceivedRef(ref)}
                                            styles={{
                                                root: {
                                                    backgroundColor: accent,
                                                    color: '#fff',
                                                    border: 'none',
                                                    '&:hover': {
                                                        backgroundColor: isPersonal ? '#0f7a2f' : '#1e6a9e',
                                                    },
                                                },
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </Box>

            {/* Uploaded References */}
            {uploadedReferences.length > 0 && (
                <Box mt={32}>
                    <Group gap="sm" mb={4} align="center">
                        <Box
                            style={{
                                width: 8,
                                height: 22,
                                borderRadius: 4,
                                background: '#267FBA',
                            }}
                        />
                        <Title order={4} style={{ color: '#1A1D21' }}>
                            Uploaded References
                        </Title>
                    </Group>
                    <Text size="sm" c="dimmed" mb={16} ml={16}>
                        Manually uploaded reference documents
                    </Text>
                    <Stack gap="sm">
                        {uploadedReferences.map((ref) => {
                            const isPersonal = ref.referenceType === 'personal';
                            const accent = isPersonal ? '#139639' : '#267FBA';
                            const soft = isPersonal ? '#F0FAF4' : '#F0F7FC';
                            const border = isPersonal ? '#C8E6D0' : '#BFD9EE';

                            return (
                                <Paper
                                    key={ref.id}
                                    p="md"
                                    radius="md"
                                    style={{
                                        background: '#fff',
                                        border: `1px solid ${border}`,
                                        borderLeft: `4px solid ${accent}`,
                                    }}
                                >
                                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                                        <Group gap="md" align="flex-start" wrap="nowrap" style={{ flex: 1, minWidth: 220 }}>
                                            <Box
                                                style={{
                                                    width: 42,
                                                    height: 42,
                                                    borderRadius: 12,
                                                    background: soft,
                                                    border: `1px solid ${border}`,
                                                    display: 'grid',
                                                    placeItems: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <FileCheck size={18} color={accent} />
                                            </Box>
                                            <Box style={{ minWidth: 0 }}>
                                                <Group gap={8} mb={4} wrap="wrap">
                                                    <Text fw={700} size="sm" style={{ color: '#1A1D21' }}>
                                                        {ref.name || ref.refereeName || 'Reference'}
                                                    </Text>
                                                    <Badge
                                                        size="xs"
                                                        variant="light"
                                                        style={{
                                                            color: accent,
                                                            backgroundColor: soft,
                                                            border: `1px solid ${border}`,
                                                        }}
                                                    >
                                                        {isPersonal ? 'Character' : 'Professional'}
                                                    </Badge>
                                                </Group>
                                                {(ref.email || ref.refereeEmail) && (
                                                    <Text size="sm" c="dimmed" style={{ wordBreak: 'break-word' }}>
                                                        {ref.email || ref.refereeEmail}
                                                    </Text>
                                                )}
                                                {ref.uploadedFileName && (
                                                    <Text size="xs" mt={6} fw={600} style={{ color: isPersonal ? '#2F6B45' : '#1F5A85' }}>
                                                        File: {ref.uploadedFileName}
                                                    </Text>
                                                )}
                                            </Box>
                                        </Group>
                                        <Button
                                            size="sm"
                                            radius="md"
                                            onClick={() => handleViewUploadedRef(ref)}
                                            styles={{
                                                root: {
                                                    backgroundColor: accent,
                                                    color: '#fff',
                                                    border: 'none',
                                                    '&:hover': {
                                                        backgroundColor: isPersonal ? '#0f7a2f' : '#1e6a9e',
                                                    },
                                                },
                                            }}
                                        >
                                            View Document
                                        </Button>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                </Box>
            )}

            {/* Reference Type Selection Modal */}
            <Modal
                opened={typeSelectionModalOpen}
                onClose={() => setTypeSelectionModalOpen(false)}
                title="Select Reference Type"
                centered
                size="md"
            >
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Paper
                        p="xl"
                        radius="md"
                        withBorder
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 150, 57, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                            setReferenceType('personal');
                            setTypeSelectionModalOpen(false);
                            setReferenceFormModalOpen(true);
                            setReferenceFormData({
                                name: '',
                                email: '',
                                phone: '',
                                relationship: '',
                                yearsKnown: '',
                                message: '',
                            });
                        }}
                    >
                        <Stack gap="sm" align="center">
                            <ThemeIcon size={48} radius="md" variant="light" color="grape">
                                <User size={24} />
                            </ThemeIcon>
                            <Text fw={700} size="lg">Character Reference</Text>
                        </Stack>
                    </Paper>

                    <Paper
                        p="xl"
                        radius="md"
                        withBorder
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 150, 57, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                            setReferenceType('professional');
                            setTypeSelectionModalOpen(false);
                            setReferenceFormModalOpen(true);
                            setReferenceFormData({
                                name: '',
                                email: '',
                                phone: '',
                                relationship: '',
                                yearsKnown: '',
                                message: '',
                            });
                        }}
                    >
                        <Stack gap="sm" align="center">
                            <ThemeIcon size={48} radius="md" variant="light" color="brandBlue">
                                <Briefcase size={24} />
                            </ThemeIcon>
                            <Text fw={700} size="lg">Professional Reference</Text>
                        </Stack>
                    </Paper>
                </SimpleGrid>
            </Modal>

            {/* Reference Form Modal */}
            <Modal
                opened={referenceFormModalOpen}
                onClose={() => {
                    setReferenceFormModalOpen(false);
                    setReferenceType(null);
                }}
                title={`${referenceType === 'personal' ? 'Character' : 'Professional'} Reference Form`}
                size="lg"
                centered
            >
                <Stack gap="md" style={{ position: 'relative' }}>
                    <LoadingOverlay visible={sendingReference} />
                    <TextInput
                        label="Reference Name"
                        placeholder="Enter reference's full name"
                        required
                        value={referenceFormData.name}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, name: e.target.value })}
                    />
                    <TextInput
                        label="Reference Email"
                        type="email"
                        placeholder="reference@example.com"
                        required
                        value={referenceFormData.email}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, email: e.target.value })}
                    />
                    <TextInput
                        label="Phone"
                        placeholder="Enter phone number"
                        value={referenceFormData.phone}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, phone: e.target.value })}
                    />
                    <TextInput
                        label="Relationship"
                        placeholder="Enter relationship"
                        value={referenceFormData.relationship}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, relationship: e.target.value })}
                    />
                    <TextInput
                        label="Years Known"
                        placeholder="e.g., 5 years"
                        value={referenceFormData.yearsKnown}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, yearsKnown: e.target.value })}
                    />
                    <Textarea
                        label="Message"
                        placeholder="Enter any additional message"
                        value={referenceFormData.message}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, message: e.target.value })}
                        minRows={3}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={() => {
                                setReferenceFormModalOpen(false);
                                setReferenceType(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                // Validate required fields
                                if (!referenceFormData.name || !referenceFormData.email) {
                                    notifications.show({
                                        title: 'Error',
                                        message: 'Please fill in required fields (Name and Email)',
                                        color: 'red',
                                    });
                                    return;
                                }

                                if (!referenceType) {
                                    notifications.show({
                                        title: 'Error',
                                        message: 'Please select a reference type',
                                        color: 'red',
                                    });
                                    return;
                                }

                                setSendingReference(true);
                                try {
                                    const token = localStorage.getItem('token');
                                    const staffId = profile?.id || id;

                                    if (!staffId) {
                                        throw new Error('Staff ID not found');
                                    }

                                    const response = await axios.post(
                                        '/api/v1/references/send',
                                        {
                                            staffId,
                                            referenceType: referenceType,
                                            name: referenceFormData.name,
                                            email: referenceFormData.email,
                                            phone: referenceFormData.phone || undefined,
                                            relationship: referenceFormData.relationship || undefined,
                                            yearsKnown: referenceFormData.yearsKnown || undefined,
                                            message: referenceFormData.message || undefined,
                                        },
                                        {
                                            headers: { Authorization: `Bearer ${token}` },
                                        }
                                    );

                                    // CRITICAL: Only show success if response.ok AND data.success === true
                                    if (response.status >= 200 && response.status < 300 && response.data.success === true) {
                                        notifications.show({
                                            title: 'Success',
                                            message: 'Reference request sent successfully',
                                            color: '#267FBA',
                                        });
                                        setReferenceFormModalOpen(false);
                                        setReferenceType(null);
                                        setReferenceFormData({
                                            name: '',
                                            email: '',
                                            phone: '',
                                            relationship: '',
                                            yearsKnown: '',
                                            message: '',
                                        });
                                        // Refresh saved references list
                                        fetchSavedReferences();
                                    } else {
                                        throw new Error(response.data.message || 'Failed to send reference');
                                    }
                                } catch (error: any) {
                                    console.error('Failed to send reference:', error);
                                    notifications.show({
                                        title: 'Error',
                                        message: error.response?.data?.message || error.message || 'Failed to send reference request',
                                        color: 'red',
                                    });
                                } finally {
                                    setSendingReference(false);
                                }
                            }}
                            loading={sendingReference}
                            disabled={sendingReference}
                            color="brandBlue"
                        >
                            Send
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Received Reference View Modal */}
            <Modal
                opened={receivedModalOpen}
                onClose={() => { setReceivedModalOpen(false); setSelectedReceivedRef(null); }}
                title={
                    <Title order={3} style={{ color: '#1A1D21' }}>
                        {selectedReceivedRef?.referenceType === 'personal'
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
                {selectedReceivedRef && (
                    <ScrollArea.Autosize mah="70vh" offsetScrollbars>
                        <ReferenceSubmissionView
                            referenceType={selectedReceivedRef.referenceType}
                            candidateName={`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()}
                            refereeName={selectedReceivedRef.name || selectedReceivedRef.refereeName}
                            refereeEmail={selectedReceivedRef.email || selectedReceivedRef.refereeEmail}
                            submittedAtLabel={formatReceivedDate(selectedReceivedRef.submittedAt)}
                            submissionData={selectedReceivedRef.submissionData}
                        />
                        <Paper mt="lg" p="md" withBorder style={{ background: '#fffacd' }}>
                                <Title order={5} mb="sm">Office use only</Title>
                                <Stack gap="sm">
                                    <TextInput label="Reference verified via email by Name" value={officeUse.verifiedBy} onChange={(e) => setOfficeUse({ ...officeUse, verifiedBy: e.target.value })} />
                                    {selectedReceivedRef.referenceType !== 'personal' && (
                                        <>
                                            <TextInput label="Verbal Reference Taken By" value={officeUse.verbalTakenBy} onChange={(e) => setOfficeUse({ ...officeUse, verbalTakenBy: e.target.value })} />
                                            <Text size="xs" c="dimmed">Only if it is not possible by email or by post</Text>
                                        </>
                                    )}
                                    <TextInput label="Date" type="date" value={officeUse.date} onChange={(e) => setOfficeUse({ ...officeUse, date: e.target.value })} />
                                    {selectedReceivedRef.referenceType !== 'personal' && (
                                        <TextInput label="Reason Stated" value={officeUse.reasonStated} onChange={(e) => setOfficeUse({ ...officeUse, reasonStated: e.target.value })} />
                                    )}
                                    <Textarea label="Additional Note" minRows={3} value={officeUse.note} onChange={(e) => setOfficeUse({ ...officeUse, note: e.target.value })} />
                                    <Group justify="flex-end">
                                        <Button loading={savingOfficeUse} onClick={async () => {
                                            setSavingOfficeUse(true);
                                            try {
                                                const token = localStorage.getItem('token');
                                                const submissionData = {
                                                    ...(selectedReceivedRef.submissionData || {}),
                                                    officeUse,
                                                };
                                                await axios.patch(`/api/v1/references/${selectedReceivedRef.id}`, { submissionData }, { headers: { Authorization: `Bearer ${token}` } });
                                                setSelectedReceivedRef({ ...selectedReceivedRef, submissionData });
                                                notifications.show({ title: 'Saved', message: `Office note saved on this ${selectedReceivedRef.referenceType === 'personal' ? 'character' : 'professional'} reference`, color: '#267FBA' });
                                            } catch (error: any) {
                                                notifications.show({ title: 'Error', message: error.response?.data?.message || 'Could not save office note', color: 'red' });
                                            } finally {
                                                setSavingOfficeUse(false);
                                            }
                                        }}>Save office note</Button>
                                    </Group>
                                </Stack>
                            </Paper>
                    </ScrollArea.Autosize>
                )}
            </Modal>

            {/* Upload Reference Modal */}
            <Modal
                opened={uploadModalOpen}
                onClose={() => {
                    setUploadModalOpen(false);
                    setUploadFile(null);
                    setUploadRefereeName('');
                    setUploadRefereeEmail('');
                    setUploadRefType('professional');
                }}
                title={<Title order={3}>Upload Reference</Title>}
                size="md"
                centered
            >
                <Stack gap="md">
                    <Box>
                        <Text fw={500} mb={8}>Reference Type</Text>
                        <Group gap={12}>
                            <Button
                                variant={uploadRefType === 'professional' ? 'filled' : 'outline'}
                                color="green"
                                onClick={() => setUploadRefType('professional')}
                                size="sm"
                            >
                                Professional
                            </Button>
                            <Button
                                variant={uploadRefType === 'personal' ? 'filled' : 'outline'}
                                color="blue"
                                onClick={() => setUploadRefType('personal')}
                                size="sm"
                            >
                                Character
                            </Button>
                        </Group>
                    </Box>

                    <TextInput
                        label="Referee Name"
                        placeholder="Enter referee name"
                        value={uploadRefereeName}
                        onChange={(e) => setUploadRefereeName(e.target.value)}
                        required
                    />

                    <TextInput
                        label="Referee Email (optional)"
                        placeholder="Enter referee email"
                        value={uploadRefereeEmail}
                        onChange={(e) => setUploadRefereeEmail(e.target.value)}
                    />

                    <Box>
                        <Text fw={500} mb={8}>Reference Document</Text>
                        {uploadFile ? (
                            <Group gap={8}>
                                <Text size="sm" c="dimmed">📄 {uploadFile.name}</Text>
                                <Button
                                    variant="subtle"
                                    size="xs"
                                    color="red"
                                    onClick={() => setUploadFile(null)}
                                >
                                    Remove
                                </Button>
                            </Group>
                        ) : (
                            <Button
                                variant="light"
                                color="green"
                                leftSection={<Upload size={14} />}
                                onClick={() => uploadFileRef.current?.click()}
                            >
                                Select File
                            </Button>
                        )}
                        <input
                            type="file"
                            ref={uploadFileRef}
                            style={{ display: 'none' }}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                                setUploadFile(e.target.files?.[0] || null);
                            }}
                        />
                        <Text size="xs" c="dimmed" mt={4}>
                            Accepted: PDF, JPG, PNG, DOC, DOCX (max 10MB)
                        </Text>
                    </Box>

                    <Group justify="flex-end" mt={8}>
                        <Button
                            variant="subtle"
                            color="gray"
                            onClick={() => setUploadModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="green"
                            onClick={handleReferenceFileUpload}
                            loading={uploading}
                            disabled={!uploadFile || !uploadRefereeName.trim()}
                        >
                            Upload Reference
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Document Viewer Modal */}
            <Modal
                opened={viewerModalOpen}
                onClose={() => {
                    setViewerModalOpen(false);
                    if (viewerUrl) {
                        window.URL.revokeObjectURL(viewerUrl);
                        setViewerUrl(null);
                    }
                }}
                title={
                    <Group gap={8}>
                        <Text fw={600}>{viewerFileName}</Text>
                    </Group>
                }
                size="xl"
                centered
                styles={{
                    body: { padding: 0, height: '75vh' },
                }}
            >
                {viewerLoading ? (
                    <Box
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '75vh'
                        }}
                    >
                        <Text c="dimmed">Loading document...</Text>
                    </Box>
                ) : viewerUrl ? (
                    <Box style={{ height: '75vh', width: '100%' }}>
                        {viewerFileName.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={viewerUrl}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none'
                                }}
                                title={viewerFileName}
                            />
                        ) : viewerFileName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <Box
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    padding: '16px'
                                }}
                            >
                                <img
                                    src={viewerUrl}
                                    alt={viewerFileName}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain'
                                    }}
                                />
                            </Box>
                        ) : (
                            <Box
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    gap: '16px'
                                }}
                            >
                                <Text c="dimmed" ta="center">
                                    This file type cannot be previewed directly.
                                </Text>
                                <Button
                                    color="green"
                                    onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = viewerUrl!;
                                        a.download = viewerFileName;
                                        a.click();
                                    }}
                                >
                                    Download {viewerFileName}
                                </Button>
                            </Box>
                        )}
                    </Box>
                ) : (
                    <Box
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '75vh'
                        }}
                    >
                        <Text c="dimmed">No document available</Text>
                    </Box>
                )}
            </Modal>

            <AppConfirmModal
                opened={!!confirmDeleteRefId}
                options={{
                    title: 'Remove reference',
                    message: 'Are you sure you want to remove this reference?',
                    confirmLabel: 'Remove',
                    confirmColor: 'red',
                }}
                onCancel={() => setConfirmDeleteRefId(null)}
                onConfirm={confirmDeleteReference}
            />
        </Stack>
    );
};
