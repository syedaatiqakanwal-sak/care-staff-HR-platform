import {
  Box,
  Title,
  Text,
  Paper,
  Table,
  Group,
  TextInput,
  Select,
  Button,
  Loader,
  Center,
  Badge,
  Container,
  Pagination,
} from '@mantine/core';
import { ScrollText } from 'lucide-react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';

type AuditRow = {
  id: string;
  userId: string;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  ipAddress: string | null;
  createdAt: string;
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'VIEW_RESTRICTED', label: 'VIEW_RESTRICTED' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'hr_case_note', label: 'HR case note' },
  { value: 'payroll_info', label: 'Payroll' },
  { value: 'staff_document', label: 'Document' },
  { value: 'user', label: 'User' },
  { value: 'leave_record', label: 'Leave' },
];

const PAGE_SIZE = 50;

const actionColor: Record<string, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  VIEW_RESTRICTED: 'violet',
};

export function AuditLogPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchLogs = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };
      if (entityType) params.entityType = entityType;
      if (entityId) params.entityId = entityId;
      if (userId) params.userId = userId;
      if (action) params.action = action;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await axios.get('/api/v1/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setItems(res.data.items || []);
      setTotal(res.data.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, entityId, userId, action, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Box p="md">
      <Container size="xl" p={0}>
        <Group gap="xs" mb={4}>
          <ScrollText size={20} color="#267FBA" />
          <Text fw={700} c="brandBlue.6" tt="uppercase" size="xs">
            Compliance
          </Text>
        </Group>
        <Title order={1} size={28} fw={900} mb={4}>
          Audit log
        </Title>
        <Text c="dimmed" size="sm" mb="xl">
          Who changed what — restricted to Admin and Manager. HR notes, payroll, documents,
          users, and leave approvals are logged here.
        </Text>

        <Paper p="md" radius="lg" withBorder mb="lg">
          <Group align="flex-end" wrap="wrap" gap="md">
            <Select
              label="Entity type"
              data={ENTITY_OPTIONS}
              value={entityType}
              onChange={(v) => {
                setEntityType(v || '');
                setPage(1);
              }}
              clearable
              maw={180}
            />
            <Select
              label="Action"
              data={ACTION_OPTIONS}
              value={action}
              onChange={(v) => {
                setAction(v || '');
                setPage(1);
              }}
              clearable
              maw={160}
            />
            <TextInput
              label="Entity ID"
              value={entityId}
              onChange={(e) => setEntityId(e.currentTarget.value)}
              placeholder="UUID"
              maw={280}
            />
            <TextInput
              label="User ID"
              value={userId}
              onChange={(e) => setUserId(e.currentTarget.value)}
              placeholder="Actor UUID"
              maw={280}
            />
            <TextInput label="From" type="date" value={from} onChange={(e) => setFrom(e.currentTarget.value)} />
            <TextInput label="To" type="date" value={to} onChange={(e) => setTo(e.currentTarget.value)} />
            <Button
              color="brandBlue"
              onClick={() => {
                setPage(1);
                fetchLogs();
              }}
            >
              Apply filters
            </Button>
          </Group>
        </Paper>

        <Paper p="md" radius="lg" withBorder>
          {loading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : items.length === 0 ? (
            <Text c="dimmed" fs="italic" ta="center" py="xl">
              No audit entries match your filters.
            </Text>
          ) : (
            <>
              <Text size="sm" c="dimmed" mb="sm">
                {total} total entries
              </Text>
              <Table striped highlightOnHover fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>When</Table.Th>
                    <Table.Th>Action</Table.Th>
                    <Table.Th>Entity</Table.Th>
                    <Table.Th>Role</Table.Th>
                    <Table.Th>Summary</Table.Th>
                    <Table.Th>IP</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(row.createdAt).toLocaleString('en-GB')}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={actionColor[row.action] || 'gray'} variant="light">
                          {row.action}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={600}>
                          {row.entityType}
                        </Text>
                        {row.entityId && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {row.entityId}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>{row.userRole || '—'}</Table.Td>
                      <Table.Td maw={360}>
                        <Text size="xs" lineClamp={2}>
                          {row.summary || '—'}
                        </Text>
                      </Table.Td>
                      <Table.Td>{row.ipAddress || '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              {totalPages > 1 && (
                <Group justify="center" mt="md">
                  <Pagination value={page} onChange={setPage} total={totalPages} />
                </Group>
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
