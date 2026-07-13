import {
  Paper,
  Title,
  Text,
  Stack,
  Table,
  Group,
  Button,
  ActionIcon,
  TextInput,
  SimpleGrid,
  Loader,
  Center,
  Select,
  SegmentedControl,
  Divider,
  Checkbox,
  Box,
} from '@mantine/core';
import { useRef, useState, useEffect } from 'react';
import { Download, Trash, Shield, FileText } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { useStaffDocuments } from '../../hooks/useStaffDocuments';
import { DocumentUploadForm } from '../documents/DocumentUploadForm';
import { ExpiryBadge } from '../documents/ExpiryBadge';
import { isManagementRole, canMutate } from '../../utils/roles';
import type { StaffDocumentDto } from '../../types/documents';

const NATIONALITY_OPTIONS = ['British', 'Irish', 'Indian', 'Pakistani', 'Somali', 'Other'];

const YES_NO = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

interface IdentityDocumentsTabProps {
  profile: {
    user?: { id: string };
    id?: string;
    passportNumber?: string | null;
    passportExpiry?: string | Date | null;
    currentNationality?: string | null;
    isUkNational?: boolean | null;
    isEeaNational?: boolean | null;
    visaType?: string | null;
    visaOrBrpNumber?: string | null;
    visaExpiryDate?: string | Date | null;
    shareCode?: string | null;
    rightToWorkStatus?: string | null;
    shareCodeGeneratedDate?: string | Date | null;
    rightToWorkCheckCompleted?: boolean | null;
    rightToWorkCheckDate?: string | Date | null;
    rightToWorkCheckExpiryDate?: string | Date | null;
  };
  isEditing?: boolean;
  onProfileChange?: (field: string, value: unknown) => void;
}

function boolToSegment(v: boolean | null | undefined): string {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

function segmentToBool(v: string): boolean | null {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return null;
}

export function IdentityDocumentsTab({
  profile,
  isEditing = false,
  onProfileChange,
}: IdentityDocumentsTabProps) {
  const targetUserId = profile.user?.id || profile.id;
  const { documents, loading, refetch } = useStaffDocuments(targetUserId);
  const canUpload = isManagementRole() && canMutate();
  const editable = isEditing;

  const [rtwDocumentName, setRtwDocumentName] = useState<string | null>(null);
  const [rtwUploading, setRtwUploading] = useState(false);
  const rtwFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rtwDoc = documents.find((d) => d.documentType === 'RIGHT_TO_WORK');
    setRtwDocumentName(rtwDoc?.fileName ?? null);
  }, [documents]);

  const isUkNationalNo = profile.isUkNational === false;
  const showEeaQuestion = isUkNationalNo;
  const showVisaFields = isUkNationalNo && profile.isEeaNational === false;

  const handleDownload = async (doc: StaffDocumentDto) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`/api/v1/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      notifications.show({ title: 'Error', message: 'Download failed', color: 'red' });
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Delete this document?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`/api/v1/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notifications.show({ title: 'Deleted', message: 'Document removed', color: 'blue' });
      refetch();
    } catch {
      notifications.show({ title: 'Error', message: 'Delete failed', color: 'red' });
    }
  };

  const passportDocs = documents.filter((d) => d.documentType === 'PASSPORT');

  const handleRtwDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;
    setRtwUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', 'RIGHT_TO_WORK');
    formData.append('documentName', file.name);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/staff/${targetUserId}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setRtwDocumentName(file.name);
      refetch();
      notifications.show({
        title: 'Success',
        message: 'Right to work document uploaded successfully',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to upload document. Please try again.',
        color: 'red',
      });
    } finally {
      setRtwUploading(false);
      if (rtwFileInputRef.current) rtwFileInputRef.current.value = '';
    }
  };

  return (
    <Stack gap="xl">
      <Paper p="lg" radius="md" withBorder>
        <Group mb="md" gap="sm">
          <FileText size={20} color="#267FBA" />
          <Title order={5}>Passport details</Title>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Passport number"
            value={profile.passportNumber ?? ''}
            readOnly={!editable}
            onChange={(e) => onProfileChange?.('passportNumber', e.currentTarget.value || null)}
          />
          <TextInput
            label="Issuing authority"
            placeholder="Enter issuing authority"
            value={profile.passportExpiry ? String(profile.passportExpiry) : ''}
            readOnly={!editable}
            onChange={(e) =>
              onProfileChange?.('passportExpiry', e.currentTarget.value || null)
            }
          />
        </SimpleGrid>
        {canUpload && (
          <Stack gap="sm" mt="md">
            <Text size="sm" fw={600}>
              Upload passport
            </Text>
            <DocumentUploadForm targetUserId={targetUserId!} onUploaded={refetch} fixedType="PASSPORT" />
          </Stack>
        )}
        {passportDocs.length > 0 && (
          <Stack gap="xs" mt="md">
            <Text size="sm" c="dimmed">
              Uploaded passport files
            </Text>
            {passportDocs.map((doc) => (
              <Group key={doc.id} justify="space-between">
                <Text size="sm">{doc.fileName}</Text>
                <ActionIcon variant="light" onClick={() => handleDownload(doc)}>
                  <Download size={16} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper p="lg" radius="md" withBorder>
        <Select
          label="Nationality"
          data={NATIONALITY_OPTIONS}
          value={
            profile.currentNationality &&
            NATIONALITY_OPTIONS.includes(profile.currentNationality)
              ? profile.currentNationality
              : 'British'
          }
          onChange={(v) => v && onProfileChange?.('currentNationality', v)}
          readOnly={!editable}
          variant={editable ? 'default' : 'filled'}
        />
      </Paper>

      <Paper p="lg" radius="md" withBorder>
        <Group mb="md" gap="sm" align="flex-start">
          <Shield size={20} color="#267FBA" />
          <Stack gap={0}>
            <Title order={5}>Right to Work (RTW)</Title>
            <Text size="xs" c="dimmed">
              Visa, BRP, and right to work verification
            </Text>
          </Stack>
        </Group>
        <Stack gap="md">
          <BoxField
            label="UK National?"
            value={boolToSegment(profile.isUkNational)}
            editable={editable}
            onChange={(v) => onProfileChange?.('isUkNational', segmentToBool(v))}
          />

          {showEeaQuestion && (
            <BoxField
              label="European Community (EC) / EEA National?"
              value={boolToSegment(profile.isEeaNational)}
              editable={editable}
              onChange={(v) => onProfileChange?.('isEeaNational', segmentToBool(v))}
            />
          )}

          {showVisaFields && (
            <>
              <Divider />
              <Group gap="sm">
                <Shield size={18} color="#267FBA" />
                <Text fw={700} size="sm">
                  Immigration status
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Type of visa"
                  value={profile.visaType ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.('visaType', e.currentTarget.value || null)
                  }
                />
                <TextInput
                  label="Visa Number / BRP Card Number or Share Code"
                  value={profile.visaOrBrpNumber ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.('visaOrBrpNumber', e.currentTarget.value || null)
                  }
                />
                <TextInput
                  label="Share code expiry date"
                  type="date"
                  value={
                    profile.visaExpiryDate
                      ? String(profile.visaExpiryDate).slice(0, 10)
                      : ''
                  }
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.(
                      'visaExpiryDate',
                      e.currentTarget.value || null,
                    )
                  }
                />
                <TextInput
                  label="Share code generated date"
                  type="date"
                  value={
                    profile.shareCodeGeneratedDate
                      ? String(profile.shareCodeGeneratedDate).slice(0, 10)
                      : ''
                  }
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.(
                      'shareCodeGeneratedDate',
                      e.currentTarget.value || null,
                    )
                  }
                />
              </SimpleGrid>

              <Checkbox
                label="Right to work check completed?"
                checked={Boolean(profile.rightToWorkCheckCompleted)}
                disabled={!editable}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  onProfileChange?.('rightToWorkCheckCompleted', checked);
                  if (!checked) {
                    onProfileChange?.('rightToWorkCheckDate', null);
                    onProfileChange?.('rightToWorkCheckExpiryDate', null);
                  }
                }}
              />

              {profile.rightToWorkCheckCompleted && (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Right to work check date"
                    type="date"
                    value={
                      profile.rightToWorkCheckDate
                        ? String(profile.rightToWorkCheckDate).slice(0, 10)
                        : ''
                    }
                    readOnly={!editable}
                    onChange={(e) =>
                      onProfileChange?.(
                        'rightToWorkCheckDate',
                        e.currentTarget.value || null,
                      )
                    }
                  />
                  <TextInput
                    label="Right to work check expiry date"
                    type="date"
                    value={
                      profile.rightToWorkCheckExpiryDate
                        ? String(profile.rightToWorkCheckExpiryDate).slice(0, 10)
                        : ''
                    }
                    readOnly={!editable}
                    onChange={(e) =>
                      onProfileChange?.(
                        'rightToWorkCheckExpiryDate',
                        e.currentTarget.value || null,
                      )
                    }
                  />
                </SimpleGrid>
              )}
            </>
          )}

          <Box mt={16}>
              <Text fw={600} size="sm" mb={8}>
                Right to Work Document
              </Text>
              {rtwDocumentName ? (
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    {rtwDocumentName}
                  </Text>
                  <Button
                    variant="light"
                    size="xs"
                    color="blue"
                    onClick={() => rtwFileInputRef.current?.click()}
                    loading={rtwUploading}
                  >
                    Replace Document
                  </Button>
                </Group>
              ) : (
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    No document uploaded
                  </Text>
                  <Button
                    variant="light"
                    size="xs"
                    color="green"
                    onClick={() => rtwFileInputRef.current?.click()}
                    loading={rtwUploading}
                  >
                    Upload Document
                  </Button>
                </Group>
              )}
              <input
                type="file"
                ref={rtwFileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleRtwDocumentUpload}
              />
          </Box>
        </Stack>
        <Text size="xs" c="dimmed" mt="sm">
          Save via &quot;Edit Personal Info&quot; on the Personal tab header.
        </Text>
      </Paper>

      {canUpload && (
        <Paper p="lg" radius="md" withBorder>
          <Title order={5} mb="md">
            Upload other document
          </Title>
          <DocumentUploadForm targetUserId={targetUserId!} onUploaded={refetch} />
        </Paper>
      )}

      <Paper p="lg" radius="md" withBorder>
        <Title order={5} mb="md">
          Stored documents
        </Title>
        {loading ? (
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        ) : documents.length === 0 ? (
          <Text c="dimmed" fs="italic">
            No documents uploaded yet.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>File</Table.Th>
                <Table.Th>Expiry</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((doc) => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.documentType.replace(/_/g, ' ')}</Table.Td>
                  <Table.Td>{doc.fileName}</Table.Td>
                  <Table.Td>{doc.expiryDate || '—'}</Table.Td>
                  <Table.Td>
                    <ExpiryBadge status={doc.expiryStatus} daysUntil={doc.daysUntilExpiry} />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon variant="light" onClick={() => handleDownload(doc)}>
                        <Download size={16} />
                      </ActionIcon>
                      {canUpload && (
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}

function BoxField({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>
        {label}
      </Text>
      <SegmentedControl
        data={YES_NO}
        value={value}
        onChange={onChange}
        disabled={!editable}
        fullWidth
      />
    </Stack>
  );
}
