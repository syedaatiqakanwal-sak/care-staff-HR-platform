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
    { key: 'active', label: 'Total Active', field: 'totalActive', filter: 'active', icon: UserCheck, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, #0e7a2d 100%)`, shadow: 'rgba(19, 150, 57, 0.3)' },
    { key: 'new', label: 'New Starters', field: 'newStarters', filter: 'new_starters', icon: Star, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1d6a9e 100%)`, shadow: 'rgba(38, 127, 186, 0.3)' },
    { key: 'shadow', label: 'On Shadow', field: 'staffOnShadow', filter: 'on_shadow', icon: Eye, gradient: 'linear-gradient(145deg, #5c6bc0 0%, #3949ab 100%)', shadow: 'rgba(57, 73, 171, 0.3)' },
    { key: 'dbs', label: 'DBS Expiring', field: 'dbsExpiringSoon', filter: 'dbs_expiring', icon: Shield, gradient: 'linear-gradient(145deg, #e65100 0%, #bf360c 100%)', shadow: 'rgba(230, 81, 0, 0.3)' },
    { key: 'dbs-declaration', label: 'DBS Declaration Due', field: 'dbsDeclarationDue', filter: 'dbs_declaration_due', icon: Shield, gradient: 'linear-gradient(145deg, #ef6c00 0%, #e65100 100%)', shadow: 'rgba(239, 108, 0, 0.3)' },
    { key: 'share-code', label: 'Share Code Expiring', field: 'shareCodeExpiring', filter: 'share_code_expiring', icon: Shield, gradient: 'linear-gradient(145deg, #f57c00 0%, #ef6c00 100%)', shadow: 'rgba(245, 124, 0, 0.3)' },
    { key: 'visa', label: 'Visa Expiring', field: 'visaExpiringSoon', filter: 'visa_expiring', icon: Plane, gradient: 'linear-gradient(145deg, #00838f 0%, #006064 100%)', shadow: 'rgba(0, 131, 143, 0.3)' },
    { key: 'training', label: 'Training Due', field: 'trainingDue', filter: 'training_due', icon: GraduationCap, gradient: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1a5f8a 100%)`, shadow: 'rgba(38, 127, 186, 0.3)' },
    { key: 'reviews', label: 'Reviews Due', field: 'reviewsDue', filter: 'reviews_due', icon: ClipboardList, gradient: `linear-gradient(145deg, ${BRAND_GREEN} 0%, #0a5c24 100%)`, shadow: 'rgba(19, 150, 57, 0.25)' },
    { key: 'supervisions', label: 'Supervisions Due', field: 'supervisionsDue', filter: 'supervisions_due', icon: Users, gradient: 'linear-gradient(145deg, #6a1b9a 0%, #4a148c 100%)', shadow: 'rgba(106, 27, 154, 0.3)' },
    { key: 'appraisals', label: 'Appraisals Due', field: 'appraisalsDue', filter: 'appraisals_due', icon: Calendar, gradient: 'linear-gradient(145deg, #c62828 0%, #8e0000 100%)', shadow: 'rgba(198, 40, 40, 0.3)' },
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
        <Box p="md" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <Container size="xl" p={0}>
                <Group justify="space-between" align="flex-end" mb={24}>
                    <Box>
                        <Group align="center" gap="xs" mb={2}>
                            <ThemeIcon variant="light" size="md" radius="md" color="brandBlue.6">
                                <Users size={16} />
                            </ThemeIcon>
                            <Text fw={700} c="brandBlue.6" tt="uppercase" size="xs" style={{ letterSpacing: '0.5px' }}>
                                HR Command Centre
                            </Text>
                        </Group>
                        <Title order={1} size={32} fw={900} c="dark.4" style={{ letterSpacing: '-0.5px' }}>
                            Compliance Dashboard
                        </Title>
                        <Text c="dimmed" mt={2} size="sm" maw={640}>
                            Workforce compliance at a glance. Click a metric to open the staff directory with that filter applied.
                        </Text>
                    </Box>
                    <Button component={Link} to="/dashboard/reports" variant="light" color="brandBlue.6" leftSection={<FileBarChart size={16} />}>
                        All Reports
                    </Button>
                </Group>

                <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm" mb="md">
                    {METRIC_TILES.map((tile) => {
                        const Icon = tile.icon;
                        const value = Number(data[tile.field] ?? 0);
                        return (
                            <UnstyledButton
                                key={tile.key}
                                onClick={() => navigate(`/dashboard/staff?filter=${tile.filter}`)}
                                style={{ width: '100%' }}
                            >
                                <Paper
                                    p="md"
                                    radius="lg"
                                    style={{
                                        background: tile.gradient,
                                        color: 'white',
                                        boxShadow: `0 10px 40px ${tile.shadow}`,
                                        transition: 'transform 0.15s ease',
                                    }}
                                >
                                    <Group justify="space-between" align="flex-start" mb={4}>
                                        <Text size="xs" fw={700} tt="uppercase" opacity={0.9}>
                                            {tile.label}
                                        </Text>
                                        <ThemeIcon size={28} radius="md" color="white" variant="white" style={{ color: BRAND_GREEN }}>
                                            <Icon size={14} />
                                        </ThemeIcon>
                                    </Group>
                                    <Title order={2} size={28} fw={900}>
                                        {loading ? '—' : value}
                                    </Title>
                                </Paper>
                            </UnstyledButton>
                        );
                    })}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="xl">
                    <Paper
                        p="md"
                        radius="xl"
                        style={{
                            background: `linear-gradient(145deg, ${BRAND_BLUE} 0%, #1d6a9e 100%)`,
                            color: 'white',
                            boxShadow: '0 10px 40px rgba(38, 127, 186, 0.3)',
                        }}
                    >
                        <Group justify="space-between" align="center">
                            <Stack gap={2}>
                                <Text size="xs" fw={700} tt="uppercase" opacity={0.8}>
                                    Staff Compliance
                                </Text>
                                <Title order={2} size={28} fw={900}>
                                    {complianceLabel}
                                </Title>
                                <Text size="xs" opacity={0.9}>
                                    Weighted score (DBS, visa, training, references, policies)
                                </Text>
                            </Stack>
                            <RingProgress
                                size={80}
                                thickness={8}
                                roundCaps
                                sections={[{ value: data.staffCompliancePercentage, color: 'white' }]}
                                label={
                                    <Text c="white" fw={900} ta="center" size="sm">
                                        {data.staffCompliancePercentage}%
                                    </Text>
                                }
                                rootColor="rgba(255, 255, 255, 0.2)"
                            />
                        </Group>
                    </Paper>

                    <Paper p="md" radius="xl" withBorder>
                        <Text fw={800} size="sm" mb="sm" c="dark.4">
                            Quick Actions
                        </Text>
                        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                            {QUICK_ACTIONS.map((action) => (
                                <Button
                                    key={action.label}
                                    variant="light"
                                    color="brandGreen.6"
                                    size="xs"
                                    leftSection={<action.icon size={14} />}
                                    justify="flex-start"
                                    styles={{ root: { height: 'auto', padding: '8px 12px' } }}
                                    onClick={() => void handleQuickAction(action.key, action.to)}
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </SimpleGrid>
                    </Paper>
                </SimpleGrid>
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
                        <Button variant="default" onClick={() => setScheduleModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button color="brandGreen.6" onClick={submitSchedule} loading={submittingSchedule}>
                            Save
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
