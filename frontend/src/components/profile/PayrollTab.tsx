import {
  Paper,
  Title,
  Text,
  Stack,
  Button,
  Group,
  TextInput,
  Textarea,
  Select,
  Loader,
  Center,
  Badge,
  Alert,
  Table,
  PasswordInput,
  FileButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Lock, Upload, Download } from 'lucide-react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { isPayrollRole, canMutate } from '../../utils/roles';
import type { PayrollInfoDto, PayType } from '../../types/payroll';
import { PAY_TYPE_OPTIONS, PAYROLL_DOC_TYPES } from '../../types/payroll';

interface PayrollTabProps {
  profile: { user?: { id: string }; id?: string };
}

type PayrollDoc = {
  id: string;
  documentType: string;
  fileName: string;
  createdAt: string;
};

export function PayrollTab({ profile }: PayrollTabProps) {
  const targetUserId = profile.user?.id || profile.id;
  const canView = isPayrollRole();
  const canEdit = canView && canMutate();

  const [data, setData] = useState<PayrollInfoDto | null>(null);
  const [documents, setDocuments] = useState<PayrollDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [salaryOrRate, setSalaryOrRate] = useState('');
  const [payType, setPayType] = useState<PayType | null>('SALARY');
  const [contractType, setContractType] = useState('');
  const [pensionStatus, setPensionStatus] = useState('');
  const [payrollNotes, setPayrollNotes] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [docType, setDocType] = useState('HMRC');
  const [docFile, setDocFile] = useState<File | null>(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const refresh = useCallback(async () => {
    if (!targetUserId || !canView) return;
    setLoading(true);
    try {
      const [payrollRes, docsRes] = await Promise.all([
        axios.get(`/api/v1/staff/${targetUserId}/payroll`, { headers }),
        axios.get(`/api/v1/staff/${targetUserId}/payroll/documents`, { headers }),
      ]);
      const p = payrollRes.data as PayrollInfoDto;
      setData(p);
      setSalaryOrRate(p.salaryOrRate || '');
      setPayType(p.payType);
      setContractType(p.contractType || '');
      setPensionStatus(p.pensionStatus || '');
      setPayrollNotes(p.payrollNotes || '');
      setDocuments(docsRes.data);
    } catch {
      notifications.show({ title: 'Error', message: 'Could not load payroll data', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [targetUserId, canView]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!canView) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        salaryOrRate: salaryOrRate || null,
        payType,
        contractType: contractType || null,
        pensionStatus: pensionStatus || null,
        payrollNotes: payrollNotes || null,
      };
      if (bankDetails.trim()) {
        payload.bankDetails = bankDetails.trim();
      }
      const res = await axios.put(`/api/v1/staff/${targetUserId}/payroll`, payload, { headers });
      setData(res.data);
      setBankDetails('');
      notifications.show({ title: 'Saved', message: 'Payroll information updated', color: 'green' });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Save failed'
        : 'Save failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const uploadDoc = async () => {
    if (!docFile) {
      notifications.show({ title: 'File required', message: 'Select a file', color: 'red' });
      return;
    }
    const form = new FormData();
    form.append('file', docFile);
    form.append('documentType', docType);
    setUploading(true);
    try {
      await axios.post(`/api/v1/staff/${targetUserId}/payroll/documents`, form, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      });
      setDocFile(null);
      notifications.show({ title: 'Uploaded', message: 'Payroll document saved', color: 'green' });
      refresh();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Upload failed'
        : 'Upload failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (docId: string, fileName: string) => {
    try {
      const res = await axios.get(`/api/v1/documents/${docId}/download`, {
        headers,
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

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Alert color="red" variant="light" icon={<Lock size={16} />}>
        Payroll storage only — not a payments engine. Restricted to Admin and HR. Bank details are
        encrypted at rest and never shown in full.
      </Alert>

      <Paper p="xl" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Title order={4}>Payroll information</Title>
          <Badge color="red" variant="outline">
            Admin / HR only
          </Badge>
        </Group>

        <Stack gap="md" maw={560}>
          <Group grow>
            <TextInput
              label="Salary or hourly rate"
              value={salaryOrRate}
              onChange={(e) => setSalaryOrRate(e.currentTarget.value)}
              readOnly={!canEdit}
              placeholder="e.g. 28500 or 12.50"
            />
            <Select
              label="Pay type"
              data={[...PAY_TYPE_OPTIONS]}
              value={payType}
              onChange={(v) => setPayType((v as PayType) || null)}
              clearable
              disabled={!canEdit}
            />
          </Group>
          <TextInput
            label="Contract type"
            value={contractType}
            onChange={(e) => setContractType(e.currentTarget.value)}
            readOnly={!canEdit}
          />
          <TextInput
            label="Pension status"
            value={pensionStatus}
            onChange={(e) => setPensionStatus(e.currentTarget.value)}
            readOnly={!canEdit}
          />

          <Paper p="md" withBorder radius="md" bg="gray.0">
            <Text size="sm" fw={700} mb={4}>
              Bank details
            </Text>
            {data?.hasBankDetails ? (
              <Text size="lg" ff="monospace" fw={700}>
                {data.bankDetailsMasked}
              </Text>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">
                No bank details on file
              </Text>
            )}
            {canEdit && (
              <PasswordInput
                mt="sm"
                label="Update bank details (account no. / sort code)"
                description="Leave blank to keep existing encrypted record"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.currentTarget.value)}
                placeholder="Enter new details to replace"
              />
            )}
          </Paper>

          <Textarea
            label="Payroll notes"
            value={payrollNotes}
            onChange={(e) => setPayrollNotes(e.currentTarget.value)}
            minRows={3}
            readOnly={!canEdit}
          />

          {canEdit && (
            <Button color="brandBlue" loading={saving} onClick={handleSave}>
              Save payroll information
            </Button>
          )}
        </Stack>
      </Paper>

      <Paper p="xl" radius="md" withBorder>
        <Title order={4} mb="md">
          HMRC / P45 / P60 documents
        </Title>
        {canEdit && (
          <Group align="flex-end" mb="lg" wrap="wrap">
            <Select
              label="Document type"
              data={[...PAYROLL_DOC_TYPES]}
              value={docType}
              onChange={(v) => v && setDocType(v)}
              maw={200}
            />
            <FileButton onChange={setDocFile} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
              {(props) => (
                <Button {...props} variant="light" leftSection={<Upload size={16} />}>
                  {docFile ? docFile.name : 'Choose file'}
                </Button>
              )}
            </FileButton>
            <Button loading={uploading} color="brandGreen.6" onClick={uploadDoc}>
              Upload
            </Button>
          </Group>
        )}
        {documents.length === 0 ? (
          <Text c="dimmed" fs="italic">
            No payroll documents uploaded.
          </Text>
        ) : (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>File</Table.Th>
                <Table.Th>Uploaded</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((doc) => (
                <Table.Tr key={doc.id}>
                  <Table.Td>{doc.documentType}</Table.Td>
                  <Table.Td>{doc.fileName}</Table.Td>
                  <Table.Td>{new Date(doc.createdAt).toLocaleDateString('en-GB')}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<Download size={14} />}
                      onClick={() => downloadDoc(doc.id, doc.fileName)}
                    >
                      Download
                    </Button>
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
