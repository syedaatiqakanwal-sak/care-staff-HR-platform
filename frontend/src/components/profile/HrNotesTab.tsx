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
  Modal,
  Checkbox,
  ActionIcon,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Lock, Plus, Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { isManagementRole, canMutate } from '../../utils/roles';
import type { HrCaseNoteDto, HrCaseNoteCategory } from '../../types/hrNotes';
import { HR_NOTE_CATEGORIES } from '../../types/hrNotes';

interface HrNotesTabProps {
  profile: { user?: { id: string }; id?: string };
}

const categoryColor: Record<string, string> = {
  SAFEGUARDING: 'red',
  DISCIPLINARY: 'orange',
  INVESTIGATION: 'grape',
  COMPLAINT: 'pink',
  GRIEVANCE: 'violet',
  CONDUCT: 'orange',
  SICKNESS: 'cyan',
  RETURN_TO_WORK: 'blue',
  POSITIVE_FEEDBACK: 'green',
};

export function HrNotesTab({ profile }: HrNotesTabProps) {
  const targetUserId = profile.user?.id || profile.id;
  const canView = isManagementRole();
  const canEdit = canView && canMutate();

  const [notes, setNotes] = useState<HrCaseNoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HrCaseNoteDto | null>(null);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState<HrCaseNoteCategory>('CONDUCT');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confidential, setConfidential] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!targetUserId || !canView) return;
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const res = await axios.get(`/api/v1/staff/${targetUserId}/hr-notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setNotes([]);
      } else {
        notifications.show({ title: 'Error', message: 'Could not load HR notes', color: 'red' });
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, canView]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const openCreate = () => {
    setEditing(null);
    setCategory('CONDUCT');
    setTitle('');
    setBody('');
    setConfidential(true);
    setModalOpen(true);
  };

  const openEdit = (note: HrCaseNoteDto) => {
    setEditing(note);
    setCategory(note.category);
    setTitle(note.title);
    setBody(note.body);
    setConfidential(note.confidential);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!targetUserId || !title.trim() || !body.trim()) {
      notifications.show({ title: 'Required', message: 'Title and body are required', color: 'red' });
      return;
    }
    const token = localStorage.getItem('token');
    const payload = { category, title: title.trim(), body: body.trim(), confidential };
    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`/api/v1/staff/${targetUserId}/hr-notes/${editing.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`/api/v1/staff/${targetUserId}/hr-notes`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setModalOpen(false);
      notifications.show({ title: 'Saved', message: 'Case note saved', color: 'green' });
      fetchNotes();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || 'Save failed'
        : 'Save failed';
      notifications.show({ title: 'Error', message: String(msg), color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: HrCaseNoteDto) => {
    if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`/api/v1/staff/${targetUserId}/hr-notes/${note.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      notifications.show({ title: 'Deleted', message: 'Case note removed', color: 'green' });
      fetchNotes();
    } catch {
      notifications.show({ title: 'Error', message: 'Delete failed', color: 'red' });
    }
  };

  if (!canView) {
    return null;
  }

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
        <Group gap="xs">
          <Title order={4}>HR case notes</Title>
          <Badge color="red" variant="filled" leftSection={<Lock size={12} />}>
            Confidential
          </Badge>
        </Group>
        {canEdit && (
          <Button leftSection={<Plus size={16} />} color="brandBlue" onClick={openCreate}>
            Add case note
          </Button>
        )}
      </Group>

      <Alert color="red" variant="light" mb="lg" icon={<Lock size={16} />}>
        Restricted to Admin, Manager, and HR only. Supervisors and staff cannot access these
        records. All access is audit-logged.
      </Alert>

      {notes.length === 0 ? (
        <Text c="dimmed" fs="italic">
          No case notes on file.
        </Text>
      ) : (
        <Stack gap="md">
          {notes.map((note) => (
            <Paper key={note.id} p="md" withBorder radius="md">
              <Group justify="space-between" align="flex-start" mb="xs">
                <Group gap="xs">
                  <Badge color={categoryColor[note.category] || 'gray'} variant="light">
                    {HR_NOTE_CATEGORIES.find((c) => c.value === note.category)?.label || note.category}
                  </Badge>
                  {note.confidential && (
                    <Badge size="xs" color="red" variant="outline">
                      Confidential
                    </Badge>
                  )}
                </Group>
                {canEdit && (
                  <Group gap={4}>
                    <ActionIcon variant="subtle" color="brandBlue" onClick={() => openEdit(note)}>
                      <Pencil size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(note)}>
                      <Trash2 size={16} />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
              <Text fw={800} mb={4}>
                {note.title}
              </Text>
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {note.body}
              </Text>
              <Divider my="sm" />
              <Text size="xs" c="dimmed">
                {note.authorEmail ? `${note.authorEmail} · ` : ''}
                Updated {new Date(note.updatedAt).toLocaleString('en-GB')}
              </Text>
            </Paper>
          ))}
        </Stack>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit case note' : 'New case note'}
        size="lg"
      >
        <Stack gap="md">
          <Select
            label="Category"
            data={HR_NOTE_CATEGORIES}
            value={category}
            onChange={(v) => setCategory((v as HrCaseNoteCategory) || 'CONDUCT')}
            disabled={!canEdit}
          />
          <TextInput
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            readOnly={!canEdit}
          />
          <Textarea
            label="Note body"
            value={body}
            minRows={6}
            onChange={(e) => setBody(e.currentTarget.value)}
            required
            readOnly={!canEdit}
          />
          <Checkbox
            label="Mark as confidential"
            checked={confidential}
            onChange={(e) => setConfidential(e.currentTarget.checked)}
            disabled={!canEdit}
          />
          {canEdit && (
            <Button onClick={handleSave} loading={saving} color="brandBlue">
              {editing ? 'Update note' : 'Create note'}
            </Button>
          )}
        </Stack>
      </Modal>
    </Paper>
  );
}
