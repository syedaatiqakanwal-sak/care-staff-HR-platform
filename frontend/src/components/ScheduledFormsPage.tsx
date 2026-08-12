import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { Calendar, ClipboardList, RefreshCw, Users } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';

type ScheduleStatus = 'upcoming' | 'due_today' | 'overdue';

type ScheduledFormRecord = {
  id: string;
  staffName: string;
  formType: string;
  formSubType: string;
  dateOfReview: string;
  status: ScheduleStatus;
  userId: string | null;
};

type ScheduledFormsResponse = {
  counts: {
    appraisals: number;
    supervisions: number;
    reviews: number;
    dueToday: number;
    totalUpcoming: number;
  };
  records: ScheduledFormRecord[];
};

const statusColor: Record<ScheduleStatus, string> = {
  upcoming: 'blue',
  due_today: 'orange',
  overdue: 'red',
};

const statusLabel: Record<ScheduleStatus, string> = {
  upcoming: 'Upcoming',
  due_today: 'Due today',
  overdue: 'Overdue',
};

const formTypeLabel = (formType: string) => {
  const t = (formType || '').toLowerCase();
  if (t === 'appraisal') return 'Appraisal';
  if (t === 'supervision') return 'Supervision';
  if (t === 'review') return 'Review';
  return formType || '—';
};

export function ScheduledFormsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ScheduledFormsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get<ScheduledFormsResponse>(
        '/api/v1/dashboard/scheduled-forms',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setData(res.data);
    } catch {
      setError('Could not load scheduled forms.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading && !data) {
    return (
      <Center h={400}>
        <Loader color="green" />
      </Center>
    );
  }

  const counts = data?.counts;
  const records = data?.records ?? [];

  return (
    <Box w="100%" maw="100%" py="md" px={0}>
      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
        <Box>
          <Title order={2} c={BRAND_GREEN}>
            Schedules
          </Title>
          <Text c="dimmed" size="sm" mt={4}>
            Upcoming appraisals, reviews, and supervisions across staff
          </Text>
        </Box>
        <Button
          leftSection={<RefreshCw size={16} />}
          variant="light"
          color="green"
          loading={loading}
          onClick={fetchData}
        >
          Refresh
        </Button>
      </Group>

      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md" mb="lg">
        <Paper
          p="md"
          radius="md"
          style={{ borderLeft: `4px solid ${BRAND_BLUE}`, background: 'white' }}
        >
          <Group gap="xs" mb={4}>
            <ClipboardList size={16} color={BRAND_BLUE} />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Appraisals
            </Text>
          </Group>
          <Text size="xl" fw={800} c={BRAND_BLUE}>
            {counts?.appraisals ?? 0}
          </Text>
        </Paper>
        <Paper
          p="md"
          radius="md"
          style={{ borderLeft: `4px solid ${BRAND_GREEN}`, background: 'white' }}
        >
          <Group gap="xs" mb={4}>
            <Users size={16} color={BRAND_GREEN} />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Supervisions
            </Text>
          </Group>
          <Text size="xl" fw={800} c={BRAND_GREEN}>
            {counts?.supervisions ?? 0}
          </Text>
        </Paper>
        <Paper
          p="md"
          radius="md"
          style={{ borderLeft: '4px solid #6366f1', background: 'white' }}
        >
          <Group gap="xs" mb={4}>
            <ClipboardList size={16} color="#6366f1" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Reviews
            </Text>
          </Group>
          <Text size="xl" fw={800}>
            {counts?.reviews ?? 0}
          </Text>
        </Paper>
        <Paper
          p="md"
          radius="md"
          style={{ borderLeft: '4px solid #d97706', background: 'white' }}
        >
          <Group gap="xs" mb={4}>
            <Calendar size={16} color="#d97706" />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Due today
            </Text>
          </Group>
          <Text size="xl" fw={800} c="#d97706">
            {counts?.dueToday ?? 0}
          </Text>
        </Paper>
        <Paper
          p="md"
          radius="md"
          style={{ borderLeft: `4px solid ${BRAND_BLUE}`, background: 'white' }}
        >
          <Group gap="xs" mb={4}>
            <Calendar size={16} color={BRAND_BLUE} />
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Upcoming
            </Text>
          </Group>
          <Text size="xl" fw={800} c={BRAND_BLUE}>
            {counts?.totalUpcoming ?? 0}
          </Text>
        </Paper>
      </SimpleGrid>

      <Paper p="lg" radius="md" withBorder style={{ width: '100%' }}>
        <Title order={4} mb="md" c={BRAND_GREEN}>
          Schedule details
        </Title>
        {records.length === 0 ? (
          <Text c="dimmed" fs="italic" py="md">
            No scheduled forms yet. Use Quick Actions on the Compliance dashboard to schedule a
            review, supervision, or appraisal.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={800}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr style={{ background: `${BRAND_GREEN}12` }}>
                  <Table.Th>Staff</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Subtype</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>
                      {row.userId ? (
                        <Text
                          size="sm"
                          fw={600}
                          c={BRAND_BLUE}
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/dashboard/staff/${row.userId}`)}
                        >
                          {row.staffName}
                        </Text>
                      ) : (
                        <Text size="sm" fw={600}>
                          {row.staffName}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue">
                        {formTypeLabel(row.formType)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{row.formSubType || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(row.dateOfReview)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor[row.status] || 'gray'} variant="light">
                        {statusLabel[row.status] || row.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Box>
  );
}

export default ScheduledFormsPage;
