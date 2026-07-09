import { SimpleGrid, TextInput, Select, Group, Text, Box, Divider, Stack, ThemeIcon, Button, Modal, Textarea, LoadingOverlay, Paper } from '@mantine/core';
import { User, Mail, Phone, Hash, Calendar, Briefcase, Plus, FileCheck, Globe } from 'lucide-react';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const GENDER_OPTIONS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Non-binary', label: 'Non-binary' },
    { value: 'Prefer not to say', label: 'Prefer not to say' },
    { value: 'Other', label: 'Other' },
];

const NATIONALITY_OPTIONS = [
    'British', 'Irish', 'Indian', 'Pakistani', 'Bangladeshi',
    'Nigerian', 'Ghanaian', 'Somali', 'Polish', 'Romanian',
    'Afghan', 'Albanian', 'Algerian', 'American', 'Australian',
    'Brazilian', 'Bulgarian', 'Canadian', 'Chinese', 'Czech',
    'Egyptian', 'Ethiopian', 'Filipino', 'French', 'German',
    'Greek', 'Hungarian', 'Indonesian', 'Iranian',
    'Iraqi', 'Italian', 'Jamaican', 'Japanese', 'Kenyan',
    'Korean', 'Latvian', 'Lebanese', 'Lithuanian', 'Malaysian',
    'Mexican', 'Moroccan', 'Nepalese', 'New Zealander', 'Norwegian',
    'Portuguese', 'Russian', 'Saudi Arabian', 'Singaporean',
    'South African', 'Spanish', 'Sri Lankan', 'Swedish', 'Swiss',
    'Syrian', 'Tanzanian', 'Thai', 'Turkish', 'Ugandan',
    'Ukrainian', 'Vietnamese', 'Zimbabwean', 'Other'
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
    const isAdmin = ['admin', 'manager', 'hr', 'supervisor'].includes((localStorage.getItem('role') || '').toLowerCase());
    const canEdit = isAdmin && localStorage.getItem('readOnly') !== 'true';

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

    return (
        <>
        <Stack gap="xl">
                    {/* Employment Status Section */}
                    <Box>
                        <Group gap="xs" mb="md">
                            <Briefcase size={18} color="#139639" />
                            <Text fw={800} size="md" c="brandBlue.9" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                                Employment Status
                            </Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing={{ base: 'md', md: 'lg' }}>
                            <Select
                                label="Employment Status"
                                placeholder="Select status"
                                data={[
                                    { value: 'APPLICANT', label: 'Applicant' },
                                    { value: 'ON_SHADOW', label: 'On shadow' },
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'LEAVER', label: 'Leaver' },
                                ]}
                                value={profile.employmentStatus || 'ACTIVE'}
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
                                label="Staff Number"
                                placeholder="e.g. LCACS000303"
                                description="Format: LCACS000 followed by digits"
                                inputWrapperOrder={['label', 'input', 'description', 'error']}
                                value={profile.lcaNumber || ''}
                                onChange={(e) => handleChange('lcaNumber', e.target.value)}
                                readOnly={!isEditing || !isAdmin}
                                variant={isEditing && isAdmin ? 'default' : 'filled'}
                                leftSection={<Hash size={18} />}
                                styles={{ 
                                    input: { 
                                        fontWeight: 700, 
                                        color: '#139639', 
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
                                label="Job Start Date"
                                type="date"
                                value={profile.startDate ? String(profile.startDate).split('T')[0] : ''}
                                onChange={(e) => handleChange('startDate', e.target.value)}
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
                            <User size={18} color="#267FBA" />
                            <Text fw={800} size="md" c="green.9" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                                Personal Identity
                            </Text>
                        </Group>
                        <Stack gap="md">
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 'md', md: 'lg' }}>
                                <Select
                                    label="Title"
                                    data={['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Mx']}
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
                                    label="Middle Name"
                                    value={profile.middleName || ''}
                                    onChange={(e) => handleChange('middleName', e.target.value)}
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
                                <Select
                                    label="Gender"
                                    placeholder="Select gender"
                                    data={GENDER_OPTIONS}
                                    value={profile.gender || null}
                                    onChange={(val) => handleChange('gender', val)}
                                    readOnly={!isEditing}
                                    variant={isEditing ? 'default' : 'filled'}
                                    clearable
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
                                    label="Date of Birth"
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
                                    label="NI Number"
                                    value={profile.niNumber || ''}
                                    placeholder="AA 12 34 56 A"
                                    onChange={(e) => handleChange('niNumber', e.target.value)}
                                    readOnly={!isEditing}
                                    variant={isEditing ? 'default' : 'filled'}
                                    leftSection={<Hash size={18} />}
                                    description="Format: AA 12 34 56 A"
                                    styles={{ input: { letterSpacing: '1px', fontWeight: 700 } }}
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
                                    description="This name will appear on official documents and reports"
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
                            <Select
                                label="Current Nationality"
                                placeholder="Select nationality"
                                data={NATIONALITY_OPTIONS}
                                value={profile.currentNationality || null}
                                onChange={(val) => handleChange('currentNationality', val || '')}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                searchable
                                radius="md"
                                leftSection={<Globe size={14} />}
                                styles={{ input: { fontWeight: 600, fontSize: '15px', height: '48px', borderRadius: '12px' }, label: { marginBottom: 8, fontWeight: 600 } }}
                            />
                            <TextInput
                                label="Town of Birth"
                                placeholder="e.g. London"
                                value={profile.townOfBirth || ''}
                                onChange={(e) => handleChange('townOfBirth', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                radius="md"
                                styles={{ input: { fontWeight: 600, fontSize: '15px', height: '48px', borderRadius: '12px' }, label: { marginBottom: 8, fontWeight: 600 } }}
                            />
                            <Select
                                label="Nationality at Birth"
                                placeholder="Select nationality"
                                data={NATIONALITY_OPTIONS}
                                value={profile.nationalityAtBirth || null}
                                onChange={(val) => handleChange('nationalityAtBirth', val || '')}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                searchable
                                radius="md"
                                leftSection={<Globe size={14} />}
                                styles={{ input: { fontWeight: 600, fontSize: '15px', height: '48px', borderRadius: '12px' }, label: { marginBottom: 8, fontWeight: 600 } }}
                            />
                            <TextInput
                                label="Country of Birth"
                                placeholder="e.g. United Kingdom"
                                value={profile.countryOfBirth || ''}
                                onChange={(e) => handleChange('countryOfBirth', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                radius="md"
                                styles={{ input: { fontWeight: 600, fontSize: '15px', height: '48px', borderRadius: '12px' }, label: { marginBottom: 8, fontWeight: 600 } }}
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
                                label="Telephone Number"
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
                                            background: 'linear-gradient(135deg, #267FBA 0%, #267FBA 100%)',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px rgba(38, 127, 186, 0.2)'
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
                            <TextInput
                                label="Next of Kin Name"
                                value={profile.nextOfKinName || ''}
                                onChange={(e) => handleChange('nextOfKinName', e.target.value)}
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
                                label="Next of Kin Number"
                                value={profile.nextOfKinNumber || ''}
                                onChange={(e) => handleChange('nextOfKinNumber', e.target.value)}
                                readOnly={!isEditing}
                                variant={isEditing ? 'default' : 'filled'}
                                leftSection={<Phone size={18} />}
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
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 150, 57, 0.15)';
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
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
                        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(19, 150, 57, 0.15)';
                        }}
                        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
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
