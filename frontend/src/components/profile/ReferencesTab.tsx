import { Button, Group, Text, Box, Paper, Stack, SimpleGrid, Modal, TextInput, LoadingOverlay, ThemeIcon, Textarea, Badge, Avatar, ActionIcon } from '@mantine/core';
import { Plus, Briefcase, User, Mail, Phone, Calendar, CheckCircle, XCircle, Clock, Trash, FileCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';
import { useParams } from 'react-router-dom';

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

    // Fetch saved references
    const fetchSavedReferences = async () => {
        try {
            setLoadingReferences(true);
            const token = localStorage.getItem('token');
            const targetId = profile?.id || id;

            if (!targetId) {
                setLoadingReferences(false);
                return;
            }

            const res = await axios.get(`/api/v1/staff/${targetId}/references`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedReferences(res.data || []);
        } catch (error) {
            console.error('Failed to fetch saved references', error);
        } finally {
            setLoadingReferences(false);
        }
    };

    useEffect(() => {
        fetchSavedReferences();
    }, [profile, id]);

    const handleDelete = async (refId: string) => {
        if (!confirm('Are you sure you want to remove this reference?')) return;
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
            notifications.show({ title: 'Success', message: 'Reminder sent.', color: '#E51690' });
            fetchSavedReferences();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to send reminder.', color: 'red' });
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
                        boxShadow: '0 2px 10px rgba(30, 186, 242, 0.08)',
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
                        boxShadow: '0 2px 10px rgba(30, 186, 242, 0.08)',
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
                                bg: 'linear-gradient(145deg, #1EBAF2 0%, #0F7296 100%)',
                                shadow: 'rgba(30, 186, 242, 0.3)'
                            },
                            {
                                bg: 'linear-gradient(145deg, #E51690 0%, #E51690 100%)',
                                shadow: 'rgba(229, 22, 144, 0.3)'
                            },
                            {
                                bg: 'linear-gradient(145deg, #0277BD 0%, #29B6F6 100%)',
                                shadow: 'rgba(2, 119, 189, 0.3)'
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
                                                {ref.referenceType === 'personal' ? 'Personal' : 'Professional'}
                                            </Badge>
                                            <Badge
                                                size="sm"
                                                variant="filled"
                                                radius="sm"
                                                style={{
                                                    backgroundColor: ref.emailStatus === 'sent' 
                                                        ? 'rgba(229, 22, 144, 0.8)' 
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
                                            {ref.emailStatus === 'pending' && (
                                                <Button
                                                    variant="subtle"
                                                    size="xs"
                                                    color="white"
                                                    onClick={() => handleSendReminder(ref.id)}
                                                    style={{ color: 'white' }}
                                                    w={{ base: '100%', xs: 'auto' }}
                                                >
                                                    <Clock size={14} style={{ marginRight: 4 }} />
                                                    Remind
                                                </Button>
                                            )}
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

            {/* Reference Type Selection Modal */}
            <Modal
                opened={typeSelectionModalOpen}
                onClose={() => setTypeSelectionModalOpen(false)}
                title="Select Reference Type"
                centered
                size="md"
            >
                <SimpleGrid cols={2} spacing="md">
                    <Paper
                        p="xl"
                        radius="md"
                        withBorder
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 186, 242, 0.15)';
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
                            <Text fw={700} size="lg">Personal Reference</Text>
                        </Stack>
                    </Paper>

                    <Paper
                        p="xl"
                        radius="md"
                        withBorder
                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 186, 242, 0.15)';
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
                title={`${referenceType === 'personal' ? 'Personal' : 'Professional'} Reference Form`}
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
                                            color: '#E51690',
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

        </Stack>
    );
};
