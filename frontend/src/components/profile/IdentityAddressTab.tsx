import { SimpleGrid, TextInput, Group, Text, Box, Divider, Stack, Textarea, Badge, Paper, ThemeIcon, Button, Modal, LoadingOverlay, Alert, FileButton, ActionIcon } from '@mantine/core';
import { Plus, Trash, MapPin, Upload, Download, AlertTriangle, Pencil, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import axios from 'axios';

const todayIso = () => new Date().toISOString().slice(0, 10);

type AddressRecord = {
    id: string;
    line1?: string | null;
    line2?: string | null;
    town?: string;
    postcode?: string;
    dateFrom?: string;
    dateTo?: string;
    proofDocumentId?: string | null;
    proofDocument?: { id: string; fileName: string } | null;
};

interface IdentityAddressTabProps {
    profile: any;
    isEditing: boolean;
}

export const IdentityAddressTab = ({ profile, isEditing }: IdentityAddressTabProps) => {
    const [addresses, setAddresses] = useState<AddressRecord[]>([]);
    const [hasGap, setHasGap] = useState(false);
    const [gapSummary, setGapSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);

    // Add Address Form State
    const [opened, { open, close }] = useDisclosure(false);
    const [newAddress, setNewAddress] = useState({
        line1: '',
        line2: '',
        town: '',
        postcode: '',
        dateFrom: '',
        dateTo: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Edit existing address record state
    const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
    const [editAddressForm, setEditAddressForm] = useState<{
        line1: string; line2: string; town: string;
        postcode: string; dateFrom: string; dateTo: string;
    }>({ line1: '', line2: '', town: '', postcode: '', dateFrom: '', dateTo: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Fetch Addresses
    const fetchAddresses = async () => {
        if (!profile?.user?.id && !profile?.id) return;
        const targetId = profile.user?.id || profile.id; // Use correct ID relation

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/v1/staff/${targetId}/addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            if (Array.isArray(data)) {
                setAddresses(data);
                setHasGap(false);
                setGapSummary(null);
            } else {
                setAddresses(data.addresses || []);
                setHasGap(Boolean(data.hasGap));
                setGapSummary(data.gapSummary || null);
            }
        } catch (error) {
            console.error('Failed to fetch addresses', error);
        } finally {
            setLoading(false);
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
            setSubmitting(true);
            const token = localStorage.getItem('token');
            await axios.post(`/api/v1/staff/${targetId}/addresses`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifications.show({ title: 'Success', message: 'Address added successfully', color: '#267FBA' });
            close();
            setNewAddress({ line1: '', line2: '', town: '', postcode: '', dateFrom: '', dateTo: todayIso() });
            fetchAddresses(); // Refresh list
        } catch (error) {
            let message = 'Failed to add address';
            if (axios.isAxiosError(error)) {
                const m = error.response?.data?.message;
                if (Array.isArray(m)) message = m.join(' ');
                else if (typeof m === 'string') message = m;
            }
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setSubmitting(false);
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

    const handleEditAddress = (addr: AddressRecord) => {
        setEditingAddressId(addr.id);
        setEditAddressForm({
            line1: addr.line1 || '',
            line2: addr.line2 || '',
            town: addr.town || '',
            postcode: addr.postcode || '',
            dateFrom: addr.dateFrom?.split('T')[0] || '',
            dateTo: addr.dateTo?.split('T')[0] || '',
        });
    };

    const handleCancelEdit = () => {
        setEditingAddressId(null);
    };

    const handleSaveAddress = async (addressId: string) => {
        const targetId = profile.user?.id || profile.id;
        try {
            setSavingEdit(true);
            const token = localStorage.getItem('token');
            await axios.patch(
                `/api/v1/staff/${targetId}/addresses/${addressId}`,
                editAddressForm,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setEditingAddressId(null);
            notifications.show({ title: 'Updated', message: 'Address updated successfully', color: 'green' });
            fetchAddresses();
        } catch (error) {
            let message = 'Failed to update address';
            if (axios.isAxiosError(error)) {
                const m = error.response?.data?.message;
                if (Array.isArray(m)) message = m.join(' ');
                else if (typeof m === 'string') message = m;
            }
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setSavingEdit(false);
        }
    };

    const openAddAddressModal = () => {
        setNewAddress({
            line1: '',
            line2: '',
            town: '',
            postcode: '',
            dateFrom: '',
            dateTo: todayIso(),
        });
        open();
    };

    const handleProofUpload = async (addressId: string, file: File | null) => {
        if (!file) return;
        const targetId = profile.user?.id || profile.id;
        const token = localStorage.getItem('token');
        setUploadingProofId(addressId);
        try {
            const form = new FormData();
            form.append('file', file);
            form.append('documentType', 'ADDRESS_PROOF');
            const uploadRes = await axios.post(`/api/v1/staff/${targetId}/documents`, form, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            const proofDocumentId = uploadRes.data?.document?.id;
            if (!proofDocumentId) {
                throw new Error('Upload did not return a document id');
            }
            await axios.put(
                `/api/v1/staff/${targetId}/addresses/${addressId}/proof`,
                { proofDocumentId },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            notifications.show({ title: 'Uploaded', message: 'Proof of address saved', color: 'green' });
            fetchAddresses();
        } catch (error) {
            let message = 'Failed to upload proof of address';
            if (axios.isAxiosError(error)) {
                const m = error.response?.data?.message;
                if (Array.isArray(m)) message = m.join(' ');
                else if (typeof m === 'string') message = m;
            }
            notifications.show({ title: 'Error', message, color: 'red' });
        } finally {
            setUploadingProofId(null);
        }
    };

    const handleProofDownload = async (docId: string, fileName: string) => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`/api/v1/documents/${docId}/download`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            notifications.show({ title: 'Error', message: 'Download failed', color: 'red' });
        }
    };

    const currentResidency = addresses.length > 0 ? addresses[0] : null;
    const currentResidencyText = currentResidency
        ? [currentResidency.line1, currentResidency.line2, currentResidency.town, currentResidency.postcode]
              .filter((part) => part != null && String(part).trim() !== '')
              .join(', ')
        : '';
    const currentDateFrom = currentResidency?.dateFrom?.split('T')[0] ?? '';
    const currentDateTo = currentResidency?.dateTo?.split('T')[0] ?? '';

    return (
        <Stack gap="xl">
            {/* Section B: Current Address */}
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
                    <Badge color="#267FBA" size="lg" variant="gradient" gradient={{ from: 'green.6', to: 'teal', deg: 90 }} style={{ marginTop: 12 }}>Active Residence</Badge>
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
                                value={todayIso()}
                                readOnly
                                variant="filled"
                                fw={700}
                                radius="md"
                            />
                        </SimpleGrid>
                    </Stack>
                </Box>
            </Paper>

            {/* Section C: Address History */}
            <Paper p={{ base: 'md', md: 'xl' }} radius="24" withBorder style={{ borderColor: '#E9ECEF', overflow: 'hidden', position: 'relative' }}>
                <LoadingOverlay visible={loading} />

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
                        onClick={openAddAddressModal}
                    >
                        Add Address
                    </Button>
                </Group>

                {hasGap && (
                    <Alert
                        icon={<AlertTriangle size={16} />}
                        title="Gap detected in address history"
                        color="red"
                        variant="light"
                        mb="md"
                        radius="md"
                    >
                        {gapSummary || 'One or more years are missing between consecutive address records.'}
                    </Alert>
                )}

                <Stack gap="md">
                    {addresses.length === 0 ? (
                        <Text c="dimmed" size="sm" ta="center" py="xl">No address history recorded.</Text>
                    ) : addresses.map((addr) => (
                        <Box key={addr.id} p="md" style={{ borderLeft: '4px solid #DEE2E6', backgroundColor: '#F8F9FA', borderRadius: '0 12px 12px 0', position: 'relative' }}>
                            <Group justify="space-between" align="flex-start" mb="xs" wrap="wrap">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">Address Record</Text>
                                    <Group gap="xs">
                                        {editingAddressId === addr.id ? (
                                            <>
                                                <Button
                                                    color="green"
                                                    variant="light"
                                                    size="xs"
                                                    style={{ height: 24, padding: '0 8px' }}
                                                    leftSection={<Check size={14} />}
                                                    loading={savingEdit}
                                                    onClick={() => handleSaveAddress(addr.id)}
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    color="gray"
                                                    variant="subtle"
                                                    size="xs"
                                                    style={{ height: 24, padding: '0 8px' }}
                                                    leftSection={<X size={14} />}
                                                    onClick={handleCancelEdit}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <ActionIcon
                                                    variant="light"
                                                    color="blue"
                                                    size="sm"
                                                    onClick={() => handleEditAddress(addr)}
                                                    aria-label="Edit address"
                                                >
                                                    <Pencil size={16} />
                                                </ActionIcon>
                                                <Button
                                                    color="red"
                                                    variant="subtle"
                                                    size="xs"
                                                    style={{ height: 24, padding: '0 8px' }}
                                                    onClick={() => handleDeleteAddress(addr.id)}
                                                >
                                                    <Trash size={14} />
                                                </Button>
                                            </>
                                        )}
                                    </Group>
                            </Group>

                            <Stack gap="xs">
                                {editingAddressId === addr.id ? (
                                    <>
                                        <TextInput
                                            label="Address Line 1"
                                            value={editAddressForm.line1}
                                            onChange={(e) => setEditAddressForm({ ...editAddressForm, line1: e.target.value })}
                                            size="sm"
                                            radius="md"
                                        />
                                        <TextInput
                                            label="Address Line 2"
                                            value={editAddressForm.line2}
                                            onChange={(e) => setEditAddressForm({ ...editAddressForm, line2: e.target.value })}
                                            size="sm"
                                            radius="md"
                                        />
                                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                            <TextInput
                                                label="Town/City"
                                                value={editAddressForm.town}
                                                onChange={(e) => setEditAddressForm({ ...editAddressForm, town: e.target.value })}
                                                size="sm"
                                                radius="md"
                                            />
                                            <TextInput
                                                label="Postcode"
                                                value={editAddressForm.postcode}
                                                onChange={(e) => setEditAddressForm({ ...editAddressForm, postcode: e.target.value })}
                                                size="sm"
                                                radius="md"
                                            />
                                        </SimpleGrid>
                                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                            <TextInput
                                                label="Date From"
                                                type="date"
                                                value={editAddressForm.dateFrom}
                                                onChange={(e) => setEditAddressForm({ ...editAddressForm, dateFrom: e.target.value })}
                                                size="sm"
                                                radius="md"
                                            />
                                            <TextInput
                                                label="Date To"
                                                type="date"
                                                value={editAddressForm.dateTo}
                                                onChange={(e) => setEditAddressForm({ ...editAddressForm, dateTo: e.target.value })}
                                                size="sm"
                                                radius="md"
                                            />
                                        </SimpleGrid>
                                    </>
                                ) : (
                                    <>
                                        <Text fw={600} size="sm" c="dark.3">
                                            {[addr.line1, addr.line2, addr.town, addr.postcode]
                                                .filter((part) => part != null && String(part).trim() !== '')
                                                .join(', ')}
                                        </Text>
                                        <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xs">
                                            <TextInput label="Date From" type="date" value={addr.dateFrom?.split('T')[0] || ''} readOnly variant="filled" size="sm" radius="md" />
                                            <TextInput label="Date To" type="date" value={addr.dateTo?.split('T')[0] || ''} readOnly variant="filled" size="sm" radius="md" />
                                        </SimpleGrid>
                                    </>
                                )}
                                <Group gap="sm" mt="xs" wrap="wrap">
                                    {addr.proofDocument ? (
                                        <Group gap="xs">
                                            <Text size="sm" c="dimmed">Proof of address:</Text>
                                            <Text size="sm" fw={600}>{addr.proofDocument.fileName}</Text>
                                            <ActionIcon
                                                variant="light"
                                                color="brandBlue"
                                                size="sm"
                                                onClick={() => handleProofDownload(addr.proofDocument!.id, addr.proofDocument!.fileName)}
                                            >
                                                <Download size={14} />
                                            </ActionIcon>
                                        </Group>
                                    ) : (
                                        <Text size="sm" c="dimmed">No proof of address uploaded</Text>
                                    )}
                                    {isEditing && (
                                        <FileButton
                                            onChange={(file) => handleProofUpload(addr.id, file)}
                                            accept="application/pdf,image/jpeg,image/png,image/jpg,.doc,.docx"
                                        >
                                            {(props) => (
                                                <Button
                                                    {...props}
                                                    variant="light"
                                                    size="xs"
                                                    leftSection={<Upload size={14} />}
                                                    loading={uploadingProofId === addr.id}
                                                >
                                                    {addr.proofDocument ? 'Replace proof' : 'Upload proof'}
                                                </Button>
                                            )}
                                        </FileButton>
                                    )}
                                </Group>
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Paper>

            {/* Add Address Modal */}
            <Modal opened={opened} onClose={close} title={<Text fw={700}>Add Previous Address</Text>} centered>
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
                            value={newAddress.dateTo || todayIso()}
                            onChange={(e) => setNewAddress({ ...newAddress, dateTo: e.target.value })}
                        />
                    </SimpleGrid>
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={close}>Cancel</Button>
                        <Button onClick={handleAddAddress} loading={submitting}>Add Address</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
};
