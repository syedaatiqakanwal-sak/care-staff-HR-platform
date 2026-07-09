import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Download, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';

function formatHHMMSS(totalSeconds: number | null | undefined) {
  const s = Math.max(0, totalSeconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatTime(d: string | Date | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type SessionRow = {
  id: string;
  staffId: string;
  policyId: string;
  policyVersion: number;
  startTime: string;
  endTime: string | null;
  totalDurationSeconds: number | null;
  date: string;
  day: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  staff?: any;
  policy?: any;
};

export const PolicyReportsPage = () => {
  const role = (localStorage.getItem('role') || '').toLowerCase();
  const isAdmin = ['admin', 'manager', 'hr', 'supervisor'].includes(role);
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingSessions, setLoadingSessions] = useState<Map<string, any[]>>(new Map());

  // Group sessions by staffId + policyId + date
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, SessionRow[]>();
    for (const session of sessions) {
      const key = `${session.staffId}_${session.policyId}_${session.date}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(session);
    }
    return groups;
  }, [sessions]);

  // Get unique groups for display (one row per group)
  const uniqueGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: Array<{ key: string; sessions: SessionRow[] }> = [];
    for (const session of sessions) {
      const key = `${session.staffId}_${session.policyId}_${session.date}`;
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ key, sessions: groupedSessions.get(key) || [session] });
      }
    }
    return groups.sort((a, b) => {
      const aTime = new Date(a.sessions[0].startTime).getTime();
      const bTime = new Date(b.sessions[0].startTime).getTime();
      return bTime - aTime; // Newest first
    });
  }, [sessions, groupedSessions]);

  const fetchSessions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/v1/policy-reading/admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Map data - show each session individually (no aggregation)
      const sessionsData = (res.data || []).map((s: any) => ({
        id: s.id,
        staffId: s.staffId,
        policyId: s.policyId,
        policyVersion: s.policyVersion,
        startTime: s.startTime,
        endTime: s.endTime || null,
        totalDurationSeconds: s.totalDurationSeconds || null,
        date: s.date,
        day: s.day,
        status: s.status,
        staff: s.staff ? {
          firstName: s.staff.firstName,
          lastName: s.staff.lastName,
          ilccsNumber: s.staff.ilccsNumber,
        } : null,
        policy: s.policy ? {
          title: s.policy.title,
        } : null,
      }));
      
      setSessions(sessionsData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load policy reading sessions.';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRow = async (key: string, session: SessionRow) => {
    const isExpanded = expandedRows.has(key);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedRows);
      newExpanded.delete(key);
      setExpandedRows(newExpanded);
    } else {
      // Expand - fetch all sessions for this group
      setExpandedRows(new Set([...expandedRows, key]));
      
      // If not already loaded, fetch sessions
      if (!loadingSessions.has(key)) {
        try {
          const res = await axios.get(`/api/v1/policy-reading/admin/grouped`, {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              staffId: session.staffId,
              policyId: session.policyId,
              date: session.date,
            },
          });
          // Map the response to ensure consistent structure
          const mappedSessions = (res.data || []).map((s: any) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime || null,
            totalDurationSeconds: s.totalDurationSeconds || null,
            status: s.status || 'IN_PROGRESS',
          }));
          const sorted = mappedSessions.sort((a: any, b: any) => 
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          const newMap = new Map(loadingSessions);
          newMap.set(key, sorted);
          setLoadingSessions(newMap);
        } catch (err: any) {
          notifications.show({ title: 'Error', message: 'Failed to load sessions', color: 'red' });
        }
      }
    }
  };

  const downloadPdf = async (staffId: string, policyId: string, date: string) => {
    if (!token) return;
    try {
      const res = await axios.get(`/api/v1/policy-reading/admin/report/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { staffId, policyId, date },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `policy_reading_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to download PDF.';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard/policies" replace />;

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Group justify="space-between" mb={{ base: 'md', md: 'lg' }} align="center" wrap="wrap">
        <Group gap="sm">
          <FileText size={22} />
          <Title order={2} fw={900}>Policy Reading Reports</Title>
        </Group>
        <Button variant="light" color="brandBlue" onClick={fetchSessions} w={{ base: '100%', xs: 'auto' }}>
          Refresh
        </Button>
      </Group>

      <Paper p={{ base: 'md', md: 'xl' }} radius="xl" withBorder>
        {loading ? (
          <Center py="xl">
            <Group gap="sm">
              <Loader size="sm" />
              <Text c="dimmed">Loading sessions...</Text>
            </Group>
          </Center>
        ) : (
          <ScrollArea.Autosize mah="65vh" type="auto" viewportProps={{ style: { minWidth: 720 } }}>
            <Table
              verticalSpacing="xs"
              horizontalSpacing="xs"
              fz="xs"
              highlightOnHover
              style={{ minWidth: 720 }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Staff Name</Table.Th>
                  <Table.Th>ILCCS</Table.Th>
                  <Table.Th>Policy Name</Table.Th>
                  <Table.Th>Version</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Day</Table.Th>
                  <Table.Th>Start Time</Table.Th>
                  <Table.Th>End Time</Table.Th>
                  <Table.Th>Sessions</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {uniqueGroups.map((group) => {
                  const firstSession = group.sessions[0];
                  const staffName = firstSession.staff ? `${firstSession.staff.firstName || ''} ${firstSession.staff.lastName || ''}`.trim() : firstSession.staffId;
                  const policyTitle = firstSession.policy?.title || firstSession.policyId;
                  const isExpanded = expandedRows.has(group.key);
                  const allSessions = loadingSessions.get(group.key) || group.sessions;
                  const sortedSessions = [...allSessions].sort((a, b) => 
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                  );

                  return (
                    <>
                      <Table.Tr 
                        key={group.key}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleRow(group.key, firstSession)}
                      >
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(group.key, firstSession);
                              }}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </ActionIcon>
                            <Text fw={800}>{staffName || '-'}</Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>{firstSession.staff?.ilccsNumber || '-'}</Table.Td>
                        <Table.Td>{policyTitle}</Table.Td>
                        <Table.Td>v{firstSession.policyVersion}</Table.Td>
                        <Table.Td>{firstSession.date}</Table.Td>
                        <Table.Td>{firstSession.day}</Table.Td>
                        <Table.Td>{formatTime(sortedSessions[0]?.startTime || firstSession.startTime)}</Table.Td>
                        <Table.Td>{formatTime(sortedSessions[sortedSessions.length - 1]?.endTime || firstSession.endTime)}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color="brandBlue">
                            {sortedSessions.length} session{sortedSessions.length > 1 ? 's' : ''}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={firstSession.status === 'COMPLETED' ? 'green' : 'gray'}>
                            {firstSession.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon 
                            variant="light" 
                            color="gray" 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPdf(firstSession.staffId, firstSession.policyId, firstSession.date);
                            }} 
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && (
                        <Table.Tr>
                          <Table.Td colSpan={11} style={{ padding: 0, backgroundColor: 'var(--mantine-color-gray-0)' }}>
                            <Box p="md">
                              <Stack gap="md">
                                {sortedSessions.map((s: any, idx: number) => (
                                  <Paper
                                    key={s.id || idx}
                                    p="md"
                                    radius="md"
                                    withBorder
                                    style={{
                                      borderLeft: '3px solid var(--mantine-color-brandBlue-6)',
                                      backgroundColor: 'white',
                                    }}
                                  >
                                    <Group justify="space-between" mb="xs">
                                      <Text fw={700} size="sm">
                                        Session {idx + 1}
                                      </Text>
                                      <Badge variant="light" color={s.status === 'COMPLETED' ? 'green' : 'gray'}>
                                        {s.status}
                                      </Badge>
                                    </Group>
                                    <Stack gap="xs" mt="xs">
                                      <Group justify="space-between">
                                        <Text fw={600} size="sm">Start Time:</Text>
                                        <Text fw={700}>{new Date(s.startTime).toLocaleString('en-GB')}</Text>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text fw={600} size="sm">End Time:</Text>
                                        <Text fw={700}>{s.endTime ? new Date(s.endTime).toLocaleString('en-GB') : '-'}</Text>
                                      </Group>
                                      <Group justify="space-between">
                                        <Text fw={600} size="sm">Duration:</Text>
                                        <Text fw={900} c="brandBlue">
                                          {s.totalDurationSeconds != null ? formatHHMMSS(s.totalDurationSeconds) : '-'}
                                        </Text>
                                      </Group>
                                    </Stack>
                                  </Paper>
                                ))}
                              </Stack>
                            </Box>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </>
                  );
                })}
              </Table.Tbody>
            </Table>
            {uniqueGroups.length === 0 && (
              <Center py="xl">
                <Text c="dimmed">No reading sessions yet.</Text>
              </Center>
            )}
          </ScrollArea.Autosize>
        )}
      </Paper>
    </Box>
  );
};

