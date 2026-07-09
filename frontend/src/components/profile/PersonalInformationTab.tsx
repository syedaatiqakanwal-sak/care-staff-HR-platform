import { Paper, Tabs, Text, Button, Group, Box, Title } from '@mantine/core';
import { User, Globe, FileCheck, Edit, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PersonalDetailsTab } from './PersonalDetailsTab';
import { IdentityAddressTab } from './IdentityAddressTab';
import { IdentityDocumentsTab } from './IdentityDocumentsTab';
import { ReferencesTab } from './ReferencesTab';
import { notifications } from '@mantine/notifications';

// Update Interface
interface PersonalInformationTabProps {
    profile: any;
    onProfileChange?: (field: string, value: any) => void;
    onSave?: () => Promise<boolean | void>;
}

export const PersonalInformationTab = ({ profile, onProfileChange, onSave }: PersonalInformationTabProps) => {
    const [searchParams] = useSearchParams();
    const [subTab, setSubTab] = useState<string | null>('details');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (onSave) {
            setSaving(true);
            const saved = await onSave();
            setSaving(false);
            if (saved === false) return;
        }
        setIsEditing(false);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsEditing(false);
        notifications.show({
            title: 'Edit Cancelled',
            message: 'No changes were saved.',
            color: 'gray'
        });
    };

    useEffect(() => {
        const section = searchParams.get('section');
        if (!section) return;

        if (section === 'references') {
            setSubTab('references');
            return;
        }
        if (section === 'details') {
            setSubTab('details');
            return;
        }
        if (section === 'identity') {
            setSubTab('identity');
            return;
        }
        if (section === 'identity-documents') {
            setSubTab('identity-documents');
        }
    }, [searchParams]);

    return (
        <Paper p={{ base: 'md', md: 'xl' }} radius="24px" shadow="xs" style={{ position: 'relative' }}>
            {/* Header with Edit Toggle */}
            <Group justify="space-between" mb={{ base: 'md', md: 'xl' }} align="flex-start" wrap="wrap">
                <Box>
                    <Title order={4} size={20} fw={800}>Personal Information</Title>
                    <Text size="sm" c="dimmed">Manage personal identity, address history, and references.</Text>
                </Box>

                {isEditing ? (
                    <Group wrap="wrap">
                        <Button variant="subtle" color="gray" onClick={handleCancel} leftSection={<X size={16} />}>
                            Cancel
                        </Button>
                        <Button variant="filled" color="brandBlue" onClick={handleSave} leftSection={<Save size={16} />} loading={saving}>
                            Save Changes
                        </Button>
                    </Group>
                ) : (
                    <Button variant="light" onClick={() => setIsEditing(true)} leftSection={<Edit size={16} />} w={{ base: '100%', xs: 'auto' }}>
                        Edit Personal Info
                    </Button>
                )}
            </Group>

            {/* Inner Tabs */}
            <style>{`
                .tab-details[data-active] { background-color: #267FBA !important; color: white !important; border-color: #267FBA !important; box-shadow: 0 4px 12px rgba(38, 127, 186, 0.3) !important; }
                .tab-identity[data-active] { background-color: #F57C00 !important; color: white !important; border-color: #F57C00 !important; box-shadow: 0 4px 12px rgba(245, 124, 0, 0.3) !important; }
                .tab-references[data-active] { background-color: #6A1B9A !important; color: white !important; border-color: #6A1B9A !important; box-shadow: 0 4px 12px rgba(106, 27, 154, 0.3) !important; }
                .tab-documents[data-active] { background-color: #00897B !important; color: white !important; border-color: #00897B !important; box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3) !important; }
            `}</style>
            <Tabs
                value={subTab}
                onChange={setSubTab}
                variant="pills"
                radius="xl"
                defaultValue="details"
                styles={{
                    tab: {
                        transition: 'all 0.2s ease',
                        fontWeight: 700,
                        fontSize: '14px',
                        padding: '10px 18px',
                        color: '#6c757d',
                        '&:hover': {
                            backgroundColor: '#F1F3F5',
                        },
                    },
                    list: {
                        backgroundColor: 'white',
                        padding: '6px',
                        borderRadius: '16px',
                        border: '1px solid #E9ECEF',
                        gap: '8px',
                        display: 'inline-flex'
                    },
                    panel: {
                        paddingTop: 24
                    }
                }}
            >
                <Tabs.List style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    <Tabs.Tab 
                        value="details" 
                        leftSection={<User size={18} />}
                        className="tab-details"
                    >
                        Personal Details
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="identity" 
                        leftSection={<Globe size={18} />}
                        className="tab-identity"
                    >
                        Identity & Address
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="identity-documents" 
                        leftSection={<FileCheck size={18} />}
                        className="tab-documents"
                    >
                        Identity & Documents
                    </Tabs.Tab>
                    <Tabs.Tab 
                        value="references" 
                        leftSection={<FileCheck size={18} />}
                        className="tab-references"
                    >
                        References
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="details">
                    <PersonalDetailsTab profile={profile} isEditing={isEditing} onProfileChange={onProfileChange} />
                </Tabs.Panel>

                <Tabs.Panel value="identity">
                    <IdentityAddressTab
                        profile={profile}
                        isEditing={isEditing}
                    />
                </Tabs.Panel>

                <Tabs.Panel value="identity-documents">
                    <IdentityDocumentsTab
                        profile={profile}
                        isEditing={isEditing}
                        onProfileChange={onProfileChange}
                    />
                </Tabs.Panel>

                <Tabs.Panel value="references">
                    <ReferencesTab isEditing={isEditing} profile={profile} />
                </Tabs.Panel>
            </Tabs>
        </Paper>
    );
};
