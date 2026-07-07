import { SimpleGrid, TextInput, Select, Group, Text, Box, Paper, Divider, Stack, ThemeIcon, Button, Modal, Textarea, LoadingOverlay, Badge } from '@mantine/core';
import { User, Mail, Phone, Hash, Calendar, Briefcase, Plus, FileCheck, Globe, CreditCard, MapPin, Trash } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { EMPLOYMENT_STATUS_OPTIONS } from '../../lib/employmentStatus';

const CURRENT_NATIONALITY_OPTIONS = ['British', 'Irish', 'Indian', 'Pakistani', 'Somali', 'Other'];

const NATIONALITY_OPTIONS = [
    'British', 'Irish', 'Indian', 'Pakistani', 'Bangladeshi',
    'Nigerian', 'Ghanaian', 'Somali', 'Polish', 'Romanian', 'Other'
];

interface PersonalDetailsTabProps {
    profile: any;
    isEditing: boolean;
    onProfileChange?: (field: string, value: any) => void;
}

export const PersonalDetailsTab = ({ profile, isEditing, onProfileChange }: PersonalDetailsTabProps) => {
    const { id } = useParams();
    // Computed Full Name
    const fullName = `${profile.firstName || ''} ${profile.middleName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim();
    const isAdmin = localStorage.getItem('role') === 'admin';

    // Reference modals state
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

    const [addresses, setAddresses] = useState<any[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [addressModalOpened, { open: openAddressModal, close: closeAddressModal }] = useDisclosure(false);
    const [newAddress, setNewAddress] = useState({
        line1: '',
        line2: '',
        town: '',
        postcode: '',
        dateFrom: '',
        dateTo: ''
    });
    const [submittingAddress, setSubmittingAddress] = useState(false);

    const handleChange = (field: string, value: any) => {
        if (onProfileChange) {
            onProfileChange(field, value);
        }
    };

    const handleAddReference = () => {
        console.log('Add Reference clicked, opening modal');
        setTypeSelectionModalOpen(true);
    };

    const handleTypeSelect = (type: 'personal' | 'professional') => {
        setReferenceType(type);
        setTypeSelectionModalOpen(false);
        setReferenceFormModalOpen(true);
        // Reset form
        setReferenceFormData({
            name: '',
            email: '',
            phone: '',
            relationship: '',
            yearsKnown: '',
            message: '',
        });
    };

    const handleSendReference = async () => {
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
            } else {
                throw new Error(response.data.message || 'Failed to send reference');
            }
        } catch (error: any) {
            console.error('Failed to send reference:', error);
            // Do NOT show success notification on error
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || error.message || 'Failed to send reference request',
                color: 'red',
            });
        } finally {
            setSendingReference(false);
        }
    };

    const fetchAddresses = async () => {
        if (!profile?.user?.id && !profile?.id) return;
        const targetId = profile.user?.id || profile.id;

        try {
            setAddressLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/v1/staff/${targetId}/addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAddresses(res.data);
        } catch (error) {
            console.error('Failed to fetch addresses', error);
        } finally {
            setAddressLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, [profile]);

    const handleAddAddress = async () => {
        const targetId = profile.user?.id || profile.id;
        const trim = (s: string) => s?.trim() ?? '';
        const payload: Record<string, string> = {};
        if (trim(newAddress.line1)) payload.line1 = trim(newAddress.line1);
        if (trim(newAddress.line2)) payload.line2 = trim(newAddress.line2);
        if (trim(newAddress.town)) payload.town = trim(newAddress.town);
        if (trim(newAddress.postcode)) payload.postcode = trim(newAddress.postcode);
        if (trim(newAddress.dateFrom)) payload.dateFrom = trim(newAddress.dateFrom);
        if (trim(newAddress.dateTo)) payload.dateTo = trim(newAddress.dateTo);

        try {
            setSubmittingAddress(true);
            const token = localStorage.getItem('token');
            await axios.post(`/api/v1/staff/${targetId}/addresses`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifications.show({ title: 'Success', message: 'Address added successfully', color: '#E51690' });
            closeAddressModal();
            setNewAddress({ line1: '', line2: '', town: '', postcode: '', dateFrom: '', dateTo: '' });
            fetchAddresses();
        } catch (error) {
            let message = 'Failed to add address';
            if (axios.isAxiosError(error)) {
                const m = error.response?.data?.message;
                if (Array.isArray(m)) message = m.join(' ');
                else if (typeof m === 'string') message = m;
            }
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setSubmittingAddress(false);
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!window.confirm('Are you sure you want to remove this address history?')) return;

        const targetId = profile.user?.id || profile.id;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/staff/${targetId}/addresses/${addressId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            notifications.show({ title: 'Removed', message: 'Address history removed', color: 'blue' });
            fetchAddresses();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to delete address', color: 'red' });
        }
    };

    const currentResidency = addresses.length > 0 ? addresses[0] : null;
    const currentResidencyText = currentResidency
        ? [currentResidency.line1, currentResidency.line2, currentResidency.town, currentResidency.postcode]
              .filter((part: string) => part != null && String(part).trim() !== '')
              .join(', ')
        : '';
    const currentDateFrom = currentResidency?.dateFrom?.split('T')[0] ?? '';
    const currentDateTo = currentResidency?.dateTo?.split('T')[0] ?? '';

    return (
        <>
        <Stack gap="xl">
                    {/* Employment Status Section */}
                    <Box>
                        <Group gap="xs" mb="md">
                            <Briefcase size={18} color="#1EBAF2" />
                            <Text fw={800} size="md" c="brandBlue.9" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                                Employment Status
                            </Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing={{ base: 'md', md: 'lg' }}>
                            <Select
                                label="Employment Status"
                                placeholder="Select status"
                                data={[...EMPLOYMENT_STATUS_OPTIONS]}
                                value={profile.employmentStatus || 'Active'}
                                onChange={(val) => handleChange('employmentStatus', val)}
                                readOnly={!isEditing || !isAdmin}
                                variant={(isEditing && isAdmin) ? 'default' : 'filled'}
                                leftSection={<Briefcase size={18} />}
                                styles={{
                                    input: { 
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                                color="brandBlue"
                            />
                            <TextInput
                                label="ILCCS Number"
                                value={profile.ilccsNumber || ''}
                                onChange={(e) => handleChange('ilccsNumber', e.target.value)}
                                readOnly={!isEditing || !isAdmin}
                                variant={isEditing && isAdmin ? 'default' : 'filled'}
                                leftSection={<Hash size={18} />}
                                styles={{ 
                                    input: { 
                                        fontWeight: 700, 
                                        color: '#1EBAF2', 
                                        letterSpacing: '1px',
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                            />
                            <TextInput
                                label="LCA Number"
                                placeholder="Admin Assigned"
                                value={profile.lcaNumber || ''}
                                onChange={(e) => handleChange('lcaNumber', e.target.value)}
                                readOnly={!isEditing || !isAdmin}
                                variant={isEditing && isAdmin ? 'default' : 'filled'}
                                leftSection={<Hash size={18} />}
                                styles={{ 
                                    input: { 
                                        fontWeight: 700, 
                                        color: '#C92A2A', 
                                        letterSpacing: '1px',
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                            />
                            <TextInput
                                label="Induction Date"
                                type="date"
                                value={profile.inductionDate ? profile.inductionDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('inductionDate', e.target.value)}
                                readOnly={!isEditing || !isAdmin}
                                variant={isEditing && isAdmin ? 'default' : 'filled'}
                                leftSection={<Calendar size={18} />}
                                styles={{ 
                                    input: { 
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                            />
                            <TextInput
                                label="Rapid Induction Date"
                                type="date"
                                value={profile.rapidInductionDate ? profile.rapidInductionDate.split('T')[0] : ''}
                                onChange={(e) => handleChange('rapidInductionDate', e.target.value)}
                                readOnly={!isEditing || !isAdmin}
                                variant={isEditing && isAdmin ? 'default' : 'filled'}
                                leftSection={<Calendar size={18} />}
                                styles={{ 
                                    input: { 
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                            />
                        </SimpleGrid>
                    </Box>

                    <Divider my="md" />

                    {/* Personal Identity Section */}
                    <Box>
                        <Group gap="xs" mb="md">
                            <User size={18} color="#E51690" />
                            <Text fw={800} size="md" c="green.9" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                                Personal Identity
                            </Text>
                        </Group>
                        <Stack gap="md">
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 'md', md: 'lg' }}>
                                <Select
                                    label="Title"
                                    data={['Mr', 'Mrs', 'Ms', 'Dr', 'Mx']}
                                    value={profile.title || 'Mr'}
                                    onChange={(val) => handleChange('title', val)}
                                    readOnly={!isEditing}
                                    variant={isEditing ? 'default' : 'filled'}
                                    styles={{
                                        input: { 
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            height: '48px',
                                            borderRadius: '12px'
                                        },
                                        label: { marginBottom: 8, fontWeight: 600 }
                                    }}
                                    radius="md"
                                />
                                <TextInput
                                    label="First Name"
                                    value={profile.firstName || ''}
                                    onChange={(e) => handleChange('firstName', e.target.value)}
                                    readOnly={!isEditing}
                                    variant={isEditing ? 'default' : 'filled'}
                                    required
                                    styles={{
                                        input: { 
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            height: '48px',
                                            borderRadius: '12px'
                                        },
                                        label: { marginBottom: 8, fontWeight: 600 }
                                    }}
                                    radius="md"
                                />
                                <TextInput
                                    label="Surname"
                                    value={profile.lastName || ''}
                                    onChange={(e) => handleChange('lastName', e.target.value)}
                                    readOnly={!isEditing}
                                    variant={isEditing ? 'default' : 'filled'}
                                    styles={{
                                        input: { 
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            height: '48px',
                                            borderRadius: '12px'
                                        },
                                        label: { marginBottom: 8, fontWeight: 600 }
                                    }}
                                    radius="md"
                                />
                            </SimpleGrid>

                            <Box
                                p="md"
                                style={{
                                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                    borderRadius: '12px',
                                    border: '2px solid #dee2e6'
                                }}
                            >
                                <TextInput
                                    label="Computed Full Name"
                                    value={fullName}
                                    readOnly
                                    variant="filled"
                                    leftSection={<User size={18} />}
                                    styles={{ 
                                        input: { 
                                            fontWeight: 800, 
                                            color: '#343a40',
                                            fontSize: '16px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: 'white'
                                        },
                                        label: { marginBottom: 8, fontWeight: 600 }
                                    }}
                                    radius="md"
                                    description="This name will appear on official certificates and reports"
                                />
                            </Box>
                        </Stack>
                    </Box>

                    <Paper p={{ base: 'md', md: 'xl' }} radius={24} withBorder mt="md">
                        <Box
                            mb="md"
                            p="md"
                            style={{ background: 'var(--mantine-color-orange-0)', borderRadius: 12 }}
                        >
                            <Group gap="sm">
                                <ThemeIcon
                                    variant="gradient"
                                    gradient={{ from: 'orange.6', to: 'yellow', deg: 90 }}
                                    size={40}
                                    radius="md"
                                >
                                    <Globe size={20} />
                                </ThemeIcon>
                                <Box>
                                    <Text fw={700} tt="uppercase" c="orange.7" size="sm">
                                        Birth & Nationality
                                    </Text>
                                    <Text c="orange.5" size="xs">
                                        Origin and citizenship details
                                    </Text>
                                </Box>
                            </Group>
                        </Box>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <TextInput
                                label="Town of Birth"
                                placeholder="e.g. London"
                                value={profile.townOfBirth || ''}
                                onChange={(e) => handleChange('townOfBirth', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                radius="md"
                            />
                            <TextInput
                                label="County of Birth"
                                placeholder="e.g. Greater London"
                                value={profile.countyOfBirth || ''}
                                onChange={(e) => handleChange('countyOfBirth', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                radius="md"
                            />
                            <Select
                                label="Nationality at Birth"
                                placeholder="Select nationality"
                                data={NATIONALITY_OPTIONS}
                                value={profile.nationalityAtBirth || null}
                                onChange={(val) => handleChange('nationalityAtBirth', val || '')}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                radius="md"
                                leftSection={<Globe size={14} />}
                            />
                        </SimpleGrid>
                    </Paper>

                    <Divider my="md" />

                    {/* Contact Information Section */}
                    <Box>
                        <Group gap="xs" mb="md">
                            <Phone size={18} color="#F57C00" />
                            <Text fw={800} size="md" c="orange.9" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                                Contact Information
                            </Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: 'md', md: 'lg' }}>
                            <TextInput
                                label={
                                    <Group gap={4}>
                                        <Text>Date of Birth</Text>
                                        <Text c="red" size="sm">*</Text>
                                    </Group>
                                }
                                type="date"
                                value={profile.dateOfBirth?.split('T')[0] || ''}
                                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                leftSection={<Calendar size={18} />}
                                required
                                styles={{
                                    input: { 
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                            />
                            <TextInput
                                label={
                                    <Group gap={4}>
                                        <Text>Telephone Number</Text>
                                        <Text c="red" size="sm">*</Text>
                                    </Group>
                                }
                                value={profile.phoneNumber || ''}
                                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                leftSection={<Phone size={18} />}
                                required
                                styles={{
                                    input: { 
                                        fontWeight: 600,
                                        fontSize: '15px',
                                        height: '48px',
                                        borderRadius: '12px'
                                    },
                                    label: { marginBottom: 8, fontWeight: 600 }
                                }}
                                radius="md"
                            />
                            <Box style={{ gridColumn: '1 / -1' }}>
                                <TextInput
                                    label="Email Address"
                                    value={profile.email || profile.user?.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    readOnly={!isEditing || !isAdmin}
                                    variant={(isEditing && isAdmin) ? 'default' : 'filled'}
                                    leftSection={<Mail size={18} />}
                                    rightSection={
                                        <Box
                                            px={12}
                                            py={6}
                                            style={{
                                                background: 'linear-gradient(135deg, #E51690 0%, #E51690 100%)',
                                                borderRadius: '8px',
                                                boxShadow: '0 2px 8px rgba(229, 22, 144, 0.2)'
                                            }}
                                        >
                                            <Text size="xs" c="white" fw={800} tt="uppercase">
                                                VERIFIED
                                            </Text>
                                        </Box>
                                    }
                                    rightSectionWidth={110}
                                    styles={{
                                        input: { 
                                            fontWeight: 600,
                                            fontSize: '15px',
                                            height: '48px',
                                            borderRadius: '12px'
                                        },
                                        label: { marginBottom: 8, fontWeight: 600 }
                                    }}
                                    radius="md"
                                />
                            </Box>
                        </SimpleGrid>
                    </Box>

                    <Divider my="md" />

                    <Paper p={{ base: 'md', md: 'xl' }} radius="24" withBorder style={{ borderColor: '#E9ECEF', overflow: 'hidden' }}>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: 'md', md: 'lg' }}>
                            <Select
                                label="Current Nationality"
                                data={CURRENT_NATIONALITY_OPTIONS}
                                value={
                                    profile?.currentNationality && CURRENT_NATIONALITY_OPTIONS.includes(profile.currentNationality)
                                        ? profile.currentNationality
                                        : 'British'
                                }
                                onChange={(v) => v && handleChange('currentNationality', v)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                leftSection={<Globe size={16} />}
                                radius="md"
                            />
                            <TextInput
                                label="NI Number"
                                value={profile?.niNumber || ''}
                                placeholder="AA 12 34 56 A"
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                onChange={(e) => handleChange('niNumber', e.target.value)}
                                leftSection={<CreditCard size={16} />}
                                description="Format: AA 12 34 56 A"
                                styles={{ input: { letterSpacing: '1px', fontWeight: 700 } }}
                                radius="md"
                            />
                        </SimpleGrid>
                    </Paper>

                    <Paper p={{ base: 'md', md: 'xl' }} radius="24" withBorder style={{ borderColor: '#E9ECEF', overflow: 'hidden' }}>
                        <Group mb={{ base: 'md', md: 'xl' }} justify="space-between" align="flex-start" wrap="wrap">
                            <Box bg="green.0" p="md" style={{ borderRadius: '16px', flex: 1 }}>
                                <Group gap="sm">
                                    <ThemeIcon variant="gradient" gradient={{ from: 'green.6', to: 'lime', deg: 90 }} radius="md" size="lg">
                                        <MapPin size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text size="lg" fw={800} c="green.9" tt="uppercase" style={{ letterSpacing: '0.5px' }}>Current Residency</Text>
                                        <Text size="sm" c="green.6" fw={600}>Verified primary address</Text>
                                    </Box>
                                </Group>
                            </Box>
                            <Badge color="#E51690" size="lg" variant="gradient" gradient={{ from: 'green.6', to: 'teal', deg: 90 }} style={{ marginTop: 12 }}>Active Residence</Badge>
                        </Group>

                        <Box
                            p="lg"
                            style={{
                                backgroundColor: '#F8FFF9',
                                borderRadius: '16px',
                                border: '1px solid #C3E6CB'
                            }}
                        >
                            <Stack gap="md">
                                <Textarea
                                    label="Current Full Address"
                                    value={currentResidencyText}
                                    placeholder="No address on file — add one in Address History below."
                                    minRows={3}
                                    readOnly
                                    variant="filled"
                                    leftSectionProps={{ style: { alignItems: 'flex-start', paddingTop: 8 } }}
                                    radius="md"
                                    autosize
                                />
                                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                    <TextInput
                                        label="Date From"
                                        type="date"
                                        value={currentDateFrom}
                                        readOnly
                                        variant="filled"
                                        radius="md"
                                    />
                                    <TextInput
                                        label="Date To"
                                        type="date"
                                        value={currentDateTo}
                                        readOnly
                                        variant="filled"
                                        fw={700}
                                        radius="md"
                                    />
                                </SimpleGrid>
                            </Stack>
                        </Box>
                    </Paper>

                    <Paper p={{ base: 'md', md: 'xl' }} radius="24" withBorder style={{ borderColor: '#E9ECEF', overflow: 'hidden', position: 'relative' }}>
                        <LoadingOverlay visible={addressLoading} />

                        <Group mb={{ base: 'md', md: 'xl' }} justify="space-between" align="center" wrap="wrap">
                            <Box bg="gray.1" p="md" style={{ borderRadius: '16px', flex: 1 }}>
                                <Group gap="sm">
                                    <ThemeIcon variant="gradient" gradient={{ from: 'gray.6', to: 'gray.8', deg: 90 }} radius="md" size="lg">
                                        <MapPin size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text size="lg" fw={800} c="gray.8" tt="uppercase" style={{ letterSpacing: '0.5px' }}>Address History</Text>
                                        <Text size="sm" c="gray.6" fw={600}>Previous 5 years of residency</Text>
                                    </Box>
                                </Group>
                            </Box>
                            <Button
                                variant="light"
                                size="sm"
                                radius="xl"
                                leftSection={<Plus size={14} />}
                                onClick={openAddressModal}
                            >
                                Add Address
                            </Button>
                        </Group>

                        <Stack gap="md">
                            {addresses.length === 0 ? (
                                <Text c="dimmed" size="sm" ta="center" py="xl">No address history recorded.</Text>
                            ) : addresses.map((addr) => (
                                <Box key={addr.id} p="md" style={{ borderLeft: '4px solid #DEE2E6', backgroundColor: '#F8F9FA', borderRadius: '0 12px 12px 0', position: 'relative' }}>
                                    <Group justify="space-between" align="flex-start" mb="xs" wrap="wrap">
                                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Address Record</Text>
                                        {isEditing && (
                                            <Button
                                                color="red"
                                                variant="subtle"
                                                size="xs"
                                                style={{ height: 24, padding: '0 8px' }}
                                                onClick={() => handleDeleteAddress(addr.id)}
                                            >
                                                <Trash size={14} />
                                            </Button>
                                        )}
                                    </Group>

                                    <Stack gap="xs">
                                        <Text fw={600} size="sm" c="dark.3">
                                            {[addr.line1, addr.line2, addr.town, addr.postcode]
                                                .filter((part: string) => part != null && String(part).trim() !== '')
                                                .join(', ')}
                                        </Text>
                                        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xs">
                                            <TextInput label="Date From" type="date" value={addr.dateFrom?.split('T')[0] || ''} readOnly variant="filled" size="sm" radius="md" />
                                            <TextInput label="Date To" type="date" value={addr.dateTo?.split('T')[0] || ''} readOnly variant="filled" size="sm" radius="md" />
                                        </SimpleGrid>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>

                    <Modal opened={addressModalOpened} onClose={closeAddressModal} title={<Text fw={700}>Add Previous Address</Text>} centered>
                        <Stack>
                            <TextInput
                                label="Address Line 1"
                                data-autofocus
                                placeholder="e.g. 42 Wallaby Way"
                                value={newAddress.line1}
                                onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                            />
                            <TextInput
                                label="Address Line 2 (Optional)"
                                placeholder="e.g. Flat 3"
                                value={newAddress.line2}
                                onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                            />
                            <SimpleGrid cols={2}>
                                <TextInput
                                    label="Town/City"
                                    placeholder="London"
                                    value={newAddress.town}
                                    onChange={(e) => setNewAddress({ ...newAddress, town: e.target.value })}
                                />
                                <TextInput
                                    label="Postcode"
                                    placeholder="SW1A 1AA"
                                    value={newAddress.postcode}
                                    onChange={(e) => setNewAddress({ ...newAddress, postcode: e.target.value })}
                                />
                            </SimpleGrid>
                            <SimpleGrid cols={2}>
                                <TextInput
                                    label="Date From"
                                    type="date"
                                    value={newAddress.dateFrom}
                                    onChange={(e) => setNewAddress({ ...newAddress, dateFrom: e.target.value })}
                                />
                                <TextInput
                                    label="Date To"
                                    type="date"
                                    value={newAddress.dateTo}
                                    onChange={(e) => setNewAddress({ ...newAddress, dateTo: e.target.value })}
                                />
                            </SimpleGrid>
                            <Group justify="flex-end" mt="md">
                                <Button variant="default" onClick={closeAddressModal}>Cancel</Button>
                                <Button onClick={handleAddAddress} loading={submittingAddress}>Add Address</Button>
                            </Group>
                        </Stack>
                    </Modal>
        </Stack>

        {/* Reference Type Selection Modal - Always rendered, controlled by state */}
            <Modal
                opened={typeSelectionModalOpen}
                onClose={() => {
                    console.log('Closing type selection modal');
                    setTypeSelectionModalOpen(false);
                }}
                title="Select Reference Type"
                centered
                size="md"
                overlayProps={{ opacity: 0.55, blur: 3 }}
                styles={{
                    content: {
                        zIndex: 1000,
                    },
                    overlay: {
                        zIndex: 999,
                    },
                }}
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
                            console.log('Personal Reference selected');
                            handleTypeSelect('personal');
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
                            console.log('Professional Reference selected');
                            handleTypeSelect('professional');
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
                            onClick={handleSendReference}
                            loading={sendingReference}
                            disabled={sendingReference}
                            color="brandBlue"
                        >
                            Send
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
};
