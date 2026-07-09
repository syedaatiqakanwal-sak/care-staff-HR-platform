import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  ClipboardList,
  FileDown,
  FileText,
  GraduationCap,
  Shield,
  ShieldCheck,
  Star,
  UserMinus,
  Users,
  Globe,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';

const BRAND_GREEN = '#139639';
const LAST_GENERATED_KEY = 'hr_reports_last_generated';

const REPORTS = [
  {
    id: 'dbs-renewal',
    title: 'DBS Renewal Report',
    description: 'Staff with DBS renewals due within the warning window.',
    icon: Shield,
    emptyMessage: 'No staff with DBS renewals due — great compliance!',
  },
  {
    id: 'visa-expiry',
    title: 'Visa Expiry Report',
    description: 'Staff with visa or RTW expiry approaching.',
    icon: Globe,
    emptyMessage: 'No staff with visa expiry approaching — all clear!',
  },
  {
    id: 'missing-reference',
    title: 'Missing Reference Report',
    description: 'Staff with fewer than two submitted references.',
    icon: Users,
    emptyMessage: 'All staff have the required references — excellent!',
  },
  {
    id: 'training-compliance',
    title: 'Training Compliance Report',
    description: 'Pending training assignments and due dates.',
    icon: GraduationCap,
    emptyMessage: 'No pending training items — workforce is up to date!',
  },
  {
    id: 'supervision-overdue',
    title: 'Supervision Overdue Report',
    description: 'Staff without a supervision in the last 180 days.',
    icon: ClipboardList,
    emptyMessage: 'No overdue supervisions — keep up the good work!',
  },
  {
    id: 'appraisal-due',
    title: 'Appraisal Due Report',
    description: 'Staff without an appraisal in the last 12 months.',
    icon: Star,
    emptyMessage: 'No appraisals overdue — reviews are on track!',
  },
  {
    id: 'staff-turnover',
    title: 'Staff Turnover Report',
    description: 'Leavers and employment status changes.',
    icon: UserMinus,
    emptyMessage: 'No leavers recorded in this report period.',
  },
  {
    id: 'cqc-audit',
    title: 'CQC Audit Report',
    description: 'Organisation-wide compliance summary for audits.',
    icon: ShieldCheck,
    emptyMessage: 'No staff records to display.',
  },
] as const;

type ReportId = (typeof REPORTS)[number]['id'];

type PreviewRow = Record<string, string | number | null | undefined>;

type PreviewResponse = {
  count: number;
  rows: PreviewRow[];
};

type ColumnDef = {
  key: string;
  label: string;
  render?: (row: PreviewRow) => ReactNode;
};

const COLUMNS_BY_REPORT: Record<ReportId, ColumnDef[]> = {
  'dbs-renewal': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'dbsNumber', label: 'DBS Number' },
    { key: 'renewalDate', label: 'Renewal Date' },
    {
      key: 'daysUntilExpiry',
      label: 'Days Until Expiry',
      render: (row) => daysBadge(row.daysUntilExpiry),
    },
  ],
  'visa-expiry': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'visaType', label: 'Visa Type' },
    { key: 'visaOrBrpNumber', label: 'Visa/BRP Number' },
    { key: 'expiryDate', label: 'Expiry Date' },
    {
      key: 'daysUntilExpiry',
      label: 'Days Until Expiry',
      render: (row) => daysBadge(row.daysUntilExpiry),
    },
  ],
  'missing-reference': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'referencesReceived', label: 'References Received' },
    { key: 'referencesRequired', label: 'References Required' },
  ],
  'training-compliance': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'pendingTrainingItems', label: 'Pending Training Items' },
    { key: 'oldestDueDate', label: 'Oldest Due Date' },
  ],
  'supervision-overdue': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'lastSupervisionDate', label: 'Last Supervision Date' },
    {
      key: 'daysOverdue',
      label: 'Days Overdue',
      render: (row) => overdueBadge(row.daysOverdue),
    },
  ],
  'appraisal-due': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'lastAppraisalDate', label: 'Last Appraisal Date' },
    {
      key: 'daysOverdue',
      label: 'Days Overdue',
      render: (row) => overdueBadge(row.daysOverdue),
    },
  ],
  'staff-turnover': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'employmentStatus', label: 'Employment Status' },
    { key: 'statusChangedDate', label: 'Status Changed Date' },
  ],
  'cqc-audit': [
    { key: 'name', label: 'Name' },
    { key: 'lcacs', label: 'Staff Number' },
    { key: 'dbsStatus', label: 'DBS Status', render: (row) => complianceStatusBadge(row.dbsStatus) },
    { key: 'visaStatus', label: 'Visa Status', render: (row) => complianceStatusBadge(row.visaStatus) },
    { key: 'trainingStatus', label: 'Training Status', render: (row) => complianceStatusBadge(row.trainingStatus) },
    { key: 'referencesStatus', label: 'References Status', render: (row) => complianceStatusBadge(row.referencesStatus) },
    { key: 'overallCompliance', label: 'Overall Compliance', render: (row) => complianceStatusBadge(row.overallCompliance, true) },
  ],
};

function daysBadge(value: unknown) {
  if (value === null || value === undefined || value === '') return <Text size="sm">-</Text>;
  const days = Number(value);
  if (Number.isNaN(days)) return <Text size="sm">{String(value)}</Text>;
  const color = days < 0 ? 'red' : days < 30 ? 'red' : days < 60 ? 'yellow' : 'green';
  return (
    <Badge color={color} variant="light" size="sm">
      {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
    </Badge>
  );
}

function overdueBadge(value: unknown) {
  if (value === null || value === undefined || value === '') return <Text size="sm">-</Text>;
  const days = Number(value);
  if (Number.isNaN(days)) return <Text size="sm">{String(value)}</Text>;
  const color = days > 90 ? 'red' : days > 30 ? 'yellow' : 'green';
  return (
    <Badge color={color} variant="light" size="sm">
      {days} days
    </Badge>
  );
}

function complianceStatusBadge(value: unknown, isOverall = false) {
  const text = String(value ?? '-');
  const lower = text.toLowerCase();
  let color = 'gray';
  if (lower.includes('non-compliant') || lower.includes('non compliant')) color = 'red';
  else if (lower.includes('compliant')) color = 'green';
  else if (lower.includes('amber') || lower.includes('pending')) color = 'yellow';
  return (
    <Badge color={color} variant="light" size={isOverall ? 'md' : 'sm'}>
      {text}
    </Badge>
  );
}

function formatDateDisplay(value: string) {
  if (!value || value === '-') return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB');
}

function cellValue(row: PreviewRow, key: string) {
  const v = row[key];
  if (v === null || v === undefined) return '-';
  if (key.toLowerCase().includes('date') && typeof v === 'string') return formatDateDisplay(v);
  return String(v);
}

export function HrReportsPage() {
  const token = localStorage.getItem('token');
  const isMobile = useMediaQuery('(max-width: 62em)');
  const [selectedId, setSelectedId] = useState<ReportId>('dbs-renewal');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [counts, setCounts] = useState<Partial<Record<ReportId, number>>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const selectedReport = useMemo(
    () => REPORTS.find((r) => r.id === selectedId) ?? REPORTS[0],
    [selectedId],
  );

  const fetchPreview = useCallback(
    async (reportId: ReportId, updateCounts = true) => {
      setLoadingPreview(true);
      try {
        const res = await axios.get<PreviewResponse>(`/api/v1/reports/hr/${reportId}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPreview(res.data);
        if (updateCounts) {
          setCounts((prev) => ({ ...prev, [reportId]: res.data.count }));
        }
      } catch (e) {
        console.error('Preview fetch failed', e);
        setPreview({ count: 0, rows: [] });
      } finally {
        setLoadingPreview(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const stored = localStorage.getItem(LAST_GENERATED_KEY);
    if (stored) setLastGenerated(stored);
  }, []);

  useEffect(() => {
    fetchPreview(selectedId, true);
  }, [selectedId, fetchPreview]);

  useEffect(() => {
    const loadCounts = async () => {
      await Promise.all(
        REPORTS.map(async (report) => {
          if (counts[report.id] !== undefined) return;
          try {
            const res = await axios.get<PreviewResponse>(`/api/v1/reports/hr/${report.id}/preview`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            setCounts((prev) => ({ ...prev, [report.id]: res.data.count }));
          } catch {
            setCounts((prev) => ({ ...prev, [report.id]: 0 }));
          }
        }),
      );
    };
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const downloadReport = async () => {
    setLoadingPdf(true);
    try {
      const res = await axios.get(`/api/v1/reports/hr/${selectedId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      const label = new Date().toLocaleDateString('en-GB');
      localStorage.setItem(LAST_GENERATED_KEY, label);
      setLastGenerated(label);
    } catch (e) {
      console.error('Report download failed', e);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const columns = COLUMNS_BY_REPORT[selectedId];

  const reportSelector = (
    <Stack gap={6}>
      {REPORTS.map((report) => {
        const Icon = report.icon;
        const active = selectedId === report.id;
        const count = counts[report.id];
        return (
          <UnstyledButton
            key={report.id}
            onClick={() => setSelectedId(report.id)}
            style={{
              display: 'block',
              width: '100%',
              borderRadius: 12,
              padding: '12px 14px',
              backgroundColor: active ? BRAND_GREEN : 'transparent',
              border: active ? `1px solid ${BRAND_GREEN}` : '1px solid #E5E7EB',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <ThemeIcon
                size={36}
                radius="md"
                variant={active ? 'white' : 'light'}
                color={active ? 'green' : 'gray'}
                style={active ? { color: BRAND_GREEN, backgroundColor: '#fff' } : undefined}
              >
                <Icon size={18} />
              </ThemeIcon>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Group gap={6} wrap="nowrap">
                  <Text fw={700} size="sm" c={active ? 'white' : 'dark.7'} lineClamp={1}>
                    {report.title}
                  </Text>
                  {count !== undefined && (
                    <Badge
                      size="xs"
                      variant={active ? 'white' : 'light'}
                      color={active ? 'green' : count > 0 ? 'orange' : 'gray'}
                      style={active ? { color: BRAND_GREEN } : undefined}
                    >
                      {count}
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c={active ? 'rgba(255,255,255,0.9)' : 'dimmed'} lineClamp={2} mt={2}>
                  {report.description}
                </Text>
              </Box>
            </Group>
          </UnstyledButton>
        );
      })}
    </Stack>
  );

  return (
    <Box p="md">
      <Container size="xl" p={0}>
        <Group gap="xs" mb={4}>
          <ThemeIcon variant="light" color="brandGreen.6" size="md" radius="md">
            <FileText size={16} />
          </ThemeIcon>
          <Text fw={700} c="brandGreen.6" tt="uppercase" size="xs">
            HR Compliance
          </Text>
        </Group>
        <Title order={1} size={30} fw={900} mb={4}>
          HR Compliance Reports
        </Title>
        <Text c="dimmed" size="sm" mb="sm" maw={720}>
          Select a report to preview data and generate PDF
        </Text>
        <Group gap="md" mb="xl">
          <Badge variant="light" color="brandGreen.6" size="lg" radius="sm">
            8 report types
          </Badge>
          <Text size="sm" c="dimmed">
            Last generated: {lastGenerated || '—'}
          </Text>
        </Group>

        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '280px 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {isMobile ? (
            <ScrollArea type="scroll" scrollbarSize={6}>
              <Group gap="xs" wrap="nowrap" pb={4}>
                {REPORTS.map((report) => {
                  const Icon = report.icon;
                  const active = selectedId === report.id;
                  const count = counts[report.id];
                  return (
                    <UnstyledButton
                      key={report.id}
                      onClick={() => setSelectedId(report.id)}
                      style={{
                        flexShrink: 0,
                        borderRadius: 12,
                        padding: '10px 14px',
                        backgroundColor: active ? BRAND_GREEN : '#fff',
                        border: `1px solid ${active ? BRAND_GREEN : '#E5E7EB'}`,
                      }}
                    >
                      <Group gap={8} wrap="nowrap">
                        <Icon size={16} color={active ? '#fff' : BRAND_GREEN} />
                        <Text size="xs" fw={700} c={active ? 'white' : 'dark.7'}>
                          {report.title.replace(' Report', '')}
                        </Text>
                        {count !== undefined && (
                          <Badge size="xs" color={active ? 'white' : 'orange'} variant="light">
                            {count}
                          </Badge>
                        )}
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Group>
            </ScrollArea>
          ) : (
            <Paper p="sm" radius="lg" withBorder shadow="xs" style={{ position: 'sticky', top: 16 }}>
              {reportSelector}
            </Paper>
          )}

          <Paper p="lg" radius="lg" withBorder shadow="sm" bg="white">
            <Group justify="space-between" align="flex-start" mb="md" wrap="wrap" gap="sm">
              <Box style={{ flex: 1, minWidth: 200 }}>
                <Group gap="xs" mb={4}>
                  <ThemeIcon variant="light" color="brandGreen.6" size="lg" radius="md">
                    <selectedReport.icon size={20} />
                  </ThemeIcon>
                  <Title order={3} size={20} fw={800}>
                    {selectedReport.title}
                  </Title>
                  {preview && (
                    <Badge color={preview.count > 0 ? 'orange' : 'green'} variant="light" size="lg">
                      {preview.count} staff
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  {selectedReport.description}
                </Text>
              </Box>
              <Button
                leftSection={!loadingPdf ? <FileDown size={16} /> : undefined}
                radius="xl"
                loading={loadingPdf}
                styles={{
                  root: {
                    backgroundColor: '#000000',
                    color: '#ffffff',
                  },
                }}
                onClick={downloadReport}
              >
                Generate PDF
              </Button>
            </Group>

            {loadingPreview ? (
              <Stack align="center" py={60} gap="md">
                <Loader color="brandGreen.6" />
                <Text c="dimmed" size="sm">
                  Loading report preview…
                </Text>
              </Stack>
            ) : !preview || preview.count === 0 ? (
              <Stack align="center" py={60} gap="md">
                <ThemeIcon size={64} radius="xl" variant="light" color="brandGreen.6">
                  {preview?.count === 0 ? <CheckCircle2 size={32} /> : <Inbox size={32} />}
                </ThemeIcon>
                <Text fw={600} size="lg" ta="center">
                  {selectedReport.emptyMessage}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  0 staff members found
                </Text>
              </Stack>
            ) : (
              <>
                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        {columns.map((col) => (
                          <Table.Th key={col.key}>{col.label}</Table.Th>
                        ))}
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {preview.rows.map((row, idx) => (
                        <Table.Tr key={`${row.userId ?? idx}-${idx}`}>
                          {columns.map((col) => (
                            <Table.Td key={col.key}>
                              {col.render ? col.render(row) : cellValue(row, col.key)}
                            </Table.Td>
                          ))}
                          <Table.Td>
                            {row.userId ? (
                              <Text
                                component="a"
                                href={`/dashboard/staff/${row.userId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                fw={600}
                                c="brandBlue.6"
                                style={{ textDecoration: 'none' }}
                              >
                                View Profile
                              </Text>
                            ) : (
                              '-'
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                <Text size="sm" c="dimmed" mt="md" fw={600}>
                  {preview.count} staff member{preview.count === 1 ? '' : 's'} found
                </Text>
              </>
            )}
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
