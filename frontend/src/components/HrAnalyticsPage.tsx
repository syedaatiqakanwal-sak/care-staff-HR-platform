import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  UserCheck,
  UserCog,
  UserPlus,
  Shield,
  ShieldAlert,
  Plane,
  GraduationCap,
  ClipboardList,
  Star,
  Inbox,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BRAND_GREEN = '#139639';

type PeriodKey = 'week' | 'month' | 'year';

type HrStats = {
  totalActive: number;
  newStarters: number;
  staffOnShadow: number;
  dbsDeclarationDue: number;
  visaExpiringSoon: number;
  trainingDue: number;
  supervisionsDue: number;
  appraisalsDue: number;
  staffCompliancePercentage: number;
  totalUsers: number;
};

type StaffAnalyticsRow = {
  userId: string;
  name: string;
  lcacs: string;
  employmentStatus: string;
  startDate: string | null;
  dbsStatus: string;
  dbsCompliant: boolean;
  visaExpiryDate: string | null;
  visaCompliant: boolean;
  trainingStatus: string;
  trainingCompliant: boolean;
  referencesCompliant: boolean;
  policiesCompliant: boolean;
  lastSupervision: string | null;
  lastAppraisal: string | null;
  complianceStatus: 'green' | 'amber' | 'red';
};

type EmploymentSlice = {
  status: string;
  label: string;
  count: number;
  color: string;
};

type ComplianceCategory = {
  label: string;
  compliant: number;
  nonCompliant: number;
};

type StarterPoint = {
  month: string;
  label: string;
  count: number;
};

type AnalyticsPayload = {
  staff: StaffAnalyticsRow[];
  period: PeriodKey;
  employmentStatusBreakdown: EmploymentSlice[];
  complianceBreakdown: ComplianceCategory[];
  newStartersOverTime: StarterPoint[];
  overallCompliance: {
    percentage: number;
    fullyCompliant: number;
    totalStaff: number;
  };
};

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

type StatCardConfig = {
  label: string;
  value: string | number;
  accent: string;
  icon: typeof Users;
  tone: 'positive' | 'warning' | 'critical' | 'neutral';
  trend?: 'up' | 'down' | 'neutral';
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
}

function complianceLabel(status: 'green' | 'amber' | 'red') {
  if (status === 'green') return 'Compliant';
  if (status === 'amber') return 'Partially Compliant';
  return 'Non-Compliant';
}

function complianceColor(status: 'green' | 'amber' | 'red') {
  if (status === 'green') return 'green';
  if (status === 'amber') return 'yellow';
  return 'red';
}

function statusBadge(value: string, compliant?: boolean) {
  const lower = value.toLowerCase();
  let color = 'gray';
  if (compliant === true || lower.includes('compliant')) color = 'green';
  else if (compliant === false || lower.includes('due') || lower.includes('expired')) color = 'red';
  else if (lower.includes('partial')) color = 'yellow';
  return (
    <Badge color={color} variant="light" size="sm">
      {value}
    </Badge>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function DonutChart({ slices, total }: { slices: EmploymentSlice[]; total: number }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 88;
  const innerR = 58;
  let angle = 0;

  const arcs = slices
    .filter((s) => s.count > 0)
    .map((slice) => {
      const portion = total > 0 ? (slice.count / total) * 360 : 0;
      const start = angle;
      const end = angle + portion;
      angle = end;
      return { ...slice, start, end, portion };
    });

  return (
    <Group align="center" gap="lg" wrap="nowrap">
      <Box style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={outerR} fill="#f1f3f5" />
          {arcs.map((arc) =>
            arc.portion > 0 ? (
              <path
                key={arc.status}
                d={describeArc(cx, cy, outerR, arc.start, arc.end - 0.2)}
                fill={arc.color}
                stroke="#fff"
                strokeWidth={2}
              />
            ) : null,
          )}
          <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
        </svg>
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Text fw={900} size="xl" c="dark.8" lh={1}>
            {total}
          </Text>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            Total Staff
          </Text>
        </Box>
      </Box>
      <Stack gap={8}>
        {slices.map((item) => (
          <Group key={item.status} gap={8} wrap="nowrap">
            <Box w={10} h={10} style={{ borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <Text size="sm">
              {item.label}: <b>{item.count}</b>
            </Text>
          </Group>
        ))}
      </Stack>
    </Group>
  );
}

function ComplianceBarChart({ data, totalStaff }: { data: ComplianceCategory[]; totalStaff: number }) {
  const maxTotal = Math.max(1, totalStaff);
  return (
    <Stack gap="md">
      {data.map((row) => {
        const total = row.compliant + row.nonCompliant || 1;
        const compliantPct = (row.compliant / maxTotal) * 100;
        const nonCompliantPct = (row.nonCompliant / maxTotal) * 100;
        return (
          <Box key={row.label}>
            <Group justify="space-between" mb={6}>
              <Text size="sm" fw={700}>
                {row.label}
              </Text>
              <Text size="xs" c="dimmed">
                <Text span c="green.7" fw={700}>
                  {row.compliant} compliant
                </Text>
                {' · '}
                <Text span c="red.7" fw={700}>
                  {row.nonCompliant} non-compliant
                </Text>
              </Text>
            </Group>
            <Box
              style={{
                display: 'flex',
                height: 22,
                borderRadius: 999,
                overflow: 'hidden',
                background: '#f1f3f5',
              }}
            >
              {row.compliant > 0 && (
                <Box
                  style={{
                    width: `${compliantPct}%`,
                    background: BRAND_GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 6,
                    minWidth: row.compliant > 0 ? 28 : 0,
                  }}
                >
                  {compliantPct > 12 && (
                    <Text size="xs" c="white" fw={700}>
                      {row.compliant}
                    </Text>
                  )}
                </Box>
              )}
              {row.nonCompliant > 0 && (
                <Box
                  style={{
                    width: `${nonCompliantPct}%`,
                    background: '#e03131',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 6,
                    minWidth: row.nonCompliant > 0 ? 28 : 0,
                  }}
                >
                  {nonCompliantPct > 12 && (
                    <Text size="xs" c="white" fw={700}>
                      {row.nonCompliant}
                    </Text>
                  )}
                </Box>
              )}
            </Box>
            <Text size="xs" c="dimmed" mt={4}>
              {Math.round((row.compliant / total) * 100)}% compliant in {row.label}
            </Text>
          </Box>
        );
      })}
    </Stack>
  );
}

function StartersAreaChart({ series }: { series: StarterPoint[] }) {
  const width = 720;
  const height = 260;
  const padX = 48;
  const padY = 32;
  const max = Math.max(1, ...series.map((p) => p.count));
  const stepX = series.length > 1 ? (width - padX * 2) / (series.length - 1) : 0;

  const points = series.map((p, i) => {
    const x = padX + i * stepX;
    const y = height - padY - (p.count / max) * (height - padY * 2);
    return { ...p, x, y };
  });

  const linePath = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = points.length
    ? `M ${points[0].x} ${height - padY} L ${points.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${height - padY} Z`
    : '';

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="New starters over time">
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = height - padY - tick * (height - padY * 2);
        const val = Math.round(max * tick);
        return (
          <g key={tick}>
            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#e9ecef" strokeWidth={1} />
            <text x={8} y={y + 4} fontSize={10} fill="#868e96">
              {val}
            </text>
          </g>
        );
      })}
      {areaPath && <path d={areaPath} fill="rgba(19, 150, 57, 0.2)" />}
      {linePath && (
        <polyline fill="none" stroke={BRAND_GREEN} strokeWidth={3} points={linePath} strokeLinejoin="round" />
      )}
      {points.map((p) => (
        <g key={p.month}>
          <circle cx={p.x} cy={p.y} r={5} fill={BRAND_GREEN} stroke="#fff" strokeWidth={2} />
          <text x={p.x} y={height - 8} textAnchor="middle" fontSize={10} fill="#495057">
            {p.label}
          </text>
          {p.count > 0 && (
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="#139639" fontWeight="bold">
              {p.count}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function HrAnalyticsPage() {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [hrStats, setHrStats] = useState<HrStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        axios.get('/api/v1/dashboard/hr-stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/v1/dashboard/analytics-data', {
          headers: { Authorization: `Bearer ${token}` },
          params: { period },
        }),
      ]);
      setHrStats(statsRes.data);
      setAnalytics(analyticsRes.data as AnalyticsPayload);
    } catch (error) {
      console.error('Failed to load analytics data', error);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const staffRows = analytics?.staff ?? [];

  const searchedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staffRows;
    return staffRows.filter((row) => `${row.name} ${row.lcacs}`.toLowerCase().includes(q));
  }, [staffRows, search]);

  const sortedRows = useMemo(() => {
    const copy = [...searchedRows];
    copy.sort((a, b) => {
      const v = a.name.localeCompare(b.name);
      return sortAsc ? v : -v;
    });
    return copy;
  }, [searchedRows, sortAsc]);

  const employmentSlices = analytics?.employmentStatusBreakdown ?? [];
  const employmentTotal = employmentSlices.reduce((sum, s) => sum + s.count, 0);

  const overallPct = analytics?.overallCompliance?.percentage ?? hrStats?.staffCompliancePercentage ?? 0;
  const fullyCompliant = analytics?.overallCompliance?.fullyCompliant ?? 0;
  const totalStaff = analytics?.overallCompliance?.totalStaff ?? hrStats?.totalUsers ?? 0;
  const overallColor = overallPct < 50 ? 'red' : overallPct <= 75 ? 'yellow' : 'green';

  const statCards: StatCardConfig[] = [
    { label: 'Total Staff', value: hrStats?.totalUsers ?? 0, accent: BRAND_GREEN, icon: Users, tone: 'positive', trend: 'neutral' },
    { label: 'Active Staff', value: hrStats?.totalActive ?? 0, accent: BRAND_GREEN, icon: UserCheck, tone: 'positive', trend: 'up' },
    { label: 'On Shadow', value: hrStats?.staffOnShadow ?? 0, accent: '#267FBA', icon: UserCog, tone: 'neutral', trend: 'neutral' },
    { label: 'New Starters (90d)', value: hrStats?.newStarters ?? 0, accent: '#267FBA', icon: UserPlus, tone: 'positive', trend: 'up' },
    { label: 'Overall Compliance %', value: `${overallPct}%`, accent: overallColor === 'green' ? BRAND_GREEN : overallColor === 'yellow' ? '#F59F00' : '#E03131', icon: Shield, tone: overallColor === 'green' ? 'positive' : overallColor === 'yellow' ? 'warning' : 'critical', trend: overallPct >= 50 ? 'up' : 'down' },
    { label: 'DBS Declaration Due', value: hrStats?.dbsDeclarationDue ?? 0, accent: '#F59F00', icon: ShieldAlert, tone: 'warning', trend: 'down' },
    { label: 'Visa Expiring', value: hrStats?.visaExpiringSoon ?? 0, accent: '#F59F00', icon: Plane, tone: 'warning', trend: 'down' },
    { label: 'Training Due', value: hrStats?.trainingDue ?? 0, accent: '#E03131', icon: GraduationCap, tone: 'critical', trend: 'down' },
    { label: 'Supervisions Due', value: hrStats?.supervisionsDue ?? 0, accent: '#F59F00', icon: ClipboardList, tone: 'warning', trend: 'down' },
    { label: 'Appraisals Due', value: hrStats?.appraisalsDue ?? 0, accent: '#F59F00', icon: Star, tone: 'warning', trend: 'down' },
  ];

  const exportCsv = () => {
    const headers = [
      'Name',
      'Staff Number',
      'Employment Status',
      'DBS Status',
      'Visa Expiry',
      'Training Status',
      'Last Supervision',
      'Last Appraisal',
      'Compliance Status',
    ];
    const rows = sortedRows.map((row) => [
      row.name,
      row.lcacs,
      row.employmentStatus,
      row.dbsStatus,
      formatDate(row.visaExpiryDate),
      row.trainingStatus,
      formatDate(row.lastSupervision),
      formatDate(row.lastAppraisal),
      complianceLabel(row.complianceStatus),
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box p="md">
      <Container size="xl" p={0}>
        <Group justify="space-between" mb="lg" align="flex-end" wrap="wrap">
          <Box>
            <Group gap="xs" mb={4}>
              <TrendingUp size={16} color={BRAND_GREEN} />
              <Text fw={700} c="brandGreen.6" tt="uppercase" size="xs">
                HR Analytics
              </Text>
            </Group>
            <Title order={1} size={30} fw={900} c="dark.8">
              Analytics
            </Title>
            <Text c="dimmed" size="sm">
              Workforce analytics and compliance insight view.
            </Text>
          </Box>

          <Group gap="xs">
            {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
              <Button
                key={key}
                variant={period === key ? 'filled' : 'light'}
                color={period === key ? 'brandGreen.6' : 'gray'}
                radius="xl"
                onClick={() => setPeriod(key)}
              >
                {PERIOD_LABELS[key]}
              </Button>
            ))}
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm" mb="md">
          {statCards.map((card) => {
            const Icon = card.icon;
            const TrendIcon = card.trend === 'down' ? TrendingDown : TrendingUp;
            return (
              <Paper
                key={card.label}
                p="md"
                radius="lg"
                withBorder
                style={{ borderLeft: `4px solid ${card.accent}`, overflow: 'hidden' }}
              >
                <Group justify="space-between" align="flex-start" mb={6} wrap="nowrap">
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lineClamp={2} style={{ flex: 1 }}>
                    {card.label}
                  </Text>
                  <ThemeIcon size="sm" variant="light" color={card.tone === 'critical' ? 'red' : card.tone === 'warning' ? 'yellow' : 'green'} radius="md">
                    <Icon size={14} />
                  </ThemeIcon>
                </Group>
                <Group align="flex-end" gap={6} wrap="nowrap">
                  <Title order={3} size={26} fw={900} c="dark.8" lh={1}>
                    {loading ? '—' : String(card.value)}
                  </Title>
                  {card.trend !== 'neutral' && !loading && (
                    <TrendIcon
                      size={16}
                      color={card.trend === 'up' && card.tone === 'positive' ? BRAND_GREEN : card.tone === 'critical' || card.tone === 'warning' ? '#E03131' : '#868e96'}
                    />
                  )}
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>

        <Paper
          p="lg"
          radius="lg"
          mb="md"
          withBorder
          style={{
            background: `linear-gradient(135deg, rgba(19, 150, 57, 0.08) 0%, #ffffff 60%)`,
            borderColor: 'rgba(19, 150, 57, 0.25)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4}>
                Overall Compliance
              </Text>
              <Group align="flex-end" gap="sm">
                <Title order={1} size={42} fw={900} c={`${overallColor}.7`}>
                  {loading ? '—' : `${overallPct}%`}
                </Title>
                <Text size="sm" c="dimmed" mb={8}>
                  {loading
                    ? 'Loading…'
                    : `${fullyCompliant} of ${totalStaff} staff fully compliant`}
                </Text>
              </Group>
            </Box>
            <Box style={{ flex: 1, minWidth: 200, maxWidth: 480 }}>
              <Progress
                value={loading ? 0 : overallPct}
                color={overallColor}
                size="xl"
                radius="xl"
                striped={!loading && overallPct < 75}
                animated={!loading && overallPct < 50}
              />
            </Box>
          </Group>
        </Paper>

        {loading ? (
          <Stack align="center" py={80}>
            <Loader color="brandGreen.6" size="lg" />
            <Text c="dimmed" size="sm">
              Loading analytics…
            </Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md" mb="md">
            <Paper p="md" radius="lg" withBorder shadow="xs">
              <Text fw={800} mb="md">
                Staff by Employment Status
              </Text>
              {employmentTotal > 0 ? (
                <DonutChart slices={employmentSlices} total={employmentTotal} />
              ) : (
                <Text c="dimmed" size="sm">
                  No staff data available.
                </Text>
              )}
            </Paper>

            <Paper p="md" radius="lg" withBorder shadow="xs">
              <Text fw={800} mb="md">
                Compliance Breakdown
              </Text>
              <ComplianceBarChart
                data={analytics?.complianceBreakdown ?? []}
                totalStaff={totalStaff}
              />
            </Paper>

            <Paper p="md" radius="lg" withBorder shadow="xs">
              <Text fw={800} mb="sm">
                New Starters Over Time
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                {PERIOD_LABELS[period]} — by start date
              </Text>
              {(analytics?.newStartersOverTime?.length ?? 0) > 0 ? (
                <StartersAreaChart series={analytics?.newStartersOverTime ?? []} />
              ) : (
                <Text c="dimmed" size="sm" py="xl" ta="center">
                  No new starters in this period.
                </Text>
              )}
            </Paper>
          </SimpleGrid>
        )}

        <Paper p="md" radius="lg" withBorder shadow="xs">
          <Group justify="space-between" mb="sm" align="flex-end" wrap="wrap">
            <Box>
              <Text fw={800} size="lg">
                Staff Analytics Table
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                Showing {sortedRows.length} staff member{sortedRows.length === 1 ? '' : 's'}
                {` · ${PERIOD_LABELS[period]}`}
              </Text>
            </Box>
            <Group>
              <TextInput
                leftSection={<Search size={14} />}
                placeholder="Search by name or staff number"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
              <Button variant="light" color="gray" onClick={() => setSortAsc((v) => !v)}>
                Sort Name {sortAsc ? 'A-Z' : 'Z-A'}
              </Button>
              <Button
                variant="outline"
                color="brandGreen.6"
                leftSection={<Download size={14} />}
                onClick={exportCsv}
              >
                Export CSV
              </Button>
            </Group>
          </Group>

          {sortedRows.length === 0 ? (
            <Stack align="center" py={48} gap="md">
              <ThemeIcon size={56} radius="xl" variant="light" color="brandGreen.6">
                <Inbox size={28} />
              </ThemeIcon>
              <Text fw={600} size="lg">
                0 rows — no staff found
              </Text>
              <Text size="sm" c="dimmed" ta="center" maw={400}>
                No staff with a start date in {PERIOD_LABELS[period].toLowerCase()}. Try a wider time
                period or clear your search.
              </Text>
            </Stack>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Staff Number</Table.Th>
                    <Table.Th>Employment Status</Table.Th>
                    <Table.Th>DBS Status</Table.Th>
                    <Table.Th>Visa Expiry</Table.Th>
                    <Table.Th>Training Status</Table.Th>
                    <Table.Th>Last Supervision</Table.Th>
                    <Table.Th>Last Appraisal</Table.Th>
                    <Table.Th>Compliance Status</Table.Th>
                    <Table.Th>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedRows.map((row) => (
                    <Table.Tr key={row.userId}>
                      <Table.Td fw={600}>{row.name}</Table.Td>
                      <Table.Td>{row.lcacs}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray" size="sm">
                          {row.employmentStatus.replace(/_/g, ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{statusBadge(row.dbsStatus, row.dbsCompliant)}</Table.Td>
                      <Table.Td>
                        {row.visaExpiryDate ? (
                          statusBadge(formatDate(row.visaExpiryDate), row.visaCompliant)
                        ) : (
                          statusBadge('N/A', true)
                        )}
                      </Table.Td>
                      <Table.Td>{statusBadge(row.trainingStatus, row.trainingCompliant)}</Table.Td>
                      <Table.Td>{formatDate(row.lastSupervision)}</Table.Td>
                      <Table.Td>{formatDate(row.lastAppraisal)}</Table.Td>
                      <Table.Td>
                        <Badge color={complianceColor(row.complianceStatus)} variant="light" size="sm">
                          {complianceLabel(row.complianceStatus)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="xs"
                          variant="outline"
                          color="brandGreen.6"
                          onClick={() => navigate(`/dashboard/staff/${row.userId}`)}
                        >
                          View
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
