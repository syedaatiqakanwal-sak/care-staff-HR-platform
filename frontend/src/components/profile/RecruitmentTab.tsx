import {
  Paper,
  Title,
  Text,
  Stack,
  Checkbox,
  Button,
  Group,
  TextInput,
  Textarea,
  Loader,
  Center,
  Badge,
  Alert,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { isManagementRole, canMutate } from '../../utils/roles';
import {
  employmentStatusBadgeColor,
  employmentStatusLabel,
} from '../../utils/employmentStatus';
import type { RecruitmentRecordDto } from '../../types/recruitment';

interface RecruitmentTabProps {
  profile: { user?: { id: string }; id?: string; employmentStatus?: string };
  onEmploymentStatusChange?: (status: string) => void;
}

type ChecklistItem = {
  key: keyof RecruitmentRecordDto;
  dateKey: keyof RecruitmentRecordDto;
  label: string;
};

const CHECKLIST: ChecklistItem[] = [
  { key: 'interviewRecorded', dateKey: 'interviewRecordedDate', label: 'Interview recorded' },
  { key: 'offerLetterIssued', dateKey: 'offerLetterIssuedDate', label: 'Offer letter issued' },
  { key: 'contractIssued', dateKey: 'contractIssuedDate', label: 'Contract issued' },
  { key: 'contractSigned', dateKey: 'contractSignedDate', label: 'Contract signed' },
  { key: 'inductionCompleted', dateKey: 'inductionCompletedDate', label: 'Induction completed' },
  { key: 'shadowStarted', dateKey: 'shadowStartDate', label: 'Shadow period started' },
];

const emptyRecord = (): RecruitmentRecordDto => ({
  id: '',
  staffId: '',
  interviewRecorded: false,
  interviewRecordedDate: null,
  offerLetterIssued: false,
  offerLetterIssuedDate: null,
  contractIssued: false,
  contractIssuedDate: null,
  contractSigned: false,
  contractSignedDate: null,
  inductionCompleted: false,
  inductionCompletedDate: null,
  shadowStarted: false,
  shadowStartDate: null,
  shadowEndDate: null,
  notes: null,
});

export function RecruitmentTab({ profile, onEmploymentStatusChange }: RecruitmentTabProps) {
  const targetUserId = profile.user?.id || profile.id;
  const canEdit = isManagementRole() && canMutate();
  const [record, setRecord] = useState<RecruitmentRecordDto>(emptyRecord());
  const [employmentStatus, setEmploymentStatus] = useState(profile.employmentStatus || 'ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemDocuments, setItemDocuments] = useState<Record<string, string | null>>({});
  const itemFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchRecruitment = useCallback(async () => {
    if (!targetUserId) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/staff/${targetUserId}/recruitment`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecord(res.data.recruitment);
      setEmploymentStatus(res.data.employmentStatus || profile.employmentStatus || 'ACTIVE');
    } catch {
      setRecord(emptyRecord());
    } finally {
      setLoading(false);
    }
  }, [targetUserId, profile.employmentStatus]);

  useEffect(() => {
    fetchRecruitment();
  }, [fetchRecruitment]);

  const patchField = <K extends keyof RecruitmentRecordDto>(
    key: K,
    value: RecruitmentRecordDto[K],
  ) => {
    setRecord((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!targetUserId) return;
    const token = localStorage.getItem('token');
    setSaving(true);
    try {
      const res = await axios.put(`/api/v1/staff/${targetUserId}/recruitment`, record, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecord(res.data.recruitment);
      const status = res.data.employmentStatus;
      setEmploymentStatus(status);
      onEmploymentStatusChange?.(status);
      notifications.show({ title: 'Saved', message: 'Recruitment checklist updated', color: 'green' });
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Save failed'
        : 'Save failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleItemDocumentUpload = async (
    itemKey: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !targetUserId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', 'OTHER');
    formData.append('documentName', `${itemKey}_${file.name}`);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/staff/${targetUserId}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setItemDocuments((prev) => ({ ...prev, [itemKey]: file.name }));
      notifications.show({
        title: 'Success',
        message: 'Document uploaded successfully',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to upload document',
        color: 'red',
      });
    }

    if (itemFileRefs.current[itemKey]) {
      itemFileRefs.current[itemKey]!.value = '';
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
    <Paper p="xl" radius="md" withBorder>
      <Group justify="space-between" mb="lg" wrap="wrap">
        <Title order={4}>Safer recruitment checklist</Title>
        <Badge
          size="lg"
          color={employmentStatusBadgeColor(employmentStatus)}
          variant="filled"
        >
          {employmentStatusLabel(employmentStatus)}
        </Badge>
      </Group>

      <Alert color="blue" variant="light" mb="lg">
        Completing shadow with a start date sets employment status to On shadow for 14 days (end
        date calculated automatically). Dashboard &quot;Staff on Shadow&quot; uses this status.
      </Alert>

      <Stack gap="md" maw={560}>
        {CHECKLIST.map((item) => {
          const checked = Boolean(record[item.key]);
          const dateVal = record[item.dateKey] as string | null;
          const isShadow = item.key === 'shadowStarted';

          return (
            <Paper key={item.key} p="md" withBorder radius="md">
              <Checkbox
                label={item.label}
                checked={checked}
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  patchField(item.key, on as RecruitmentRecordDto[typeof item.key]);
                  if (on && !dateVal && item.dateKey !== 'shadowStartDate') {
                    patchField(
                      item.dateKey,
                      new Date().toISOString().slice(0, 10) as RecruitmentRecordDto[typeof item.dateKey],
                    );
                  }
                  if (!on && item.dateKey) {
                    patchField(item.dateKey, null);
                  }
                }}
                disabled={!canEdit}
              />
              {(item.dateKey === 'shadowStartDate' || dateVal) && (
                <TextInput
                  mt="sm"
                  label={isShadow ? 'Shadow start date' : 'Date completed'}
                  type="date"
                  value={
                    isShadow
                      ? (record.shadowStartDate?.slice(0, 10) ?? '')
                      : (dateVal?.slice(0, 10) ?? '')
                  }
                  onChange={(e) => {
                    const v = e.currentTarget.value || null;
                    if (isShadow) {
                      patchField('shadowStartDate', v);
                      if (v) {
                        const end = new Date(v);
                        end.setDate(end.getDate() + 14);
                        patchField('shadowEndDate', end.toISOString().slice(0, 10));
                      } else {
                        patchField('shadowEndDate', null);
                      }
                    } else {
                      patchField(item.dateKey, v);
                    }
                  }}
                  readOnly={!canEdit}
                />
              )}
              {isShadow && record.shadowEndDate && (
                <Text size="xs" c="dimmed" mt={4}>
                  Shadow ends: {new Date(record.shadowEndDate).toLocaleDateString('en-GB')} (14
                  days from start)
                </Text>
              )}
              {!isShadow && (
              <Box mt={8} pt={8} style={{ borderTop: '1px solid #f0f0f0' }}>
                {itemDocuments[item.key] ? (
                  <Group gap={8} align="center">
                    <Text size="xs" c="dimmed">
                      📄 {itemDocuments[item.key]}
                    </Text>
                    <Button
                      variant="subtle"
                      size="xs"
                      color="blue"
                      onClick={() => itemFileRefs.current[item.key]?.click()}
                    >
                      Replace
                    </Button>
                  </Group>
                ) : (
                  <Button
                    variant="subtle"
                    size="xs"
                    color="green"
                    leftSection={<Upload size={12} />}
                    onClick={() => itemFileRefs.current[item.key]?.click()}
                  >
                    Upload Document
                  </Button>
                )}
                <input
                  type="file"
                  ref={(el) => {
                    itemFileRefs.current[item.key] = el;
                  }}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleItemDocumentUpload(item.key, e)}
                />
              </Box>
              )}
            </Paper>
          );
        })}

        <Textarea
          label="Notes"
          value={record.notes ?? ''}
          onChange={(e) => patchField('notes', e.currentTarget.value || null)}
          readOnly={!canEdit}
          minRows={3}
        />

        {canEdit && (
          <Button onClick={handleSave} loading={saving} color="brandBlue">
            Save recruitment checklist
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
