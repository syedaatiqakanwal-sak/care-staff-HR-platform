import { useEffect, useMemo, useRef, useState } from 'react';
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
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BookOpen, Clock, FileText, ListChecks, Eye, RefreshCcw, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function formatHHMMSS(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

type PolicyRow = {
  id: string;
  title: string;
  description: string;
  version: number;
  isActive: boolean;
  updatedAt: string;
};

type PolicyNotifRow = {
  id: string;
  policyId: string;
  isRead: boolean;
  createdAt: string;
};

export const PoliciesPage = () => {
  const navigate = useNavigate();

  const role = (localStorage.getItem('role') || '').toLowerCase();
  const isAdmin = role === 'admin';

  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [notifs, setNotifs] = useState<PolicyNotifRow[]>([]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [readingSession, setReadingSession] = useState<{ id: string; startTime: string } | null>(null);

  const [readerOpen, setReaderOpen] = useState(false);
  const [readingPolicy, setReadingPolicy] = useState<PolicyRow | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const tickIntervalRef = useRef<number | null>(null);
  const startMsRef = useRef<number | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);

  const revokePdfBlobUrl = () => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
  };

  const loadPolicyPdfBlobUrl = async (policyId: string): Promise<string> => {
    if (!token) throw new Error('Not authenticated');
    const tokenRes = await axios.get(`/api/v1/policies/${policyId}/view-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const streamUrl = `/api/v1/policies/${policyId}/stream?token=${encodeURIComponent(tokenRes.data.token)}`;
    const pdfRes = await axios.get(streamUrl, { responseType: 'blob' });
    if (pdfRes.status < 200 || pdfRes.status >= 300) {
      throw new Error('Failed to load policy PDF');
    }
    return URL.createObjectURL(pdfRes.data);
  };

  // Timer loop (UI only)
  useEffect(() => {
    // Only run timer while modal is open
    if (!readerOpen || !isReading) {
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
      setElapsedSeconds(0);
      startMsRef.current = null;
      return;
    }

    const compute = () => {
      const startMs = startMsRef.current ?? Date.now();
      startMsRef.current = startMs;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };

    compute();

    if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
    tickIntervalRef.current = window.setInterval(() => {
      compute();
    }, 1000);

    return () => {
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    };
  }, [readerOpen, isReading]);

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [polRes, notifRes] = await Promise.all([
        axios.get('/api/v1/policies', { headers }),
        isAdmin ? Promise.resolve({ data: [] }) : axios.get('/api/v1/policy-notifications/my', { headers }),
      ]);
      setPolicies(polRes.data || []);
      setNotifs((notifRes.data || []).map((n: any) => ({ id: n.id, policyId: n.policyId, isRead: n.isRead, createdAt: n.createdAt })));
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
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadPolicyIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const n of notifs) {
      if (!n.isRead) set.add(n.policyId);
    }
    return set;
  }, [notifs]);

  const openReader = async (p: PolicyRow) => {
    if (!token) return;

    setReadingPolicy(p);
    setReaderOpen(true);
    setIsReading(true);
    setElapsedSeconds(0);
    startMsRef.current = Date.now();
    setReadingSession(null);

    revokePdfBlobUrl();
    setPdfUrl(null);
    try {
      const blobUrl = await loadPolicyPdfBlobUrl(p.id);
      pdfBlobUrlRef.current = blobUrl;
      setPdfUrl(blobUrl);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to open policy PDF.', color: 'red' });
      setPdfUrl(null);
    }

    // Create a new reading session every time modal opens (staff only)
    if (!isAdmin) {
      try {
        const startRes = await axios.post(
          '/api/v1/policy-reading/start',
          { policyId: p.id },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setReadingSession({ id: startRes.data.id, startTime: startRes.data.startTime });
      } catch (err: any) {
        // If session fails, still allow PDF to open, but warn user
        notifications.show({
          title: 'Tracking error',
          message: err?.response?.data?.message || 'Failed to start tracking session.',
          color: 'orange',
        });
      }
    }

    // Mark policy notifications as read immediately on open (so sidebar badge drops)
    const unreadForPolicy = notifs.filter((n) => n.policyId === p.id && !n.isRead);
    if (!isAdmin && unreadForPolicy.length > 0) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        await Promise.all(
          unreadForPolicy.map((n) => axios.patch(`/api/v1/policy-notifications/${n.id}/read`, {}, { headers })),
        );
        setNotifs((prev) => prev.map((n) => (n.policyId === p.id ? { ...n, isRead: true } : n)));
        window.dispatchEvent(new Event('policyNotifsUpdated'));
      } catch {
        // ignore
      }
    }
  };

  const openPdfOnly = async (p: PolicyRow) => {
    if (!token) return;
    try {
      const blobUrl = await loadPolicyPdfBlobUrl(p.id);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err?.response?.data?.message || 'Failed to open policy PDF.', color: 'red' });
    }
  };

  if (isAdmin) {
    return (
      <Box p="xl">
        <Group justify="space-between" align="center" mb="lg">
          <Group gap="sm">
            <FileText size={22} />
            <Title order={2} fw={900}>Policies</Title>
          </Group>
          <Group>
            <Button 
              variant="filled" 
              leftSection={<ListChecks size={16} />} 
              color="#E51690" 
              onClick={() => navigate('/dashboard/policies/reports')}
              style={{ fontWeight: 700 }}
            >
              Reports
            </Button>
            <Button 
              variant="filled" 
              leftSection={<BarChart3 size={16} />} 
              color="orange" 
              onClick={() => navigate('/dashboard/policies/analytics')}
              style={{ fontWeight: 700 }}
            >
              Analytics
            </Button>
            <Button 
              variant="filled" 
              leftSection={<FileText size={16} />} 
              color="brandBlue" 
              onClick={() => navigate('/dashboard/policies/manage')}
              style={{ fontWeight: 700 }}
            >
              Manage
            </Button>
          </Group>
        </Group>

        <Paper p="xl" radius="xl" withBorder>
          <Group justify="space-between" mb="md">
            <Text fw={800}>All policies</Text>
            <ActionIcon variant="light" onClick={fetchAll} title="Refresh">
              <RefreshCcw size={16} />
            </ActionIcon>
          </Group>
          {loading ? (
            <Center py="xl">
              <Group gap="sm">
                <Loader size="sm" />
                <Text c="dimmed">Loading...</Text>
              </Group>
            </Center>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {policies.map((p, i) => {
                const cardGradients = [
                  'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)', // Blue
                  'linear-gradient(135deg, #E51690 0%, #E51690 100%)'  // Green
                ];
                const bgIdx = i % cardGradients.length;
                const bg = cardGradients[bgIdx];

                return (
                  <Paper key={p.id} p="sm" radius="xl" withBorder={false} style={{
                    transition: 'transform 0.2s',
                    cursor: 'pointer',
                    background: bg,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                    }}>
                    <Box style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />

                    <Group justify="space-between" mb="xs" wrap="nowrap" style={{ position: 'relative', zIndex: 1 }}>
                      <ThemeIcon variant="filled" color="rgba(255,255,255,0.2)" size="md" radius="md" style={{ backdropFilter: 'blur(4px)' }}>
                        <FileText size={14} color="white" />
                      </ThemeIcon>
                      <Group gap={4}>
                        <Badge variant="filled" size="sm" radius="sm" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>v{p.version}</Badge>
                        <Badge variant="filled" size="sm" radius="sm" style={{ background: p.isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(158, 158, 158, 0.3)', color: 'white', backdropFilter: 'blur(4px)' }}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Group>
                    </Group>
                    <Title order={5} mb={2} size={18} fw={800} c="white">{p.title}</Title>
                    <Text size="xs" c="white" opacity={0.8} fw={600} lineClamp={2}>{p.description || 'Policy document'}</Text>
                    <Button 
                      mt="sm" 
                      variant="filled" 
                      size="xs"
                      leftSection={<Eye size={12} />} 
                      onClick={(e) => {
                        e.stopPropagation();
                        openPdfOnly(p);
                      }}
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        backdropFilter: 'blur(4px)'
                      }}
                    >
                      View PDF
                    </Button>
                  </Paper>
                );
              })}
              {policies.length === 0 && <Text c="dimmed">No policies found.</Text>}
            </SimpleGrid>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box p={{ base: 'md', md: 'xl' }}>
      <Group justify="space-between" align="center" mb={{ base: 'md', md: 'lg' }} wrap="wrap">
        <Group gap="sm">
          <BookOpen size={22} />
          <Title order={2} fw={900}>Policies</Title>
        </Group>

        <Group gap="sm" wrap="wrap">
          <Badge
            leftSection={<Clock size={14} />}
            size="lg"
            variant="gradient"
            gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }}
          >
            {readerOpen ? formatHHMMSS(elapsedSeconds) : '00:00:00'}
          </Badge>
          <Button variant="light" leftSection={<RefreshCcw size={16} />} onClick={fetchAll} w={{ base: '100%', xs: 'auto' }}>
            Refresh
          </Button>
        </Group>
      </Group>

      <Paper p={{ base: 'md', md: 'xl' }} radius="xl" withBorder>
        {loading ? (
          <Center py="xl">
            <Group gap="sm">
              <Loader size="sm" />
              <Text c="dimmed">Loading policies...</Text>
            </Group>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 'md', md: 'lg' }}>
            {policies.filter((p) => p.isActive).map((p, i) => {
              const unread = unreadPolicyIdSet.has(p.id);
              const cardGradients = [
                'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)', // Blue
                'linear-gradient(135deg, #E51690 0%, #E51690 100%)'  // Green
              ];
              const bgIdx = i % cardGradients.length;
              const bg = cardGradients[bgIdx];

              return (
                <Paper key={p.id} p={{ base: 'sm', md: 'sm' }} radius="xl" withBorder={false} style={{
                  transition: 'transform 0.2s',
                  cursor: 'pointer',
                  background: bg,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                  }}>
                  <Box style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />

                  <Group justify="space-between" mb="xs" wrap="wrap" style={{ position: 'relative', zIndex: 1 }}>
                    <ThemeIcon variant="filled" color="rgba(255,255,255,0.2)" size="md" radius="md" style={{ backdropFilter: 'blur(4px)' }}>
                      <FileText size={14} color="white" />
                    </ThemeIcon>
                    <Group gap={4} wrap="wrap">
                      <Badge variant="filled" size="sm" radius="sm" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>v{p.version}</Badge>
                      {unread && <Badge variant="filled" size="sm" radius="sm" style={{ background: 'rgba(244, 67, 54, 0.3)', color: 'white', backdropFilter: 'blur(4px)' }}>NEW</Badge>}
                    </Group>
                  </Group>
                  <Title order={5} mb={2} size={18} fw={800} c="white">{p.title}</Title>
                  <Text size="xs" c="white" opacity={0.8} fw={600} lineClamp={2}>{p.description || 'Policy document'}</Text>
                  <Button 
                    mt="sm" 
                    variant="filled" 
                    size="xs"
                    leftSection={<Eye size={12} />} 
                    onClick={(e) => {
                      e.stopPropagation();
                      openReader(p);
                    }}
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)', 
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'white',
                      backdropFilter: 'blur(4px)'
                    }}
                    w={{ base: '100%', sm: 'auto' }}
                  >
                    Read Policy
                  </Button>
                </Paper>
              );
            })}
            {policies.filter((p) => p.isActive).length === 0 && (
              <Text c="dimmed">No active policies available.</Text>
            )}
          </SimpleGrid>
        )}
      </Paper>

      <Modal
        opened={readerOpen}
        onClose={async () => {
          // Complete session on close (best-effort)
          if (!isAdmin && readingSession?.id) {
            const endTimeIso = new Date().toISOString();
            try {
              await axios.patch(
                `/api/v1/policy-sessions/${readingSession.id}`,
                { endTime: endTimeIso },
                { headers: { Authorization: `Bearer ${token}` } },
              );
            } catch (err: any) {
              // Log error but don't block modal close
              console.error('Failed to complete policy reading session:', err?.response?.data || err);
            }
            setReadingSession(null);
          }

          // Immediately stop timer & reset local reading state
          if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
          setIsReading(false);
          setElapsedSeconds(0);
          startMsRef.current = null;

          setReaderOpen(false);
          setReadingPolicy(null);
          revokePdfBlobUrl();
          setPdfUrl(null);

          // Refresh notifications/policies after close
          await fetchAll();
        }}
        size="xl"
        radius="md"
        centered
        title={<Title order={4}>Policy Reader</Title>}
      >
        {!readingPolicy ? (
          <Text c="dimmed">No policy selected.</Text>
        ) : (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Box>
                <Text fw={900}>{readingPolicy.title}</Text>
                <Text size="sm" c="dimmed">Version {readingPolicy.version}</Text>
              </Box>
              <Badge
                leftSection={<Clock size={14} />}
                size="lg"
                variant="gradient"
                gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }}
              >
                {formatHHMMSS(elapsedSeconds)}
              </Badge>
            </Group>

            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
              {pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Policy PDF"
                  width="100%"
                  height="420"
                  style={{ border: 'none', display: 'block' }}
                />
              ) : (
                <Center py="xl">
                  <Text c="dimmed">Loading PDF...</Text>
                </Center>
              )}
            </Paper>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

