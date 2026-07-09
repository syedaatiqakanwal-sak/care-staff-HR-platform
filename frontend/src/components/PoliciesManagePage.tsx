import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  FileInput,
  Group,
  Loader,
  Modal,
  Paper,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Download, Edit, Plus, Trash2, Upload, FileText } from 'lucide-react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';

type PolicyRow = {
  id: string;
  title: string;
  description: string;
  filePath: string;
  version: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export const PoliciesManagePage = () => {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const isAdmin = ['admin', 'manager', 'hr'].includes(role);
  const canEdit = isAdmin && localStorage.getItem('readOnly') !== 'true';
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PolicyRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [incrementVersion, setIncrementVersion] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', description: '', isActive: true });

  const sorted = useMemo(() => policies, [policies]);

  const fetchPolicies = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/policies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPolicies(res.data || []);
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.message || 'Failed to load policies.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', isActive: true });
    setFile(null);
    setIncrementVersion(true);
    setModalOpen(true);
  };

  const openEdit = (p: PolicyRow) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || '', isActive: p.isActive });
    setFile(null);
    setIncrementVersion(false);
    setModalOpen(true);
  };

  const openNewVersion = (p: PolicyRow) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || '', isActive: p.isActive });
    setFile(null);
    setIncrementVersion(true);
    setModalOpen(true);
  };

  const save = async () => {
    if (!token) return;
    if (!form.title.trim()) {
      notifications.show({ title: 'Validation', message: 'Title is required', color: 'orange' });
      return;
    }
    if (!editing && !file) {
      notifications.show({ title: 'Validation', message: 'PDF file is required', color: 'orange' });
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description || '');
      fd.append('isActive', String(form.isActive));
      if (editing) fd.append('incrementVersion', String(incrementVersion));
      if (file) fd.append('file', file);

      if (!editing) {
        await axios.post('/api/v1/policies', fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notifications.show({ title: 'Created', message: 'Policy created successfully', color: '#267FBA' });
      } else {
        await axios.patch(`/api/v1/policies/${editing.id}`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
        notifications.show({ title: 'Updated', message: 'Policy updated successfully', color: '#267FBA' });
      }

      setModalOpen(false);
      await fetchPolicies();
    } catch (err: any) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.message || 'Failed to save policy.',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: PolicyRow) => {
    if (!token) return;
    try {
      const fd = new FormData();
      fd.append('isActive', String(!p.isActive));
      fd.append('incrementVersion', 'false');
      await axios.patch(`/api/v1/policies/${p.id}`, fd, { headers: { Authorization: `Bearer ${token}` } });
      await fetchPolicies();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to update policy.', color: 'red' });
    }
  };

  const remove = async (p: PolicyRow) => {
    if (!token) return;
    const ok = window.confirm(`Delete policy "${p.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await axios.delete(`/api/v1/policies/${p.id}`, { headers: { Authorization: `Bearer ${token}` } });
      notifications.show({ title: 'Deleted', message: 'Policy deleted', color: '#267FBA' });
      await fetchPolicies();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to delete policy.', color: 'red' });
    }
  };

  const downloadPdf = async (p: PolicyRow) => {
    if (!token) return;
    try {
      const pdfRes = await axios.get(`/api/v1/policies/${p.id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to open PDF.', color: 'red' });
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard/policies" replace />;

  return (
    <Box p="xl">
      <Group justify="space-between" mb="lg" align="center">
        <Title order={2} fw={900}>Manage Policies</Title>
        <Group>
          <Button variant="light" onClick={fetchPolicies}>Refresh</Button>
          <Button leftSection={<Plus size={16} />} color="brandBlue" onClick={openCreate} disabled={!canEdit}>
            Add Policy
          </Button>
        </Group>
      </Group>

      <Paper p="xl" radius="xl" withBorder>
        {loading ? (
          <Center py="xl">
            <Group gap="sm">
              <Loader size="sm" />
              <Text c="dimmed">Loading policies...</Text>
            </Group>
          </Center>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Version</Table.Th>
                <Table.Th>Active</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sorted.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Text fw={800}>{p.title}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{p.description || ''}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="brandBlue">v{p.version}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Switch checked={p.isActive} onChange={() => toggleActive(p)} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(p.updatedAt).toLocaleDateString('en-GB')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={8} wrap="nowrap">
                      <ActionIcon variant="light" color="brandBlue" onClick={() => openEdit(p)} title="Edit">
                        <Edit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="#267FBA" onClick={() => openNewVersion(p)} title="Upload New Version">
                        <Upload size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="gray" onClick={() => downloadPdf(p)} title="Open PDF">
                        <Download size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="red" onClick={() => remove(p)} title="Delete">
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {sorted.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Center py="xl">
                      <Text c="dimmed">No policies yet.</Text>
                    </Center>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        centered
        size="lg"
        radius="md"
        title={<Title order={4}>{editing ? (incrementVersion ? 'Upload New Version' : 'Edit Policy') : 'Add Policy'}</Title>}
      >
        <Box>
          <TextInput
            label="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.currentTarget.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.currentTarget.value }))}
            minRows={3}
            mt="sm"
          />

          <Group mt="sm" justify="space-between">
            <Switch
              label="Active"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.currentTarget.checked }))}
            />
            {editing && (
              <Switch
                label="Increment version"
                checked={incrementVersion}
                onChange={(e) => setIncrementVersion(e.currentTarget.checked)}
              />
            )}
          </Group>

          <FileInput
            label="PDF File"
            placeholder={editing ? 'Optional (upload to replace / new version)' : 'Upload PDF'}
            value={file}
            onChange={setFile}
            mt="sm"
            accept="application/pdf"
            leftSection={<FileText size={16} />}
          />

          <Group justify="flex-end" mt="lg">
            <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button color="brandBlue" loading={saving} onClick={save} disabled={!canEdit}>
              Save
            </Button>
          </Group>
        </Box>
      </Modal>
    </Box>
  );
};

