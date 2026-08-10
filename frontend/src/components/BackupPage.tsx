import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { AppConfirmModal } from './AppConfirmModal';
import {
  backupService,
  type BackupLog,
  type BackupSettings,
} from '../services/backup.service';

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';

function formatBytes(size: string | number | null | undefined): string {
  const n = typeof size === 'string' ? parseInt(size, 10) : Number(size || 0);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const typeColor: Record<string, string> = {
  daily: 'brandBlue',
  weekly: 'brandGreen',
  monthly: 'brandBlue',
  manual: 'gray',
};

const statusColor: Record<string, string> = {
  success: 'green',
  failed: 'red',
  running: 'yellow',
  pending: 'orange',
};

const HISTORY_PAGE_SIZE = 10;

const cardShellStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(19, 150, 57, 0.18)',
  boxShadow: '0 8px 24px rgba(19, 150, 57, 0.08)',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

function SummaryCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper p={0} radius="lg" style={cardShellStyle}>
      <Box
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${BRAND_GREEN} 0%, ${BRAND_BLUE} 100%)`,
          flexShrink: 0,
        }}
      />
      <Box p="md" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 88 }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap" mb={8}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} style={{ letterSpacing: '0.04em' }}>
            {label}
          </Text>
          <ThemeIcon
            size={28}
            radius="md"
            style={{
              background: 'rgba(19, 150, 57, 0.1)',
              color: BRAND_GREEN,
              flexShrink: 0,
            }}
          >
            {icon}
          </ThemeIcon>
        </Group>
        <Box>{children}</Box>
      </Box>
    </Paper>
  );
}

export function BackupPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingR2, setTestingR2] = useState(false);
  const [r2TestMsg, setR2TestMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<BackupLog[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [draft, setDraft] = useState<BackupSettings | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BackupLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statusRes, logsRes, settingsRes] = await Promise.all([
        backupService.getStatus(),
        backupService.getLogs(200),
        backupService.getSettings(),
      ]);
      setRunning(Boolean(statusRes.running));
      setLogs(logsRes);
      setSettings(settingsRes);
      setDraft((prev) => {
        // Keep unsaved draft edits unless first load
        if (!prev) return { ...settingsRes };
        return prev.id === settingsRes.id ? prev : { ...settingsRes };
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to load backup data',
        color: 'red',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => refresh(true), 30000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const successLogs = useMemo(
    () => logs.filter((l) => l.status === 'success' && l.filename),
    [logs],
  );
  const lastBackup = successLogs[0] || null;

  const historyTotalPages = Math.max(1, Math.ceil(logs.length / HISTORY_PAGE_SIZE));
  const historySlice = logs.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE,
  );

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await backupService.createBackup('manual');
      if (res.success) {
        notifications.show({
          title: 'Success',
          message: `Backup created: ${res.log.filename}`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Backup failed',
          message: res.log.errorMessage || 'Backup did not complete successfully',
          color: 'red',
        });
      }
      await refresh(true);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create backup',
        color: 'red',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!draft) return;
    setSavingSettings(true);
    try {
      const updated = await backupService.updateSettings({
        dailyEnabled: draft.dailyEnabled,
        weeklyEnabled: draft.weeklyEnabled,
        monthlyEnabled: draft.monthlyEnabled,
        maxDaily: draft.maxDaily,
        maxWeekly: draft.maxWeekly,
        maxMonthly: draft.maxMonthly,
        r2Enabled: draft.r2Enabled,
        r2AutoUpload: draft.r2Enabled ? draft.r2AutoUpload : false,
        deleteLocalAfterR2: draft.deleteLocalAfterR2,
      });
      setSettings(updated);
      setDraft({ ...updated });
      notifications.show({
        title: 'Success',
        message: 'Backup settings saved',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to save settings',
        color: 'red',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestR2 = async () => {
    setTestingR2(true);
    setR2TestMsg(null);
    try {
      const res = await backupService.testR2Connection();
      setR2TestMsg({ ok: res.ok, message: res.message });
      notifications.show({
        title: res.ok ? 'R2 connected' : 'R2 failed',
        message: res.message,
        color: res.ok ? 'green' : 'red',
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'R2 connection test failed';
      setR2TestMsg({ ok: false, message });
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setTestingR2(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setActionId(`dl-${filename}`);
    try {
      await backupService.downloadBackup(filename);
      notifications.show({
        title: 'Download started',
        message: filename,
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Download failed',
        color: 'red',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleUploadR2 = async (log: BackupLog) => {
    setActionId(`up-${log.id}`);
    try {
      await backupService.uploadToR2(log.id);
      notifications.show({
        title: 'Uploaded to R2',
        message: log.filename || log.id,
        color: 'green',
      });
      await refresh(true);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'R2 upload failed',
        color: 'red',
      });
    } finally {
      setActionId(null);
    }
  };

  const confirmDeleteBackup = async () => {
    if (!confirmDelete?.filename) return;
    setDeleting(true);
    try {
      await backupService.deleteBackup(confirmDelete.filename);
      notifications.show({
        title: 'Deleted',
        message: confirmDelete.filename,
        color: 'green',
      });
      setConfirmDelete(null);
      await refresh(true);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Delete failed',
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !draft) {
    return (
      <Center style={{ flex: 1, minHeight: 0, height: '100%' }}>
        <Loader size="sm" color="brandGreen" />
      </Center>
    );
  }

  return (
    <Box
      className="backup-page"
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .backup-page .mantine-Paper-root::before,
        .backup-page .mantine-Paper-root::after {
          display: none;
        }
        .backup-page .backup-tabs {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .backup-page .backup-tabs > [role="tabpanel"] {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .backup-page .backup-overview {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .backup-page .backup-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-auto-rows: 1fr;
          gap: 12px;
          flex: 0.9;
          min-height: 0;
        }
        .backup-page .backup-quick-actions {
          flex: 1.1;
          min-height: 0;
        }
        .backup-page .backup-scroll-panel {
          flex: 1;
          min-height: 0;
          overflow: auto;
        }
        @media (max-width: 900px) {
          .backup-page .backup-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 520px) {
          .backup-page .backup-summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <Container
        size="xl"
        p={0}
        style={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
        }}
      >
        <Group justify="space-between" align="center" mb={10} wrap="wrap" gap="sm" style={{ flexShrink: 0 }}>
          <Box>
            <Group gap="xs" mb={2}>
              <ThemeIcon variant="light" size="sm" radius="md" color="brandGreen.6">
                <Database size={14} />
              </ThemeIcon>
              <Text fw={700} c="brandGreen.6" tt="uppercase" size="xs" style={{ letterSpacing: '0.5px' }}>
                System
              </Text>
            </Group>
            <Title order={1} size={26} fw={900} c="dark.4" style={{ letterSpacing: '-0.4px', lineHeight: 1.15 }}>
              Database Backup
            </Title>
            <Text c="dimmed" size="sm" mt={2}>
              Local PostgreSQL dumps and Cloudflare R2 offsite copies. Admin only.
            </Text>
          </Box>
          <Button
            variant="light"
            color="brandGreen"
            leftSection={<RefreshCw size={16} />}
            onClick={() => refresh()}
            loading={loading}
          >
            Refresh
          </Button>
        </Group>

        <Tabs
          defaultValue="overview"
          color="brandGreen"
          className="backup-tabs"
          styles={{
            root: {
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            },
            list: {
              flexShrink: 0,
              marginBottom: 12,
            },
            panel: {
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 0,
            },
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="settings">Settings</Tabs.Tab>
            <Tabs.Tab value="files">Backup Files</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Box className="backup-overview">
              <Box className="backup-summary-grid" mb={12}>
                <SummaryCard label="Total Backups" icon={<HardDrive size={14} />}>
                  <Text size="xl" fw={900} c="dark.4" style={{ lineHeight: 1.1 }}>
                    {successLogs.length}
                  </Text>
                </SummaryCard>

                <SummaryCard label="Last Backup" icon={<Database size={14} />}>
                  <Text size="sm" fw={800} c="dark.4" style={{ lineHeight: 1.3 }}>
                    {formatDate(lastBackup?.createdAt)}
                  </Text>
                </SummaryCard>

                <SummaryCard label="Last Size" icon={<HardDrive size={14} />}>
                  <Text size="xl" fw={900} c="dark.4" style={{ lineHeight: 1.1 }}>
                    {formatBytes(lastBackup?.sizeBytes)}
                  </Text>
                </SummaryCard>

                <SummaryCard
                  label="R2 Status"
                  icon={settings?.r2Enabled ? <Cloud size={14} /> : <CloudOff size={14} />}
                >
                  <Group gap="xs" wrap="wrap">
                    <Badge
                      color={settings?.r2Enabled ? 'green' : 'red'}
                      variant="light"
                      leftSection={
                        settings?.r2Enabled ? <Cloud size={12} /> : <CloudOff size={12} />
                      }
                    >
                      {settings?.r2Enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    {running && (
                      <Badge color="yellow" variant="light">
                        Running…
                      </Badge>
                    )}
                  </Group>
                </SummaryCard>
              </Box>

              <Paper
                className="backup-quick-actions"
                p={0}
                radius="xl"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(19, 150, 57, 0.22)',
                  boxShadow: '0 8px 24px rgba(19, 150, 57, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <Box
                  style={{
                    height: 4,
                    background: `linear-gradient(90deg, ${BRAND_GREEN} 0%, ${BRAND_BLUE} 100%)`,
                    flexShrink: 0,
                  }}
                />
                <Box
                  p="md"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Group justify="space-between" align="center" wrap="wrap" mb="md" style={{ flexShrink: 0 }}>
                    <Box>
                      <Text fw={800} size="sm" c="dark.4">
                        Quick actions
                      </Text>
                      <Text size="xs" c="dimmed" mt={2}>
                        Create a manual dump or review the latest successful backup.
                      </Text>
                    </Box>
                    <Button
                      color="brandGreen"
                      leftSection={<HardDrive size={16} />}
                      loading={creating || running}
                      onClick={handleCreateBackup}
                    >
                      Create Backup Now
                    </Button>
                  </Group>

                  <Box
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      background: 'rgba(19, 150, 57, 0.04)',
                      border: '1px solid rgba(19, 150, 57, 0.1)',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    {lastBackup ? (
                      <Stack gap="sm">
                        <Group gap="xs" wrap="nowrap" align="flex-start">
                          <Text size="sm" fw={700} c="dimmed" style={{ minWidth: 96 }}>
                            Filename
                          </Text>
                          <Text size="sm" fw={600} ff="monospace" style={{ wordBreak: 'break-all' }}>
                            {lastBackup.filename}
                          </Text>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={700} c="dimmed" style={{ minWidth: 96 }}>
                            Size
                          </Text>
                          <Text size="sm" fw={800}>
                            {formatBytes(lastBackup.sizeBytes)}
                          </Text>
                        </Group>
                        <Group gap="xs" wrap="wrap">
                          <Text size="sm" fw={700} c="dimmed" style={{ minWidth: 96 }}>
                            Type
                          </Text>
                          <Badge color={typeColor[lastBackup.type] || 'gray'} variant="light">
                            {lastBackup.type}
                          </Badge>
                        </Group>
                        <Group gap="xs" wrap="wrap">
                          <Text size="sm" fw={700} c="dimmed" style={{ minWidth: 96 }}>
                            R2 uploaded
                          </Text>
                          <Badge color={lastBackup.r2Uploaded ? 'green' : 'gray'} variant="light">
                            {lastBackup.r2Uploaded ? 'Yes' : 'No'}
                          </Badge>
                        </Group>
                      </Stack>
                    ) : (
                      <Text c="dimmed" size="sm">
                        No successful backups yet.
                      </Text>
                    )}
                  </Box>

                  <Text size="xs" c="dimmed" mt="md" style={{ flexShrink: 0 }}>
                    Auto-refreshes every 30 seconds.
                  </Text>
                </Box>
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="settings">
            <Box className="backup-scroll-panel">
              <Paper p={0} radius="lg" style={{ ...cardShellStyle, height: 'auto', minHeight: '100%' }}>
                <Box
                  style={{
                    height: 3,
                    background: `linear-gradient(90deg, ${BRAND_GREEN} 0%, ${BRAND_BLUE} 100%)`,
                    flexShrink: 0,
                  }}
                />
                <Box p="md">
                {draft && (
                  <Stack gap="md">
                    <Switch
                      label="Daily backup at 02:00 (London)"
                      color="brandGreen"
                      checked={draft.dailyEnabled}
                      onChange={(e) =>
                        setDraft({ ...draft, dailyEnabled: e.currentTarget.checked })
                      }
                    />
                    <Switch
                      label="Weekly backup Sunday at 03:00 (London)"
                      color="brandGreen"
                      checked={draft.weeklyEnabled}
                      onChange={(e) =>
                        setDraft({ ...draft, weeklyEnabled: e.currentTarget.checked })
                      }
                    />
                    <Switch
                      label="Monthly backup (1st of month at 04:00 London)"
                      color="brandGreen"
                      checked={draft.monthlyEnabled}
                      onChange={(e) =>
                        setDraft({ ...draft, monthlyEnabled: e.currentTarget.checked })
                      }
                    />
                    <NumberInput
                      label="Max daily backups to keep"
                      value={draft.maxDaily}
                      min={1}
                      max={365}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          maxDaily: typeof v === 'number' ? v : draft.maxDaily,
                        })
                      }
                    />
                    <NumberInput
                      label="Max weekly backups to keep"
                      value={draft.maxWeekly}
                      min={1}
                      max={104}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          maxWeekly: typeof v === 'number' ? v : draft.maxWeekly,
                        })
                      }
                    />
                    <NumberInput
                      label="Keep last N monthly backups"
                      value={draft.maxMonthly ?? 12}
                      min={1}
                      max={120}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          maxMonthly: typeof v === 'number' ? v : draft.maxMonthly,
                        })
                      }
                    />
                    <Switch
                      label="R2 cloud backup"
                      color="brandGreen"
                      checked={draft.r2Enabled}
                      onChange={(e) => {
                        const on = e.currentTarget.checked;
                        setDraft({
                          ...draft,
                          r2Enabled: on,
                          r2AutoUpload: on ? draft.r2AutoUpload : false,
                        });
                      }}
                    />
                    <Switch
                      label="Auto-upload to R2"
                      description="Only available when R2 cloud backup is on"
                      color="brandGreen"
                      checked={draft.r2AutoUpload}
                      disabled={!draft.r2Enabled}
                      onChange={(e) =>
                        setDraft({ ...draft, r2AutoUpload: e.currentTarget.checked })
                      }
                    />
                    <Switch
                      label="Delete local after R2 upload"
                      color="brandGreen"
                      checked={draft.deleteLocalAfterR2}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          deleteLocalAfterR2: e.currentTarget.checked,
                        })
                      }
                    />

                    <Group gap="sm" wrap="wrap">
                      <Button
                        color="brandGreen"
                        loading={savingSettings}
                        onClick={handleSaveSettings}
                        leftSection={<CheckCircle2 size={16} />}
                      >
                        Save Settings
                      </Button>
                      <Button
                        variant="outline"
                        color="brandBlue"
                        loading={testingR2}
                        onClick={handleTestR2}
                        leftSection={<Cloud size={16} />}
                      >
                        Test R2 Connection
                      </Button>
                    </Group>

                    {r2TestMsg && (
                      <Alert
                        color={r2TestMsg.ok ? 'green' : 'red'}
                        title={r2TestMsg.ok ? 'R2 OK' : 'R2 error'}
                      >
                        {r2TestMsg.message}
                      </Alert>
                    )}
                  </Stack>
                )}
                </Box>
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="files">
            <Box className="backup-scroll-panel">
              <Paper p="md" radius="lg" style={{ ...cardShellStyle, height: 'auto', minHeight: '100%' }}>
                {successLogs.length === 0 ? (
                  <Center py="xl">
                    <Text c="dimmed">No backups yet</Text>
                  </Center>
                ) : (
                  <Table.ScrollContainer minWidth={720}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Filename</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Size</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>R2</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {successLogs.map((log) => (
                          <Table.Tr key={log.id}>
                            <Table.Td>
                              <Text size="sm" ff="monospace">
                                {log.filename}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={typeColor[log.type] || 'gray'} variant="light">
                                {log.type}
                              </Badge>
                            </Table.Td>
                            <Table.Td>{formatBytes(log.sizeBytes)}</Table.Td>
                            <Table.Td>{formatDate(log.createdAt)}</Table.Td>
                            <Table.Td>
                              <Badge
                                color={log.r2Uploaded ? 'green' : 'gray'}
                                variant="light"
                              >
                                {log.r2Uploaded ? 'Yes' : 'No'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <Tooltip label="Download">
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="brandBlue"
                                    loading={actionId === `dl-${log.filename}`}
                                    onClick={() =>
                                      log.filename && handleDownload(log.filename)
                                    }
                                  >
                                    <Download size={14} />
                                  </Button>
                                </Tooltip>
                                {!log.r2Uploaded && (
                                  <Tooltip label="Upload to R2">
                                    <Button
                                      size="compact-xs"
                                      variant="light"
                                      color="brandGreen"
                                      loading={actionId === `up-${log.id}`}
                                      onClick={() => handleUploadR2(log)}
                                    >
                                      <Upload size={14} />
                                    </Button>
                                  </Tooltip>
                                )}
                                <Tooltip label="Delete">
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="red"
                                    onClick={() => setConfirmDelete(log)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </Tooltip>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                )}
              </Paper>
            </Box>
          </Tabs.Panel>

          <Tabs.Panel value="history">
            <Box className="backup-scroll-panel">
              <Paper p="md" radius="lg" style={{ ...cardShellStyle, height: 'auto', minHeight: '100%' }}>
                {logs.length === 0 ? (
                  <Center py="xl">
                    <Text c="dimmed">No backup history</Text>
                  </Center>
                ) : (
                  <>
                    <Table.ScrollContainer minWidth={800}>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Filename</Table.Th>
                            <Table.Th>Size</Table.Th>
                            <Table.Th>Triggered by</Table.Th>
                            <Table.Th>R2</Table.Th>
                            <Table.Th>Date</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {historySlice.map((log) => (
                            <Table.Tr
                              key={log.id}
                              style={
                                log.status === 'failed'
                                  ? { background: 'rgba(255, 0, 0, 0.06)' }
                                  : undefined
                              }
                            >
                              <Table.Td>
                                <Badge color={typeColor[log.type] || 'gray'} variant="light">
                                  {log.type}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={statusColor[log.status] || 'gray'}
                                  variant="light"
                                >
                                  {log.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" ff="monospace">
                                  {log.filename || '—'}
                                </Text>
                                {log.errorMessage && (
                                  <Text size="xs" c="red">
                                    {log.errorMessage}
                                  </Text>
                                )}
                              </Table.Td>
                              <Table.Td>{formatBytes(log.sizeBytes)}</Table.Td>
                              <Table.Td>
                                <Text size="xs" ff="monospace">
                                  {log.triggeredBy || '—'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {log.r2Uploaded ? 'Yes' : 'No'}
                              </Table.Td>
                              <Table.Td>{formatDate(log.createdAt)}</Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                    <Group justify="center" mt="md">
                      <Button
                        variant="default"
                        size="xs"
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Text size="sm">
                        Page {historyPage} / {historyTotalPages}
                      </Text>
                      <Button
                        variant="default"
                        size="xs"
                        disabled={historyPage >= historyTotalPages}
                        onClick={() =>
                          setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
                        }
                      >
                        Next
                      </Button>
                    </Group>
                  </>
                )}
              </Paper>
            </Box>
          </Tabs.Panel>
        </Tabs>
      </Container>

      <AppConfirmModal
        opened={Boolean(confirmDelete)}
        title="Delete backup?"
        message={
          confirmDelete ? (
            <>
              Permanently delete{' '}
              <Text span fw={700} ff="monospace">
                {confirmDelete.filename}
              </Text>
              ? This cannot be undone.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteBackup}
      />
    </Box>
  );
}

export default BackupPage;
