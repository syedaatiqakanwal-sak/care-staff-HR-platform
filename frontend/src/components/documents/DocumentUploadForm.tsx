import { useState } from 'react';
import {
  Button,
  Group,
  Select,
  TextInput,
  Textarea,
  FileButton,
  Stack,
  Text,
} from '@mantine/core';
import { Upload } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import {
  FURTHER_DOCUMENT_TYPE_OPTIONS,
  type StaffDocumentType,
} from '../../types/documents';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.odt,.ods,.odp';

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function showFileTooBig(fileName: string, sizeBytes: number) {
  notifications.show({
    title: 'File too large',
    message: `Your file "${fileName}" is too big (${formatMb(sizeBytes)} MB). Please compress its size and reupload it. Maximum allowed size is 50 MB.`,
    color: 'red',
    autoClose: 8000,
  });
}

interface DocumentUploadFormProps {
  targetUserId: string;
  onUploaded: () => void;
  fixedType?: StaffDocumentType;
  /** When uploading a passport, store/link this number on the document notes and profile. */
  linkedPassportNumber?: string;
  /** Called after a successful passport upload with the expiry date (YYYY-MM-DD). */
  onLinkedDatesSaved?: (expiryDate: string | null) => void;
}

export function DocumentUploadForm({
  targetUserId,
  onUploaded,
  fixedType,
  linkedPassportNumber,
  onLinkedDatesSaved,
}: DocumentUploadFormProps) {
  const [documentType, setDocumentType] = useState<StaffDocumentType | null>(fixedType ?? null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const isPassport = (fixedType ?? documentType) === 'PASSPORT';

  const handleFilePick = (picked: File | null) => {
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      showFileTooBig(picked.name, picked.size);
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    const selectedType = fixedType ?? documentType;
    if (!selectedType) {
      notifications.show({
        title: 'Document type required',
        message: 'Choose a document type before uploading.',
        color: 'red',
      });
      return;
    }
    if (!file) {
      notifications.show({ title: 'File required', message: 'Select a file to upload', color: 'red' });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      showFileTooBig(file.name, file.size);
      return;
    }
    if (isPassport && !linkedPassportNumber?.trim()) {
      notifications.show({
        title: 'Passport number required',
        message: 'Enter the Passport number above before uploading the passport file.',
        color: 'red',
      });
      return;
    }
    if (isPassport && (!issueDate || !expiryDate)) {
      notifications.show({
        title: 'Dates required',
        message: 'Enter Issue date and Expiry date for the passport upload.',
        color: 'red',
      });
      return;
    }

    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', selectedType);
    if (issueDate) form.append('issueDate', issueDate);
    if (expiryDate) form.append('expiryDate', expiryDate);

    const noteParts: string[] = [];
    if (isPassport && linkedPassportNumber?.trim()) {
      noteParts.push(`Passport number: ${linkedPassportNumber.trim()}`);
    }
    if (notes.trim()) noteParts.push(notes.trim());
    if (noteParts.length) form.append('notes', noteParts.join(' | '));

    setUploading(true);
    try {
      await axios.post(`/api/v1/staff/${targetUserId}/documents`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: MAX_UPLOAD_BYTES,
        maxContentLength: MAX_UPLOAD_BYTES,
      });

      // Sync passport expiry onto staff profile (linked with passport number + dates)
      if (isPassport && expiryDate) {
        try {
          await axios.put(
            `/api/v1/staff/${targetUserId}`,
            {
              passportNumber: linkedPassportNumber?.trim() || undefined,
              passportExpiry: expiryDate,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          onLinkedDatesSaved?.(expiryDate);
        } catch {
          // Document uploaded; profile sync failure is non-fatal
        }
      }

      notifications.show({ title: 'Uploaded', message: 'Document saved', color: 'green' });
      setFile(null);
      setIssueDate('');
      setExpiryDate('');
      setNotes('');
      if (!fixedType) setDocumentType(null);
      onUploaded();
    } catch (err: unknown) {
      let msg = 'Upload failed';
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 413) {
          showFileTooBig(file.name, file.size);
          return;
        } else if (Array.isArray(err.response?.data?.message)) {
          msg = err.response.data.message.join(', ');
        } else {
          msg = err.response?.data?.message || err.message || 'Upload failed';
        }
      }
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack gap="sm">
      {!fixedType && (
        <Select
          label="Document type"
          placeholder="Choose document type"
          data={FURTHER_DOCUMENT_TYPE_OPTIONS}
          value={documentType}
          onChange={(v) => setDocumentType((v as StaffDocumentType) || null)}
          searchable
          nothingFoundMessage="No matching document type"
          clearable
        />
      )}
      <Group grow>
        <TextInput
          label="Issue date"
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.currentTarget.value)}
          required={isPassport}
        />
        <TextInput
          label="Expiry date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.currentTarget.value)}
          required={isPassport}
        />
      </Group>
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
      <Text size="xs" c="dimmed">
        Allowed: PDF, Word, PowerPoint, Excel, images. Max size 50 MB per file.
      </Text>
      <Group>
        <FileButton onChange={handleFilePick} accept={ACCEPT}>
          {(props) => (
            <Button {...props} variant="light" leftSection={<Upload size={16} />}>
              {file ? file.name : 'Choose file'}
            </Button>
          )}
        </FileButton>
        <Button onClick={handleUpload} loading={uploading} color="brandBlue">
          Upload document
        </Button>
      </Group>
    </Stack>
  );
}
