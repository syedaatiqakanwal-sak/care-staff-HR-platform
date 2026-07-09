import {
  Paper,
  Title,
  Text,
  Stack,
  TextInput,
  Checkbox,
  Button,
  Group,
  Select,
  Loader,
  Center,
  SimpleGrid,
  Box,
  FileButton,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { Download, Upload } from 'lucide-react';
import { useStaffDocuments } from '../../hooks/useStaffDocuments';
import { ExpiryBadge } from '../documents/ExpiryBadge';
import { isManagementRole, canMutate } from '../../utils/roles';
import { useState, useEffect } from 'react';
import type { StaffDocumentDto } from '../../types/documents';

const DBS_EXPLANATION =
  'Lets Care All Ltd recognises that DBS certificates do not have an official expiry date. To ensure the continued suitability of its workforce, all employees are required to complete an annual declaration confirming whether there have been any changes to their criminal record or DBS status since their last DBS check. Lets Care All Ltd will normally undertake a new DBS check every three years, or sooner where deemed necessary based on risk assessment, regulatory requirements, or changes in an employee\'s circumstances.';

interface DbsTabProps {
  profile: { user?: { id: string }; id?: string };
}

export function DbsTab({ profile }: DbsTabProps) {
  const targetUserId = profile.user?.id || profile.id;
  const { dbs, documents, loading, refetch } = useStaffDocuments(targetUserId);
  const canEdit = isManagementRole() && canMutate();

  const [dbsNumber, setDbsNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [renewalDate, setRenewalDate] = useState('');
  const [nextDeclarationDate, setNextDeclarationDate] = useState('');
  const [updateServiceStatus, setUpdateServiceStatus] = useState(false);
  const [certificateDocumentId, setCertificateDocumentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [declarationFile, setDeclarationFile] = useState<File | null>(null);
  const [uploadingDeclaration, setUploadingDeclaration] = useState(false);

  useEffect(() => {
    if (dbs) {
      setDbsNumber(dbs.dbsNumber);
      setIssueDate(dbs.issueDate?.slice(0, 10) ?? '');
      setRenewalDate(dbs.renewalDate?.slice(0, 10) ?? '');
      setNextDeclarationDate(dbs.nextDeclarationDate?.slice(0, 10) ?? '');
      setUpdateServiceStatus(dbs.updateServiceStatus);
      setCertificateDocumentId(dbs.certificateDocumentId);
    }
  }, [dbs]);

  const certOptions = documents
    .filter((d) => d.documentType === 'DBS_CERTIFICATE')
    .map((d: StaffDocumentDto) => ({ value: d.id, label: d.fileName }));

  const declarationDocs = documents.filter((d) => d.documentType === 'DBS_DECLARATION');

  const handleSave = async () => {
    if (!targetUserId || !dbsNumber.trim()) {
      notifications.show({ title: 'Required', message: 'DBS number is required', color: 'red' });
      return;
    }
    const token = localStorage.getItem('token');
    const payload = {
      dbsNumber: dbsNumber.trim(),
      issueDate: issueDate || undefined,
      renewalDate: renewalDate || undefined,
      nextDeclarationDate: nextDeclarationDate || null,
      updateServiceStatus,
      certificateDocumentId: certificateDocumentId || undefined,
    };
    setSaving(true);
    try {
      if (dbs?.id) {
        await axios.patch(`/api/v1/dbs/${dbs.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`/api/v1/staff/${targetUserId}/dbs`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      notifications.show({ title: 'Saved', message: 'DBS record updated', color: 'green' });
      refetch();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Save failed'
        : 'Save failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeclarationUpload = async () => {
    if (!declarationFile || !targetUserId) {
      notifications.show({ title: 'File required', message: 'Select a declaration form to upload', color: 'red' });
      return;
    }
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', declarationFile);
    form.append('documentType', 'DBS_DECLARATION');

    setUploadingDeclaration(true);
    try {
      await axios.post(`/api/v1/staff/${targetUserId}/documents`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      notifications.show({ title: 'Uploaded', message: 'Declaration form saved', color: 'green' });
      setDeclarationFile(null);
      refetch();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Upload failed'
        : 'Upload failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setUploadingDeclaration(false);
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

  if (loading && !dbs) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Paper p="xl" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={4}>DBS (Disclosure and Barring Service) Details</Title>
        {dbs?.renewalStatus && (
          <ExpiryBadge status={dbs.renewalStatus} daysUntil={dbs.daysUntilRenewal} />
        )}
      </Group>

      <Box
        mb="lg"
        p="md"
        style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e9ecef',
        }}
      >
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
          {DBS_EXPLANATION}
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Stack gap="md">
          <TextInput
            label="DBS number"
            value={dbsNumber}
            onChange={(e) => setDbsNumber(e.currentTarget.value)}
            readOnly={!canEdit}
            required
          />
          <Group grow>
            <TextInput
              label="Issue date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.currentTarget.value)}
              readOnly={!canEdit}
            />
            <TextInput
              label="Next DBS Check Date"
              type="date"
              value={renewalDate}
              onChange={(e) => setRenewalDate(e.currentTarget.value)}
              readOnly={!canEdit}
            />
          </Group>
          <TextInput
            label="Next DBS Declaration Date"
            type="date"
            value={nextDeclarationDate}
            onChange={(e) => setNextDeclarationDate(e.currentTarget.value)}
            readOnly={!canEdit}
          />
          <Checkbox
            label="Update Service enrolled"
            checked={updateServiceStatus}
            onChange={(e) => setUpdateServiceStatus(e.currentTarget.checked)}
            disabled={!canEdit}
          />
          {certOptions.length > 0 && (
            <Select
              label="Linked certificate document"
              data={certOptions}
              value={certificateDocumentId}
              onChange={setCertificateDocumentId}
              clearable
              disabled={!canEdit}
            />
          )}
          {canEdit && (
            <Button onClick={handleSave} loading={saving} color="brandBlue">
              {dbs ? 'Update DBS record' : 'Create DBS record'}
            </Button>
          )}
          {!canEdit && !dbs && (
            <Text c="dimmed" fs="italic">
              No DBS record on file.
            </Text>
          )}
        </Stack>

        <Stack gap="md">
          <Title order={5}>Signed declaration form</Title>
          <Text size="sm" c="dimmed">
            Upload the employee&apos;s signed annual DBS declaration form.
          </Text>
          {canEdit && (
            <Group>
              <FileButton onChange={setDeclarationFile} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                {(props) => (
                  <Button {...props} variant="light" leftSection={<Upload size={16} />} color="brandBlue">
                    {declarationFile ? declarationFile.name : 'Choose file'}
                  </Button>
                )}
              </FileButton>
              <Button
                onClick={handleDeclarationUpload}
                loading={uploadingDeclaration}
                disabled={!declarationFile}
                color="brandBlue"
              >
                Upload declaration
              </Button>
            </Group>
          )}
          {declarationDocs.length > 0 ? (
            <Stack gap="xs">
              <Divider />
              {declarationDocs.map((doc) => (
                <Group key={doc.id} justify="space-between" wrap="nowrap">
                  <Text size="sm" truncate style={{ flex: 1 }}>
                    {doc.fileName}
                  </Text>
                  <ActionIcon
                    variant="light"
                    color="brandBlue"
                    onClick={() => handleDownload(doc)}
                    aria-label="Download declaration"
                  >
                    <Download size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" fs="italic">
              No declaration forms uploaded yet.
            </Text>
          )}
        </Stack>
      </SimpleGrid>
    </Paper>
  );
}
