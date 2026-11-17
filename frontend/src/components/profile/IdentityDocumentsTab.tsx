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
  Modal,
} from '@mantine/core';
import { useRef, useState, useEffect } from 'react';
import { Download, Trash, Shield, FileText, ClipboardCheck, FolderOpen, Eye } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { useStaffDocuments } from '../../hooks/useStaffDocuments';
import { DocumentUploadForm } from '../documents/DocumentUploadForm';
import { DocumentViewButton } from '../documents/DocumentViewButton';
import { ExpiryBadge } from '../documents/ExpiryBadge';
import { isManagementRole, canMutate } from '../../utils/roles';
import { documentTypeLabel, type StaffDocumentDto } from '../../types/documents';
import { AppConfirmModal } from '../AppConfirmModal';

const NATIONALITY_OPTIONS = ['British', 'Irish', 'Indian', 'Pakistani', 'Nepalese', 'Somali', 'Other'];

const INITIAL_DOC_TYPES = new Set(['PASSPORT', 'RIGHT_TO_WORK', 'SHARE_CODE']);

const YES_NO = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

interface IdentityDocumentsTabProps {
  profile: {
    user?: { id: string };
    id?: string;
    passportNumber?: string | null;
    passportIssuingAuthority?: string | null;
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
    furtherIsUkNational?: boolean | null;
    furtherIsEeaNational?: boolean | null;
    furtherVisaType?: string | null;
    furtherVisaOrBrpNumber?: string | null;
    furtherVisaExpiryDate?: string | Date | null;
    furtherShareCodeGeneratedDate?: string | Date | null;
    furtherRightToWorkCheckCompleted?: boolean | null;
    furtherRightToWorkCheckDate?: string | Date | null;
    furtherRightToWorkCheckExpiryDate?: string | Date | null;
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
  const [shareCodeDocumentName, setShareCodeDocumentName] = useState<string | null>(null);
  const [furtherRtwDocumentName, setFurtherRtwDocumentName] = useState<string | null>(null);
  const [furtherShareCodeDocumentName, setFurtherShareCodeDocumentName] = useState<string | null>(null);
  const [rtwUploading, setRtwUploading] = useState(false);
  const [shareCodeUploading, setShareCodeUploading] = useState(false);
  const [furtherRtwUploading, setFurtherRtwUploading] = useState(false);
  const [furtherShareCodeUploading, setFurtherShareCodeUploading] = useState(false);
  const rtwFileInputRef = useRef<HTMLInputElement>(null);
  const shareCodeFileInputRef = useRef<HTMLInputElement>(null);
  const furtherRtwFileInputRef = useRef<HTMLInputElement>(null);
  const furtherShareCodeFileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; name: string; kind: 'pdf' | 'image' } | null>(null);

  const FILE_ACCEPT =
    '.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.ods,.odp';

  useEffect(() => {
    const rtwDoc = documents.find((d) => d.documentType === 'RIGHT_TO_WORK');
    const shareCodeDoc = documents.find((d) => d.documentType === 'SHARE_CODE');
    const furtherRtwDoc = documents.find((d) => d.documentType === 'FURTHER_RIGHT_TO_WORK');
    const furtherShareCodeDoc = documents.find((d) => d.documentType === 'FURTHER_SHARE_CODE');
    setRtwDocumentName(rtwDoc?.fileName ?? null);
    setShareCodeDocumentName(shareCodeDoc?.fileName ?? null);
    setFurtherRtwDocumentName(furtherRtwDoc?.fileName ?? null);
    setFurtherShareCodeDocumentName(furtherShareCodeDoc?.fileName ?? null);
  }, [documents]);

  const isUkNationalNo = profile.isUkNational === false;
  const showEeaQuestion = isUkNationalNo;
  const showVisaFields = isUkNationalNo && profile.isEeaNational === false;
  const furtherIsUkNationalNo = profile.furtherIsUkNational === false;
  const showFurtherEeaQuestion = furtherIsUkNationalNo;
  const showFurtherVisaFields = furtherIsUkNationalNo && profile.furtherIsEeaNational === false;

  const closeViewer = () => {
    setViewer((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const handleView = async (doc: StaffDocumentDto) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get(`/api/v1/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const headerType = String(res.headers['content-type'] || '').split(';')[0];
      const name = doc.fileName.toLowerCase();
      const isImage = headerType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/.test(name);
      const isPdf = headerType === 'application/pdf' || name.endsWith('.pdf');
      if (!isImage && !isPdf) {
        notifications.show({
          title: 'Preview unavailable',
          message: 'This file type cannot be shown here. Use download for Word or Excel files.',
          color: 'yellow',
        });
        return;
      }
      const blob = new Blob([res.data], { type: isPdf ? 'application/pdf' : headerType || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setViewer((current) => {
        if (current?.url) URL.revokeObjectURL(current.url);
        return { url, name: doc.fileName, kind: isImage ? 'image' : 'pdf' };
      });
    } catch {
      notifications.show({ title: 'Error', message: 'Could not open the document', color: 'red' });
    }
  };

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

  const handleDelete = (docId: string) => {
    setConfirmDeleteDocId(docId);
  };

  const confirmDeleteDocument = async () => {
    const docId = confirmDeleteDocId;
    if (!docId) return;
    setConfirmDeleteDocId(null);
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
  const initialDocs = documents.filter((d) =>
    INITIAL_DOC_TYPES.has(d.documentType as string),
  );
  const furtherDocs = documents.filter(
    (d) => !INITIAL_DOC_TYPES.has(d.documentType as string),
  );

  type UploadDocType =
    | 'RIGHT_TO_WORK'
    | 'SHARE_CODE'
    | 'FURTHER_RIGHT_TO_WORK'
    | 'FURTHER_SHARE_CODE';

  const uploadTypedDocument = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: UploadDocType,
  ) => {
    const file = e.target.files?.[0];
    const uploadMeta: Record<
      UploadDocType,
      {
        inputRef: React.RefObject<HTMLInputElement | null>;
        setUploading: (v: boolean) => void;
        setName: (v: string | null) => void;
        successLabel: string;
        expiry: string | Date | null | undefined;
        notesValue: string | null | undefined;
      }
    > = {
      RIGHT_TO_WORK: {
        inputRef: rtwFileInputRef,
        setUploading: setRtwUploading,
        setName: setRtwDocumentName,
        successLabel: 'Right to work document',
        expiry: profile.rightToWorkCheckExpiryDate,
        notesValue: profile.visaOrBrpNumber || profile.shareCode,
      },
      SHARE_CODE: {
        inputRef: shareCodeFileInputRef,
        setUploading: setShareCodeUploading,
        setName: setShareCodeDocumentName,
        successLabel: 'Share code document',
        expiry: profile.visaExpiryDate,
        notesValue: profile.visaOrBrpNumber || profile.shareCode,
      },
      FURTHER_RIGHT_TO_WORK: {
        inputRef: furtherRtwFileInputRef,
        setUploading: setFurtherRtwUploading,
        setName: setFurtherRtwDocumentName,
        successLabel: 'Further right to work document',
        expiry: profile.furtherRightToWorkCheckExpiryDate,
        notesValue: profile.furtherVisaOrBrpNumber,
      },
      FURTHER_SHARE_CODE: {
        inputRef: furtherShareCodeFileInputRef,
        setUploading: setFurtherShareCodeUploading,
        setName: setFurtherShareCodeDocumentName,
        successLabel: 'Further share code document',
        expiry: profile.furtherVisaExpiryDate,
        notesValue: profile.furtherVisaOrBrpNumber,
      },
    };
    const { inputRef, setUploading, setName, successLabel, expiry, notesValue } =
      uploadMeta[documentType];

    if (!file || !targetUserId) return;

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      notifications.show({
        title: 'File too large',
        message: `Your file "${file.name}" is too big (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please compress its size and reupload it. Maximum allowed size is 50 MB.`,
        color: 'red',
        autoClose: 8000,
      });
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (expiry) {
      formData.append('expiryDate', String(expiry).slice(0, 10));
    }
    if (notesValue) {
      formData.append('notes', `Visa/BRP/Share: ${notesValue}`.trim());
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/staff/${targetUserId}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: maxBytes,
        maxContentLength: maxBytes,
      });
      setName(file.name);
      refetch();
      notifications.show({
        title: 'Success',
        message: `${successLabel} uploaded successfully`,
        color: 'green',
      });
    } catch (err: unknown) {
      let msg = 'Failed to upload document. Please try again.';
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 413) {
          msg = `Your file "${file.name}" is too big. Please compress its size and reupload it (max 50 MB).`;
        } else if (Array.isArray(err.response?.data?.message)) {
          msg = err.response.data.message.join(', ');
        } else if (err.response?.data?.message) {
          msg = String(err.response.data.message);
        }
      }
      notifications.show({
        title: 'Error',
        message: msg,
        color: 'red',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRtwDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadTypedDocument(e, 'RIGHT_TO_WORK');
  const handleShareCodeDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadTypedDocument(e, 'SHARE_CODE');
  const handleFurtherRtwDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadTypedDocument(e, 'FURTHER_RIGHT_TO_WORK');
  const handleFurtherShareCodeDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadTypedDocument(e, 'FURTHER_SHARE_CODE');

  return (
    <>
    <Stack gap="xl">
      <Box>
        <Group mb="md" gap="sm" align="flex-start">
          <ClipboardCheck size={22} color="#139639" />
          <Stack gap={2}>
            <Title order={4} size={18} fw={800}>
              Initial Document check
            </Title>
            <Text size="sm" c="dimmed">
              Passport, nationality, share code, and right to work documents.
            </Text>
          </Stack>
        </Group>
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
            value={profile.passportIssuingAuthority ?? ''}
            readOnly={!editable}
            onChange={(e) =>
              onProfileChange?.('passportIssuingAuthority', e.currentTarget.value || null)
            }
          />
        </SimpleGrid>
        {canUpload && (
          <Stack gap="sm" mt="md">
            <Text size="sm" fw={600}>
              Upload passport
            </Text>
            <Text size="xs" c="dimmed">
              Linked to passport number{profile.passportNumber ? ` (${profile.passportNumber})` : ''}.
              Use Issue date and Expiry date below for this passport file.
            </Text>
            <DocumentUploadForm
              targetUserId={targetUserId!}
              onUploaded={refetch}
              fixedType="PASSPORT"
              linkedPassportNumber={profile.passportNumber ?? undefined}
              onLinkedDatesSaved={(expiryDate) => {
                if (expiryDate) onProfileChange?.('passportExpiry', expiryDate);
              }}
            />
          </Stack>
        )}
        {passportDocs.length > 0 && (
          <Stack gap="xs" mt="md">
            <Text size="sm" c="dimmed">
              Uploaded passport files
            </Text>
            {passportDocs.map((doc) => (
              <Group key={doc.id} justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text size="sm">{doc.fileName}</Text>
                  <Text size="xs" c="dimmed">
                    {[
                      profile.passportNumber ? `No: ${profile.passportNumber}` : null,
                      doc.issueDate ? `Issued: ${String(doc.issueDate).slice(0, 10)}` : null,
                      doc.expiryDate ? `Expires: ${String(doc.expiryDate).slice(0, 10)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </Stack>
                <Group gap="xs">
                  <ActionIcon variant="light" color="brandBlue" aria-label="View document" onClick={() => handleView(doc)}>
                    <Eye size={16} />
                  </ActionIcon>
                  <ActionIcon variant="light" aria-label="Download document" onClick={() => handleDownload(doc)}>
                    <Download size={16} />
                  </ActionIcon>
                  {canUpload && (
                    <ActionIcon variant="light" color="red" onClick={() => handleDelete(doc.id)}>
                      <Trash size={16} />
                    </ActionIcon>
                  )}
                </Group>
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
                    label="RIGHT TO WORK EXPIRY DATE"
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
                Share Code Document
              </Text>
              {shareCodeDocumentName ? (
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    {shareCodeDocumentName}
                  </Text>
                  {documents.find((d) => d.documentType === 'SHARE_CODE') && (
                    <DocumentViewButton documentId={documents.find((d) => d.documentType === 'SHARE_CODE')!.id} fileName={shareCodeDocumentName} variant="button" />
                  )}
                  <Button
                    variant="light"
                    size="xs"
                    color="blue"
                    onClick={() => shareCodeFileInputRef.current?.click()}
                    loading={shareCodeUploading}
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
                    onClick={() => shareCodeFileInputRef.current?.click()}
                    loading={shareCodeUploading}
                  >
                    Upload Document
                  </Button>
                </Group>
              )}
              <input
                type="file"
                ref={shareCodeFileInputRef}
                style={{ display: 'none' }}
                accept={FILE_ACCEPT}
                onChange={handleShareCodeDocumentUpload}
              />
          </Box>

          <Box mt={16}>
              <Text fw={600} size="sm" mb={8}>
                Right to Work Document
              </Text>
              {rtwDocumentName ? (
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    {rtwDocumentName}
                  </Text>
                  {documents.find((d) => d.documentType === 'RIGHT_TO_WORK') && (
                    <DocumentViewButton documentId={documents.find((d) => d.documentType === 'RIGHT_TO_WORK')!.id} fileName={rtwDocumentName} variant="button" />
                  )}
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
                accept={FILE_ACCEPT}
                onChange={handleRtwDocumentUpload}
              />
          </Box>
        </Stack>
        <Text size="xs" c="dimmed" mt="sm">
          Save via &quot;Edit Personal Info&quot; on the Personal tab header.
        </Text>
      </Paper>

      <Paper p="lg" radius="md" withBorder>
        <Title order={5} mb="md">
          Stored documents
        </Title>
        <DocumentsTable
          documents={initialDocs}
          loading={loading}
          canUpload={canUpload}
          emptyLabel="No initial documents uploaded yet."
          onDownload={handleDownload}
          onView={handleView}
          onDelete={handleDelete}
        />
      </Paper>
        </Stack>
      </Box>

      <Box>
        <Group mb="md" gap="sm" align="flex-start">
          <FolderOpen size={22} color="#267FBA" />
          <Stack gap={2}>
            <Title order={4} size={18} fw={800}>
              Further document check
            </Title>
            <Text size="sm" c="dimmed">
              Separate visa, share code, and right to work details — not a copy of the initial check.
            </Text>
          </Stack>
        </Group>
        <Stack gap="xl">
      <Paper p="lg" radius="md" withBorder>
        <Group mb="md" gap="sm" align="flex-start">
          <Shield size={20} color="#267FBA" />
          <Stack gap={0}>
            <Title order={5}>Further Right to Work (RTW)</Title>
            <Text size="xs" c="dimmed">
              Stored independently from the initial RTW fields
            </Text>
          </Stack>
        </Group>
        <Stack gap="md">
          <BoxField
            label="UK National?"
            value={boolToSegment(profile.furtherIsUkNational)}
            editable={editable}
            onChange={(v) => onProfileChange?.('furtherIsUkNational', segmentToBool(v))}
          />

          {showFurtherEeaQuestion && (
            <BoxField
              label="European Community (EC) / EEA National?"
              value={boolToSegment(profile.furtherIsEeaNational)}
              editable={editable}
              onChange={(v) => onProfileChange?.('furtherIsEeaNational', segmentToBool(v))}
            />
          )}

          {showFurtherVisaFields && (
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
                  value={profile.furtherVisaType ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.('furtherVisaType', e.currentTarget.value || null)
                  }
                />
                <TextInput
                  label="Visa Number / BRP Card Number or Share Code"
                  value={profile.furtherVisaOrBrpNumber ?? ''}
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.('furtherVisaOrBrpNumber', e.currentTarget.value || null)
                  }
                />
                <TextInput
                  label="Share code expiry date"
                  type="date"
                  value={
                    profile.furtherVisaExpiryDate
                      ? String(profile.furtherVisaExpiryDate).slice(0, 10)
                      : ''
                  }
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.(
                      'furtherVisaExpiryDate',
                      e.currentTarget.value || null,
                    )
                  }
                />
                <TextInput
                  label="Share code generated date"
                  type="date"
                  value={
                    profile.furtherShareCodeGeneratedDate
                      ? String(profile.furtherShareCodeGeneratedDate).slice(0, 10)
                      : ''
                  }
                  readOnly={!editable}
                  onChange={(e) =>
                    onProfileChange?.(
                      'furtherShareCodeGeneratedDate',
                      e.currentTarget.value || null,
                    )
                  }
                />
              </SimpleGrid>

              <Checkbox
                label="Right to work check completed?"
                checked={Boolean(profile.furtherRightToWorkCheckCompleted)}
                disabled={!editable}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  onProfileChange?.('furtherRightToWorkCheckCompleted', checked);
                  if (!checked) {
                    onProfileChange?.('furtherRightToWorkCheckDate', null);
                    onProfileChange?.('furtherRightToWorkCheckExpiryDate', null);
                  }
                }}
              />

              {profile.furtherRightToWorkCheckCompleted && (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Right to work check date"
                    type="date"
                    value={
                      profile.furtherRightToWorkCheckDate
                        ? String(profile.furtherRightToWorkCheckDate).slice(0, 10)
                        : ''
                    }
                    readOnly={!editable}
                    onChange={(e) =>
                      onProfileChange?.(
                        'furtherRightToWorkCheckDate',
                        e.currentTarget.value || null,
                      )
                    }
                  />
                  <TextInput
                    label="RIGHT TO WORK EXPIRY DATE"
                    type="date"
                    value={
                      profile.furtherRightToWorkCheckExpiryDate
                        ? String(profile.furtherRightToWorkCheckExpiryDate).slice(0, 10)
                        : ''
                    }
                    readOnly={!editable}
                    onChange={(e) =>
                      onProfileChange?.(
                        'furtherRightToWorkCheckExpiryDate',
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
                Share Code Document
              </Text>
              {furtherShareCodeDocumentName ? (
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    {furtherShareCodeDocumentName}
                  </Text>
                  {documents.find((d) => d.documentType === 'FURTHER_SHARE_CODE') && (
                    <DocumentViewButton documentId={documents.find((d) => d.documentType === 'FURTHER_SHARE_CODE')!.id} fileName={furtherShareCodeDocumentName} variant="button" />
                  )}
                  <Button
                    variant="light"
                    size="xs"
                    color="blue"
                    onClick={() => furtherShareCodeFileInputRef.current?.click()}
                    loading={furtherShareCodeUploading}
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
                    onClick={() => furtherShareCodeFileInputRef.current?.click()}
                    loading={furtherShareCodeUploading}
                  >
                    Upload Document
                  </Button>
                </Group>
              )}
              <input
                type="file"
                ref={furtherShareCodeFileInputRef}
                style={{ display: 'none' }}
                accept={FILE_ACCEPT}
                onChange={handleFurtherShareCodeDocumentUpload}
              />
          </Box>

          <Box mt={16}>
              <Text fw={600} size="sm" mb={8}>
                Right to Work Document
              </Text>
              {furtherRtwDocumentName ? (
                <Group gap={8}>
                  <Text size="sm" c="dimmed">
                    {furtherRtwDocumentName}
                  </Text>
                  {documents.find((d) => d.documentType === 'FURTHER_RIGHT_TO_WORK') && (
                    <DocumentViewButton documentId={documents.find((d) => d.documentType === 'FURTHER_RIGHT_TO_WORK')!.id} fileName={furtherRtwDocumentName} variant="button" />
                  )}
                  <Button
                    variant="light"
                    size="xs"
                    color="blue"
                    onClick={() => furtherRtwFileInputRef.current?.click()}
                    loading={furtherRtwUploading}
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
                    onClick={() => furtherRtwFileInputRef.current?.click()}
                    loading={furtherRtwUploading}
                  >
                    Upload Document
                  </Button>
                </Group>
              )}
              <input
                type="file"
                ref={furtherRtwFileInputRef}
                style={{ display: 'none' }}
                accept={FILE_ACCEPT}
                onChange={handleFurtherRtwDocumentUpload}
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
            Upload further document
          </Title>
          <DocumentUploadForm targetUserId={targetUserId!} onUploaded={refetch} />
        </Paper>
      )}

      <Paper p="lg" radius="md" withBorder>
        <Title order={5} mb="md">
          Stored documents
        </Title>
        <DocumentsTable
          documents={furtherDocs}
          loading={loading}
          canUpload={canUpload}
          emptyLabel="No further documents uploaded yet."
          onDownload={handleDownload}
          onView={handleView}
          onDelete={handleDelete}
        />
      </Paper>
        </Stack>
      </Box>
    </Stack>

    <Modal opened={!!viewer} onClose={closeViewer} title={viewer?.name || 'Document'} size="xl" centered>
      {viewer?.kind === 'image' ? (
        <img src={viewer.url} alt={viewer.name} style={{ width: '100%', height: 'auto' }} />
      ) : viewer ? (
        <iframe title={viewer.name} src={viewer.url} style={{ width: '100%', height: '75vh', border: 'none' }} />
      ) : null}
    </Modal>

    <AppConfirmModal
      opened={!!confirmDeleteDocId}
      options={{
        title: 'Delete document',
        message: 'Delete this document?',
        confirmLabel: 'Delete',
        confirmColor: 'red',
      }}
      onCancel={() => setConfirmDeleteDocId(null)}
      onConfirm={confirmDeleteDocument}
    />
    </>
  );
}

function DocumentsTable({
  documents,
  loading,
  canUpload,
  emptyLabel,
  onDownload,
  onView,
  onDelete,
}: {
  documents: StaffDocumentDto[];
  loading: boolean;
  canUpload: boolean;
  emptyLabel: string;
  onDownload: (doc: StaffDocumentDto) => void;
  onView: (doc: StaffDocumentDto) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }
  if (documents.length === 0) {
    return (
      <Text c="dimmed" fs="italic">
        {emptyLabel}
      </Text>
    );
  }
  return (
    <Table.ScrollContainer minWidth={640}>
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
              <Table.Td>{documentTypeLabel(doc.documentType)}</Table.Td>
              <Table.Td>{doc.fileName}</Table.Td>
              <Table.Td>{doc.expiryDate || '—'}</Table.Td>
              <Table.Td>
                <ExpiryBadge status={doc.expiryStatus} daysUntil={doc.daysUntilExpiry} />
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon variant="light" color="brandBlue" aria-label="View document" onClick={() => onView(doc)}>
                    <Eye size={16} />
                  </ActionIcon>
                  <ActionIcon variant="light" onClick={() => onDownload(doc)}>
                    <Download size={16} />
                  </ActionIcon>
                  {canUpload && (
                    <ActionIcon variant="light" color="red" onClick={() => onDelete(doc.id)}>
                      <Trash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
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