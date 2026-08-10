import {
    Box,
    Title,
    Text,
    SimpleGrid,
    Paper,
    Group,
    Stack,
    Container,
    ThemeIcon,
    UnstyledButton,
    Button,
    RingProgress,
    Modal,
    Select,
    TextInput,
    Textarea,
} from '@mantine/core';
import {
    Users,
    UserCheck,
    FileBarChart,
    Shield,
    Plane,
    GraduationCap,
    Eye,
    Star,
    Calendar,
    ClipboardList,
    UserPlus,
    Upload,
    Mail,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { DocumentUploadForm } from './documents/DocumentUploadForm';

const BRAND_GREEN = '#139639';
const BRAND_BLUE = '#267FBA';

type HrStats = {
    totalActive: number;
    newStarters: number;
    staffOnShadow: number;
    dbsExpiringSoon: number;
    dbsDeclarationDue: number;
    shareCodeExpiring: number;
    visaExpiringSoon: number;
    trainingDue: number;
    reviewsDue: number;
    supervisionsDue: number;
    appraisalsDue: number;
    staffCompliancePercentage: number;
};

type MetricTile = {
    key: string;
    label: string;
    field: keyof HrStats;
    filter: string;
    icon: typeof Users;
    gradient: string;
    shadow: string;
};

const METRIC_TILES: MetricTile[] = [
    { key: 'active', label: 'Total Active', field: 'totalActive', filter: 'active', icon: UserCheck, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, #0e7a2d 100%)`, shadow: 'rgba(19, 150, 57, 0.28)' },
    { key: 'new', label: 'New Starters', field: 'newStarters', filter: 'new_starters', icon: Star, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1a5f8a 100%)`, shadow: 'rgba(38, 127, 186, 0.28)' },
    { key: 'shadow', label: 'On Shadow', field: 'staffOnShadow', filter: 'on_shadow', icon: Eye, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, ${BRAND_BLUE} 100%)`, shadow: 'rgba(19, 150, 57, 0.22)' },
    { key: 'dbs', label: 'DBS Expiring', field: 'dbsExpiringSoon', filter: 'dbs_expiring', icon: Shield, gradient: `linear-gradient(145deg, #0e7a2d 0%, ${BRAND_GREEN} 100%)`, shadow: 'rgba(19, 150, 57, 0.28)' },
    { key: 'dbs-declaration', label: 'DBS Declaration Due', field: 'dbsDeclarationDue', filter: 'dbs_declaration_due', icon: Shield, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1d6a9e 100%)`, shadow: 'rgba(38, 127, 186, 0.28)' },
    { key: 'share-code', label: 'Share Code Expiring', field: 'shareCodeExpiring', filter: 'share_code_expiring', icon: Shield, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, #0a5c24 100%)`, shadow: 'rgba(19, 150, 57, 0.25)' },
    { key: 'visa', label: 'Visa Expiring', field: 'visaExpiringSoon', filter: 'visa_expiring', icon: Plane, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #133d72 100%)`, shadow: 'rgba(38, 127, 186, 0.28)' },
    { key: 'training', label: 'Training Due', field: 'trainingDue', filter: 'training_due', icon: GraduationCap, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1a5f8a 100%)`, shadow: 'rgba(38, 127, 186, 0.28)' },
    { key: 'reviews', label: 'Reviews Due', field: 'reviewsDue', filter: 'reviews_due', icon: ClipboardList, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, #0a5c24 100%)`, shadow: 'rgba(19, 150, 57, 0.25)' },
    { key: 'supervisions', label: 'Supervisions Due', field: 'supervisionsDue', filter: 'supervisions_due', icon: Users, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, ${BRAND_BLUE} 100%)`, shadow: 'rgba(38, 127, 186, 0.22)' },
    { key: 'appraisals', label: 'Appraisals Due', field: 'appraisalsDue', filter: 'appraisals_due', icon: Calendar, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #0e7a2d 100%)`, shadow: 'rgba(19, 150, 57, 0.22)' },
];

const QUICK_ACTIONS = [
    { key: 'add-employee', label: 'Add New Employee', icon: UserPlus, to: '/dashboard/staff?add=1' },
    { key: 'upload-document', label: 'Upload Document', icon: Upload },
    { key: 'schedule-review', label: 'Schedule Review', icon: ClipboardList },
    { key: 'schedule-supervision', label: 'Schedule Supervision', icon: Users },
    { key: 'schedule-appraisal', label: 'Schedule Appraisal', icon: Calendar },
    { key: 'send-reference', label: 'Send Reference Request', icon: Mail },
    { key: 'create-appraisal', label: 'Create Appraisal', icon: ClipboardList },
    { key: 'compliance-report', label: 'Generate Compliance Report', icon: FileBarChart },
];

type StaffOption = {
    value: string;
    label: string;
};

export const DashboardView = () => {
    const [data, setData] = useState<HrStats>({
        totalActive: 0,
        newStarters: 0,
        staffOnShadow: 0,
        dbsExpiringSoon: 0,
        dbsDeclarationDue: 0,
        shareCodeExpiring: 0,
        visaExpiringSoon: 0,
        trainingDue: 0,
        reviewsDue: 0,
        supervisionsDue: 0,
        appraisalsDue: 0,
        staffCompliancePercentage: 0,
    });
    const [loading, setLoading] = useState(true);
    const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleType, setScheduleType] = useState<'review' | 'supervision' | 'appraisal'>('review');
    const [scheduleSubType, setScheduleSubType] = useState('');
    const [scheduleStaffId, setScheduleStaffId] = useState<string | null>(null);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleNotes, setScheduleNotes] = useState('');
    const [submittingSchedule, setSubmittingSchedule] = useState(false);

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadStaffId, setUploadStaffId] = useState<string | null>(null);

    const [referenceModalOpen, setReferenceModalOpen] = useState(false);
    const [referenceStaffId, setReferenceStaffId] = useState<string | null>(null);

    const [complianceModalOpen, setComplianceModalOpen] = useState(false);
    const [complianceMode, setComplianceMode] = useState<'organisation' | 'staff'>('organisation');
    const [complianceStaffId, setComplianceStaffId] = useState<string | null>(null);
    const [generatingCompliance, setGeneratingCompliance] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await axios.get('/api/v1/dashboard/hr-stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setData(response.data);
            } catch (error: unknown) {
                console.error('Failed to fetch HR dashboard stats', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [token]);

    const loadStaffOptions = async () => {
        if (staffOptions.length > 0 || staffLoading) return;
        setStaffLoading(true);
        try {
            const response = await axios.get('/api/v1/staff', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const options: StaffOption[] = (response.data || [])
                .map((p: { user?: { id?: string }; firstName?: string; lastName?: string; ilccsNumber?: string; lcaNumber?: string }) => {
                    const userId = p.user?.id;
                    if (!userId) return null;
                    const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.firstName || 'Staff';
                    const lcacs = p.lcaNumber || p.ilccsNumber || 'N/A';
                    return { value: userId, label: `${fullName} (${lcacs})` };
                })
                .filter(Boolean) as StaffOption[];
            setStaffOptions(options);
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load staff list', color: 'red' });
        } finally {
            setStaffLoading(false);
        }
    };

    const handleQuickAction = async (actionKey: string, to?: string) => {
        if (actionKey === 'add-employee') {
            navigate(to || '/dashboard/staff?add=1');
            return;
        }

        if (actionKey === 'schedule-review' || actionKey === 'schedule-supervision' || actionKey === 'schedule-appraisal' || actionKey === 'create-appraisal') {
            await loadStaffOptions();
            const nextType = actionKey.includes('supervision') ? 'supervision' : actionKey.includes('appraisal') ? 'appraisal' : 'review';
            setScheduleType(nextType);
            setScheduleSubType(
                nextType === 'review'
                    ? '2nd Month'
                    : nextType === 'appraisal'
                      ? '1st Year Appraisal'
                      : '1st Year 6th Month',
            );
            setScheduleStaffId(null);
            setScheduleDate('');
            setScheduleNotes('');
            setScheduleModalOpen(true);
            return;
        }

        if (actionKey === 'upload-document') {
            await loadStaffOptions();
            setUploadStaffId(null);
            setUploadModalOpen(true);
            return;
        }

        if (actionKey === 'send-reference') {
            await loadStaffOptions();
            setReferenceStaffId(null);
            setReferenceModalOpen(true);
            return;
        }

        if (actionKey === 'compliance-report') {
            await loadStaffOptions();
            setComplianceMode('organisation');
            setComplianceStaffId(null);
            setComplianceModalOpen(true);
            return;
        }
    };

    const submitSchedule = async () => {
        if (!scheduleStaffId || !scheduleDate || !scheduleSubType) {
            notifications.show({ title: 'Missing fields', message: 'Please select staff, type, and date', color: 'red' });
            return;
        }
        const selected = staffOptions.find((s) => s.value === scheduleStaffId);
        const staffName = selected?.label?.split(' (')[0] || 'Staff member';
        setSubmittingSchedule(true);
        try {
            await axios.post(
                `/api/v1/staff/${scheduleStaffId}/review-forms`,
                {
                    formType: scheduleType,
                    formSubType: scheduleSubType,
                    staffName,
                    dateOfReview: scheduleDate,
                    documentationComments: scheduleNotes || '',
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            notifications.show({ title: 'Saved', message: `${scheduleType} scheduled successfully`, color: 'green' });
            setScheduleModalOpen(false);
        } catch (error: unknown) {
            const msg = axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to save form' : 'Failed to save form';
            notifications.show({ title: 'Error', message: String(msg), color: 'red' });
        } finally {
            setSubmittingSchedule(false);
        }
    };

    const generateComplianceReport = async () => {
        if (complianceMode === 'staff' && !complianceStaffId) {
            notifications.show({ title: 'Missing staff', message: 'Select a staff member', color: 'red' });
            return;
        }
        setGeneratingCompliance(true);
        try {
            const url =
                complianceMode === 'organisation'
                    ? '/api/v1/reports/hr/compliance/organisation'
                    : `/api/v1/reports/hr/compliance/staff/${complianceStaffId}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const fileUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download =
                complianceMode === 'organisation'
                    ? 'compliance-organisation-report.pdf'
                    : `compliance-staff-${complianceStaffId}.pdf`;
            a.click();
            URL.revokeObjectURL(fileUrl);
            setComplianceModalOpen(false);
        } catch (error: unknown) {
            const msg = axios.isAxiosError(error) ? error.response?.data?.message || 'Failed to generate report' : 'Failed to generate report';
            notifications.show({ title: 'Error', message: String(msg), color: 'red' });
        } finally {
            setGeneratingCompliance(false);
        }
    };

    const complianceLabel =
        data.staffCompliancePercentage >= 85
            ? 'Good'
            : data.staffCompliancePercentage >= 60
              ? 'Fair'
              : 'Needs attention';

    return (
        <Box
            className="compliance-dashboard"
            style={{
                flex: 1,
                minHeight: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'fadeIn 0.5s ease-out',
            }}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .compliance-dashboard .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    grid-auto-rows: 1fr;
                    gap: 10px;
                    flex: 1.15;
                    min-height: 0;
                }
                .compliance-dashboard .lower-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    flex: 1;
                    min-height: 0;
                }
                .compliance-dashboard .metric-card {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .compliance-dashboard .mantine-Paper-root::before,
                .compliance-dashboard .mantine-Paper-root::after {
                    display: none;
                }
                .compliance-dashboard .quick-action-row:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(19, 150, 57, 0.12);
                }
                @media (max-width: 1200px) {
                    .compliance-dashboard .metrics-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                @media (max-width: 768px) {
                    .compliance-dashboard .metrics-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                    .compliance-dashboard .lower-row {
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
                <Group justify="space-between" align="center" mb={10} style={{ flexShrink: 0 }}>
                    <Box>
                        <Group align="center" gap="xs" mb={2}>
                            <ThemeIcon variant="light" size="sm" radius="md" color="brandBlue.6">
                                <Users size={14} />
                            </ThemeIcon>
                            <Text fw={700} c="brandBlue.6" tt="uppercase" size="xs" style={{ letterSpacing: '0.5px' }}>
                                HR Command Centre
                            </Text>
                        </Group>
                        <Title order={1} size={26} fw={900} c="dark.4" style={{ letterSpacing: '-0.4px', lineHeight: 1.15 }}>
                            Compliance Dashboard
                        </Title>
                    </Box>
                    <Button component={Link} to="/dashboard/reports" variant="light" color="brandBlue.6" leftSection={<FileBarChart size={16} />}>
                        All Reports
                    </Button>
                </Group>

                <Box className="metrics-grid" mb={12}>
                    {METRIC_TILES.map((tile) => {
                        const Icon = tile.icon;
                        const value = Number(data[tile.field] ?? 0);
                        return (
                            <UnstyledButton
                                key={tile.key}
                                onClick={() => navigate(`/dashboard/staff?filter=${tile.filter}`)}
                                style={{ width: '100%', height: '100%', minHeight: 0 }}
                            >
                                <Paper
                                    className="metric-card"
                                    p="sm"
                                    radius="lg"
                                    style={{
                                        background: tile.gradient,
                                        color: 'white',
                                        boxShadow: `0 8px 24px ${tile.shadow}`,
                                        transition: 'transform 0.15s ease',
                                        border: 'none',
                                    }}
                                >
                                    <Group justify="space-between" align="flex-start" mb={4} wrap="nowrap">
                                        <Text size="xs" fw={700} tt="uppercase" c="white" style={{ lineHeight: 1.25 }}>
                                            {tile.label}
                                        </Text>
                                        <ThemeIcon
                                            size={26}
                                            radius="md"
                                            color="white"
                                            variant="white"
                                            style={{
                                                color: BRAND_GREEN,
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Icon size={13} />
                                        </ThemeIcon>
                                    </Group>
                                    <Title order={2} size={24} fw={900} c="white" style={{ lineHeight: 1 }}>
                                        {loading ? '—' : value}
                                    </Title>
                                </Paper>
                            </UnstyledButton>
                        );
                    })}
                </Box>

                <Box className="lower-row">
                    <Paper
                        p="md"
                        radius="xl"
                        style={{
                            background: 'linear-gradient(145deg, #4AA3D8 0%, #267FBA 48%, #1a5f8a 100%)',
                            color: 'white',
                            boxShadow: '0 10px 32px rgba(38, 127, 186, 0.28)',
                            border: 'none',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <Group justify="space-between" align="center" w="100%" wrap="nowrap">
                            <Stack gap={4} style={{ minWidth: 0 }}>
                                <Text size="xs" fw={700} tt="uppercase" c="white" style={{ opacity: 0.9, letterSpacing: '0.06em' }}>
                                    Staff Compliance
                                </Text>
                                <Title order={2} size={28} fw={900} c="white">
                                    {complianceLabel}
                                </Title>
                                <Text size="xs" c="white" style={{ opacity: 0.9 }}>
                                    Weighted score (DBS, visa, training, references, policies)
                                </Text>
                            </Stack>
                            <RingProgress
                                size={96}
                                thickness={9}
                                roundCaps
                                sections={[{ value: data.staffCompliancePercentage, color: 'white' }]}
                                label={
                                    <Text c="white" fw={900} ta="center" size="md">
                                        {data.staffCompliancePercentage}%
                                    </Text>
                                }
                                rootColor="rgba(255, 255, 255, 0.22)"
                            />
                        </Group>
                    </Paper>

                    <Paper
                        p={0}
                        radius="xl"
                        style={{
                            background: '#ffffff',
                            border: '1px solid rgba(19, 150, 57, 0.22)',
                            boxShadow: '0 8px 24px rgba(19, 150, 57, 0.08)',
                            height: '100%',
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
                        <Box p="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <Group justify="space-between" align="center" mb="sm" style={{ flexShrink: 0 }}>
                                <Text fw={800} size="sm" c="dark.4">
                                    Quick Actions
                                </Text>
                                <Text size="xs" c="dimmed" fw={600}>
                                    8 shortcuts
                                </Text>
                            </Group>
                            <SimpleGrid cols={2} spacing={8} style={{ flex: 1, minHeight: 0, alignContent: 'stretch' }}>
                                {QUICK_ACTIONS.map((action) => {
                                    const IconComp = action.icon;
                                    return (
                                        <UnstyledButton
                                            key={action.key}
                                            className="quick-action-row"
                                            onClick={() => void handleQuickAction(action.key, action.to)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                width: '100%',
                                                height: '100%',
                                                minHeight: 40,
                                                padding: '8px 10px',
                                                borderRadius: 10,
                                                background:
                                                    action.key.includes('reference') || action.key.includes('compliance') || action.key.includes('upload')
                                                        ? 'rgba(38, 127, 186, 0.08)'
                                                        : 'rgba(19, 150, 57, 0.08)',
                                                border: '1px solid rgba(19, 150, 57, 0.1)',
                                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            }}
                                        >
                                            <ThemeIcon
                                                size={30}
                                                radius="md"
                                                style={{
                                                    background: `linear-gradient(135deg, ${BRAND_GREEN} 0%, ${BRAND_BLUE} 100%)`,
                                                    color: '#ffffff',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <IconComp size={14} color="#ffffff" />
                                            </ThemeIcon>
                                            <Text size="xs" fw={700} c="dark.4" style={{ lineHeight: 1.25, whiteSpace: 'normal' }}>
                                                {action.label}
                                            </Text>
                                        </UnstyledButton>
                                    );
                                })}
                            </SimpleGrid>
                        </Box>
                    </Paper>
                </Box>
            </Container>

            <Modal
                opened={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                title={`Schedule ${scheduleType.charAt(0).toUpperCase()}${scheduleType.slice(1)}`}
                centered
            >
                <Stack>
                    <Select
                        label="Staff member"
                        placeholder="Select staff"
                        data={staffOptions}
                        value={scheduleStaffId}
                        onChange={setScheduleStaffId}
                        searchable
                        disabled={staffLoading}
                    />
                    <TextInput
                        label="Date"
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.currentTarget.value)}
                    />
                    <Select
                        label="Type"
                        value={scheduleSubType}
                        onChange={(v) => setScheduleSubType(v || '')}
                        data={
                            scheduleType === 'review'
                                ? [
                                      { value: '2nd Month', label: '2nd Month Review' },
                                      { value: '3rd Month', label: '3rd Month Review' },
                                      { value: '4th Month', label: '4th Month Review' },
                                      { value: '8 Month', label: '8 Month Review' },
                                      { value: '10 Month', label: '10 Month Review' },
                                  ]
                                : scheduleType === 'appraisal'
                                  ? [
                                        { value: '1st Year Appraisal', label: '1st Year Appraisal' },
                                        { value: 'Second Year Appraisal', label: 'Second Year Appraisal' },
                                    ]
                                  : [
                                        { value: '1st Year 6th Month', label: '1st Year 6th Month Supervision' },
                                        { value: '2nd Year 6th Month', label: '2nd Year 6th Month Supervision' },
                                    ]
                        }
                    />
                    <Textarea
                        label="Notes / details"
                        value={scheduleNotes}
                        onChange={(e) => setScheduleNotes(e.currentTarget.value)}
                        minRows={3}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setScheduleModalOpen(false)} disabled={submittingSchedule}>
                            Cancel
                        </Button>
                        <Button color="brandGreen.6" onClick={submitSchedule} loading={submittingSchedule} disabled={submittingSchedule}>
                            {submittingSchedule ? 'Saving...' : 'Save'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Upload Document"
                centered
                size="lg"
            >
                <Stack>
                    <Select
                        label="Staff member"
                        placeholder="Select staff"
                        data={staffOptions}
                        value={uploadStaffId}
                        onChange={setUploadStaffId}
                        searchable
                        disabled={staffLoading}
                    />
                    {uploadStaffId && (
                        <DocumentUploadForm
                            targetUserId={uploadStaffId}
                            onUploaded={() => {
                                notifications.show({ title: 'Uploaded', message: 'Document uploaded successfully', color: 'green' });
                                setUploadModalOpen(false);
                            }}
                        />
                    )}
                </Stack>
            </Modal>

            <Modal
                opened={referenceModalOpen}
                onClose={() => setReferenceModalOpen(false)}
                title="Send Reference Request"
                centered
            >
                <Stack>
                    <Select
                        label="Staff member"
                        placeholder="Select staff"
                        data={staffOptions}
                        value={referenceStaffId}
                        onChange={setReferenceStaffId}
                        searchable
                        disabled={staffLoading}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setReferenceModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="brandGreen.6"
                            onClick={() => {
                                if (!referenceStaffId) return;
                                setReferenceModalOpen(false);
                                navigate(`/dashboard/staff/${referenceStaffId}?tab=personal-details&section=references`);
                            }}
                        >
                            Open Reference Flow
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={complianceModalOpen}
                onClose={() => setComplianceModalOpen(false)}
                title="Generate Compliance Report"
                centered
            >
                <Stack>
                    <Select
                        label="Report mode"
                        data={[
                            { value: 'organisation', label: 'Whole organisation' },
                            { value: 'staff', label: 'Per person' },
                        ]}
                        value={complianceMode}
                        onChange={(v) => setComplianceMode((v as 'organisation' | 'staff') || 'organisation')}
                    />
                    {complianceMode === 'staff' && (
                        <Select
                            label="Staff member"
                            placeholder="Select staff"
                            data={staffOptions}
                            value={complianceStaffId}
                            onChange={setComplianceStaffId}
                            searchable
                            disabled={staffLoading}
                        />
                    )}
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setComplianceModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button color="brandBlue.6" loading={generatingCompliance} onClick={generateComplianceReport}>
                            Generate PDF
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
};
