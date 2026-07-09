import { useState } from 'react';
import {
  Button,
  Group,
  Select,
  TextInput,
  Textarea,
  FileButton,
  Stack,
} from '@mantine/core';
import { Upload } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import {
  DOCUMENT_TYPE_OPTIONS,
  type StaffDocumentType,
} from '../../types/documents';

interface DocumentUploadFormProps {
  targetUserId: string;
  onUploaded: () => void;
  fixedType?: StaffDocumentType;
}

export function DocumentUploadForm({ targetUserId, onUploaded, fixedType }: DocumentUploadFormProps) {
  const [documentType, setDocumentType] = useState<StaffDocumentType>(fixedType ?? 'PASSPORT');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      notifications.show({ title: 'File required', message: 'Select a file to upload', color: 'red' });
      return;
    }
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', fixedType ?? documentType);
    if (issueDate) form.append('issueDate', issueDate);
    if (expiryDate) form.append('expiryDate', expiryDate);
    if (notes) form.append('notes', notes);

    setUploading(true);
    try {
      await axios.post(`/api/v1/staff/${targetUserId}/documents`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      notifications.show({ title: 'Uploaded', message: 'Document saved', color: 'green' });
      setFile(null);
      setIssueDate('');
      setExpiryDate('');
      setNotes('');
      onUploaded();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Upload failed'
        : 'Upload failed';
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
          data={DOCUMENT_TYPE_OPTIONS}
          value={documentType}
          onChange={(v) => v && setDocumentType(v as StaffDocumentType)}
        />
      )}
      <Group grow>
        <TextInput
          label="Issue date"
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.currentTarget.value)}
        />
        <TextInput
          label="Expiry date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.currentTarget.value)}
        />
      </Group>
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
      <Group>
        <FileButton onChange={setFile} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
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
