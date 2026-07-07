import { Paper, Tabs, Text, Button, Group, Box, Title } from '@mantine/core';
import { User, FileCheck, Edit, Save, X } from 'lucide-react';
import { useState } from 'react';
import { PersonalDetailsTab } from './PersonalDetailsTab';
import { ReferencesTab } from './ReferencesTab';
import { notifications } from '@mantine/notifications';

// Update Interface
interface PersonalInformationTabProps {
    profile: any;
    onProfileChange?: (field: string, value: any) => void;
    onSave?: () => Promise<void>;
}

export const PersonalInformationTab = ({ profile, onProfileChange, onSave }: PersonalInformationTabProps) => {
    const [subTab, setSubTab] = useState<string | null>('details');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (onSave) {
            setSaving(true);
            await onSave();
            setSaving(false);
        }
        setIsEditing(false);
        // Notification is handled by parent, but we can keep or remove this one. 
        // Parent shows "Profile Updated" green check. We can avoid double toast.
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
                .tab-details[data-active] { background-color: #E51690 !important; color: white !important; border-color: #E51690 !important; box-shadow: 0 4px 12px rgba(229, 22, 144, 0.3) !important; }
                .tab-references[data-active] { background-color: #6A1B9A !important; color: white !important; border-color: #6A1B9A !important; box-shadow: 0 4px 12px rgba(106, 27, 154, 0.3) !important; }
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

                <Tabs.Panel value="references">
                    <ReferencesTab isEditing={isEditing} profile={profile} />
                </Tabs.Panel>
            </Tabs>
        </Paper>
    );
};
