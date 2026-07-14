import {
    Box,
    Title,
    Text,
    Group,
    Button,
    Paper,
    Stack,
    Avatar,
    Tabs,
    Table,
    Badge,
    ThemeIcon,
    PasswordInput,
    Container,
    Divider,
    ActionIcon,
    Tooltip,
    SimpleGrid,
    Center,
    TextInput,
    Textarea,
    Select,
    Modal,
    LoadingOverlay,
    List,
    Menu,
    ScrollArea,
    FileButton
} from '@mantine/core';
import {
    ArrowLeft,
    FileSpreadsheet,
    FileCheck,
    Eye,
    ShieldCheck,
    Shield,
    Calendar,
    Briefcase,
    User,
    Mail,
    Phone,
    Settings,
    Clock,
    Check,
    Edit,
    Save,
    X,
    Lock,
    AlertTriangle,
    AlertCircle,
    Trash,
    Download,
    RotateCcw,
    ChevronDown,
    ClipboardList,
    Users,
    FileText,
    Upload,
    Camera,
    ClipboardCheck,
    RefreshCw,
    CheckCircle,
    Banknote
} from 'lucide-react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useState, useEffect, useRef } from 'react';
import { SignaturePad } from './SignaturePad';
import axios from 'axios';
import { PersonalInformationTab } from './profile/PersonalInformationTab';
import { DbsTab } from './profile/DbsTab';
import { RecruitmentTab } from './profile/RecruitmentTab';
import { HrNotesTab } from './profile/HrNotesTab';
import { LeaveAttendanceTab } from './profile/LeaveAttendanceTab';
import { PayrollTab } from './profile/PayrollTab';
import { hasDashboardAccess, isManagementRole, isPayrollRole, canMutate, isStaffPortalRole, getStoredRole } from '../utils/roles';
import { InHouseTrainingTab } from './profile/InHouseTrainingTab';
import {
    employmentStatusBadgeColor,
    employmentStatusLabel,
} from '../utils/employmentStatus';

const appraisalWrapTextareaStyles = {
    input: {
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'break-word' as const,
        resize: 'vertical' as const,
    },
};

// --- HELPER COMPONENT: Date Editor with Save/Cancel ---
const DateEditableCell = ({ date, onSave, isAdmin }: { date: string | null, onSave: (date: string | null) => Promise<void>, isAdmin: boolean }) => {
    const [value, setValue] = useState(date ? new Date(date).toISOString().split('T')[0] : '');
    const [isDirty, setIsDirty] = useState(false);
    const [loading, setLoading] = useState(false);

    // Sync state if the prop changes externally (e.g. after save or refresh)
    useEffect(() => {
        setValue(date ? new Date(date).toISOString().split('T')[0] : '');
        setIsDirty(false);
    }, [date]);

    if (!isAdmin) {
        return <Text size="sm">{date ? new Date(date).toLocaleDateString('en-GB') : '-'}</Text>;
    }

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(value || null);
            setIsDirty(false); // Reset dirty state on success
        } catch (error) {
            // Error handling is done in parent, but we stop loading here
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setValue(date ? new Date(date).toISOString().split('T')[0] : '');
        setIsDirty(false);
    };

    return (
        <Group gap={4} wrap="nowrap" align="center">
            <TextInput
                type="date"
                variant={isDirty ? "default" : "unstyled"}
                size="sm"
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    setIsDirty(true);
                }}
                styles={{
                    input: {
                        paddingLeft: isDirty ? 8 : 0,
                        height: 30,
                        minHeight: 30,
                        border: isDirty ? '1px solid #ced4da' : 'none',
                        backgroundColor: isDirty ? 'white' : 'transparent',
                        color: isDirty ? 'black' : 'inherit',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }
                }}
            />
            {isDirty && (
                <Group gap={4}>
                    <ActionIcon size="md" color="#267FBA" variant="filled" onClick={handleSave} loading={loading} title="Save Changes">
                        <Check size={14} />
                    </ActionIcon>
                    <ActionIcon size="md" color="red" variant="light" onClick={handleCancel} disabled={loading} title="Cancel">
                        <X size={14} />
                    </ActionIcon>
                </Group>
            )}
        </Group>
    );
};

// Certificate Card Component
const CertificateCard = ({ title, subtitle, provider, isCompleted, onView, onDownload, onComplete, onIncomplete, isAdmin, canMutateCerts }: { title: string, subtitle?: string, provider: string, isCompleted: boolean, onView?: () => void, onDownload?: () => void, onComplete?: () => void, onIncomplete?: () => void, isAdmin: boolean, canMutateCerts?: boolean }) => {
    const canEditCerts = canMutateCerts ?? isAdmin;
    const cardGradients = [
        'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
        'linear-gradient(135deg, #267FBA 0%, #267FBA 100%)',
        'linear-gradient(135deg, #267FBA 0%, #1d6a9e 100%)'
    ];
    const bg = cardGradients[Math.floor(Math.random() * cardGradients.length)];
    const shadow = 'rgba(19, 150, 57, 0.3)';

    return (
        <Paper
            p={0}
            radius="24"
            withBorder={false}
            style={{
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                background: bg,
                boxShadow: `0 10px 40px ${shadow}`,
                position: 'relative'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = `0 20px 50px ${shadow}`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 10px 40px ${shadow}`;
            }}
        >
            <Box style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <Box style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

            <Box p="sm" style={{ position: 'relative', zIndex: 1 }}>
                <Group justify="space-between" align="flex-start" mb="xs">
                    <ThemeIcon
                        variant="filled"
                        size={40}
                        radius="md"
                        style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)',
                        }}
                    >
                        <FileCheck size={18} color="white" />
                    </ThemeIcon>
                    {isCompleted ? (
                        <Badge 
                            variant="gradient"
                            gradient={{ from: 'green.6', to: 'teal.6', deg: 90 }}
                            size="sm"
                            radius="md"
                            fw={700}
                            leftSection={<Check size={12} />}
                        >
                            Verified
                        </Badge>
                    ) : (
                        <Badge 
                            variant="light"
                            color="orange"
                            size="sm"
                            radius="md"
                            fw={700}
                            leftSection={<Clock size={12} />}
                        >
                            Pending
                        </Badge>
                    )}
                </Group>

                <Text size="sm" fw={800} c="white" mb={4} lineClamp={2}>
                    {title}
                </Text>
                {subtitle && (
                    <Text size="xs" c="white" opacity={0.7} mb="xs" lineClamp={1}>
                        {subtitle}
                    </Text>
                )}
                <Text size="xs" c="white" opacity={0.7} mb="xs">
                    {provider}
                </Text>

                <Box
                    p="xs"
                    bg="rgba(0,0,0,0.1)"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '0 0 12px 12px' }}
                >
                    <Group gap={4}>
                        {onView && (
                            <Button 
                                variant="filled"
                                size="xs"
                                fullWidth
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    fontWeight: 700,
                                    backdropFilter: 'blur(4px)',
                                    padding: '4px 8px',
                                    height: '28px',
                                    fontSize: '11px'
                                }}
                                leftSection={<Eye size={12} />} 
                                onClick={onView}
                            >
                                View
                            </Button>
                        )}
                        {onDownload && isAdmin && (
                            <Button 
                                variant="filled"
                                size="xs"
                                fullWidth
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    color: 'white',
                                    fontWeight: 700,
                                    backdropFilter: 'blur(4px)',
                                    padding: '4px 8px',
                                    height: '28px',
                                    fontSize: '11px'
                                }}
                                leftSection={<Download size={12} />} 
                                onClick={onDownload}
                            >
                                Download
                            </Button>
                        )}
                        {isCompleted ? (
                            onIncomplete && canEditCerts && (
                                <Button 
                                    variant="filled"
                                    size="xs"
                                    fullWidth
                                    style={{
                                        backgroundColor: 'rgba(198, 40, 40, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        color: 'white',
                                        fontWeight: 700,
                                        backdropFilter: 'blur(4px)',
                                        padding: '4px 8px',
                                        height: '28px',
                                        fontSize: '11px'
                                    }}
                                    leftSection={<RotateCcw size={12} />} 
                                    onClick={onIncomplete}
                                >
                                    Incomplete
                                </Button>
                            )
                        ) : (
                            onComplete && canEditCerts && (
                                <Button 
                                    variant="filled"
                                    size="xs"
                                    fullWidth
                                    style={{
                                        backgroundColor: 'rgba(38, 127, 186, 0.3)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        color: 'white',
                                        fontWeight: 700,
                                        backdropFilter: 'blur(4px)',
                                        padding: '4px 8px',
                                        height: '28px',
                                        fontSize: '11px'
                                    }}
                                    leftSection={<CheckCircle size={12} />} 
                                    onClick={onComplete}
                                >
                                    Complete
                                </Button>
                            )
                        )}
                    </Group>
                </Box>
            </Box>
        </Paper>
    );
};

// Review Form Cards Component (similar to Course Cards)
const ReviewFormCards = ({ forms, onEdit, onDelete, onDownload, onView, isAdmin, canDelete }: { forms: any[], onEdit: (form: any) => void, onDelete: (form: any) => void, onDownload: (form: any) => void, onView: (form: any) => void, isAdmin: boolean, canDelete?: boolean }) => {
    const allowDelete = canDelete ?? isAdmin;
    if (forms.length === 0) {
        return <Text c="dimmed" ta="center" py="xl">No saved forms found.</Text>;
    }

    const cardGradients = [
        'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
        'linear-gradient(135deg, #267FBA 0%, #267FBA 100%)',
        'linear-gradient(135deg, #267FBA 0%, #1d6a9e 100%)',
        'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)'
    ];

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
            {forms.map((form, i) => {
                const bgIdx = i % cardGradients.length;
                const bg = cardGradients[bgIdx];
                const formTypeLabel = form.formType === 'review' ? 'Review' : form.formType === 'appraisal' ? 'Appraisal' : 'Supervision';

                return (
                    <Paper key={form.id} p="md" radius="xl" withBorder={false} style={{
                        transition: 'transform 0.2s',
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
                        <Box style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />

                        <Group justify="space-between" mb="sm" wrap="nowrap" style={{ position: 'relative', zIndex: 1 }}>
                            <ThemeIcon variant="filled" color="rgba(255,255,255,0.2)" size="lg" radius="md" style={{ backdropFilter: 'blur(4px)' }}>
                                {form.formType === 'review' ? <FileText size={18} color="white" /> : form.formType === 'appraisal' ? <ClipboardList size={18} color="white" /> : <Users size={18} color="white" />}
                            </ThemeIcon>
                            <Group gap={4} onClick={(e) => e.stopPropagation()}>
                                {!isAdmin && (
                                    <>
                                        <ActionIcon variant="filled" color="rgba(0,0,0,0.3)" size="sm" onClick={() => onView(form)} title="View Form">
                                            <Eye size={14} />
                                        </ActionIcon>
                                        {!form.careStaffSignature && (
                                            <ActionIcon variant="filled" color="rgba(46,125,50,0.7)" size="sm" onClick={() => onView(form)} title="Sign Form">
                                                <Edit size={14} />
                                            </ActionIcon>
                                        )}
                                    </>
                                )}
                                {isAdmin && (
                                    <>
                                        <ActionIcon variant="filled" color="rgba(0,0,0,0.3)" size="sm" onClick={() => onEdit(form)}>
                                            <Edit size={14} />
                                        </ActionIcon>
                                        <ActionIcon variant="filled" color="rgba(0,0,0,0.3)" size="sm" onClick={() => onDownload(form)}>
                                            <Download size={14} />
                                        </ActionIcon>
                                    </>
                                )}
                                {allowDelete && (
                                    <ActionIcon variant="filled" color="red" size="sm" onClick={() => onDelete(form)}>
                                        <Trash size={14} />
                                    </ActionIcon>
                                )}
                            </Group>
                        </Group>
                        <Title order={5} mb={2} size={16} fw={800} c="white" lineClamp={2}>{form.formSubType} {formTypeLabel}</Title>
                        <Text size="xs" c="white" opacity={0.8} fw={600} mb={4} lineClamp={1}>{form.staffName}</Text>
                        <Badge variant="filled" size="sm" radius="sm" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>
                            {new Date(form.dateOfReview).toLocaleDateString()}
                        </Badge>
                    </Paper>
                );
            })}
        </SimpleGrid>
    );
};

export const StaffProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<string | null>(searchParams.get('tab') === 'personal-details' ? 'personal' : (searchParams.get('tab') || 'personal'));
    const [selectedTrainingMonth, setSelectedTrainingMonth] = useState<string | null>('1');
    const [saveLoading, setSaveLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

    // Dynamic Course State
    const [allCourses, setAllCourses] = useState<any[]>([]);

    // Scroll to top when component mounts
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [id]);

    // Sync tab from URL if it changes
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && tabParam !== 'vle') {
            setActiveTab(tabParam === 'personal-details' ? 'personal' : tabParam);
        }
    }, [searchParams]);

    const [certificates, setCertificates] = useState<any[]>([]);
    const [trainingRecords, setTrainingRecords] = useState<any[]>([]);


    // Secure Certificate Viewer State
    const [showCertModal, setShowCertModal] = useState(false);
    const [viewingCert, setViewingCert] = useState<{ id: string, title: string, url: string } | null>(null);
    const [certLoading, setCertLoading] = useState(false);

    // --- SUB-MODULE SELECTION STATE ---
    const [subModuleModalOpen, setSubModuleModalOpen] = useState(false);
    const [monthlyReportMonth, setMonthlyReportMonth] = useState<string | null>(String(new Date().getMonth() + 1));
    const [monthlyReportYear, setMonthlyReportYear] = useState<string | null>(String(new Date().getFullYear()));
    const [yearlyReportYear, setYearlyReportYear] = useState<string | null>(String(new Date().getFullYear()));
    const [downloadingMonthlyReport, setDownloadingMonthlyReport] = useState(false);
    const [downloadingYearlyReport, setDownloadingYearlyReport] = useState(false);
    const [downloadingEnrollmentReport, setDownloadingEnrollmentReport] = useState(false);
    const [viewingReport, setViewingReport] = useState<{ type: 'monthly' | 'yearly', url: string } | null>(null);
    const [pendingEnrollment, setPendingEnrollment] = useState<{ courseName: string, date: string, subModules: string[] } | null>(null);
    const [selectedSubModule, setSelectedSubModule] = useState<string | null>(null);
    const [enrollmentLoading, setEnrollmentLoading] = useState(false);

    // --- CUSTOM CONFIRMATION MODAL STATE ---
    const [confirmModal, setConfirmModal] = useState<{
        opened: boolean;
        title: string;
        message: React.ReactNode;
        onConfirm: () => void;
        confirmLabel?: string;
        color?: string;
    }>({
        opened: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // --- REFERENCES MODAL STATE ---
    const [professionalRefModal, setProfessionalRefModal] = useState(false);
    const [personalRefModal, setPersonalRefModal] = useState(false);
    const [referenceFormData, setReferenceFormData] = useState({
        name: '',
        position: '',
        company: '',
        email: '',
        phone: '',
        relationship: '',
        address: '',
        notes: ''
    });
    const [referenceLoading, setReferenceLoading] = useState(false);
    const [references, setReferences] = useState<any[]>([]);

    // Review/Appraisal/Supervision Form State
    const [reviewFormModal, setReviewFormModal] = useState(false);
    const [reviewFormType, setReviewFormType] = useState<'review' | 'appraisal' | 'supervision'>('review');
    const [reviewFormSubType, setReviewFormSubType] = useState<string>('');
    const [firstYearAppraisalModal, setFirstYearAppraisalModal] = useState(false);
    const [supervisionFormModal, setSupervisionFormModal] = useState(false);
    const [editingAppraisalFormId, setEditingAppraisalFormId] = useState<string | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);
    const appraisalFormPrintRef = useRef<HTMLDivElement>(null);
    const [firstYearAppraisalData, setFirstYearAppraisalData] = useState({
        // Preparation for Appraisal Section
        appraiseeName: '',
        appraiseeJobTitle: '',
        appraisalDate: '',
        keyResponsibilities: '',
        partsDoneWell: '',
        objectives: [] as Array<{ objective: string; measure: string; score: string }>,
        capabilityScores: {} as Record<string, { score: string; notes: string }>,
        newRoleRequirements: '',
        newRoleCapabilities: {} as Record<string, { score: string; notes: string }>,
        difficulties: '',
        supportFromManager: '',
        trainingNeeded: '',
        supportNeeded: '',
        complianceResponsibilities: '',
        relationshipWithManagers: '',
        reviewerComments1: '',
        reviewerComments2: '',
        reviewerComments3: '',
        relationshipWithCoworkers: '',
        careerGoals2Years: '',
        careerGoals5Years: '',
        otherPoints: '',
        // Performance Appraisal Form Section
        appraiserName: '',
        appraiserJobTitle: '',
        lengthInPosition: '',
        appraiserDate: '',
        currentBusinessNeeds: '',
        gatheredInformation: '',
        currentPerformanceStrengths: '',
        appraiserObjectives: [] as Array<{ objective: string; measure: string; score: string; comment: string }>,
        appraiserCapabilityScores: {} as Record<string, { score: string; notes: string }>,
        appraiserNewRoleCapabilities: {} as Record<string, { score: string; notes: string }>,
        improvementDetails: '',
        developmentTraining: '',
        training1: '',
        training1How: '',
        training2: '',
        training2How: '',
        training3: '',
        training3How: '',
        jobDescriptionChanges: '',
        interviewNotes: '',
        appraiseeComments: '',
        appraiseeSignature: '',
        appraiserSignature: '',
        signatureDate: '',
        // Action Plan Section
        actionPlanName: '',
        actionPlanItems: [] as Array<{ keyArea: string; actionPlan: string; targetDate: string }>
    });
    const [reviewFormData, setReviewFormData] = useState({
        staffName: '',
        startDate: '',
        dateOfReview: '',
        documentationComments: '',
        jobPerformanceGrade: '',
        jobPerformanceReason: '',
        trainingDevelopmentGrade: '',
        trainingDevelopmentReason: '',
        communicationSkillsGrade: '',
        communicationSkillsReason: '',
        attendancePunctualityGrade: '',
        attendancePunctualityReason: '',
        reviewerCommentOverallWork: '',
        reviewerCommentProgressTraining: '',
        reviewerCommentTeamWorking: '',
        reviewerCommentAttendance: '',
        recommendedForReview: '',
        reviewReasons: '',
        careStaffSignature: '',
        careStaffDate: '',
        reviewerSignature: '',
        reviewerDate: '',
        // Supervision form fields
        superviseeName: '',
        supervisorName: '',
        supervisionDate: '',
        supervisionFrequency: '',
        agreedActionsLastReview: '',
        roleExperience: '',
        newSkillsUsed: '',
        challengesFaced: '',
        trainingImplementation: '',
        personalDevelopment: '',
        goalsBeforeNextSupervision: '',
        supervisorFeedback: '',
        otherDiscussionAreas: '',
        agreedActions: '',
        superviseeSignature: '',
        superviseeSignatureDate: '',
        supervisorSignature: '',
        supervisorSignatureDate: '',
        // 2nd Year supervision extra fields
        biggestAchievement: '',
        organisationValues: '',
        remainingChallenges: '',
        learningAndDevelopment: ''
    });
    const [reviewForms, setReviewForms] = useState<any[]>([]);
    const [reviewFormLoading, setReviewFormLoading] = useState(false);
    const [deleteReviewFormModal, setDeleteReviewFormModal] = useState(false);
    const [reviewFormToDelete, setReviewFormToDelete] = useState<any>(null);
    const [editingReviewFormId, setEditingReviewFormId] = useState<string | null>(null);

    // Helper to open confirmation
    const openConfirmation = (title: string, message: React.ReactNode, onConfirm: () => void, confirmLabel = 'Confirm', color = 'brandBlue') => {
        setConfirmModal({
            opened: true,
            title,
            message,
            onConfirm,
            confirmLabel,
            color
        });
    };

    // --- ANTI-SCREENSHOT STATE ---
    const [isSecureVisible, setIsSecureVisible] = useState(true);

    // --- ANTI-SCREENSHOT LOGIC ---
    useEffect(() => {
        const handleBlur = () => {
            // When window loses focus (e.g., clicking Snipping Tool or switching tabs), hide content
            if (showCertModal) {
                setIsSecureVisible(false);
            }
        };

        const handleFocus = () => {
            // Restore visibility when user clicks back on the page
            setIsSecureVisible(true);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Detect PrintScreen key
            if (e.key === 'PrintScreen') {
                setIsSecureVisible(false);
                notifications.show({
                    title: 'Security Alert',
                    message: 'Screenshots are disabled for this document.',
                    color: 'red',
                    icon: <AlertTriangle size={16} />
                });
                // Keep it hidden for a moment to ruin the screenshot
                setTimeout(() => setIsSecureVisible(true), 2000);
            }
        };

        // Attach listeners
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('keyup', handleKeyUp);

        // Add CSS to block printing via browser menu (Ctrl+P)
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body { display: none !important; }
            }
        `;
        document.head.appendChild(style);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('keyup', handleKeyUp);
            document.head.removeChild(style);
        };
    }, [showCertModal]);


    const isAdmin = hasDashboardAccess();
    const canManage = isManagementRole() && canMutate();
    const canViewHrNotes = isManagementRole();
    const canViewPayroll = isPayrollRole();
    // In-House Training Plan: Admin/HR/Manager can view; only Admin/HR can edit; Staff cannot see.
    const inHouseRole = getStoredRole();
    const canViewInHouseTraining = inHouseRole === 'admin' || inHouseRole === 'hr' || inHouseRole === 'manager';
    const canEditInHouseTraining = (inHouseRole === 'admin' || inHouseRole === 'hr') && canMutate();

    // Fetch Profile Data & Courses
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    setLoading(false);
                    return;
                }

                // 1. Fetch Dynamic Courses List
                try {
                    const coursesRes = await axios.get('/api/v1/courses', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAllCourses(coursesRes.data);
                } catch (courseErr) {
                    console.error('Failed to fetch courses list', courseErr);
                }

                // 2. Fetch Profile
                let endpoint = '';
                if (window.location.pathname.includes('/me') || !id) {
                    endpoint = '/api/v1/staff/me';
                } else {
                    endpoint = `/api/v1/staff/${id}`;
                }

                const response = await axios.get(endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile(response.data);

                // Load profile picture as blob for authenticated access
                const targetUserId = response.data.user?.id || response.data.id;
                if (response.data.profilePicture && typeof response.data.profilePicture === 'string' && response.data.profilePicture.trim() && targetUserId) {
                    try {
                        const imageResponse = await axios.get(`/api/v1/staff/${targetUserId}/profile-picture`, {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: 'blob'
                        });
                        const blobUrl = URL.createObjectURL(imageResponse.data);
                        setProfilePictureUrl(blobUrl);
                    } catch (error) {
                        console.error('Failed to load profile picture:', error);
                        setProfilePictureUrl(null);
                    }
                } else {
                    setProfilePictureUrl(null);
                }

                // 3. Fetch Linked Data (Certificates, Training)
                if (targetUserId) {
                    // Certificates
                    try {
                    const certResponse = await axios.get(`/api/v1/certificates/staff/${targetUserId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const flatCerts = certResponse.data.flatMap((g: any) => g.certificates);
                    setCertificates(flatCerts);
                    } catch (err) {
                        console.error('Failed to fetch certificates', err);
                    }

                    // Training Records
                    try {
                        const trainingRes = await axios.get(`/api/v1/training/staff/${targetUserId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setTrainingRecords(trainingRes.data);
                    } catch (err) {
                        console.error('Failed to fetch training records', err);
                    }

                    // Review Forms
                    try {
                        const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setReviewForms(reviewFormsRes.data);
                    } catch (err) {
                        console.error("Failed to fetch review forms", err);
                    }

                }
            } catch (error: any) {
                console.error('Failed to fetch profile data', error);
                const role = localStorage.getItem('role');
                if (role === 'staff' && !window.location.pathname.includes('/me')) {
                    notifications.show({ title: 'Access Denied', message: 'You can only view your own profile.', color: 'red' });
                    navigate('/dashboard/me');
                } else {
                    notifications.show({
                        title: 'Error',
                        message: 'Could not load profile data.',
                        color: 'red'
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (profilePictureUrl) {
                URL.revokeObjectURL(profilePictureUrl);
            }
        };
    }, [profilePictureUrl]);

    // Handler functions for review forms
    const handleReviewFormEdit = (form: any, preserveViewMode: boolean = false) => {
        // Reset view mode when editing (admin action), unless we're preserving it for view mode
        if (!preserveViewMode) {
            setIsViewMode(false);
        }
        // Check if it's a 1st Year or Second Year Appraisal
        if (form.formType === 'appraisal' && (form.formSubType === '1st Year Appraisal' || form.formSubType === 'Second Year Appraisal')) {
            // Open the 1st Year Appraisal form modal
            setReviewFormSubType(form.formSubType);
            
            // Default empty state
            const defaultAppraisalData = {
                // Preparation for Appraisal Section
                appraiseeName: '',
                appraiseeJobTitle: '',
                appraisalDate: '',
                keyResponsibilities: '',
                partsDoneWell: '',
                objectives: [] as Array<{ objective: string; measure: string; score: string }>,
                capabilityScores: {} as Record<string, { score: string; notes: string }>,
                newRoleRequirements: '',
                newRoleCapabilities: {} as Record<string, { score: string; notes: string }>,
                difficulties: '',
                supportFromManager: '',
                trainingNeeded: '',
                supportNeeded: '',
                complianceResponsibilities: '',
                relationshipWithManagers: '',
                relationshipWithCoworkers: '',
                reviewerComments1: '',
                reviewerComments2: '',
                reviewerComments3: '',
                careerGoals2Years: '',
                careerGoals5Years: '',
                otherPoints: '',
                // Performance Appraisal Form Section
                appraiserName: '',
                appraiserJobTitle: '',
                lengthInPosition: '',
                appraiserDate: '',
                currentBusinessNeeds: '',
                gatheredInformation: '',
                currentPerformanceStrengths: '',
                appraiserObjectives: [] as Array<{ objective: string; measure: string; score: string; comment: string }>,
                appraiserCapabilityScores: {} as Record<string, { score: string; notes: string }>,
                appraiserNewRoleCapabilities: {} as Record<string, { score: string; notes: string }>,
                improvementDetails: '',
                developmentTraining: '',
                training1: '',
                training1How: '',
                training2: '',
                training2How: '',
                training3: '',
                training3How: '',
                jobDescriptionChanges: '',
                interviewNotes: '',
                appraiseeComments: '',
                appraiseeSignature: '',
                appraiserSignature: '',
                signatureDate: '',
                actionPlanName: '',
                actionPlanItems: [] as Array<{ keyArea: string; actionPlan: string; targetDate: string }>
            };
            
            // Try to parse the appraisal data from documentationComments (stored as JSON)
            let parsedData: any = {};
            if (form.documentationComments) {
                try {
                    const parsed = JSON.parse(form.documentationComments);
                    if (parsed.type === 'firstYearAppraisal' && parsed.data) {
                        parsedData = parsed.data;
                    }
                } catch (e) {
                    // If parsing fails, it might be regular text, so use default
                    console.error('Failed to parse appraisal data', e);
                }
            }
            
            // Deep merge parsed data with defaults, ensuring nested objects are properly initialized
            const mergedData = {
                ...defaultAppraisalData,
                ...parsedData,
                // Ensure arrays are initialized
                objectives: parsedData.objectives && Array.isArray(parsedData.objectives) && parsedData.objectives.length > 0 
                    ? parsedData.objectives 
                    : defaultAppraisalData.objectives,
                appraiserObjectives: parsedData.appraiserObjectives && Array.isArray(parsedData.appraiserObjectives) && parsedData.appraiserObjectives.length > 0 
                    ? parsedData.appraiserObjectives 
                    : defaultAppraisalData.appraiserObjectives,
                actionPlanItems: parsedData.actionPlanItems && Array.isArray(parsedData.actionPlanItems) && parsedData.actionPlanItems.length > 0 
                    ? parsedData.actionPlanItems 
                    : defaultAppraisalData.actionPlanItems,
                // Ensure nested objects are initialized
                capabilityScores: parsedData.capabilityScores && typeof parsedData.capabilityScores === 'object' && Object.keys(parsedData.capabilityScores).length > 0
                    ? parsedData.capabilityScores
                    : defaultAppraisalData.capabilityScores,
                newRoleCapabilities: parsedData.newRoleCapabilities && typeof parsedData.newRoleCapabilities === 'object' && Object.keys(parsedData.newRoleCapabilities).length > 0
                    ? parsedData.newRoleCapabilities
                    : defaultAppraisalData.newRoleCapabilities,
                appraiserCapabilityScores: parsedData.appraiserCapabilityScores && typeof parsedData.appraiserCapabilityScores === 'object' && Object.keys(parsedData.appraiserCapabilityScores).length > 0
                    ? parsedData.appraiserCapabilityScores
                    : defaultAppraisalData.appraiserCapabilityScores,
                appraiserNewRoleCapabilities: parsedData.appraiserNewRoleCapabilities && typeof parsedData.appraiserNewRoleCapabilities === 'object' && Object.keys(parsedData.appraiserNewRoleCapabilities).length > 0
                    ? parsedData.appraiserNewRoleCapabilities
                    : defaultAppraisalData.appraiserNewRoleCapabilities,
                // Override with form-level data if available
                appraiseeName: form.staffName || parsedData.appraiseeName || defaultAppraisalData.appraiseeName,
                appraisalDate: form.dateOfReview || parsedData.appraisalDate || defaultAppraisalData.appraisalDate,
                appraiserDate: parsedData.appraiserDate || form.dateOfReview || defaultAppraisalData.appraiserDate,
                signatureDate: parsedData.signatureDate || form.dateOfReview || defaultAppraisalData.signatureDate,
                actionPlanName: form.staffName || parsedData.actionPlanName || defaultAppraisalData.actionPlanName,
            };
            
            // Update with merged data
            setEditingAppraisalFormId(form.id); // Store the form ID for updating
            setFirstYearAppraisalData(mergedData);
            setFirstYearAppraisalModal(true);
        } else if (form.formType === 'supervision' && (form.formSubType === '1st Year 6th Month' || form.formSubType === '2nd Year 6th Month')) {
            // Open supervision form in its own branded modal
            setReviewFormType('supervision');
            setReviewFormSubType(form.formSubType);
            let supervisionData: any = {};
            if (form.documentationComments) {
                try {
                    const parsed = JSON.parse(form.documentationComments);
                    if (parsed.type === 'supervision' && parsed.data) {
                        supervisionData = parsed.data;
                    } else {
                        supervisionData = parsed;
                    }
                } catch (e) {
                    console.error('Failed to parse supervision data', e);
                }
            }
            setReviewFormData(prev => ({
                ...prev,
                staffName: form.staffName,
                startDate: form.startDate || '',
                dateOfReview: form.dateOfReview,
                documentationComments: form.documentationComments || '',
                superviseeName: supervisionData.superviseeName || form.staffName || '',
                supervisorName: supervisionData.supervisorName || '',
                supervisionDate: supervisionData.supervisionDate || form.dateOfReview || '',
                supervisionFrequency: supervisionData.supervisionFrequency || '',
                agreedActionsLastReview: supervisionData.agreedActionsLastReview || '',
                roleExperience: supervisionData.roleExperience || '',
                newSkillsUsed: supervisionData.newSkillsUsed || '',
                challengesFaced: supervisionData.challengesFaced || '',
                trainingImplementation: supervisionData.trainingImplementation || '',
                personalDevelopment: supervisionData.personalDevelopment || '',
                goalsBeforeNextSupervision: supervisionData.goalsBeforeNextSupervision || '',
                supervisorFeedback: supervisionData.supervisorFeedback || '',
                otherDiscussionAreas: supervisionData.otherDiscussionAreas || '',
                agreedActions: supervisionData.agreedActions || '',
                superviseeSignature: supervisionData.superviseeSignature || form.careStaffSignature || '',
                superviseeSignatureDate: supervisionData.superviseeSignatureDate || form.careStaffDate || '',
                supervisorSignature: supervisionData.supervisorSignature || form.reviewerSignature || '',
                supervisorSignatureDate: supervisionData.supervisorSignatureDate || form.reviewerDate || '',
                biggestAchievement: supervisionData.biggestAchievement || '',
                organisationValues: supervisionData.organisationValues || '',
                remainingChallenges: supervisionData.remainingChallenges || '',
                learningAndDevelopment: supervisionData.learningAndDevelopment || '',
            }));
            setEditingReviewFormId(form.id);
            setSupervisionFormModal(true);
        } else {
            // Open regular review form modal
            setReviewFormType(form.formType as 'review' | 'appraisal' | 'supervision');
            setReviewFormSubType(form.formSubType);

            setReviewFormData({
                staffName: form.staffName,
                startDate: form.startDate || '',
                dateOfReview: form.dateOfReview,
                documentationComments: form.documentationComments || '',
                jobPerformanceGrade: form.jobPerformanceGrade || '',
                jobPerformanceReason: form.jobPerformanceReason || '',
                trainingDevelopmentGrade: form.trainingDevelopmentGrade || '',
                trainingDevelopmentReason: form.trainingDevelopmentReason || '',
                communicationSkillsGrade: form.communicationSkillsGrade || '',
                communicationSkillsReason: form.communicationSkillsReason || '',
                attendancePunctualityGrade: form.attendancePunctualityGrade || '',
                attendancePunctualityReason: form.attendancePunctualityReason || '',
                reviewerCommentOverallWork: form.jobPerformanceReason || '',
                reviewerCommentProgressTraining: form.trainingDevelopmentReason || '',
                reviewerCommentTeamWorking: form.communicationSkillsReason || '',
                reviewerCommentAttendance: form.attendancePunctualityReason || '',
                recommendedForReview: form.recommendedForReview || '',
                reviewReasons: form.reviewReasons || '',
                careStaffSignature: form.careStaffSignature || '',
                careStaffDate: form.careStaffDate || '',
                reviewerSignature: form.reviewerSignature || '',
                reviewerDate: form.reviewerDate || '',
                superviseeName: '', supervisorName: '', supervisionDate: '', supervisionFrequency: '',
                agreedActionsLastReview: '', roleExperience: '', newSkillsUsed: '', challengesFaced: '',
                trainingImplementation: '', personalDevelopment: '', goalsBeforeNextSupervision: '',
                supervisorFeedback: '', otherDiscussionAreas: '', agreedActions: '',
                superviseeSignature: '', superviseeSignatureDate: '', supervisorSignature: '', supervisorSignatureDate: '',
                biggestAchievement: '', organisationValues: '', remainingChallenges: '', learningAndDevelopment: ''
            });
            setEditingReviewFormId(form.id);
            setReviewFormModal(true);
        }
    };

    const handleReviewFormDelete = (form: any) => {
        openConfirmation(
            'Delete Review Form',
            `Are you sure you want to delete this ${form.formSubType} ${form.formType} form for ${form.staffName}? This action cannot be undone.`,
            async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`/api/v1/staff/review-forms/${form.id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    notifications.show({ title: 'Deleted', message: 'Review form deleted successfully', color: '#267FBA' });
                    // Refresh
                    const targetUserId = profile?.user?.id || profile?.id || id;
                    const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setReviewForms(reviewFormsRes.data);
                } catch (error: any) {
                    notifications.show({ title: 'Error', message: error.response?.data?.message || 'Failed to delete', color: 'red' });
                }
            },
            'Delete',
            'red'
        );
    };

    const handleReviewFormView = (form: any) => {
        // Set view mode to true first
        setIsViewMode(true);
        // Use the same logic as edit but preserve view mode
        handleReviewFormEdit(form, true);
    };

    const confirmDeleteReviewForm = async () => {
        if (!reviewFormToDelete) return;

        try {
            const token = localStorage.getItem('token');
            
            await axios.delete(`/api/v1/staff/review-forms/${reviewFormToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifications.show({
                title: 'Success',
                message: 'Review form deleted successfully',
                color: '#267FBA',
            });

            // Refresh review forms
            const targetUserId = profile?.user?.id || profile?.id || id;
            const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviewForms(reviewFormsRes.data);

            setDeleteReviewFormModal(false);
            setReviewFormToDelete(null);
        } catch (error: any) {
            console.error('Failed to delete review form', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to delete review form',
                color: 'red',
            });
        }
    };

    const handleDownloadMonthlyReport = async () => {
        if (!monthlyReportMonth || !monthlyReportYear) {
            notifications.show({
                title: 'Error',
                message: 'Please select both month and year',
                color: 'red',
            });
            return;
        }

        setDownloadingMonthlyReport(true);
        try {
            const token = localStorage.getItem('token');
            const targetUserId = profile?.user?.id || profile?.id || id;

            if (!targetUserId) {
                throw new Error('Staff ID not found');
            }

            const response = await axios.get(
                `/api/v1/staff/${targetUserId}/monthly-report?year=${monthlyReportYear}&month=${monthlyReportMonth}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = monthNames[parseInt(monthlyReportMonth) - 1];
            const fileName = `Monthly_Report_${profile?.firstName || 'Staff'}_${profile?.lastName || 'Member'}_${monthName}_${monthlyReportYear}.pdf`;
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            notifications.show({
                title: 'Success',
                message: 'Monthly report downloaded successfully',
                color: '#267FBA',
            });
        } catch (error: any) {
            console.error('Failed to download monthly report', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || error.message || 'Failed to download monthly report',
                color: 'red',
            });
        } finally {
            setDownloadingMonthlyReport(false);
        }
    };

    const handleDownloadEnrollmentReport = async () => {
        if (!profile) {
            notifications.show({
                title: 'Error',
                message: 'Profile not loaded',
                color: 'red',
            });
            return;
        }

        setDownloadingEnrollmentReport(true);
        try {
            const token = localStorage.getItem('token');
            const targetUserId = profile?.user?.id || profile?.id || id;

            if (!targetUserId) {
                throw new Error('Staff ID not found');
            }

            const response = await axios.get(
                `/api/v1/staff/${targetUserId}/enrollment-completion-report`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const fileName = `Enrollment_Completion_Report_${profile?.firstName || 'Staff'}_${profile?.lastName || 'Member'}.pdf`;
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            notifications.show({
                title: 'Success',
                message: 'Enrollment and Completion report downloaded successfully',
                color: '#267FBA',
            });
        } catch (error: any) {
            console.error('Failed to download enrollment report', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || error.message || 'Failed to download enrollment report',
                color: 'red',
            });
        } finally {
            setDownloadingEnrollmentReport(false);
        }
    };

    const handleDownloadYearlyReport = async () => {
        if (!yearlyReportYear) {
            notifications.show({
                title: 'Error',
                message: 'Please select a year',
                color: 'red',
            });
            return;
        }

        setDownloadingYearlyReport(true);
        try {
            const token = localStorage.getItem('token');
            const targetUserId = profile?.user?.id || profile?.id || id;

            if (!targetUserId) {
                throw new Error('Staff ID not found');
            }

            const response = await axios.get(
                `/api/v1/staff/${targetUserId}/yearly-report?year=${yearlyReportYear}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            // Create blob and download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const fileName = `Yearly_Report_${profile?.firstName || 'Staff'}_${profile?.lastName || 'Member'}_${yearlyReportYear}.pdf`;
            
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            notifications.show({
                title: 'Success',
                message: 'Yearly report downloaded successfully',
                color: '#267FBA',
            });
        } catch (error: any) {
            console.error('Failed to download yearly report', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || error.message || 'Failed to download yearly report',
                color: 'red',
            });
        } finally {
            setDownloadingYearlyReport(false);
        }
    }; 

    const handleViewReport = async (type: 'monthly' | 'yearly') => {
        try {
            const token = localStorage.getItem('token');
            const targetUserId = profile?.user?.id || profile?.id || id;

            if (!targetUserId) {
                throw new Error('Staff ID not found');
            }

            let url = '';
            if (type === 'monthly') {
                if (!monthlyReportMonth || !monthlyReportYear) {
                    notifications.show({
                        title: 'Error',
                        message: 'Please select both month and year',
                        color: 'red',
                    });
                    return;
                }
                url = `/api/v1/staff/${targetUserId}/monthly-report?year=${monthlyReportYear}&month=${monthlyReportMonth}`;
            } else {
                if (!yearlyReportYear) {
                    notifications.show({
                        title: 'Error',
                        message: 'Please select a year',
                        color: 'red',
                    });
                    return;
                }
                url = `/api/v1/staff/${targetUserId}/yearly-report?year=${yearlyReportYear}`;
            }

            // Fetch the PDF as blob
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const blobUrl = window.URL.createObjectURL(blob);
            setViewingReport({ type, url: blobUrl });
        } catch (error: any) {
            console.error('Failed to load report', error);
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || error.message || 'Failed to load report',
                color: 'red',
            });
        }
    };

    const handleReviewFormDownload = (form: any) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            // Check if it's an appraisal form
            if (form.formType === 'appraisal' && (form.formSubType === '1st Year Appraisal' || form.formSubType === 'Second Year Appraisal')) {
                // Parse the appraisal data from documentationComments
                let appraisalData: any = {};
                if (form.documentationComments) {
                    try {
                        const parsed = JSON.parse(form.documentationComments);
                        if (parsed.type === 'firstYearAppraisal' && parsed.data) {
                            appraisalData = parsed.data;
                        }
                    } catch (e) {
                        console.error('Failed to parse appraisal data', e);
                    }
                }
                
                // Render the full appraisal form (same as on-screen)
                const renderAppraisalFormHTML = (data: any) => {
                    const renderTable = (rows: any[], headers: string[], isObjectives = false) => {
                        if (!rows || rows.length === 0) return '';
                        let html = '<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">';
                        html += '<thead><tr>';
                        headers.forEach(h => html += `<th style="border: 1px solid #000; padding: 8px; background: #f0f0f0;">${h}</th>`);
                        html += '</tr></thead><tbody>';
                        rows.forEach(row => {
                            html += '<tr>';
                            if (isObjectives) {
                                html += `<td style="border: 1px solid #000; padding: 8px;">${row.objective || ''}</td>`;
                                html += `<td style="border: 1px solid #000; padding: 8px;">${row.measure || ''}</td>`;
                                html += `<td style="border: 1px solid #000; padding: 8px;">${row.score || ''}</td>`;
                                if (row.comment !== undefined) {
                                    html += `<td style="border: 1px solid #000; padding: 8px;">${row.comment || ''}</td>`;
                                }
                            } else if (row.keyArea) {
                                html += `<td style="border: 1px solid #000; padding: 8px;">${row.keyArea || ''}</td>`;
                                html += `<td style="border: 1px solid #000; padding: 8px;">${row.actionPlan || ''}</td>`;
                                html += `<td style="border: 1px solid #000; padding: 8px;">${row.targetDate || ''}</td>`;
                            }
                            html += '</tr>';
                        });
                        html += '</tbody></table>';
                        return html;
                    };
                    
                    const renderCapabilityTable = (scores: Record<string, { score: string; notes: string }>, areas: string[]) => {
                        if (!scores || Object.keys(scores).length === 0) return '';
                        let html = '<table style="width: 100%; border-collapse: collapse; margin: 10px 0;">';
                        html += '<thead><tr>';
                        html += '<th style="border: 1px solid #000; padding: 8px; background: #f0f0f0;">Capability Area</th>';
                        html += '<th style="border: 1px solid #000; padding: 8px; background: #f0f0f0;">Score</th>';
                        html += '<th style="border: 1px solid #000; padding: 8px; background: #f0f0f0;">Notes and Comments</th>';
                        html += '</tr></thead><tbody>';
                        areas.forEach(area => {
                            const scoreData = scores[area];
                            html += '<tr>';
                            html += `<td style="border: 1px solid #000; padding: 8px;">${area}</td>`;
                            html += `<td style="border: 1px solid #000; padding: 8px;">${scoreData?.score || ''}</td>`;
                            html += `<td style="border: 1px solid #000; padding: 8px;">${scoreData?.notes || ''}</td>`;
                            html += '</tr>';
                        });
                        html += '</tbody></table>';
                        return html;
                    };
                    
                    const capabilityAreas = [
                        'Customer/ Clients Relations', 'Time Management', 'Reporting and Administration', 
                        'Communication Skills', 'Delegation Skills', 'IT/Equipment/Machinery Skills',
                        'Ability to reflect on own performance', 'Problem-solving and decision making',
                        'Team working and developing others', 'Energy, determination and work rate',
                        'Professional Development', 'Steadiness under pressure',
                        'Adaptability, flexibility and mobility', 'Personal appearance and image',
                        'Clinical Skills', 'Personal Care', 'Emotional Support', 'Cultural Competence',
                        'Safety and Infection Control', 'Documentation and Record Keeping',
                        'Ethical Practice', 'Care Planning and Coordination', 'Reliability and Punctuality'
                    ];
                    
                    const newRoleAreas = [
                        'Leadership and Management', 'Care Planning and Coordination',
                        'Problem Solving and Decision-Making', 'Resource Management',
                        'Teamwork and Collaboration', 'Knowledge and Competence',
                        'Supervision and Management'
                    ];
                    
                    return `
                        <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 16px;">
                            <h3 style="margin-top: 0;">Preparation for Appraisal</h3>
                            <p style="font-size: 12px; color: #666;">This section is to be completed by the Appraisee prior to the appraisal interview.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Name:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;">${data.appraiseeName || ''}</td>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Job title:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;">${data.appraiseeJobTitle || ''}</td>
                                </tr>
                            </table>
                            <p><strong>Date:</strong> ${data.appraisalDate || ''}</p>
                            <p><strong>Describe your understanding of your key responsibilities and duties:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 60px;">${data.keyResponsibilities || ''}</p>
                            <p><strong>Which parts of the job do you feel you do well?</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.partsDoneWell || ''}</p>
                            <p><strong>List the objectives you set out to achieve:</strong></p>
                            ${renderTable(data.objectives || [], ['Objective', 'Measure/Standard', 'Score from 1 to 5'], true)}
                            <p><strong>Score your own capability or knowledge:</strong></p>
                            ${renderCapabilityTable(data.capabilityScores || {}, capabilityAreas)}
                            ${data.newRoleRequirements ? `
                                <p><strong>New role requirements:</strong> ${data.newRoleRequirements}</p>
                                ${renderCapabilityTable(data.newRoleCapabilities || {}, newRoleAreas)}
                            ` : ''}
                            <p><strong>Which parts of your job do you have difficulties with?</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.difficulties || ''}</p>
                            <p><strong>Support from manager:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.supportFromManager || ''}</p>
                            <p><strong>Training and support needed:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.trainingNeeded || ''}</p>
                            <p><strong>Compliance Responsibilities: Is there any change in your DBS status?</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.complianceResponsibilities || ''}</p>
                            <p><strong>Relationship with managers:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.relationshipWithManagers || ''}</p>
                            <p><strong>Relationship with co-workers:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.relationshipWithCoworkers || ''}</p>
                            <p><strong>Career goals (2 years):</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.careerGoals2Years || ''}</p>
                            <p><strong>Other points:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.otherPoints || ''}</p>
                            <p><strong>Comments from the reviewer:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.reviewerComments1 || ''}</p>
                        </div>
                        
                        <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 16px;">
                            <h3 style="margin-top: 0;">Performance Appraisal Form</h3>
                            <p style="font-size: 12px; color: #666;">This section is to be completed by the Appraiser prior to the appraisal interview.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Name of Appraisee:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;">${data.appraiseeName || ''}</td>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Job title:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;">${data.appraiseeJobTitle || ''}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Length of time in current position:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;">${data.lengthInPosition || ''}</td>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Appraiser name:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;">${data.appraiserName || ''}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000;"><strong>Date:</strong></td>
                                    <td style="padding: 8px; border: 1px solid #000;" colspan="3">${data.appraiserDate || ''}</td>
                                </tr>
                            </table>
                            <p><strong>Current Business Needs:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.currentBusinessNeeds || ''}</p>
                            <p><strong>Record of gathered information:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.gatheredInformation || ''}</p>
                            <p><strong>Current Performance Strengths:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.currentPerformanceStrengths || ''}</p>
                            <p><strong>List the objectives which the Appraisee had agreed to achieve:</strong></p>
                            ${renderTable(data.appraiserObjectives || [], ['Objective', 'Measure/Standard', 'Score from 1 to 5', 'Comment'], true)}
                            <p><strong>Score the appraisee's capability:</strong></p>
                            ${renderCapabilityTable(data.appraiserCapabilityScores || {}, capabilityAreas)}
                            ${data.newRoleRequirements ? `
                                <p><strong>New role requirements capabilities:</strong></p>
                                ${renderCapabilityTable(data.appraiserNewRoleCapabilities || {}, newRoleAreas)}
                            ` : ''}
                            <p><strong>How the Appraisee improve:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 60px;">${data.improvementDetails || ''}</p>
                            <p><strong>Development and Training:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.developmentTraining || ''}</p>
                            ${data.training1 ? `
                                <p><strong>Training sessions:</strong></p>
                                <p>1. ${data.training1 || ''} - ${data.training1How || ''}</p>
                                ${data.training2 ? `<p>2. ${data.training2 || ''} - ${data.training2How || ''}</p>` : ''}
                                ${data.training3 ? `<p>3. ${data.training3 || ''} - ${data.training3How || ''}</p>` : ''}
                            ` : ''}
                            <p><strong>Job Description changes:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.jobDescriptionChanges || ''}</p>
                            <p><strong>Interview Notes:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.interviewNotes || ''}</p>
                            <p><strong>Appraisee's comments:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 60px;">${data.appraiseeComments || ''}</p>
                            <p><strong>Comments from the reviewer:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.reviewerComments2 || ''}</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000;">
                                        <strong>Signature (Appraisee):</strong>
                                        ${data.appraiseeSignature && data.appraiseeSignature.startsWith('data:image') 
                                            ? `<img src="${data.appraiseeSignature}" alt="Appraisee Signature" style="max-width: 200px; max-height: 80px; display: block; margin-top: 5px;" />` 
                                            : data.appraiseeSignature || ''}
                                    </td>
                                    <td style="padding: 8px; border: 1px solid #000;">
                                        <strong>Signature (Appraiser):</strong>
                                        ${data.appraiserSignature && data.appraiserSignature.startsWith('data:image') 
                                            ? `<img src="${data.appraiserSignature}" alt="Appraiser Signature" style="max-width: 200px; max-height: 80px; display: block; margin-top: 5px;" />` 
                                            : data.appraiserSignature || ''}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #000;" colspan="2"><strong>Date:</strong> ${data.signatureDate || ''}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="margin-bottom: 30px; border: 1px solid #ddd; padding: 16px;">
                            <h3 style="margin-top: 0;">Action Plan</h3>
                            <p><strong>Name:</strong> ${data.actionPlanName || ''}</p>
                            ${renderTable(data.actionPlanItems || [], ['Key Areas Discussed', 'Action Plan to be Followed', 'Target Date'], false)}
                            <p><strong>Comments from the reviewer:</strong></p>
                            <p style="white-space: pre-wrap; border: 1px solid #ddd; padding: 8px; min-height: 40px;">${data.reviewerComments3 || ''}</p>
                        </div>
                    `;
                };
                
                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${form.formSubType} - Performance Appraisal</title>
                        <style>
                            * { box-sizing: border-box; }
                            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                            @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                                .page { width: 210mm; margin: 0; padding: 10mm; }
                                .section-card { page-break-inside: avoid; }
                            }
                            .page { max-width: 850px; margin: 0 auto; padding: 24px; }
                            .section-card { border: 3px solid #267FBA; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
                            .section-card.blue { border-color: #139639; }
                            .card-header { padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
                            .card-header.green { background: linear-gradient(135deg, #139639 0%, #267FBA 100%); }
                            .card-header.blue { background: linear-gradient(135deg, #267FBA 0%, #139639 100%); }
                            .card-header h1 { color: #fff; font-size: 20px; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
                            .card-header h2 { color: #fff; font-size: 16px; margin: 4px 0 0; font-weight: 800; }
                            .card-header img { height: 50px; border-radius: 50%; background: #fff; padding: 3px; }
                            .card-body { padding: 20px 24px; }
                            .info-label { font-size: 10px; font-weight: 700; color: #139639; text-transform: uppercase; margin-bottom: 3px; }
                            .info-value { font-size: 13px; font-weight: 600; color: #222; margin-bottom: 10px; }
                            h3 { color: #139639; font-size: 14px; margin: 16px 0 8px; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px; }
                            h3.green { color: #267FBA; }
                            .text-block { white-space: pre-wrap; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 10px; min-height: 36px; font-size: 12px; line-height: 1.6; margin-bottom: 12px; background: #fafafa; }
                            table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 12px; }
                            td, th { border: 1px solid #bbb; padding: 6px 8px; vertical-align: top; }
                            th { background: #e3f0f8; font-weight: 700; color: #139639; text-align: left; }
                            .cap-table td:first-child { width: 50%; }
                            .cap-table td:nth-child(2) { width: 15%; text-align: center; }
                            .sig-row { display: flex; gap: 14px; margin-top: 16px; }
                            .sig-box { flex: 1; border: 1px solid #267FBA; border-radius: 8px; padding: 12px; }
                            .sig-box.blue { border-color: #139639; }
                            .sig-label { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
                            .sig-label.green { color: #267FBA; }
                            .sig-label.blue { color: #139639; }
                            .sig-img { max-width: 200px; max-height: 70px; display: block; }
                            .sig-placeholder { border: 2px dashed #ccc; border-radius: 6px; min-height: 60px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 12px; background: #fafafa; }
                        </style>
                    </head>
                    <body>
                        <div class="page">
                            <!-- ═══ Section 1: Preparation for Appraisal ═══ -->
                            <div class="section-card">
                                <div class="card-header green">
                                    <div>
                                        <h1>Lets Care All</h1>
                                        <h2>${form.formSubType === 'Second Year Appraisal' ? 'Preparation for Appraisal Year 2025-26' : 'Preparation for Appraisal'}</h2>
                                    </div>
                                    <img src="/assets/logo.png" alt="Logo" />
                                </div>
                                <div class="card-body">
                                    <p style="font-size:11px;color:#666;font-style:italic;margin:0 0 12px;">This section is to be completed by the Appraisee prior to the appraisal interview.</p>
                                    <div style="display:flex;gap:16px;">
                                        <div style="flex:1;"><div class="info-label">Name</div><div class="info-value">${appraisalData.appraiseeName || form.staffName || '-'}</div></div>
                                        <div style="flex:1;"><div class="info-label">Job Title</div><div class="info-value">${appraisalData.appraiseeJobTitle || '-'}</div></div>
                                        <div style="flex:1;"><div class="info-label">Date</div><div class="info-value">${appraisalData.appraisalDate || form.dateOfReview || '-'}</div></div>
                                    </div>
                                    <h3>Key Responsibilities and Duties</h3>
                                    <div class="text-block">${appraisalData.keyResponsibilities || ''}</div>
                                    <h3>Parts of the Job Done Well</h3>
                                    <div class="text-block">${appraisalData.partsDoneWell || ''}</div>
                                    ${appraisalData.objectives && appraisalData.objectives.length > 0 ? `
                                        <h3>Objectives</h3>
                                        <table><thead><tr><th>Objective</th><th>Measure/Standard</th><th>Score (1-5)</th></tr></thead><tbody>
                                        ${appraisalData.objectives.map((o: any) => `<tr><td>${o.objective || ''}</td><td>${o.measure || ''}</td><td style="text-align:center;">${o.score || ''}</td></tr>`).join('')}
                                        </tbody></table>
                                    ` : ''}
                                    ${appraisalData.capabilityScores && Object.keys(appraisalData.capabilityScores).length > 0 ? `
                                        <h3>Self-Assessment Capability Scores</h3>
                                        <table class="cap-table"><thead><tr><th>Capability Area</th><th>Score</th><th>Notes</th></tr></thead><tbody>
                                        ${Object.entries(appraisalData.capabilityScores).map(([area, val]: [string, any]) => `<tr><td>${area}</td><td style="text-align:center;">${val?.score || ''}</td><td>${val?.notes || ''}</td></tr>`).join('')}
                                        </tbody></table>
                                    ` : ''}
                                    ${appraisalData.newRoleRequirements ? `
                                        <h3 class="green">New Role Requirements: ${appraisalData.newRoleRequirements}</h3>
                                        ${appraisalData.newRoleCapabilities && Object.keys(appraisalData.newRoleCapabilities).length > 0 ? `
                                            <table class="cap-table"><thead><tr><th>Capability Area</th><th>Score</th><th>Notes</th></tr></thead><tbody>
                                            ${Object.entries(appraisalData.newRoleCapabilities).map(([area, val]: [string, any]) => `<tr><td>${area}</td><td style="text-align:center;">${val?.score || ''}</td><td>${val?.notes || ''}</td></tr>`).join('')}
                                            </tbody></table>
                                        ` : ''}
                                    ` : ''}
                                    <h3>Difficulties</h3><div class="text-block">${appraisalData.difficulties || ''}</div>
                                    <h3>Support from Manager</h3><div class="text-block">${appraisalData.supportFromManager || ''}</div>
                                    <h3>Training / Support Needed</h3><div class="text-block">${appraisalData.trainingNeeded || ''}</div>
                                    <h3>Compliance Responsibilities: Is there any change in your DBS status?</h3><div class="text-block">${appraisalData.complianceResponsibilities || ''}</div>
                                    <h3>Relationship with Managers</h3><div class="text-block">${appraisalData.relationshipWithManagers || ''}</div>
                                    <h3>Relationship with Co-workers</h3><div class="text-block">${appraisalData.relationshipWithCoworkers || ''}</div>
                                    <h3>Career Goals (2 Years)</h3><div class="text-block">${appraisalData.careerGoals2Years || ''}</div>
                                    ${appraisalData.careerGoals5Years ? `<h3>Career Goals (5 Years)</h3><div class="text-block">${appraisalData.careerGoals5Years}</div>` : ''}
                                    <h3>Other Points</h3><div class="text-block">${appraisalData.otherPoints || ''}</div>
                                    <h3>Comments from the reviewer</h3><div class="text-block">${appraisalData.reviewerComments1 || ''}</div>
                                </div>
                            </div>

                            <!-- ═══ Section 2: Performance Appraisal Form ═══ -->
                            <div class="section-card blue">
                                <div class="card-header blue">
                                    <div>
                                        <h1>Lets Care All</h1>
                                        <h2>Performance Appraisal Form</h2>
                                    </div>
                                    <img src="/assets/logo.png" alt="Logo" />
                                </div>
                                <div class="card-body">
                                    <p style="font-size:11px;color:#666;font-style:italic;margin:0 0 12px;">This section is to be completed by the Appraiser prior to the appraisal interview.</p>
                                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Appraisee</div><div class="info-value">${appraisalData.appraiseeName || form.staffName || '-'}</div></div>
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Job Title</div><div class="info-value">${appraisalData.appraiseeJobTitle || '-'}</div></div>
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Length in Position</div><div class="info-value">${appraisalData.lengthInPosition || '-'}</div></div>
                                    </div>
                                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Appraiser</div><div class="info-value">${appraisalData.appraiserName || '-'}</div></div>
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Appraiser Job Title</div><div class="info-value">${appraisalData.appraiserJobTitle || '-'}</div></div>
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Date</div><div class="info-value">${appraisalData.appraiserDate || '-'}</div></div>
                                    </div>
                                    <h3>Current Business Needs</h3><div class="text-block">${appraisalData.currentBusinessNeeds || ''}</div>
                                    <h3>Gathered Information</h3><div class="text-block">${appraisalData.gatheredInformation || ''}</div>
                                    <h3>Current Performance Strengths</h3><div class="text-block">${appraisalData.currentPerformanceStrengths || ''}</div>
                                    ${appraisalData.appraiserObjectives && appraisalData.appraiserObjectives.length > 0 ? `
                                        <h3>Appraiser Objectives</h3>
                                        <table><thead><tr><th>Objective</th><th>Measure/Standard</th><th>Score</th><th>Comment</th></tr></thead><tbody>
                                        ${appraisalData.appraiserObjectives.map((o: any) => `<tr><td>${o.objective || ''}</td><td>${o.measure || ''}</td><td style="text-align:center;">${o.score || ''}</td><td>${o.comment || ''}</td></tr>`).join('')}
                                        </tbody></table>
                                    ` : ''}
                                    ${appraisalData.appraiserCapabilityScores && Object.keys(appraisalData.appraiserCapabilityScores).length > 0 ? `
                                        <h3>Appraiser Capability Scores</h3>
                                        <table class="cap-table"><thead><tr><th>Capability Area</th><th>Score</th><th>Notes</th></tr></thead><tbody>
                                        ${Object.entries(appraisalData.appraiserCapabilityScores).map(([area, val]: [string, any]) => `<tr><td>${area}</td><td style="text-align:center;">${val?.score || ''}</td><td>${val?.notes || ''}</td></tr>`).join('')}
                                        </tbody></table>
                                    ` : ''}
                                    ${appraisalData.appraiserNewRoleCapabilities && Object.keys(appraisalData.appraiserNewRoleCapabilities).length > 0 ? `
                                        <h3 class="green">New Role Capabilities (Appraiser)</h3>
                                        <table class="cap-table"><thead><tr><th>Capability Area</th><th>Score</th><th>Notes</th></tr></thead><tbody>
                                        ${Object.entries(appraisalData.appraiserNewRoleCapabilities).map(([area, val]: [string, any]) => `<tr><td>${area}</td><td style="text-align:center;">${val?.score || ''}</td><td>${val?.notes || ''}</td></tr>`).join('')}
                                        </tbody></table>
                                    ` : ''}
                                    <h3>How the Appraisee Can Improve</h3><div class="text-block">${appraisalData.improvementDetails || ''}</div>
                                    <h3>Development and Training</h3><div class="text-block">${appraisalData.developmentTraining || ''}</div>
                                    ${appraisalData.training1 ? `
                                        <h3>Training Sessions</h3>
                                        <table><thead><tr><th>Training</th><th>How Achieved</th></tr></thead><tbody>
                                        <tr><td>${appraisalData.training1 || ''}</td><td>${appraisalData.training1How || ''}</td></tr>
                                        ${appraisalData.training2 ? `<tr><td>${appraisalData.training2}</td><td>${appraisalData.training2How || ''}</td></tr>` : ''}
                                        ${appraisalData.training3 ? `<tr><td>${appraisalData.training3}</td><td>${appraisalData.training3How || ''}</td></tr>` : ''}
                                        </tbody></table>
                                    ` : ''}
                                    <h3>Job Description Changes</h3><div class="text-block">${appraisalData.jobDescriptionChanges || ''}</div>
                                    <h3>Interview Notes</h3><div class="text-block">${appraisalData.interviewNotes || ''}</div>
                                    <h3>Appraisee's Comments</h3><div class="text-block">${appraisalData.appraiseeComments || ''}</div>
                                    <h3>Comments from the reviewer</h3><div class="text-block">${appraisalData.reviewerComments2 || ''}</div>

                                    <!-- Signatures -->
                                    <div style="border-top:2px solid #267FBA;padding-top:16px;margin-top:20px;">
                                        <p style="text-align:center;font-style:italic;font-size:12px;color:#666;">I hereby confirm that this is a fair and accurate representation of the appraisal discussion.</p>
                                        <div class="sig-row">
                                            <div class="sig-box">
                                                <div class="sig-label green">Signature (Appraisee)</div>
                                                ${appraisalData.appraiseeSignature && appraisalData.appraiseeSignature.startsWith('data:image')
                                                    ? `<img class="sig-img" src="${appraisalData.appraiseeSignature}" alt="Appraisee Signature" />`
                                                    : '<div class="sig-placeholder">No signature</div>'}
                                            </div>
                                            <div class="sig-box blue">
                                                <div class="sig-label blue">Signature (Appraiser)</div>
                                                ${appraisalData.appraiserSignature && appraisalData.appraiserSignature.startsWith('data:image')
                                                    ? `<img class="sig-img" src="${appraisalData.appraiserSignature}" alt="Appraiser Signature" />`
                                                    : '<div class="sig-placeholder">No signature</div>'}
                                            </div>
                                        </div>
                                        <div style="margin-top:8px;"><div class="info-label">Date</div><div class="info-value">${appraisalData.signatureDate || ''}</div></div>
                                    </div>
                                </div>
                            </div>

                            <!-- ═══ Section 3: Action Plan ═══ -->
                            <div class="section-card">
                                <div class="card-header green">
                                    <div>
                                        <h1>Lets Care All</h1>
                                        <h2>Action Plan</h2>
                                    </div>
                                    <img src="/assets/logo.png" alt="Logo" />
                                </div>
                                <div class="card-body">
                                    <p style="font-size:11px;color:#666;margin:0 0 10px;">Agree a plan for the forthcoming year.</p>
                                    <div class="info-label">Name</div><div class="info-value">${appraisalData.actionPlanName || ''}</div>
                                    ${appraisalData.actionPlanItems && appraisalData.actionPlanItems.length > 0 ? `
                                        <table><thead><tr><th>Key Areas Discussed</th><th>Action Plan to Follow</th><th>Target Date</th></tr></thead><tbody>
                                        ${appraisalData.actionPlanItems.map((item: any) => `<tr><td>${item.keyArea || ''}</td><td>${item.actionPlan || ''}</td><td>${item.targetDate || ''}</td></tr>`).join('')}
                                        </tbody></table>
                                    ` : ''}
                                    <h3>Comments from the reviewer</h3><div class="text-block">${appraisalData.reviewerComments3 || ''}</div>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            } else if (form.formType === 'supervision' && (form.formSubType === '1st Year 6th Month' || form.formSubType === '2nd Year 6th Month')) {
                // Parse the supervision data from documentationComments
                let supervisionData: any = {};
                if (form.documentationComments) {
                    try {
                        const parsed = JSON.parse(form.documentationComments);
                        // Check if data is stored as { type: 'supervision', data: {...} }
                        if (parsed.type === 'supervision' && parsed.data) {
                            supervisionData = parsed.data;
                        } else if (parsed.type === 'supervision') {
                            // If type is supervision but no data property, use the parsed object directly
                            supervisionData = parsed;
                        } else {
                            // Otherwise, use the parsed object directly (for backward compatibility)
                            supervisionData = parsed;
                        }
                    } catch (e) {
                        console.error('Failed to parse supervision data', e);
                    }
                }
                
                const d = supervisionData;
                const is2ndYear = form.formSubType === '2nd Year 6th Month';

                // Build question/answer pairs dynamically
                const qaPairs: Array<{q: string; a: string}> = [];
                if (is2ndYear) {
                    qaPairs.push({ q: 'Actions from the previous meeting', a: d.agreedActionsLastReview || '' });
                    qaPairs.push({ q: 'What has been my biggest achievement since my last supervision?', a: d.biggestAchievement || '' });
                    qaPairs.push({ q: 'How do I continue to display the values of the organisation in my everyday work?', a: d.organisationValues || '' });
                    qaPairs.push({ q: 'What challenges have I faced since my last supervision and how have I managed and overcome them?', a: d.challengesFaced || '' });
                    qaPairs.push({ q: 'Are there any challenges that remain? If so, what is needed to help me overcome them?', a: d.remainingChallenges || '' });
                    qaPairs.push({ q: 'What learning and development have I done since my last supervision and how have I put this learning into practice?', a: d.learningAndDevelopment || '' });
                    qaPairs.push({ q: 'What do I want to achieve before my next supervision?', a: d.goalsBeforeNextSupervision || '' });
                } else {
                    qaPairs.push({ q: 'Agreed Actions from the Last Review or the topics for this supervisor', a: d.agreedActionsLastReview || '' });
                    qaPairs.push({ q: 'How did you find your role as a care staff, and what have you learned?', a: d.roleExperience || '' });
                    qaPairs.push({ q: 'What are the new skills I have used as a care staff?', a: d.newSkillsUsed || '' });
                    qaPairs.push({ q: 'What challenges have I faced since my last review, and how have I managed and overcome them?', a: d.challengesFaced || '' });
                    qaPairs.push({ q: 'How do I continue to implement the knowledge which I gained from training for an organisation in my everyday work?', a: d.trainingImplementation || '' });
                    qaPairs.push({ q: 'What I like to learn for my personal development, and how I can put this learning into practice?', a: d.personalDevelopment || '' });
                    qaPairs.push({ q: 'What do I want to achieve before my next supervision?', a: d.goalsBeforeNextSupervision || '' });
                }
                qaPairs.push({ q: 'Feedback from supervisor', a: d.supervisorFeedback || '' });
                qaPairs.push({ q: 'Other areas of discussion', a: d.otherDiscussionAreas || '' });
                qaPairs.push({ q: 'Agreed actions', a: d.agreedActions || '' });

                const qaHTML = qaPairs.map(p => `
                    <h3>${p.q}</h3>
                    <div class="text-block">${p.a}</div>
                `).join('');

                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${form.formSubType} - Supervision</title>
                        <style>
                            * { box-sizing: border-box; }
                            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                            @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                                .page { width: 210mm; margin: 0; padding: 10mm; }
                            }
                            .page { max-width: 850px; margin: 0 auto; padding: 24px; }
                            .section-card { border: 3px solid #267FBA; border-radius: 12px; overflow: hidden; }
                            .card-header { padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #139639 0%, #267FBA 100%); }
                            .card-header h1 { color: #fff; font-size: 20px; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
                            .card-header h2 { color: #fff; font-size: 16px; margin: 4px 0 0; font-weight: 800; }
                            .card-header .sub { color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 2px; }
                            .card-header img { height: 50px; border-radius: 50%; background: #fff; padding: 3px; }
                            .card-body { padding: 20px 24px; }
                            .info-label { font-size: 10px; font-weight: 700; color: #139639; text-transform: uppercase; margin-bottom: 3px; }
                            .info-value { font-size: 13px; font-weight: 600; color: #222; margin-bottom: 10px; }
                            h3 { color: #139639; font-size: 13px; margin: 16px 0 6px; border-bottom: 2px solid #e0e0e0; padding-bottom: 4px; }
                            .text-block { white-space: pre-wrap; border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 10px; min-height: 32px; font-size: 12px; line-height: 1.6; margin-bottom: 10px; background: #fafafa; }
                            .sig-row { display: flex; gap: 14px; margin-top: 16px; }
                            .sig-box { flex: 1; border: 1px solid #267FBA; border-radius: 8px; padding: 12px; }
                            .sig-box.blue { border-color: #139639; }
                            .sig-label { font-size: 12px; font-weight: 800; margin-bottom: 6px; }
                            .sig-label.green { color: #267FBA; }
                            .sig-label.blue { color: #139639; }
                            .sig-img { max-width: 200px; max-height: 70px; display: block; }
                            .sig-placeholder { border: 2px dashed #ccc; border-radius: 6px; min-height: 60px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 12px; background: #fafafa; }
                        </style>
                    </head>
                    <body>
                        <div class="page">
                            <div class="section-card">
                                <div class="card-header">
                                    <div>
                                        <h1>Lets Care All</h1>
                                        <h2>One to One Supervision Recording Form</h2>
                                        <div class="sub">${form.formSubType}</div>
                                    </div>
                                    <img src="/assets/logo.png" alt="Logo" />
                                </div>
                                <div class="card-body">
                                    <div style="display:flex;gap:14px;flex-wrap:wrap;">
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Supervisee</div><div class="info-value">${d.superviseeName || form.staffName || '-'}</div></div>
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Supervisor</div><div class="info-value">${d.supervisorName || '-'}</div></div>
                                    </div>
                                    <div style="display:flex;gap:14px;flex-wrap:wrap;">
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Date</div><div class="info-value">${d.supervisionDate || form.dateOfReview || '-'}</div></div>
                                        <div style="flex:1;min-width:180px;"><div class="info-label">Frequency</div><div class="info-value">${d.supervisionFrequency || '-'}</div></div>
                                    </div>

                                    <hr style="border:none;border-top:2px solid #139639;margin:16px 0;" />

                                    ${qaHTML}

                                    <!-- Signatures -->
                                    <div style="border-top:2px solid #267FBA;padding-top:16px;margin-top:20px;">
                                        <div class="sig-row">
                                            <div class="sig-box">
                                                <div class="sig-label green">Supervisee</div>
                                                <div class="info-label">Name</div><div class="info-value">${d.superviseeName || form.staffName || ''}</div>
                                                ${d.superviseeSignature && d.superviseeSignature.startsWith('data:image')
                                                    ? `<img class="sig-img" src="${d.superviseeSignature}" alt="Sig" />`
                                                    : '<div class="sig-placeholder">No signature</div>'}
                                                <div style="margin-top:6px;"><div class="info-label">Date</div><div class="info-value">${d.superviseeSignatureDate || form.careStaffDate || '-'}</div></div>
                                            </div>
                                            <div class="sig-box blue">
                                                <div class="sig-label blue">Supervisor</div>
                                                <div class="info-label">Name</div><div class="info-value">${d.supervisorName || ''}</div>
                                                ${d.supervisorSignature && d.supervisorSignature.startsWith('data:image')
                                                    ? `<img class="sig-img" src="${d.supervisorSignature}" alt="Sig" />`
                                                    : '<div class="sig-placeholder">No signature</div>'}
                                                <div style="margin-top:6px;"><div class="info-label">Date</div><div class="info-value">${d.supervisorSignatureDate || form.reviewerDate || '-'}</div></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            } else {
                // ── Branded Employment Review Download ──
                const gradeLabel = (g: string) => g === '4' ? 'Excellent' : g === '3' ? 'Good' : g === '2' ? 'Below Average' : g === '1' ? 'Poor' : '';
                const gradeColor = (g: string) => g === '4' ? '#267FBA' : g === '3' ? '#139639' : g === '2' ? '#F57C00' : g === '1' ? '#C62828' : '#999';
                const renderGradeCircles = (grade: string) => [1,2,3,4].map(n => {
                    const sel = grade === String(n);
                    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;margin-right:6px;font-weight:800;font-size:13px;border:${sel ? 'none' : '1.5px solid #ccc'};background:${sel ? gradeColor(String(n)) : '#f5f5f5'};color:${sel ? '#fff' : '#999'};">${n}</span>`;
                }).join('');

                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${form.formSubType} Employment Review - ${form.staffName}</title>
                        <style>
                            * { box-sizing: border-box; }
                            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; background: #fff; }
                            @media print {
                                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                                .page { width: 210mm; min-height: 297mm; margin: 0; padding: 14mm; }
                            }
                            .page { max-width: 800px; margin: 0 auto; padding: 30px; }
                            .form-border { border: 3px solid #267FBA; border-radius: 12px; overflow: hidden; }
                            .form-header { background: linear-gradient(135deg, #139639 0%, #267FBA 100%); padding: 22px 28px; display: flex; justify-content: space-between; align-items: center; }
                            .form-header h1 { color: #fff; font-size: 22px; margin: 0; letter-spacing: 2px; text-transform: uppercase; }
                            .form-header h2 { color: #fff; font-size: 17px; margin: 6px 0 0; font-weight: 800; }
                            .form-header img { height: 55px; border-radius: 50%; background: #fff; padding: 4px; }
                            .form-body { padding: 28px; }
                            .info-box { border: 1px solid #139639; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; }
                            .info-label { font-size: 11px; font-weight: 700; color: #139639; text-transform: uppercase; margin-bottom: 4px; }
                            .info-value { font-size: 15px; font-weight: 700; color: #222; }
                            .info-row { display: flex; gap: 14px; }
                            .info-row > div { flex: 1; }
                            .doc-box { border: 1px solid #267FBA; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; background: #f8fdf8; }
                            .doc-label { font-size: 11px; font-weight: 700; color: #267FBA; text-transform: uppercase; margin-bottom: 6px; }
                            .grade-instruction { background: linear-gradient(135deg, #e3f0f8 0%, #e6f5eb 100%); border: 1px solid #b8d4ea; border-radius: 8px; padding: 10px 14px; text-align: center; font-size: 13px; font-weight: 700; color: #139639; margin-bottom: 16px; }
                            .grade-row { display: flex; gap: 14px; margin-bottom: 14px; }
                            .grade-item { flex: 1; border: 1px solid #139639; border-radius: 8px; padding: 12px 14px; }
                            .grade-item-label { font-size: 13px; font-weight: 700; color: #333; margin-bottom: 8px; }
                            .recommend-box { border: 2px solid #139639; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; }
                            .recommend-box.yes { border-color: #267FBA; background: #f1f8f1; }
                            .recommend-box.no { border-color: #C62828; background: #fff5f5; }
                            .recommend-badge { display: inline-block; padding: 6px 18px; border-radius: 6px; font-weight: 800; font-size: 14px; color: #fff; }
                            .sig-row { display: flex; gap: 14px; margin-top: 16px; }
                            .sig-box { flex: 1; border: 1px solid #267FBA; border-radius: 8px; padding: 14px; }
                            .sig-box.reviewer { border-color: #139639; }
                            .sig-label { font-size: 13px; font-weight: 800; margin-bottom: 8px; }
                            .sig-label.staff { color: #267FBA; }
                            .sig-label.reviewer { color: #139639; }
                            .sig-img { max-width: 200px; max-height: 80px; display: block; }
                            .sig-placeholder { border: 2px dashed #ccc; border-radius: 6px; min-height: 70px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 13px; background: #fafafa; }
                            .sig-date { font-size: 11px; color: #888; margin-top: 6px; }
                            hr.green { border: none; border-top: 2px solid #267FBA; margin: 18px 0; }
                            hr.blue { border: none; border-top: 2px solid #139639; margin: 18px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="page">
                            <div class="form-border">
                                <div class="form-header">
                                    <div>
                                        <h1>Lets Care All</h1>
                                        <h2>${form.formSubType} Employment Review</h2>
                                    </div>
                                    <img src="/assets/logo.png" alt="Logo" />
                                </div>
                                <div class="form-body">
                                    <div class="info-row">
                                        <div class="info-box"><div class="info-label">Staff Name</div><div class="info-value">${form.staffName || '-'}</div></div>
                                        <div class="info-box"><div class="info-label">Start Date</div><div class="info-value">${form.startDate ? new Date(form.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div></div>
                                    </div>
                                    <div class="info-box"><div class="info-label">Date of Review</div><div class="info-value">${form.dateOfReview ? new Date(form.dateOfReview).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</div></div>

                                    ${form.documentationComments && !form.documentationComments.startsWith('{') ? `
                                        <div class="doc-box">
                                            <div class="doc-label">Check that all documentation is complete and add comments here:</div>
                                            <div style="font-size:13px;white-space:pre-wrap;line-height:1.7;">${form.documentationComments}</div>
                                        </div>
                                    ` : ''}

                                    <div class="grade-instruction">For the following areas please grade each section from 1–4 (1 poor, 2 below average, 3 good and 4 excellent)</div>

                                    <div class="grade-row">
                                        <div class="grade-item">
                                            <div class="grade-item-label">Overall work performance</div>
                                            ${renderGradeCircles(form.jobPerformanceGrade || '')}
                                            ${form.jobPerformanceReason ? `<div style="margin-top:8px;"><div style="font-size:11px;font-weight:700;color:#139639;margin-bottom:4px;">Comments from the reviewer:</div><div style="font-size:12px;white-space:pre-wrap;border:1px solid #e0e0e0;border-radius:6px;padding:8px;background:#fafafa;">${form.jobPerformanceReason}</div></div>` : ''}
                                        </div>
                                        <div class="grade-item">
                                            <div class="grade-item-label">Progress in training/induction</div>
                                            ${renderGradeCircles(form.trainingDevelopmentGrade || '')}
                                            ${form.trainingDevelopmentReason ? `<div style="margin-top:8px;"><div style="font-size:11px;font-weight:700;color:#139639;margin-bottom:4px;">Comments from the reviewer:</div><div style="font-size:12px;white-space:pre-wrap;border:1px solid #e0e0e0;border-radius:6px;padding:8px;background:#fafafa;">${form.trainingDevelopmentReason}</div></div>` : ''}
                                        </div>
                                    </div>
                                    <div class="grade-row">
                                        <div class="grade-item">
                                            <div class="grade-item-label">Team-working performance</div>
                                            ${renderGradeCircles(form.communicationSkillsGrade || '')}
                                            ${form.communicationSkillsReason ? `<div style="margin-top:8px;"><div style="font-size:11px;font-weight:700;color:#139639;margin-bottom:4px;">Comments from the reviewer:</div><div style="font-size:12px;white-space:pre-wrap;border:1px solid #e0e0e0;border-radius:6px;padding:8px;background:#fafafa;">${form.communicationSkillsReason}</div></div>` : ''}
                                        </div>
                                        <div class="grade-item">
                                            <div class="grade-item-label">Attendance performance</div>
                                            ${renderGradeCircles(form.attendancePunctualityGrade || '')}
                                            ${form.attendancePunctualityReason ? `<div style="margin-top:8px;"><div style="font-size:11px;font-weight:700;color:#139639;margin-bottom:4px;">Comments from the reviewer:</div><div style="font-size:12px;white-space:pre-wrap;border:1px solid #e0e0e0;border-radius:6px;padding:8px;background:#fafafa;">${form.attendancePunctualityReason}</div></div>` : ''}
                                        </div>
                                    </div>

                                    <hr class="green" />

                                    <div class="recommend-box ${form.recommendedForReview === 'YES' ? 'yes' : form.recommendedForReview === 'NO' ? 'no' : ''}">
                                        <div style="font-size:13px;font-weight:800;color:#333;margin-bottom:8px;">Recommended for further period of review</div>
                                        <span class="recommend-badge" style="background:${form.recommendedForReview === 'YES' ? '#267FBA' : form.recommendedForReview === 'NO' ? '#C62828' : '#999'};">${form.recommendedForReview || 'Not specified'}</span>
                                        ${form.reviewReasons ? `
                                            <div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.8);border-radius:6px;border-left:3px solid #139639;">
                                                <div style="font-size:11px;font-weight:700;color:#139639;margin-bottom:4px;">State reasons, and period of review:</div>
                                                <div style="font-size:13px;white-space:pre-wrap;">${form.reviewReasons}</div>
                                            </div>
                                        ` : ''}
                                    </div>

                                    <hr class="blue" />

                                    <div class="sig-row">
                                        <div class="sig-box">
                                            <div class="sig-label staff">Sign and Date (Care Staff)</div>
                                            ${form.careStaffSignature && form.careStaffSignature.startsWith('data:image')
                                                ? `<img class="sig-img" src="${form.careStaffSignature}" alt="Care Staff Signature" />`
                                                : '<div class="sig-placeholder">No signature</div>'}
                                            ${form.careStaffDate ? `<div class="sig-date">${new Date(form.careStaffDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}
                                        </div>
                                        <div class="sig-box reviewer">
                                            <div class="sig-label reviewer">Sign and Date (Reviewer)</div>
                                            ${form.reviewerSignature && form.reviewerSignature.startsWith('data:image')
                                                ? `<img class="sig-img" src="${form.reviewerSignature}" alt="Reviewer Signature" />`
                                                : '<div class="sig-placeholder">No signature</div>'}
                                            ${form.reviewerDate ? `<div class="sig-date">${new Date(form.reviewerDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 250);
            }
        }
    };

    const handleSaveProfile = async (): Promise<boolean> => {
        setSaveLoading(true);
        try {
            const token = localStorage.getItem('token');
            const targetUserId = profile.user?.id || profile.id;
            let endpoint = '/api/v1/staff/me';

            if (hasDashboardAccess() && targetUserId) {
                endpoint = `/api/v1/staff/${targetUserId}`;
            }

            const permittedPayload: any = {
                firstName: profile.firstName,
                lastName: profile.lastName,
                middleName: profile.middleName,
                title: profile.title,
                phoneNumber: profile.phoneNumber,
                email: profile.email,
                department: profile.department,
                employmentStatus: profile.employmentStatus,
                ilccsNumber: profile.ilccsNumber,
                lcaNumber: profile.lcaNumber,
                startDate: profile.startDate || null,
                inductionDate: profile.inductionDate || null,
                rapidInductionDate: profile.rapidInductionDate || null,
                dateOfBirth: profile.dateOfBirth || null,
                niNumber: profile.niNumber || null,
                gender: profile.gender?.trim() || null,
                nextOfKinName: profile.nextOfKinName?.trim() || null,
                nextOfKinNumber: profile.nextOfKinNumber?.trim() || null,
                passportNumber: profile.passportNumber?.trim() || null,
                passportExpiry: profile.passportExpiry || null,
                isUkNational: profile.isUkNational ?? null,
                isEeaNational: profile.isEeaNational ?? null,
                visaType: profile.visaType?.trim() || null,
                visaOrBrpNumber: profile.visaOrBrpNumber?.trim() || null,
                townOfBirth: profile.townOfBirth?.trim() || null,
                countyOfBirth: profile.countyOfBirth?.trim() || null,
                countryOfBirth: profile.countryOfBirth?.trim() || null,
                nationalityAtBirth: profile.nationalityAtBirth?.trim() || null,
                currentNationality: profile.currentNationality?.trim() || null,
                visaExpiryDate: profile.visaExpiryDate || null,
                shareCode: profile.shareCode?.trim() || null,
                rightToWorkStatus: profile.rightToWorkStatus?.trim() || null,
                shareCodeGeneratedDate: profile.shareCodeGeneratedDate || null,
                rightToWorkCheckCompleted: profile.rightToWorkCheckCompleted ?? false,
                rightToWorkCheckDate: profile.rightToWorkCheckCompleted
                    ? profile.rightToWorkCheckDate || null
                    : null,
                rightToWorkCheckExpiryDate: profile.rightToWorkCheckCompleted
                    ? profile.rightToWorkCheckExpiryDate || null
                    : null,
            };

            await axios.put(endpoint, permittedPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const refetchEndpoint =
                window.location.pathname.includes('/me') || !id ? '/api/v1/staff/me' : `/api/v1/staff/${id}`;
            const profileRes = await axios.get(refetchEndpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(profileRes.data);

            notifications.show({
                title: 'Profile Updated',
                message: 'Your profile changes have been saved successfully.',
                color: '#267FBA',
                icon: <Check size={16} />,
            });
            return true;
        } catch (error: any) {
            console.error('Save failed', error);
            
            // Handle 401 Unauthorized - token expired or invalid
            if (error.response?.status === 401) {
                notifications.show({
                    title: 'Unauthorized',
                    message: 'Your session has expired. Please login again.',
                    color: 'red',
                });
                // Clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
            } else if (error.response?.status === 403) {
                notifications.show({
                    title: 'Forbidden',
                    message: 'You do not have permission to save this profile. Please ensure you have the correct permissions.',
                    color: 'red',
                });
            } else if (error.response?.status === 400) {
                // Bad Request - validation errors
                const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Validation error. Please check your input.';
                notifications.show({
                    title: 'Validation Error',
                    message: errorMessage,
                    color: 'red',
                });
            } else {
                // Show the actual error message from the API if available
                const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to save changes.';
                notifications.show({
                    title: 'Error',
                    message: errorMessage,
                    color: 'red'
                });
            }
            return false;
        } finally {
            setSaveLoading(false);
        }
    };

    const handleProfileChange = (field: string, value: any) => {
        setProfile((prev: any) => ({
            ...prev,
            [field]: value
        }));
    };

    // --- ENROLLMENT UPDATE LOGIC WITH SUB-MODULE SUPPORT ---
    const updateEnrollmentRecord = async (courseName: string, enrollmentDate: string | null, subModule: string | null = null) => {
        const token = localStorage.getItem('token');
        const userId = profile.user?.id || profile.id;

        await axios.patch(`/api/v1/training/staff/${userId}/record`, {
            courseName: courseName,
            enrollmentDate: enrollmentDate,
            subModule: subModule // Now supported by backend
        }, { headers: { Authorization: `Bearer ${token}` } });

        // Refetch records
        const trainingRes = await axios.get(`/api/v1/training/staff/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setTrainingRecords(trainingRes.data);
        notifications.show({ title: 'Updated', message: 'Enrollment date updated', color: '#267FBA' });
    };

    // Called when admin changes date in the cell
    const handleEnrollmentSave = async (courseName: string, newDate: string | null, subModules: string[]) => {
        // If we are clearing the date (newDate is null), no need to ask for sub-module
        if (newDate && subModules && subModules.length > 0) {
            setPendingEnrollment({ courseName, date: newDate, subModules });
            setSelectedSubModule(null); // Reset
            setSubModuleModalOpen(true);
        } else {
            // No sub-modules or clearing date -> Direct update
            await updateEnrollmentRecord(courseName, newDate, null);
        }
    };

    const confirmSubModuleEnrollment = async () => {
        if (!pendingEnrollment) return;

        setEnrollmentLoading(true);
        try {
            await updateEnrollmentRecord(pendingEnrollment.courseName, pendingEnrollment.date, selectedSubModule);
            setSubModuleModalOpen(false);
            setPendingEnrollment(null);
        } catch (error) {
            console.error('Failed to update enrollment with sub-module', error);
            notifications.show({ title: 'Error', message: 'Failed to save enrollment', color: 'red' });
        } finally {
            setEnrollmentLoading(false);
        }
    };

    const handleDeleteRecord = async (recordId: string) => {
        try {
            const token = localStorage.getItem('token');
            const userId = profile.user?.id || profile.id;
            await axios.delete(`/api/v1/training/staff/${userId}/record/${recordId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifications.show({ title: 'Success', message: 'Enrollment removed', color: '#267FBA' });

            // Refresh
            const trainingRes = await axios.get(`/api/v1/training/staff/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTrainingRecords(trainingRes.data);
        } catch (err) {
            notifications.show({ title: 'Error', message: 'Failed to delete record', color: 'red' });
        }
    };

    const handleMarkComplete = async (courseItem: any, existingCert: any, subModule: string | null = null) => {
        try {
            const token = localStorage.getItem('token');
            let certId = existingCert?.id;
            const userId = profile.user?.id || profile.id;

            if (!certId) {
                // Create the record first
                const createRes = await axios.post('/api/v1/certificates', {
                    userId: userId,
                    courseName: courseItem.course || courseItem.title,
                    provider: courseItem.provider,
                    monthNumber: courseItem.month,
                    subModule: subModule // Sending subModule to backend so it's saved in entity
                }, { headers: { Authorization: `Bearer ${token}` } });
                certId = createRes.data.id;
            }

            // Mark Complete
            await axios.patch(`/api/v1/certificates/${certId}/complete`, { subModule }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifications.show({ title: 'Success', message: 'Certificate generated successfully.', color: '#267FBA' });

            // Refresh certificates
            const certResponse = await axios.get(`/api/v1/certificates/staff/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCertificates(certResponse.data.flatMap((g: any) => g.certificates));

            // Refresh Training Records
            const trainingRes = await axios.get(`/api/v1/training/staff/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTrainingRecords(trainingRes.data);

        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Failed to generate certificate.', color: 'red' });
        }
    };

    const handleMarkIncomplete = async (certificateId: string) => {
        try {
            const token = localStorage.getItem('token');
            const userId = profile.user?.id || profile.id;
            
            await axios.patch(`/api/v1/certificates/${certificateId}/incomplete`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            notifications.show({ title: 'Updated', message: 'Certificate marked as incomplete.', color: 'blue' });

            // Refresh
            const certResponse = await axios.get(`/api/v1/certificates/staff/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            setCertificates(certResponse.data.flatMap((g: any) => g.certificates));
            const trainingRes = await axios.get(`/api/v1/training/staff/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            setTrainingRecords(trainingRes.data);

        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to update status.', color: 'red' });
        }
    };

    const fetchCertificateViewToken = async (certificateId: string, token: string) => {
        const response = await axios.post(`/api/v1/certificates/${certificateId}/view-token`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data.token as string;
    };

    const resolveCertificateViewerUrl = async (certificateId: string, token: string) => {
        // Retry once when stream token expires between token issue and stream request.
        for (let attempt = 0; attempt < 2; attempt++) {
            const viewToken = await fetchCertificateViewToken(certificateId, token);
            const streamUrl = `/api/v1/certificates/${certificateId}/stream?token=${viewToken}`;
            try {
                const streamResponse = await axios.get(streamUrl, { responseType: 'blob' });
                return window.URL.createObjectURL(streamResponse.data);
            } catch (streamErr: any) {
                if (streamErr?.response?.status === 401 && attempt === 0) {
                    continue;
                }
                throw streamErr;
            }
        }
        throw new Error('Could not create certificate stream URL');
    };

    const handleCertificateAction = async (certificateId: string, courseName: string, action: 'view' | 'download') => {
        if (action === 'download' && !isAdmin) {
            notifications.show({
                title: 'Action Restricted',
                message: 'Direct downloads are disabled for security. Please use the "View" option.',
                color: 'orange'
            });
            return;
        }

        try {
            setCertLoading(true);
            const token = localStorage.getItem('token');

            if (action === 'view') {
                const viewerUrl = await resolveCertificateViewerUrl(certificateId, token || '');

                setViewingCert({ id: certificateId, title: courseName, url: viewerUrl });
                setShowCertModal(true);
                setIsSecureVisible(true);
            } else if (action === 'download' && isAdmin) {
                const response = await axios.get(`/api/v1/certificates/${certificateId}/download`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    responseType: 'blob'
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${courseName.replace(/\s/g, '_')}_Certificate.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode?.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
        } catch (error: any) {
            console.error('Certificate action failed:', error);
            let message = 'Could not process certificate request.';
            if (error.response?.status === 403) message = 'Certificate access denied. Please confirm certificate status is Completed and belongs to this account.';
            if (error.response?.status === 401) message = 'Certificate view token expired. Please click View again.';

            notifications.show({
                title: 'Error',
                message: message,
                color: 'red'
            });
        } finally {
            setCertLoading(false);
        }
    };

    if (loading) return <Center h="100vh"><Text>Loading Profile...</Text></Center>;

    if (!profile && hasDashboardAccess() && (window.location.pathname.includes('/me') || !id)) {
        return (
            <Center h="100vh">
                <Stack align="center">
                    <Title order={3}>Admin View</Title>
                    <Text>Admins do not have a public staff profile.</Text>
                    <Button component={Link} to="/dashboard" variant="light">Go to Dashboard</Button>
                </Stack>
            </Center>
        );
    }

    if (!profile) return <Center h="100vh"><Text>Profile not found.</Text></Center>;

    const staffName = [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || profile.firstName || 'Staff';
    const staffRole = profile.department || 'Care Staff';

    return (
        <Box p={{ base: 'md', sm: 'lg', md: 'xl' }} bg="#F8F9FA" style={{ minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
            <style>{`
                .tab-personal[data-active] { background-color: #139639 !important; color: white !important; box-shadow: 0 4px 12px rgba(19, 150, 57, 0.3) !important; }
                .tab-training[data-active] { background-color: #267FBA !important; color: white !important; box-shadow: 0 4px 12px rgba(38, 127, 186, 0.3) !important; }
                .tab-certificates[data-active] { background-color: #267FBA !important; color: white !important; box-shadow: 0 4px 12px rgba(38, 127, 186, 0.3) !important; }
                .tab-work-performance[data-active] { background-color: #C62828 !important; color: white !important; box-shadow: 0 4px 12px rgba(198, 40, 40, 0.3) !important; }
                .tab-monthly-report[data-active] { background-color: #00897B !important; color: white !important; box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3) !important; }
                .tab-recruitment[data-active] {
                    background-color: #139639 !important;
                    color: #000000 !important;
                    border-color: #139639 !important;
                }
                .tab-dbs[data-active] {
                    background-color: #139639 !important;
                    color: #000000 !important;
                    border-color: #139639 !important;
                }
                .tab-inhouse-training[data-active] {
                    background-color: #139639 !important;
                    color: #000000 !important;
                    border-color: #139639 !important;
                }
            `}</style>
            <Container size="xl" p={0} style={{ width: '100%', maxWidth: '100%' }}>
                {/* Profile Banner */}
                <Paper
                    p={{ base: 'md', sm: 'lg', md: 'xl' }}
                    radius={24}
                    mb={{ base: 'md', sm: 'lg', md: 'xl' }}
                    style={{
                        background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(19, 150, 57, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <Box style={{
                        position: 'absolute',
                        top: -40,
                        right: -40,
                        width: '300px',
                        height: '300px',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                        borderRadius: '50%'
                    }} />

                    <Group gap={40} align="center" style={{ position: 'relative', zIndex: 1 }}>
                        <Box style={{ position: 'relative' }}>
                            <Avatar
                                size={96}
                                radius={96}
                                src={profilePictureUrl || null}
                                variant="filled"
                                styles={{
                                    root: {
                                        background: profilePictureUrl ? 'transparent' : 'rgba(0,0,0,0.2)',
                                        border: '4px solid rgba(255,255,255,0.3)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                        backdropFilter: 'blur(4px)',
                                        objectFit: 'cover'
                                    },
                                    placeholder: {
                                        color: 'white',
                                        fontSize: '48px',
                                        fontWeight: 800,
                                        textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                                    },
                                    image: {
                                        objectFit: 'cover'
                                    }
                                }}
                            >
                                {!profilePictureUrl && profile.firstName?.[0]}{!profilePictureUrl && profile.lastName?.[0]}
                            </Avatar>
                            {(isAdmin || id === 'me' || window.location.pathname.includes('/me')) && (
                                <FileButton
                                    onChange={async (file) => {
                                        if (!file) return;
                                        try {
                                            const token = localStorage.getItem('token');
                                            const formData = new FormData();
                                            formData.append('file', file);
                                            
                                            // Determine target ID: if viewing own profile, use profile.user?.id, otherwise use id
                                            const targetId = (id === 'me' || window.location.pathname.includes('/me')) ? profile.user?.id : id;
                                            await axios.post(`/api/v1/staff/${targetId}/profile-picture`, formData, {
                                                headers: {
                                                    Authorization: `Bearer ${token}`,
                                                    'Content-Type': 'multipart/form-data'
                                                }
                                            });
                                            
                                            notifications.show({
                                                title: 'Success',
                                                message: 'Profile picture uploaded successfully',
                                                color: '#267FBA'
                                            });
                                            
                                            // Refresh profile data
                                            let endpoint = '';
                                            if (window.location.pathname.includes('/me') || !id) {
                                                endpoint = '/api/v1/staff/me';
                                            } else {
                                                endpoint = `/api/v1/staff/${targetId}`;
                                            }
                                            const profileRes = await axios.get(endpoint, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            setProfile(profileRes.data);
                                            
                                            // Reload profile picture as blob
                                            if (targetId) {
                                                try {
                                                    // Revoke old blob URL if exists
                                                    if (profilePictureUrl) {
                                                        URL.revokeObjectURL(profilePictureUrl);
                                                    }
                                                    const imageResponse = await axios.get(`/api/v1/staff/${targetId}/profile-picture`, {
                                                        headers: { Authorization: `Bearer ${token}` },
                                                        responseType: 'blob'
                                                    });
                                                    const blobUrl = URL.createObjectURL(imageResponse.data);
                                                    setProfilePictureUrl(blobUrl);
                                                } catch (error) {
                                                    console.error('Failed to reload profile picture:', error);
                                                    setProfilePictureUrl(null);
                                                }
                                            }
                                        } catch (error: any) {
                                            notifications.show({
                                                title: 'Error',
                                                message: error.response?.data?.message || 'Failed to upload profile picture',
                                                color: 'red'
                                            });
                                        }
                                    }}
                                    accept="image/png,image/jpeg,image/jpg,image/gif"
                                >
                                    {(props) => (
                                        <Tooltip label="Upload Profile Picture" withArrow position="bottom">
                                            <ActionIcon
                                                {...props}
                                                variant="filled"
                                                radius="xl"
                                                size={36}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 8,
                                                    right: 8,
                                                    background: '#139639',
                                                    border: '4px solid #005680',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Camera size={18} />
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </FileButton>
                            )}
                            {!(isAdmin || id === 'me' || window.location.pathname.includes('/me')) && (
                            <Tooltip label="Verified Active Staff" withArrow position="bottom">
                                <ThemeIcon
                                    variant="filled"
                                    radius="xl"
                                    size={36}
                                    style={{
                                        position: 'absolute',
                                        bottom: 8,
                                        right: 8,
                                        background: '#267FBA',
                                        border: '4px solid #005680',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <ShieldCheck size={18} />
                                </ThemeIcon>
                            </Tooltip>
                            )}
                        </Box>

                        <Stack gap={12}>
                            <Box>
                                <Group gap="sm" align="center" mb={4}>
                                    <Title order={1} size={36} fw={900} c="white" style={{ lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{staffName}</Title>
                                    <Badge
                                        variant="filled"
                                        size="lg"
                                        radius="sm"
                                        py={4}
                                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}
                                    >
                                        {staffRole}
                                    </Badge>
                                </Group>
                                <Group gap={6}>
                                    <User size={16} color="rgba(255,255,255,0.7)" />
                                    <Text size="md" fw={600} c="white" opacity={0.8}>Lets Care All Staff Member</Text>
                                </Group>
                            </Box>

                            <Group gap="xl" mt={6}>
                                <Group gap={10}>
                                    <ThemeIcon variant="filled" color="rgba(255,255,255,0.2)" size="xl" radius="md">
                                        <Briefcase size={20} color="white" />
                                    </ThemeIcon>
                                    <Box>
                                        <Text size="sm" fw={700} c="white" opacity={0.7} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Staff Number</Text>
                                        <Text size="md" fw={900} c="white">{profile.lcaNumber || 'N/A'}</Text>
                                    </Box>
                                </Group>

                                <Divider orientation="vertical" color="rgba(255,255,255,0.2)" />

                                <Group gap={10}>
                                    <ThemeIcon variant="filled" color="rgba(38, 127, 186, 0.8)" size="xl" radius="md">
                                        <Check size={20} color="white" />
                                    </ThemeIcon>
                                    <Box>
                                        <Text size="sm" fw={700} c="white" opacity={0.7} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Status</Text>
                                        <Group gap="xs">
                                            <Text size="md" fw={900} c="white">{employmentStatusLabel(profile.employmentStatus)}</Text>
                                            <Badge
                                                size="sm"
                                                color={employmentStatusBadgeColor(profile.employmentStatus)}
                                                variant="filled"
                                            >
                                                {profile.employmentStatus || 'ACTIVE'}
                                            </Badge>
                                        </Group>
                                    </Box>
                                </Group>
                            </Group>
                        </Stack>
                    </Group>
                </Paper>

                <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="xl" styles={{
                    tab: {
                        transition: 'all 0.2s ease',
                        fontWeight: 700,
                        fontSize: '15px',
                        padding: '12px 24px',
                        color: '#6c757d',
                        '&:hover': {
                            backgroundColor: '#F1F3F5',
                        },
                    },
                    list: {
                        backgroundColor: 'white',
                        padding: '6px',
                        borderRadius: '16px',
                        border: '1px solid #E9ECEF',
                        gap: '8px',
                        display: 'inline-flex'
                    }
                }}>
                    <Tabs.List 
                        mb="xl"
                        style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}
                    >
                        <Tabs.Tab 
                            value="personal" 
                            leftSection={<User size={18} />}
                            className="tab-personal"
                        >
                            Personal Details
                        </Tabs.Tab>
                        <Tabs.Tab 
                            value="training" 
                            leftSection={<FileSpreadsheet size={18} />}
                            className="tab-training"
                        >
                            Training Plan
                        </Tabs.Tab>
                        {canViewInHouseTraining && (
                        <Tabs.Tab 
                            value="inhouse-training" 
                            leftSection={<ClipboardList size={18} />}
                            className="tab-inhouse-training"
                        >
                            In-House Training Plan
                        </Tabs.Tab>
                        )}
                        <Tabs.Tab 
                            value="certificates" 
                            leftSection={<FileCheck size={18} />}
                            className="tab-certificates"
                        >
                            Certificates
                        </Tabs.Tab>
                        <Tabs.Tab 
                            value="dbs" 
                            leftSection={<Shield size={18} />}
                            className="tab-dbs"
                        >
                            DBS
                        </Tabs.Tab>
                        {canManage && (
                        <Tabs.Tab 
                            value="recruitment" 
                            leftSection={<ClipboardCheck size={18} />}
                            className="tab-recruitment"
                        >
                            Recruitment
                        </Tabs.Tab>
                        )}
                        {canViewHrNotes && (
                        <Tabs.Tab 
                            value="hr-notes" 
                            leftSection={<Lock size={18} />}
                            className="tab-hr-notes"
                        >
                            HR Notes
                        </Tabs.Tab>
                        )}
                        <Tabs.Tab 
                            value="leave-attendance" 
                            leftSection={<Calendar size={18} />}
                            className="tab-leave-attendance"
                        >
                            Leave & Attendance
                        </Tabs.Tab>
                        {canViewPayroll && (
                        <Tabs.Tab 
                            value="payroll" 
                            leftSection={<Banknote size={18} />}
                            className="tab-payroll"
                        >
                            Payroll
                        </Tabs.Tab>
                        )}
                        <Tabs.Tab 
                            value="work-performance" 
                            leftSection={<Briefcase size={18} />}
                            className="tab-work-performance"
                        >
                            Work and Performance
                        </Tabs.Tab>
                        <Tabs.Tab 
                            value="monthly-report" 
                            leftSection={<FileText size={18} />}
                            className="tab-monthly-report"
                        >
                            Reports
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="personal">
                        <PersonalInformationTab
                            profile={profile}
                            onProfileChange={handleProfileChange}
                            onSave={handleSaveProfile}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="dbs">
                        <DbsTab profile={profile} />
                    </Tabs.Panel>

                    {canManage && (
                    <Tabs.Panel value="recruitment">
                        <RecruitmentTab
                            profile={profile}
                            onEmploymentStatusChange={(status) =>
                                setProfile((p: typeof profile) => (p ? { ...p, employmentStatus: status } : p))
                            }
                        />
                    </Tabs.Panel>
                    )}

                    {canViewHrNotes && (
                    <Tabs.Panel value="hr-notes">
                        <HrNotesTab profile={profile} />
                    </Tabs.Panel>
                    )}

                    <Tabs.Panel value="leave-attendance">
                        <LeaveAttendanceTab profile={profile} />
                    </Tabs.Panel>

                    {canViewPayroll && (
                    <Tabs.Panel value="payroll">
                        <PayrollTab profile={profile} />
                    </Tabs.Panel>
                    )}

                    <Tabs.Panel value="training">
                        <Box mb="xl">
                            <Box 
                                p="lg" 
                                mb="md"
                                style={{ 
                                    background: 'linear-gradient(135deg, #267FBA 0%, #1d6a9e 100%)',
                                    borderRadius: '16px',
                                    display: 'inline-block',
                                    minWidth: '100%',
                                    boxShadow: '0 4px 12px rgba(38, 127, 186, 0.2)'
                                }}
                            >
                                <Group justify="space-between" align="center">
                                    <Group gap="md">
                                        <ThemeIcon 
                                            variant="filled" 
                                            size={48} 
                                            radius="md"
                                            style={{ 
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                backdropFilter: 'blur(10px)',
                                                border: '1px solid rgba(255, 255, 255, 0.3)'
                                            }}
                                        >
                                            <FileSpreadsheet size={24} color="white" />
                                        </ThemeIcon>
                                        <Box>
                                            <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                                Staff Development Tracker
                                            </Text>
                                            <Text size="sm" c="rgba(255,255,255,0.9)" fw={500} mt={4}>
                                                {isAdmin ? 'Manage assigned courses.' : 'My enrolled and completed courses.'}
                                            </Text>
                                        </Box>
                                    </Group>
                                    {/* Month dropdown - visible to both admin and staff (read-only for staff) */}
                                    <Select
                                        value={selectedTrainingMonth}
                                        onChange={setSelectedTrainingMonth}
                                        data={[
                                            { value: 'specialist', label: 'Specialist' },
                                            { value: 'other', label: 'Other' },
                                            ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: `Month ${i + 1}` }))
                                        ]}
                                        allowDeselect={false}
                                        leftSection={<Calendar size={18} />}
                                        w={200}
                                        styles={{
                                            input: {
                                                background: 'rgba(255, 255, 255, 0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                color: 'white',
                                                fontWeight: 700,
                                                backdropFilter: 'blur(4px)',
                                                '&::placeholder': { color: 'rgba(255,255,255,0.7)' }
                                            },
                                            dropdown: {
                                                background: 'white'
                                            }
                                        }}
                                    />
                                </Group>
                            </Box>

                            <Paper 
                                p="xl" 
                                radius="24" 
                                withBorder={false}
                                style={{ 
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                    boxShadow: '0 4px 20px rgba(19, 150, 57, 0.12)',
                                }}
                            >
                                <Table verticalSpacing="md" style={{ borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th 
                                                style={{ 
                                                    border: 'none', 
                                                    paddingLeft: 20,
                                                    background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    borderRadius: '12px 0 0 12px'
                                                }}
                                            >
                                                Course Name
                                            </Table.Th>
                                            <Table.Th 
                                                style={{ 
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                Type
                                            </Table.Th>
                                            <Table.Th 
                                                style={{ 
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                Enrollment Date
                                            </Table.Th>
                                            <Table.Th 
                                                style={{ 
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                Completion Date
                                            </Table.Th>
                                            <Table.Th 
                                                style={{ 
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                Status
                                            </Table.Th>
                                            <Table.Th 
                                                style={{ 
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '14px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}
                                            >
                                                Due
                                            </Table.Th>
                                            {canManage && (
                                                <Table.Th 
                                                    style={{ 
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                                                        color: 'white',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        borderRadius: '0 12px 12px 0'
                                                    }}
                                                >
                                                    Actions
                                                </Table.Th>
                                            )}
                                        </Table.Tr>
                                    </Table.Thead>
                                <Table.Tbody>
                                    {allCourses
                                        .filter(course => {
                                            // Use the same filtering logic for both admin and staff
                                            // Both admin and staff can filter by selected month
                                            const filterVal = selectedTrainingMonth || '1';

                                            // 1. Specialist Filter
                                            if (filterVal === 'specialist') {
                                                return course.categories.includes('specialist');
                                            }

                                            // 2. Other Filter
                                            if (filterVal === 'other') {
                                                return course.categories.includes('other');
                                            }

                                            // 3. Month Filter (1-12)
                                            // Must be strictly that month AND (Mandatory OR Additional)
                                            const courseMonth = (course.month || 0).toString();
                                            const isMonthMatch = courseMonth === filterVal;
                                            const isCategoryMatch = course.categories.includes('mandatory') || course.categories.includes('additional');

                                            return isMonthMatch && isCategoryMatch;
                                        })
                                        .flatMap((course) => {
                                            const courseRecords = trainingRecords.filter(r => r.courseName === course.title);
                                            // Explicit typing for rowsToRender
                                            const rowsToRender: any[] = [];

                                            // 1. Add rows for existing records
                                            courseRecords.forEach((record, recordIdx) => {
                                                rowsToRender.push({
                                                    type: 'existing',
                                                    record: record,
                                                    key: `${course.title}-existing-${record.id || recordIdx}`
                                                });
                                            });

                                            // 2. Add an empty "Pending" row if:
                                            //    - There are NO records at all (standard initial state)
                                            //    - OR It is Admin view AND it is an 'other' course (to allow adding DIFFERENT sub-modules)
                                            //    FIX: Prevent "Pending" row from appearing for Staff if they are already enrolled.
                                            if (courseRecords.length === 0 || (isAdmin && course.categories.includes('other'))) {
                                                rowsToRender.push({
                                                    type: 'new',
                                                    record: null,
                                                    key: `${course.title}-new`
                                                });
                                            }

                                            return rowsToRender.map((rowItem) => {
                                                const record = rowItem.record;
                                                const isCompleted = record?.status === 'COMPLETED';

                                                return (
                                                    <Table.Tr
                                                        key={rowItem.key}
                                                        style={{
                                                            background: isCompleted 
                                                                ? 'linear-gradient(135deg, #e6f5eb 0%, #e6f5eb 100%)'
                                                                : 'linear-gradient(135deg, #FFF3E0 0%, #FFF8F0 100%)',
                                                            borderRadius: 12,
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                                                        }}
                                                    >
                                                        <Table.Td 
                                                            fw={700} 
                                                            c="dark.8" 
                                                            style={{ 
                                                                border: 'none', 
                                                                paddingLeft: 20, 
                                                                verticalAlign: 'middle',
                                                                fontSize: '15px'
                                                            }}
                                                        >
                                                            {course.title}
                                                            {/* If record has a sub-module, show it. Else show list if available */}
                                                            {record?.subModule ? (
                                                                <Group gap={6} mt={4} align="center">
                                                                    <ThemeIcon 
                                                                        size={18} 
                                                                        radius="xl" 
                                                                        variant="gradient"
                                                                        gradient={{ from: 'grape.6', to: 'pink.6', deg: 90 }}
                                                                    >
                                                                        <Check size={10} />
                                                                    </ThemeIcon>
                                                                    <Text size="xs" c="grape.8" fw={700}>
                                                                        {record.subModule}
                                                                    </Text>
                                                                </Group>
                                                            ) : (
                                                                // Only show the list for the "New" row to hint at options, or if it's a standard course
                                                                rowItem.type === 'new' && course.subModules && course.subModules.length > 0 && (
                                                                    <List size="xs" type="ordered" mt={4} c="dimmed" spacing={2} style={{ paddingLeft: 0, listStylePosition: 'inside' }}>
                                                                        {course.subModules.map((sm: string, idx: number) => (
                                                                            <List.Item key={idx}>{sm}</List.Item>
                                                                        ))}
                                                                    </List>
                                                                )
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td style={{ border: 'none', verticalAlign: 'middle' }}>
                                                            {course.categories.map((c: string) => (
                                                                <Badge 
                                                                    key={c} 
                                                                    size="sm" 
                                                                    variant="gradient"
                                                                    gradient={c === 'mandatory' 
                                                                        ? { from: 'red.6', to: 'pink.6', deg: 90 }
                                                                        : { from: 'blue.6', to: 'cyan.6', deg: 90 }
                                                                    }
                                                                    mr={4}
                                                                    radius="md"
                                                                    fw={700}
                                                                    style={{ textTransform: 'capitalize' }}
                                                                >
                                                                    {c}
                                                                </Badge>
                                                            ))}
                                                        </Table.Td>
                                                        {/* UPDATED ENROLLMENT DATE CELL */}
                                                        <Table.Td style={{ border: 'none', verticalAlign: 'middle' }}>
                                                            <DateEditableCell
                                                                isAdmin={canManage}
                                                                date={record?.enrollmentDate || record?.createdAt || null}
                                                                onSave={(newDate) => handleEnrollmentSave(course.title, newDate, course.subModules || [])}
                                                            />
                                                        </Table.Td>
                                                        <Table.Td style={{ border: 'none', verticalAlign: 'middle' }}>
                                                            {/* Only allow setting completion if the record exists */}
                                                            {rowItem.type === 'existing' && (
                                                                <DateEditableCell
                                                                    isAdmin={canManage}
                                                                    date={record?.completedAt || null}
                                                                    onSave={async (newDate) => {
                                                                        const token = localStorage.getItem('token');
                                                                        const userId = profile.user?.id || profile.id;
                                                                        // For existing records, update by calling endpoint with enough info to identify it
                                                                        await axios.patch(`/api/v1/training/staff/${userId}/record`, {
                                                                            courseName: course.title,
                                                                            completedAt: newDate,
                                                                            subModule: record?.subModule // Include subModule to identify correct record
                                                                        }, { headers: { Authorization: `Bearer ${token}` } });

                                                                        const trainingRes = await axios.get(`/api/v1/training/staff/${userId}`, {
                                                                            headers: { Authorization: `Bearer ${token}` }
                                                                        });
                                                                        setTrainingRecords(trainingRes.data);
                                                                        notifications.show({ title: 'Updated', message: 'Completion date updated', color: '#267FBA' });
                                                                    }}
                                                                />
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td style={{ border: 'none', verticalAlign: 'middle' }}>
                                                            {isCompleted ? (
                                                                <Badge 
                                                                    variant="gradient"
                                                                    gradient={{ from: 'green.6', to: 'teal.6', deg: 90 }}
                                                                    size="lg" 
                                                                    px="md"
                                                                    radius="md"
                                                                    fw={700}
                                                                    leftSection={<Check size={14} />}
                                                                >
                                                                    Completed
                                                                </Badge>
                                                            ) : (
                                                                <Badge 
                                                                    variant="gradient"
                                                                    gradient={{ from: 'orange.6', to: 'yellow.6', deg: 90 }}
                                                                    size="lg" 
                                                                    px="md"
                                                                    radius="md"
                                                                    fw={700}
                                                                    leftSection={<Clock size={14} />}
                                                                >
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </Table.Td>
                                                        <Table.Td style={{ border: 'none', verticalAlign: 'middle' }}>
                                                            <Badge 
                                                                variant="light" 
                                                                color="brandBlue"
                                                                size="md"
                                                                radius="md"
                                                                fw={600}
                                                            >
                                                                {course.month === 0 ? 'Specialist/Other' : `Month ${course.month}`}
                                                            </Badge>
                                                        </Table.Td>
                                                        {canManage && (
                                                            <Table.Td style={{ border: 'none', verticalAlign: 'middle' }}>
                                                                {/* Show delete only for existing records */}
                                                                {rowItem.type === 'existing' && record && (
                                                                    <ActionIcon
                                                                        color="red"
                                                                        variant="filled"
                                                                        size="md"
                                                                        radius="md"
                                                                        onClick={() => {
                                                                            openConfirmation(
                                                                                'Delete Enrollment',
                                                                                'Are you sure you want to unenroll this staff member? This action cannot be undone.',
                                                                                () => handleDeleteRecord(record.id),
                                                                                'Delete',
                                                                                'red'
                                                                            );
                                                                        }}
                                                                        style={{
                                                                            background: 'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
                                                                            boxShadow: '0 2px 8px rgba(198, 40, 40, 0.3)'
                                                                        }}
                                                                    >
                                                                        <Trash size={16} />
                                                                    </ActionIcon>
                                                                )}
                                                            </Table.Td>
                                                        )}
                                                    </Table.Tr>
                                                );
                                            });
                                        })}
                                </Table.Tbody>
                            </Table>
                            </Paper>
                        </Box>
                    </Tabs.Panel>

                    {canViewInHouseTraining && (
                    <Tabs.Panel value="inhouse-training">
                        <InHouseTrainingTab profile={profile} canEdit={canEditInHouseTraining} />
                    </Tabs.Panel>
                    )}

                    <Tabs.Panel value="certificates">
                        <Paper p="xl" radius="24px" shadow="xs" bg="white">
                            <Group justify="space-between" mb="xl">
                                <Box>
                                    <Title order={4} size={20} fw={800} c="dark.4">My Credentials</Title>
                                    <Text size="sm" c="dimmed">Your verified academic and professional certificates.</Text>
                                </Box>
                                <Badge size="lg" variant="gradient" gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }}>
                                    {certificates.filter(c => c.status === 'Completed').length} Verified
                                </Badge>
                            </Group>

                            {/* STAFF VIEW: Flat list of ALL COMPLETED certs. */}
                            {!isAdmin && (
                                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                    {certificates.filter(c => c.status === 'Completed').map((cert, index) => {
                                        const cardGradients = [
                                            'linear-gradient(145deg, #139639 0%, #0e7a2d 100%)', // Blue
                                            'linear-gradient(145deg, #267FBA 0%, #267FBA 100%)'  // Green
                                        ];
                                        const bgIdx = index % cardGradients.length;
                                        const bg = cardGradients[bgIdx];
                                        const shadow = bgIdx === 0 ? 'rgba(19, 150, 57, 0.3)' 
                                            : 'rgba(38, 127, 186, 0.3)';

                                        return (
                                            <Paper
                                                key={cert.id}
                                                p={0}
                                                radius="24"
                                                withBorder={false}
                                                style={{
                                                    overflow: 'hidden',
                                                    transition: 'all 0.2s ease',
                                                    background: bg,
                                                    boxShadow: `0 10px 40px ${shadow}`,
                                                    position: 'relative'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                                    e.currentTarget.style.boxShadow = `0 20px 50px ${shadow}`;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = `0 10px 40px ${shadow}`;
                                                }}
                                            >
                                                {/* Decorative Circles */}
                                                <Box style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                                                <Box style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                                                <Box p="sm" style={{ position: 'relative', zIndex: 1 }}>
                                                    <Group justify="space-between" align="flex-start" mb="xs">
                                                        <ThemeIcon
                                                            variant="filled"
                                                            size={40}
                                                            radius="md"
                                                            style={{
                                                                background: 'rgba(0, 0, 0, 0.25)',
                                                                backdropFilter: 'blur(4px)',
                                                                border: '1px solid rgba(255, 255, 255, 0.25)',
                                                                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)',
                                                            }}
                                                        >
                                                            <FileCheck size={18} color="white" />
                                                        </ThemeIcon>
                                                        <Badge 
                                                            variant="gradient"
                                                            gradient={{ from: 'green.6', to: 'teal.6', deg: 90 }}
                                                            size="sm"
                                                            radius="md"
                                                            fw={700}
                                                            leftSection={<Check size={12} />}
                                                        >
                                                            Verified
                                                        </Badge>
                                                    </Group>

                                                    <Text size="sm" fw={800} c="white" mb={4} lineClamp={2}>
                                                        {cert.courseName}
                                                    </Text>
                                                    <Text size="xs" c="white" opacity={0.7} mb="xs">
                                                        {cert.provider}
                                                    </Text>

                                                    <Box
                                                        p="xs"
                                                        bg="rgba(0,0,0,0.1)"
                                                        style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '0 0 12px 12px' }}
                                                    >
                                                        <Button 
                                                            variant="filled"
                                                            size="xs"
                                                            fullWidth
                                                            style={{
                                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                                                color: 'white',
                                                                fontWeight: 700,
                                                                backdropFilter: 'blur(4px)',
                                                                padding: '4px 8px',
                                                                height: '28px',
                                                                fontSize: '11px'
                                                            }}
                                                            leftSection={<Eye size={12} />} 
                                                            onClick={() => handleCertificateAction(cert.id, cert.courseName, 'view')}
                                                        >
                                                            View Certificate
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </Paper>
                                        );
                                    })}
                                    {certificates.filter(c => c.status === 'Completed').length === 0 && (
                                        <Text c="dimmed" ta="center" fs="italic" style={{ gridColumn: '1 / -1' }}>No completed certificates found.</Text>
                                    )}
                                </SimpleGrid>
                            )}

                            {/* ADMIN VIEW: Grouped Sections */}
                            {isAdmin && (
                                <Stack gap="xl">
                                    {/* 1. MANDATORY & ADDITIONAL SECTION (Grouped by Month 1-12) */}
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                                        // UPDATED: Include BOTH Mandatory AND Additional categories
                                        const monthCourses = allCourses.filter(c =>
                                            (c.categories.includes('mandatory') || c.categories.includes('additional')) &&
                                            c.month === month
                                        );

                                        if (monthCourses.length === 0) return null;

                                        return (
                                            <Box key={`mandatory-${month}`}>
                                                <Divider
                                                    label={<Text fw={700} c="brandBlue.6" size="sm" tt="uppercase">MANDATORY & ADDITIONAL - MONTH {month}</Text>}
                                                    labelPosition="left"
                                                    mb="md"
                                                />
                                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                                    {monthCourses.map((courseItem: any) => {
                                                        const certificate = certificates.find(c => c.courseName === courseItem.title);
                                                        const isCompleted = certificate?.status === 'Completed';

                                                        return (
                                                            <CertificateCard
                                                                key={courseItem.id}
                                                                title={courseItem.title}
                                                                provider={courseItem.provider}
                                                                isCompleted={isCompleted}
                                                                onView={() => handleCertificateAction(certificate?.id, courseItem.title, 'view')}
                                                                onDownload={() => handleCertificateAction(certificate?.id, courseItem.title, 'download')}
                                                                onComplete={() => openConfirmation('Confirm Completion', `Mark '${courseItem.title}' as complete?`, () => handleMarkComplete({ ...courseItem, course: courseItem.title }, certificate))}
                                                                onIncomplete={() => openConfirmation('Revert Status', `Mark '${courseItem.title}' as incomplete?`, () => handleMarkIncomplete(certificate?.id))}
                                                                isAdmin={isAdmin}
                                                            />
                                                        );
                                                    })}
                                                </SimpleGrid>
                                            </Box>
                                        );
                                    })}

                                    {/* 2. SPECIALIST SECTION */}
                                    {(() => {
                                        const specialistCourses = allCourses.filter(c => c.categories.includes('specialist'));
                                        if (specialistCourses.length === 0) return null;
                                        return (
                                            <Box>
                                                <Divider label={<Text fw={700} c="orange.7" size="sm" tt="uppercase">SPECIALIST COURSES</Text>} labelPosition="left" mb="md" />
                                                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                                    {specialistCourses.map((courseItem: any) => {
                                                        const certificate = certificates.find(c => c.courseName === courseItem.title);
                                                        const isCompleted = certificate?.status === 'Completed';
                                                        return (
                                                            <CertificateCard
                                                                key={courseItem.id}
                                                                title={courseItem.title}
                                                                provider={courseItem.provider}
                                                                isCompleted={isCompleted}
                                                                onView={() => handleCertificateAction(certificate?.id, courseItem.title, 'view')}
                                                                onDownload={() => handleCertificateAction(certificate?.id, courseItem.title, 'download')}
                                                                onComplete={() => openConfirmation('Confirm Completion', `Mark '${courseItem.title}' as complete?`, () => handleMarkComplete({ ...courseItem, course: courseItem.title }, certificate))}
                                                                onIncomplete={() => openConfirmation('Revert Status', `Mark '${courseItem.title}' as incomplete?`, () => handleMarkIncomplete(certificate?.id))}
                                                                isAdmin={isAdmin}
                                                            />
                                                        );
                                                    })}
                                                </SimpleGrid>
                                            </Box>
                                        );
                                    })()}

                                    {/* 3. OTHER SECTION (Iterating Training Records for Sub-modules) */}
                                    {(() => {
                                        const otherCourseTitles = allCourses.filter(c => c.categories.includes('other')).map(c => c.title);
                                        // Get records that belong to 'Other' courses
                                        const otherRecords = trainingRecords.filter(r => otherCourseTitles.includes(r.courseName));

                                        if (otherRecords.length > 0) {
                                            return (
                                                <Box>
                                                    <Divider label={<Text fw={700} c="grape.7" size="sm" tt="uppercase">OTHER / AD-HOC COURSES</Text>} labelPosition="left" mb="md" />
                                                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                                                        {otherRecords.map((record: any) => {
                                                            // For 'Other' courses, we want the certificate to be named after the sub-module if present.
                                                            // We check if a certificate exists for either the sub-module name OR the parent course name + subModule match
                                                            const targetName = record.subModule || record.courseName;
                                                            const certificate = certificates.find(c =>
                                                                (c.courseName === targetName) ||
                                                                (c.courseName === record.courseName && c.subModule === record.subModule)
                                                            );
                                                            const isCompleted = certificate?.status === 'Completed';

                                                            return (
                                                                <CertificateCard
                                                                    key={record.id}
                                                                    title={targetName} // Display Sub-Module as Main Title
                                                                    subtitle={record.courseName !== targetName ? record.courseName : ''}
                                                                    provider="Internal/External"
                                                                    isCompleted={isCompleted}
                                                                    onView={() => handleCertificateAction(certificate?.id, targetName, 'view')}
                                                                    onDownload={() => handleCertificateAction(certificate?.id, targetName, 'download')}
                                                                    // Pass subModule explicitly here
                                                                    onComplete={() => openConfirmation('Confirm Completion', `Mark '${targetName}' as complete?`, () => handleMarkComplete({ title: record.courseName, provider: 'Internal', month: 0 }, certificate, record.subModule))}
                                                                    onIncomplete={() => openConfirmation('Revert Status', `Mark '${targetName}' as incomplete?`, () => handleMarkIncomplete(certificate?.id))}
                                                                    isAdmin={isAdmin}
                                                                    canMutateCerts={canManage}
                                                                />
                                                            );
                                                        })}
                                                    </SimpleGrid>
                                                </Box>
                                            );
                                        }
                                        return null;
                                    })()}
                                </Stack>
                            )}
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="work-performance">
                        <Paper p="xl" radius="24px" shadow="xs">
                            <Group justify="space-between" mb="xl">
                                <Box>
                                    <Title order={4} size={20} fw={800}>Work and Performance</Title>
                                    <Text size="sm" c="dimmed">Manage reviews, supervision, and appraisals.</Text>
                            </Box>
                            </Group>

                            <Stack gap="xl">
                                <Tabs variant="pills" radius="xl" defaultValue="review" styles={{
                                    tab: {
                                        transition: 'all 0.3s ease',
                                        fontWeight: 800,
                                        padding: '12px 24px',
                                    },
                                    list: {
                                        backgroundColor: 'white',
                                        padding: '10px',
                                        borderRadius: '40px',
                                        border: '1px solid rgba(0,0,0,0.05)',
                                        display: 'inline-flex',
                                        gap: '8px'
                                    }
                                }}>
                                    <Tabs.List mb="xl">
                                        <Tabs.Tab value="review" leftSection={<FileText size={16} />} color="brandBlue.6">Review</Tabs.Tab>
                                        <Tabs.Tab value="appraisal" leftSection={<ClipboardList size={16} />} color="brandBlue.6">Appraisal</Tabs.Tab>
                                        <Tabs.Tab value="supervision" leftSection={<Users size={16} />} color="brandBlue.6">Supervision</Tabs.Tab>
                                    </Tabs.List>

                                    {/* Review Tab */}
                                    <Tabs.Panel value="review">
                                        {isAdmin && (
                                            <Group mb="lg">
                                                <Calendar size={20} color="gray" />
                                                <Select
                                                    placeholder="Select Review Type"
                                                    data={[
                                                        { value: '2nd Month', label: '2nd Month Review' },
                                                        { value: '3rd Month', label: '3rd Month Review' },
                                                        { value: '4th Month', label: '4th Month Review' },
                                                        { value: '8 Month', label: '8 Month Review' },
                                                        { value: '10 Month', label: '10 Month Review' }
                                                    ]}
                                                    onChange={(value) => {
                                                        if (value) {
                                                            setReviewFormType('review');
                                                            setReviewFormSubType(value);
                                                            // Full reset — clear all fields for a fresh new form
                                                            setReviewFormData({
                                                                staffName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
                                                                startDate: profile?.startDate || '',
                                                                dateOfReview: new Date().toISOString().split('T')[0],
                                                                documentationComments: '',
                                                                jobPerformanceGrade: '',
                                                                jobPerformanceReason: '',
                                                                trainingDevelopmentGrade: '',
                                                                trainingDevelopmentReason: '',
                                                                communicationSkillsGrade: '',
                                                                communicationSkillsReason: '',
                                                                attendancePunctualityGrade: '',
                                                                attendancePunctualityReason: '',
                                                                reviewerCommentOverallWork: '',
                                                                reviewerCommentProgressTraining: '',
                                                                reviewerCommentTeamWorking: '',
                                                                reviewerCommentAttendance: '',
                                                                recommendedForReview: '',
                                                                reviewReasons: '',
                                                                careStaffSignature: '',
                                                                careStaffDate: '',
                                                                reviewerSignature: '',
                                                                reviewerDate: '',
                                                                superviseeName: '',
                                                                supervisorName: '',
                                                                supervisionDate: '',
                                                                supervisionFrequency: '',
                                                                agreedActionsLastReview: '',
                                                                roleExperience: '',
                                                                newSkillsUsed: '',
                                                                challengesFaced: '',
                                                                trainingImplementation: '',
                                                                personalDevelopment: '',
                                                                goalsBeforeNextSupervision: '',
                                                                supervisorFeedback: '',
                                                                otherDiscussionAreas: '',
                                                                agreedActions: '',
                                                                superviseeSignature: '',
                                                                superviseeSignatureDate: '',
                                                                supervisorSignature: '',
                                                                supervisorSignatureDate: '',
                                                                biggestAchievement: '',
                                                                organisationValues: '',
                                                                remainingChallenges: '',
                                                                learningAndDevelopment: ''
                                                            });
                                                            setEditingReviewFormId(null); // Reset to null for new form
                                                            setIsViewMode(false);
                                                            setReviewFormModal(true);
                                                        }
                                                    }}
                                                    w={300}
                                                />
                                            </Group>
                                        )}
                                        <ReviewFormCards 
                                            forms={reviewForms.filter(f => f.formType === 'review')}
                                            onEdit={handleReviewFormEdit}
                                            onDelete={handleReviewFormDelete}
                                            onDownload={handleReviewFormDownload}
                                            onView={handleReviewFormView}
                                            isAdmin={isAdmin}
                                            canDelete={canManage}
                                        />
                                    </Tabs.Panel>

                                    {/* Appraisal Tab */}
                                    <Tabs.Panel value="appraisal">
                                        {isAdmin && (
                                            <Group mb="lg">
                                                <Calendar size={20} color="gray" />
                                                <Select
                                                    placeholder="Select Appraisal Type"
                                                    data={[
                                                        { value: '1st Year Appraisal', label: '1st Year Appraisal' },
                                                        { value: 'Second Year Appraisal', label: 'Second Year Appraisal' }
                                                    ]}
                                                    onChange={(value) => {
                                                        if (value) {
                                                            if (value === '1st Year Appraisal' || value === 'Second Year Appraisal') {
                                                                // Open 1st Year Appraisal form (same form for both)
                                                                setReviewFormSubType(value); // Set the subtype for modal title
                                                                setEditingAppraisalFormId(null); // Reset editing state for new form
                                                                setFirstYearAppraisalData({
                                                                    appraiseeName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
                                                                    appraiseeJobTitle: profile?.jobTitle || '',
                                                                    appraisalDate: new Date().toISOString().split('T')[0],
                                                                    keyResponsibilities: '', partsDoneWell: '', difficulties: '',
                                                                    supportFromManager: '', trainingNeeded: '', complianceResponsibilities: '',
                                                                    relationshipWithManagers: '', relationshipWithCoworkers: '',
                                                                    reviewerComments1: '', reviewerComments2: '', reviewerComments3: '',
                                                                    careerGoals2Years: '', careerGoals5Years: '', otherPoints: '', supportNeeded: '',
                                                                    capabilityScores: {}, newRoleRequirements: '', newRoleCapabilities: {},
                                                                    objectives: [{ objective: '', measure: '', score: '' }],
                                                                    appraiserName: 'Dalia Elsadany',
                                                                    appraiserJobTitle: '',
                                                                    appraiserDate: new Date().toISOString().split('T')[0],
                                                                    lengthInPosition: '', currentBusinessNeeds: '',
                                                                    gatheredInformation: '', currentPerformanceStrengths: '',
                                                                    appraiserObjectives: [{ objective: '', measure: '', score: '', comment: '' }],
                                                                    appraiserCapabilityScores: {}, appraiserNewRoleCapabilities: {},
                                                                    improvementDetails: '', developmentTraining: '',
                                                                    training1: '', training1How: '', training2: '', training2How: '', training3: '', training3How: '',
                                                                    jobDescriptionChanges: '', interviewNotes: '',
                                                                    appraiseeComments: '', appraiseeSignature: '', appraiserSignature: '',
                                                                    signatureDate: new Date().toISOString().split('T')[0],
                                                                    actionPlanName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
                                                                    actionPlanItems: [{ keyArea: '', actionPlan: '', targetDate: '' }]
                                                                });
                                                                setFirstYearAppraisalModal(true);
                                                            } else {
                                                                // Open regular review form for other appraisals
                                                                setReviewFormType('appraisal');
                                                                setReviewFormSubType(value);
                                                                setReviewFormData({
                                                                    staffName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
                                                                    startDate: profile?.startDate || '',
                                                                    dateOfReview: new Date().toISOString().split('T')[0],
                                                                    documentationComments: '',
                                                                    jobPerformanceGrade: '', jobPerformanceReason: '',
                                                                    trainingDevelopmentGrade: '', trainingDevelopmentReason: '',
                                                                    communicationSkillsGrade: '', communicationSkillsReason: '',
                                                                    attendancePunctualityGrade: '', attendancePunctualityReason: '',
                                                                    reviewerCommentOverallWork: '', reviewerCommentProgressTraining: '',
                                                                    reviewerCommentTeamWorking: '', reviewerCommentAttendance: '',
                                                                    recommendedForReview: '', reviewReasons: '',
                                                                    careStaffSignature: '', careStaffDate: '',
                                                                    reviewerSignature: '', reviewerDate: '',
                                                                    superviseeName: '', supervisorName: '',
                                                                    supervisionDate: '', supervisionFrequency: '',
                                                                    agreedActionsLastReview: '', roleExperience: '',
                                                                    newSkillsUsed: '', challengesFaced: '',
                                                                    trainingImplementation: '', personalDevelopment: '',
                                                                    goalsBeforeNextSupervision: '', supervisorFeedback: '',
                                                                    otherDiscussionAreas: '', agreedActions: '',
                                                                    superviseeSignature: '', superviseeSignatureDate: '',
                                                                    supervisorSignature: '', supervisorSignatureDate: '',
                                                                    biggestAchievement: '', organisationValues: '',
                                                                    remainingChallenges: '', learningAndDevelopment: ''
                                                                });
                                                                setEditingReviewFormId(null);
                                                                setIsViewMode(false);
                                                                setReviewFormModal(true);
                                                            }
                                                        }
                                                    }}
                                                    w={300}
                                                />
                                            </Group>
                                        )}
                                        <ReviewFormCards 
                                            forms={reviewForms.filter(f => f.formType === 'appraisal')}
                                            onEdit={handleReviewFormEdit}
                                            onDelete={handleReviewFormDelete}
                                            onDownload={handleReviewFormDownload}
                                            onView={handleReviewFormView}
                                            isAdmin={isAdmin}
                                            canDelete={canManage}
                                        />
                                    </Tabs.Panel>

                                    {/* Supervision Tab */}
                                    <Tabs.Panel value="supervision">
                                        {isAdmin && (
                                            <Group mb="lg">
                                                <Calendar size={20} color="gray" />
                                                <Select
                                                    placeholder="Select Supervision Type"
                                                    data={[
                                                        { value: '1st Year 6th Month', label: '1st Year 6th Month Supervision' },
                                                        { value: '2nd Year 6th Month', label: '2nd Year 6th Month Supervision' }
                                                    ]}
                                                    onChange={(value) => {
                                                        if (value) {
                                                            const staffFullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
                                                            const todayDate = new Date().toISOString().split('T')[0];
                                                            
                                                            setReviewFormType('supervision');
                                                            setReviewFormSubType(value);
                                                            setReviewFormData({
                                                                staffName: staffFullName,
                                                                startDate: profile?.startDate || '',
                                                                dateOfReview: todayDate,
                                                                superviseeName: staffFullName,
                                                                supervisionDate: todayDate,
                                                                documentationComments: '',
                                                                jobPerformanceGrade: '', jobPerformanceReason: '',
                                                                trainingDevelopmentGrade: '', trainingDevelopmentReason: '',
                                                                communicationSkillsGrade: '', communicationSkillsReason: '',
                                                                attendancePunctualityGrade: '', attendancePunctualityReason: '',
                                                                reviewerCommentOverallWork: '', reviewerCommentProgressTraining: '',
                                                                reviewerCommentTeamWorking: '', reviewerCommentAttendance: '',
                                                                recommendedForReview: '', reviewReasons: '',
                                                                careStaffSignature: '', careStaffDate: '',
                                                                reviewerSignature: '', reviewerDate: '',
                                                                supervisorName: '', supervisionFrequency: '',
                                                                agreedActionsLastReview: '', roleExperience: '',
                                                                newSkillsUsed: '', challengesFaced: '',
                                                                trainingImplementation: '', personalDevelopment: '',
                                                                goalsBeforeNextSupervision: '', supervisorFeedback: '',
                                                                otherDiscussionAreas: '', agreedActions: '',
                                                                superviseeSignature: '', superviseeSignatureDate: '',
                                                                supervisorSignature: '', supervisorSignatureDate: '',
                                                                biggestAchievement: '', organisationValues: '',
                                                                remainingChallenges: '', learningAndDevelopment: ''
                                                            });
                                                            setEditingReviewFormId(null);
                                                            setIsViewMode(false);
                                                            setSupervisionFormModal(true);
                                                        }
                                                    }}
                                                    w={300}
                                                />
                                            </Group>
                                        )}
                                        <ReviewFormCards 
                                            forms={reviewForms.filter(f => f.formType === 'supervision')}
                                            onEdit={handleReviewFormEdit}
                                            onDelete={handleReviewFormDelete}
                                            onDownload={handleReviewFormDownload}
                                            onView={handleReviewFormView}
                                            isAdmin={isAdmin}
                                            canDelete={canManage}
                                        />
                                    </Tabs.Panel>

                                </Tabs>
                            </Stack>
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="monthly-report">
                        <Box 
                            p="xl" 
                            style={{ 
                                background: 'linear-gradient(135deg, #00897B 0%, #00ACC1 100%)',
                                borderRadius: '24px',
                                boxShadow: '0 8px 24px rgba(0, 137, 123, 0.25)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                            <Box style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                            
                            <Stack gap="xl" style={{ position: 'relative', zIndex: 1 }}>
                                <Group gap="md" align="center">
                                    <ThemeIcon 
                                        variant="filled" 
                                        size={56} 
                                        radius="md"
                                        style={{ 
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid rgba(255, 255, 255, 0.3)'
                                        }}
                                    >
                                        <FileText size={28} color="white" />
                                    </ThemeIcon>
                                    <Box>
                                        <Title order={3} size={28} fw={900} c="white" mb={4}>Activity Reports</Title>
                                        <Text size="md" c="rgba(255,255,255,0.9)" fw={500}>{isAdmin ? 'Generate and view comprehensive reports with training, reviews, and appraisals' : 'View comprehensive reports with training, reviews, and appraisals'}</Text>
                                    </Box>
                                </Group>

                                <Tabs defaultValue="monthly" variant="pills" radius="xl">
                                    <Tabs.List mb="xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '4px' }}>
                                        <Tabs.Tab 
                                            value="monthly" 
                                            leftSection={<Calendar size={16} />}
                                            style={{ 
                                                color: 'white', 
                                                fontWeight: 700,
                                                '&[data-active]': {
                                                    background: 'rgba(255,255,255,0.25)',
                                                    color: 'white'
                                                }
                                            }}
                                        >
                                            Reports
                                        </Tabs.Tab>
                                        <Tabs.Tab 
                                            value="yearly" 
                                            leftSection={<FileText size={16} />}
                                            style={{ 
                                                color: 'white', 
                                                fontWeight: 700,
                                                '&[data-active]': {
                                                    background: 'rgba(255,255,255,0.25)',
                                                    color: 'white'
                                                }
                                            }}
                                        >
                                            Yearly Report
                                        </Tabs.Tab>
                                        <Tabs.Tab 
                                            value="enrollment" 
                                            leftSection={<FileCheck size={16} />}
                                            style={{ 
                                                color: 'white', 
                                                fontWeight: 700,
                                                '&[data-active]': {
                                                    background: 'rgba(255,255,255,0.25)',
                                                    color: 'white'
                                                }
                                            }}
                                        >
                                            Enrollment & Completion
                                        </Tabs.Tab>
                                    </Tabs.List>

                                    <Tabs.Panel value="monthly">
                                        <Paper p="xl" radius="xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                                            <Stack gap="lg">
                                                <Title order={4} size={20} fw={800} c="dark.8">Monthly Activity Report</Title>
                                                <Group align="flex-end" gap="md" wrap="wrap">
                                                    <Select
                                                        label="Select Month"
                                                        placeholder="Select Month"
                                                        data={[
                                                            { value: '1', label: 'January' },
                                                            { value: '2', label: 'February' },
                                                            { value: '3', label: 'March' },
                                                            { value: '4', label: 'April' },
                                                            { value: '5', label: 'May' },
                                                            { value: '6', label: 'June' },
                                                            { value: '7', label: 'July' },
                                                            { value: '8', label: 'August' },
                                                            { value: '9', label: 'September' },
                                                            { value: '10', label: 'October' },
                                                            { value: '11', label: 'November' },
                                                            { value: '12', label: 'December' },
                                                        ]}
                                                        value={monthlyReportMonth || String(new Date().getMonth() + 1)}
                                                        onChange={(value) => setMonthlyReportMonth(value || String(new Date().getMonth() + 1))}
                                                        style={{ width: 200 }}
                                                        leftSection={<Calendar size={18} />}
                                                    />
                                                    <Select
                                                        label="Select Year"
                                                        placeholder="Select Year"
                                                        data={Array.from({ length: 5 }, (_, i) => {
                                                            const year = new Date().getFullYear() - i;
                                                            return { value: String(year), label: String(year) };
                                                        })}
                                                        value={monthlyReportYear || String(new Date().getFullYear())}
                                                        onChange={(value) => setMonthlyReportYear(value || String(new Date().getFullYear()))}
                                                        style={{ width: 150 }}
                                                    />
                                                    <Group gap="sm">
                                                        {canManage && (
                                                            <Button
                                                                leftSection={<Download size={18} />}
                                                                onClick={handleDownloadMonthlyReport}
                                                                loading={downloadingMonthlyReport}
                                                                variant="filled"
                                                                size="md"
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #00897B 0%, #00ACC1 100%)',
                                                                    color: 'white',
                                                                    fontWeight: 700,
                                                                    boxShadow: '0 4px 12px rgba(0, 137, 123, 0.3)',
                                                                }}
                                                            >
                                                                Download
                                                            </Button>
                                                        )}
                                                    </Group>
                                                </Group>
                                            </Stack>
                                        </Paper>
                                    </Tabs.Panel>

                                    <Tabs.Panel value="yearly">
                                        <Paper p="xl" radius="xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                                            <Stack gap="lg">
                                                <Title order={4} size={20} fw={800} c="dark.8">Yearly Activity Report</Title>
                                                <Group align="flex-end" gap="md" wrap="wrap">
                                                    <Select
                                                        label="Select Year"
                                                        placeholder="Select Year"
                                                        data={Array.from({ length: 5 }, (_, i) => {
                                                            const year = new Date().getFullYear() - i;
                                                            return { value: String(year), label: String(year) };
                                                        })}
                                                        value={yearlyReportYear || String(new Date().getFullYear())}
                                                        onChange={(value) => setYearlyReportYear(value || String(new Date().getFullYear()))}
                                                        style={{ width: 200 }}
                                                        leftSection={<Calendar size={18} />}
                                                    />
                                                    <Group gap="sm">
                                                        {canManage && (
                                                            <Button
                                                                leftSection={<Download size={18} />}
                                                                onClick={handleDownloadYearlyReport}
                                                                loading={downloadingYearlyReport}
                                                                variant="filled"
                                                                size="md"
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #00897B 0%, #00ACC1 100%)',
                                                                    color: 'white',
                                                                    fontWeight: 700,
                                                                    boxShadow: '0 4px 12px rgba(0, 137, 123, 0.3)',
                                                                }}
                                                            >
                                                                Download
                                                            </Button>
                                                        )}
                                                    </Group>
                                                </Group>
                                            </Stack>
                                        </Paper>
                                    </Tabs.Panel>

                                    <Tabs.Panel value="enrollment">
                                        <Paper p="xl" radius="xl" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
                                            <Stack gap="lg">
                                                <Title order={4} size={20} fw={800} c="dark.8">Enrollment and Completion Report</Title>
                                                <Text size="sm" c="dimmed">
                                                    This report shows all courses in the training plan with their enrollment dates and completion status.
                                                </Text>
                                                <Group align="flex-end" gap="md" wrap="wrap">
                                                    <Group gap="sm">
                                                        {canManage && (
                                                            <Button
                                                                leftSection={<Download size={18} />}
                                                                onClick={handleDownloadEnrollmentReport}
                                                                loading={downloadingEnrollmentReport}
                                                                variant="filled"
                                                                size="md"
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #267FBA 0%, #267FBA 100%)',
                                                                    color: 'white',
                                                                    fontWeight: 700,
                                                                    boxShadow: '0 4px 12px rgba(38, 127, 186, 0.3)',
                                                                }}
                                                            >
                                                                Download Report
                                                            </Button>
                                                        )}
                                                    </Group>
                                                </Group>
                                            </Stack>
                                        </Paper>
                                    </Tabs.Panel>
                                </Tabs>
                            </Stack>
                        </Box>
                    </Tabs.Panel>
                </Tabs>
            </Container>

            {/* Sub-Module Selection Modal */}
            <Modal
                opened={subModuleModalOpen}
                onClose={() => setSubModuleModalOpen(false)}
                title={<Title order={4}>Select Sub-Module</Title>}
                centered
                radius="md"
            >
                <Text size="sm" mb="md">
                    Please select the specific module or topic for <b>{pendingEnrollment?.courseName}</b>:
                </Text>
                <Select
                    label="Sub-Module"
                    placeholder="Select a module"
                    data={pendingEnrollment?.subModules || []}
                    value={selectedSubModule}
                    onChange={setSelectedSubModule}
                    mb="xl"
                />
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setSubModuleModalOpen(false)}>Cancel</Button>
                    <Button
                        color="brandBlue"
                        loading={enrollmentLoading}
                        disabled={!selectedSubModule}
                        onClick={confirmSubModuleEnrollment}
                    >
                        Save Enrollment
                    </Button>
                </Group>
            </Modal>

            {/* Secure Certificate Viewer Modal */}
            <Modal
                opened={showCertModal}
                onClose={() => {
                    if (viewingCert?.url?.startsWith('blob:')) {
                        window.URL.revokeObjectURL(viewingCert.url);
                    }
                    setShowCertModal(false);
                    setViewingCert(null);
                }}
                title={
                    <Group>
                        <ShieldCheck size={20} color="#267FBA" />
                        <Text fw={700} c="dark.4">Secure Certificate Viewer</Text>
                    </Group>
                }
                size="xl"
                radius="md"
                padding={0}
                styles={{
                    header: { backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee' },
                    body: { height: '80vh', overflow: 'hidden', position: 'relative', backgroundColor: '#525659' }
                }}
                onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
                        e.preventDefault();
                    }
                }}
            >
                <LoadingOverlay visible={certLoading} overlayProps={{ blur: 2 }} />
                {viewingCert && (
                    <Box
                        w="100%"
                        h="100%"
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ userSelect: 'none', position: 'relative' }}
                    >
                        {isSecureVisible ? (
                            <iframe
                                src={viewingCert.url}
                                width="100%"
                                height="100%"
                                style={{ border: 'none', display: 'block' }}
                                title="Certificate"
                            />
                        ) : (
                            <Center h="100%" bg="black">
                                <Stack align="center">
                                    <AlertTriangle size={64} color="red" />
                                    <Text c="white" fw={800} size="xl">Security Violation Detected</Text>
                                    <Text c="dimmed">Screenshots and Screen Recording are disabled.</Text>
                                </Stack>
                            </Center>
                        )}

                        <Box
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 50,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                pointerEvents: 'auto',
                                overflow: 'hidden',
                                background: 'transparent'
                            }}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            {isSecureVisible && (
                                <Box style={{ opacity: 0.1, textAlign: 'center' }}>
                                    <Text fz={40} fw={900} c="gray" style={{ transform: 'rotate(-45deg)', whiteSpace: 'nowrap', mb: 100 }}>
                                        CONFIDENTIAL - PREVIEW ONLY
                                    </Text>
                                    <Text fz={30} fw={700} c="gray" style={{ transform: 'rotate(-45deg)' }}>
                                        Staff: {staffName} | ID: {profile?.lcaNumber || profile?.ilccsNumber || 'N/A'}
                                    </Text>
                                    <Text fz={20} fw={500} c="gray" style={{ transform: 'rotate(-45deg)', mt: 100 }}>
                                        {new Date().toLocaleString()}
                                    </Text>
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Modal>

            {/* Confirmation Modal */}
            <Modal
                opened={confirmModal.opened}
                onClose={() => setConfirmModal((prev) => ({ ...prev, opened: false }))}
                title={<Title order={4}>{confirmModal.title}</Title>}
                centered
                radius="md"
            >
                <Text size="sm" mb="lg">{confirmModal.message}</Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={() => setConfirmModal((prev) => ({ ...prev, opened: false }))}>
                        Cancel
                    </Button>
                    <Button
                        color={confirmModal.color || 'brandBlue'}
                        onClick={() => {
                            confirmModal.onConfirm();
                            setConfirmModal((prev) => ({ ...prev, opened: false }));
                        }}
                    >
                        {confirmModal.confirmLabel || 'Confirm'}
                    </Button>
                </Group>
            </Modal>

            {/* Professional Reference Modal */}
            <Modal
                opened={professionalRefModal}
                onClose={() => setProfessionalRefModal(false)}
                title={
                    <Group>
                        <Briefcase size={20} />
                        <Title order={4}>Professional Reference</Title>
                    </Group>
                }
                centered
                size="lg"
                radius="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Full Name"
                        placeholder="Enter reference's full name"
                        value={referenceFormData.name}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, name: e.target.value })}
                        required
                        leftSection={<User size={16} />}
                    />
                    <TextInput
                        label="Position/Job Title"
                        placeholder="e.g., Manager, Director"
                        value={referenceFormData.position}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, position: e.target.value })}
                        required
                        leftSection={<Briefcase size={16} />}
                    />
                    <TextInput
                        label="Company/Organization"
                        placeholder="Company name"
                        value={referenceFormData.company}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, company: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Email Address"
                        placeholder="reference@example.com"
                        type="email"
                        value={referenceFormData.email}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, email: e.target.value })}
                        required
                        leftSection={<Mail size={16} />}
                    />
                    <TextInput
                        label="Phone Number"
                        placeholder="+44 7700 900000"
                        value={referenceFormData.phone}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, phone: e.target.value })}
                        leftSection={<Phone size={16} />}
                    />
                    <TextInput
                        label="Address"
                        placeholder="Company address"
                        value={referenceFormData.address}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, address: e.target.value })}
                    />
                    <Textarea
                        label="Notes"
                        placeholder="Additional information (optional)"
                        value={referenceFormData.notes}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, notes: e.target.value })}
                        minRows={3}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setProfessionalRefModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="brandBlue"
                            loading={referenceLoading}
                            onClick={async () => {
                                if (!referenceFormData.name || !referenceFormData.position || !referenceFormData.company || !referenceFormData.email) {
                                    notifications.show({
                                        title: 'Validation Error',
                                        message: 'Please fill in all required fields',
                                        color: 'red',
                                    });
                                    return;
                                }
                                setReferenceLoading(true);
                                try {
                                    const token = localStorage.getItem('token');
                                    const targetStaffId = profile?.id;
                                    if (!targetStaffId) {
                                        throw new Error('Staff profile ID not found');
                                    }
                                    
                                    const response = await axios.post(
                                        '/api/v1/references/send',
                                        {
                                            staffId: targetStaffId,
                                            referenceType: 'professional',
                                            name: referenceFormData.name,
                                            email: referenceFormData.email,
                                            phone: referenceFormData.phone,
                                            relationship: referenceFormData.position,
                                            yearsKnown: referenceFormData.notes,
                                            message: referenceFormData.notes,
                                        },
                                        {
                                            headers: { Authorization: `Bearer ${token}` },
                                        }
                                    );

                                    if (response.data.success) {
                                        notifications.show({
                                            title: 'Success',
                                            message: 'Reference request sent successfully. The referee will receive an email with a secure link to complete the form.',
                                            color: '#267FBA',
                                        });
                                        setProfessionalRefModal(false);
                                        setReferenceFormData({
                                            name: '',
                                            position: '',
                                            company: '',
                                            email: '',
                                            phone: '',
                                            relationship: '',
                                            address: '',
                                            notes: ''
                                        });
                                        // Refresh references list if needed
                                        const targetUserId = profile?.user?.id || id;
                                        if (targetUserId) {
                                            try {
                                                const refsResponse = await axios.get(`/api/v1/staff/${targetUserId}/references`, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                setReferences(refsResponse.data || []);
                                            } catch (err) {
                                                console.error('Failed to refresh references:', err);
                                            }
                                        }
                                    }
                                } catch (error: any) {
                                    const errorMessage = error.response?.data?.message || error.message || 'Failed to send reference request';
                                    notifications.show({
                                        title: 'Error',
                                        message: errorMessage,
                                        color: 'red',
                                    });
                                } finally {
                                    setReferenceLoading(false);
                                }
                            }}
                        >
                            Save Reference
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Personal Reference Modal */}
            <Modal
                opened={personalRefModal}
                onClose={() => setPersonalRefModal(false)}
                title={
                    <Group>
                        <User size={20} />
                        <Title order={4}>Personal Reference</Title>
                    </Group>
                }
                centered
                size="lg"
                radius="md"
            >
                <Stack gap="md">
                    <TextInput
                        label="Full Name"
                        placeholder="Enter reference's full name"
                        value={referenceFormData.name}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, name: e.target.value })}
                        required
                        leftSection={<User size={16} />}
                    />
                    <TextInput
                        label="Relationship"
                        placeholder="e.g., Friend, Colleague, Neighbor"
                        value={referenceFormData.relationship}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, relationship: e.target.value })}
                        required
                    />
                    <TextInput
                        label="Email Address"
                        placeholder="reference@example.com"
                        type="email"
                        value={referenceFormData.email}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, email: e.target.value })}
                        required
                        leftSection={<Mail size={16} />}
                    />
                    <TextInput
                        label="Phone Number"
                        placeholder="+44 7700 900000"
                        value={referenceFormData.phone}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, phone: e.target.value })}
                        required
                        leftSection={<Phone size={16} />}
                    />
                    <TextInput
                        label="Address"
                        placeholder="Home address"
                        value={referenceFormData.address}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, address: e.target.value })}
                    />
                    <Textarea
                        label="Notes"
                        placeholder="Additional information (optional)"
                        value={referenceFormData.notes}
                        onChange={(e) => setReferenceFormData({ ...referenceFormData, notes: e.target.value })}
                        minRows={3}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setPersonalRefModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="grape"
                            loading={referenceLoading}
                            onClick={async () => {
                                if (!referenceFormData.name || !referenceFormData.relationship || !referenceFormData.email || !referenceFormData.phone) {
                                    notifications.show({
                                        title: 'Validation Error',
                                        message: 'Please fill in all required fields',
                                        color: 'red',
                                    });
                                    return;
                                }
                                setReferenceLoading(true);
                                try {
                                    const token = localStorage.getItem('token');
                                    const targetStaffId = profile?.id;
                                    if (!targetStaffId) {
                                        throw new Error('Staff profile ID not found');
                                    }
                                    
                                    const response = await axios.post(
                                        '/api/v1/references/send',
                                        {
                                            staffId: targetStaffId,
                                            referenceType: 'personal',
                                            name: referenceFormData.name,
                                            email: referenceFormData.email,
                                            phone: referenceFormData.phone,
                                            relationship: referenceFormData.relationship,
                                            yearsKnown: referenceFormData.notes,
                                            message: referenceFormData.notes,
                                        },
                                        {
                                            headers: { Authorization: `Bearer ${token}` },
                                        }
                                    );

                                    if (response.data.success) {
                                        notifications.show({
                                            title: 'Success',
                                            message: 'Reference request sent successfully. The referee will receive an email with a secure link to complete the form.',
                                            color: '#267FBA',
                                        });
                                        setPersonalRefModal(false);
                                        setReferenceFormData({
                                            name: '',
                                            position: '',
                                            company: '',
                                            email: '',
                                            phone: '',
                                            relationship: '',
                                            address: '',
                                            notes: ''
                                        });
                                        // Refresh references list if needed
                                        const targetUserId = profile?.user?.id || id;
                                        if (targetUserId) {
                                            try {
                                                const refsResponse = await axios.get(`/api/v1/staff/${targetUserId}/references`, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                setReferences(refsResponse.data || []);
                                            } catch (err) {
                                                console.error('Failed to refresh references:', err);
                                            }
                                        }
                                    }
                                } catch (error: any) {
                                    const errorMessage = error.response?.data?.message || error.message || 'Failed to send reference request';
                                    notifications.show({
                                        title: 'Error',
                                        message: errorMessage,
                                        color: 'red',
                                    });
                                } finally {
                                    setReferenceLoading(false);
                                }
                            }}
                        >
                            Save Reference
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* ═══════ Supervision Form Modal (Branded) ═══════ */}
            <Modal
                opened={supervisionFormModal}
                onClose={() => { setSupervisionFormModal(false); setIsViewMode(false); setEditingReviewFormId(null); }}
                title={null}
                fullScreen
                radius={0}
                transitionProps={{ transition: 'fade', duration: 200 }}
                styles={{ header: { display: 'none' }, body: { padding: 0 } }}
            >
                <ScrollArea h="100vh" p="md">
                    <Box
                        style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 100,
                            background: 'white',
                            borderBottom: '1px solid #e9ecef',
                            padding: '12px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Text fw={700} size="lg">{reviewFormSubType} Supervision</Text>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            onClick={() => {
                                setSupervisionFormModal(false);
                                setIsViewMode(false);
                                setEditingReviewFormId(null);
                            }}
                        >
                            <X size={20} />
                        </ActionIcon>
                    </Box>
                    <Box p="xl" pb={60}>
                        <Paper p={0} radius="lg" withBorder style={{ border: '3px solid #267FBA', overflow: 'hidden' }}>
                            {/* Header */}
                            <Box style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '2px' }}>Lets Care All</Text>
                                    <Text size="lg" fw={800} c="white" mt={4}>One to One Supervision Recording Form</Text>
                                    <Text size="sm" c="rgba(255,255,255,0.8)" mt={2}>{reviewFormSubType}</Text>
                                </Box>
                                <img src="/assets/logo.png" alt="Logo" style={{ height: 55, borderRadius: '50%', background: 'white', padding: '4px' }} />
                            </Box>

                            <Box p="xl">
                                {/* ── Staff info ── */}
                                <SimpleGrid cols={2} mb="md">
                                    <TextInput label="Name of Supervisee" required value={reviewFormData.superviseeName}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setReviewFormData(p => ({ ...p, superviseeName: e.target.value }))} />
                                    <TextInput label="Name of Supervisor" value={reviewFormData.supervisorName}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setReviewFormData(p => ({ ...p, supervisorName: e.target.value }))} />
                                </SimpleGrid>
                                <SimpleGrid cols={2} mb="lg">
                                    <TextInput label="Date" type="date" required value={reviewFormData.supervisionDate}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setReviewFormData(p => ({ ...p, supervisionDate: e.target.value }))} />
                                    <TextInput label="Supervision Frequency" value={reviewFormData.supervisionFrequency}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setReviewFormData(p => ({ ...p, supervisionFrequency: e.target.value }))} />
                                </SimpleGrid>

                                <Box style={{ borderTop: '2px solid #139639' }} pt="lg">
                                    {/* ── 1st Year 6th Month Questions ── */}
                                    {reviewFormSubType === '1st Year 6th Month' && (
                                        <>
                                            <Textarea label="Agreed Actions from the Last Review or the topics for this supervisor" autosize minRows={3} mb="md"
                                                value={reviewFormData.agreedActionsLastReview} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, agreedActionsLastReview: e.target.value }))} />
                                            <Textarea label="How did you find your role as a care staff, and what have you learned?" autosize minRows={3} mb="md"
                                                value={reviewFormData.roleExperience} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, roleExperience: e.target.value }))} />
                                            <Textarea label="What are the new skills I have used as a care staff?" autosize minRows={3} mb="md"
                                                value={reviewFormData.newSkillsUsed} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, newSkillsUsed: e.target.value }))} />
                                            <Textarea label="What challenges have I faced since my last review, and how have I managed and overcome them?" autosize minRows={3} mb="md"
                                                value={reviewFormData.challengesFaced} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, challengesFaced: e.target.value }))} />
                                            <Textarea label="How do I continue to implement the knowledge which I gained from training for an organisation in my everyday work?" autosize minRows={3} mb="md"
                                                value={reviewFormData.trainingImplementation} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, trainingImplementation: e.target.value }))} />
                                            <Textarea label="What I like to learn for my personal development, and how I can put this learning into practice?" autosize minRows={3} mb="md"
                                                value={reviewFormData.personalDevelopment} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, personalDevelopment: e.target.value }))} />
                                            <Textarea label="What do I want to achieve before my next supervision?" autosize minRows={3} mb="md"
                                                value={reviewFormData.goalsBeforeNextSupervision} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, goalsBeforeNextSupervision: e.target.value }))} />
                                        </>
                                    )}

                                    {/* ── 2nd Year 6th Month Questions ── */}
                                    {reviewFormSubType === '2nd Year 6th Month' && (
                                        <>
                                            <Textarea label="Actions from the previous meeting" autosize minRows={3} mb="md"
                                                value={reviewFormData.agreedActionsLastReview} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, agreedActionsLastReview: e.target.value }))} />
                                            <Textarea label="What has been my biggest achievement since my last supervision?" autosize minRows={3} mb="md"
                                                value={reviewFormData.biggestAchievement} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, biggestAchievement: e.target.value }))} />
                                            <Textarea label="How do I continue to display the values of the organisation in my everyday work?" autosize minRows={3} mb="md"
                                                value={reviewFormData.organisationValues} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, organisationValues: e.target.value }))} />
                                            <Textarea label="What challenges have I faced since my last supervision and how have I managed and overcome them?" autosize minRows={3} mb="md"
                                                value={reviewFormData.challengesFaced} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, challengesFaced: e.target.value }))} />
                                            <Textarea label="Are there any challenges that remain? If so, what is needed to help me overcome them?" autosize minRows={3} mb="md"
                                                value={reviewFormData.remainingChallenges} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, remainingChallenges: e.target.value }))} />
                                            <Textarea label="What learning and development have I done since my last supervision and how have I put this learning into practice?" autosize minRows={3} mb="md"
                                                value={reviewFormData.learningAndDevelopment} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, learningAndDevelopment: e.target.value }))} />
                                            <Textarea label="What do I want to achieve before my next supervision?" autosize minRows={3} mb="md"
                                                value={reviewFormData.goalsBeforeNextSupervision} readOnly={isViewMode && !isAdmin}
                                                onChange={e => setReviewFormData(p => ({ ...p, goalsBeforeNextSupervision: e.target.value }))} />
                                        </>
                                    )}

                                    {/* ── Common fields for both ── */}
                                    <Box style={{ borderTop: '2px solid #267FBA' }} pt="lg" mt="lg">
                                        <Textarea label="Feedback from supervisor" autosize minRows={3} mb="md"
                                            value={reviewFormData.supervisorFeedback} readOnly={isViewMode && !isAdmin}
                                            onChange={e => setReviewFormData(p => ({ ...p, supervisorFeedback: e.target.value }))} />
                                        <Textarea label="Other areas of discussion" autosize minRows={3} mb="md"
                                            value={reviewFormData.otherDiscussionAreas} readOnly={isViewMode && !isAdmin}
                                            onChange={e => setReviewFormData(p => ({ ...p, otherDiscussionAreas: e.target.value }))} />
                                        <Textarea label="Agreed actions" autosize minRows={3} mb="md"
                                            value={reviewFormData.agreedActions} readOnly={isViewMode && !isAdmin}
                                            onChange={e => setReviewFormData(p => ({ ...p, agreedActions: e.target.value }))} />
                                    </Box>

                                    {/* ── Signatures ── */}
                                    <Box style={{ borderTop: '2px solid #139639' }} pt="lg" mt="lg">
                                        <SimpleGrid cols={2}>
                                            <Paper withBorder p="md" radius="md" style={{ borderColor: '#267FBA', background: !isAdmin ? '#f0fff4' : 'white' }}>
                                                <Text fw={700} size="sm" c="#267FBA" mb={4}>Supervisee</Text>
                                                <TextInput label="Name" size="sm" mb="xs" value={reviewFormData.superviseeName} readOnly />
                                                {!isAdmin ? (
                                                    <>
                                                        <SignaturePad
                                                            label={reviewFormData.superviseeSignature ? 'Your Signature' : '✍️ Click here to add your signature'}
                                                            value={reviewFormData.superviseeSignature}
                                                            onChange={async (sig: string) => {
                                                                const today = new Date().toISOString().split('T')[0];
                                                                setReviewFormData(p => ({ ...p, superviseeSignature: sig, superviseeSignatureDate: today }));
                                                                try {
                                                                    const token = localStorage.getItem('token');
                                                                    await axios.put(
                                                                        `/api/v1/staff/review-forms/${editingReviewFormId}`,
                                                                        { careStaffSignature: sig, careStaffDate: today },
                                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                                    );
                                                                    notifications.show({ title: 'Signed', message: 'Your signature has been saved.', color: '#267FBA' });
                                                                    const targetUserId = profile?.user?.id || profile?.id || id;
                                                                    const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, { headers: { Authorization: `Bearer ${token}` } });
                                                                    setReviewForms(reviewFormsRes.data);
                                                                } catch (err) {
                                                                    notifications.show({ title: 'Error', message: 'Failed to save signature.', color: 'red' });
                                                                }
                                                            }} />
                                                        {!reviewFormData.superviseeSignature && (
                                                            <Text size="xs" c="#267FBA" fw={600} mt={4} ta="center">👆 Tap above to open the signature pad</Text>
                                                        )}
                                                    </>
                                                ) : (
                                                    <SignaturePad label="Supervisee Signature" value={reviewFormData.superviseeSignature}
                                                        onChange={(sig: string) => {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            setReviewFormData(p => ({ ...p, superviseeSignature: sig, superviseeSignatureDate: today }));
                                                        }} />
                                                )}
                                                <TextInput label="Date" type="date" size="sm" mt="xs" value={reviewFormData.superviseeSignatureDate}
                                                    readOnly={isViewMode && !isAdmin}
                                                    onChange={e => setReviewFormData(p => ({ ...p, superviseeSignatureDate: e.target.value }))} />
                                            </Paper>
                                            <Paper withBorder p="md" radius="md" style={{ borderColor: '#139639' }}>
                                                <Text fw={700} size="sm" c="#139639" mb={4}>Supervisor</Text>
                                                <TextInput label="Name" size="sm" mb="xs" value={reviewFormData.supervisorName} readOnly />
                                                {isAdmin ? (
                                                    <SignaturePad label="Supervisor Signature" value={reviewFormData.supervisorSignature}
                                                        onChange={(sig: string) => setReviewFormData(p => ({ ...p, supervisorSignature: sig }))} />
                                                ) : (
                                                    <>
                                                        {reviewFormData.supervisorSignature ? (
                                                            <Paper withBorder p="xs" style={{ display: 'inline-block' }}>
                                                                <img src={reviewFormData.supervisorSignature} alt="Supervisor Signature" style={{ maxWidth: '200px', maxHeight: '80px', display: 'block' }} />
                                                            </Paper>
                                                        ) : (
                                                            <Paper withBorder p="md" style={{ textAlign: 'center', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
                                                                <Text size="sm" c="dimmed">Awaiting supervisor signature</Text>
                                                            </Paper>
                                                        )}
                                                    </>
                                                )}
                                                <TextInput label="Date" type="date" size="sm" mt="xs" value={reviewFormData.supervisorSignatureDate}
                                                    readOnly={!isAdmin}
                                                    onChange={e => setReviewFormData(p => ({ ...p, supervisorSignatureDate: e.target.value }))} />
                                            </Paper>
                                        </SimpleGrid>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>

                        {/* ── Action buttons ── */}
                        <Group justify="flex-end" mt="xl">
                            <Button variant="default" onClick={() => { setSupervisionFormModal(false); setIsViewMode(false); setEditingReviewFormId(null); }}>
                                {isViewMode && !isAdmin ? 'Close' : 'Cancel'}
                            </Button>
                            {(isAdmin || (!isAdmin && isViewMode)) && (
                                <Button
                                    loading={reviewFormLoading}
                                    style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)' }}
                                    onClick={async () => {
                                        if (!reviewFormData.superviseeName || !reviewFormData.supervisionDate) {
                                            notifications.show({ title: 'Validation', message: 'Please fill in required fields', color: 'red' });
                                            return;
                                        }
                                        setReviewFormLoading(true);
                                        try {
                                            const token = localStorage.getItem('token');
                                            const targetUserId = profile?.user?.id || profile?.id || id;
                                            const supervisionPayload = {
                                                formType: 'supervision',
                                                formSubType: reviewFormSubType,
                                                staffName: reviewFormData.staffName || reviewFormData.superviseeName,
                                                startDate: reviewFormData.startDate || null,
                                                dateOfReview: reviewFormData.supervisionDate || reviewFormData.dateOfReview,
                                                documentationComments: JSON.stringify({
                                                    type: 'supervision',
                                                    data: {
                                                        superviseeName: reviewFormData.superviseeName,
                                                        supervisorName: reviewFormData.supervisorName,
                                                        supervisionDate: reviewFormData.supervisionDate,
                                                        supervisionFrequency: reviewFormData.supervisionFrequency,
                                                        agreedActionsLastReview: reviewFormData.agreedActionsLastReview,
                                                        roleExperience: reviewFormData.roleExperience,
                                                        newSkillsUsed: reviewFormData.newSkillsUsed,
                                                        challengesFaced: reviewFormData.challengesFaced,
                                                        trainingImplementation: reviewFormData.trainingImplementation,
                                                        personalDevelopment: reviewFormData.personalDevelopment,
                                                        goalsBeforeNextSupervision: reviewFormData.goalsBeforeNextSupervision,
                                                        supervisorFeedback: reviewFormData.supervisorFeedback,
                                                        otherDiscussionAreas: reviewFormData.otherDiscussionAreas,
                                                        agreedActions: reviewFormData.agreedActions,
                                                        superviseeSignature: reviewFormData.superviseeSignature,
                                                        superviseeSignatureDate: reviewFormData.superviseeSignatureDate,
                                                        supervisorSignature: reviewFormData.supervisorSignature,
                                                        supervisorSignatureDate: reviewFormData.supervisorSignatureDate,
                                                        biggestAchievement: reviewFormData.biggestAchievement,
                                                        organisationValues: reviewFormData.organisationValues,
                                                        remainingChallenges: reviewFormData.remainingChallenges,
                                                        learningAndDevelopment: reviewFormData.learningAndDevelopment
                                                    }
                                                }),
                                                careStaffSignature: reviewFormData.superviseeSignature || null,
                                                careStaffDate: reviewFormData.superviseeSignatureDate || null,
                                                reviewerSignature: reviewFormData.supervisorSignature || null,
                                                reviewerDate: reviewFormData.supervisorSignatureDate || null,
                                            };
                                            if (editingReviewFormId) {
                                                await axios.put(`/api/v1/staff/review-forms/${editingReviewFormId}`, supervisionPayload,
                                                    { headers: { Authorization: `Bearer ${token}` } });
                                                notifications.show({ title: 'Updated', message: 'Supervision form updated', color: '#267FBA' });
                                            } else {
                                                await axios.post(`/api/v1/staff/${targetUserId}/review-forms`, supervisionPayload,
                                                    { headers: { Authorization: `Bearer ${token}` } });
                                                notifications.show({ title: 'Saved', message: 'Supervision form saved', color: '#267FBA' });
                                            }
                                            const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`,
                                                { headers: { Authorization: `Bearer ${token}` } });
                                            setReviewForms(reviewFormsRes.data);
                                            setSupervisionFormModal(false);
                                            setIsViewMode(false);
                                            setEditingReviewFormId(null);
                                        } catch (error: any) {
                                            let errorMessage = 'Failed to save supervision form';
                                            if (error.response?.status === 401) {
                                                errorMessage = 'Session expired. Please login again.';
                                                localStorage.removeItem('token'); localStorage.removeItem('role');
                                                setTimeout(() => { window.location.href = '/login'; }, 1500);
                                            } else if (error.response?.status === 403) {
                                                errorMessage = 'You do not have permission.';
                                            } else if (error.response?.data?.message) {
                                                errorMessage = error.response.data.message;
                                            }
                                            notifications.show({ title: 'Error', message: errorMessage, color: 'red' });
                                        } finally {
                                            setReviewFormLoading(false);
                                        }
                                    }}
                                >
                                    {isViewMode && !isAdmin ? 'Save Signature' : 'Save Supervision'}
                                </Button>
                            )}
                        </Group>
                    </Box>
                </ScrollArea>
            </Modal>

            {/* ═══════ 1st / 2nd Year Appraisal Form Modal ═══════ */}
            <Modal
                opened={firstYearAppraisalModal}
                onClose={() => {
                    setFirstYearAppraisalModal(false);
                    setIsViewMode(false);
                    setEditingAppraisalFormId(null);
                }}
                title={null}
                fullScreen
                radius={0}
                transitionProps={{ transition: 'fade', duration: 200 }}
                styles={{ header: { display: 'none' }, body: { padding: 0 } }}
            >
                <ScrollArea h="100vh" p="md">
                    <Box
                        style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 100,
                            background: 'white',
                            borderBottom: '1px solid #e9ecef',
                            padding: '12px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Text fw={700} size="lg">
                            {reviewFormSubType === 'Second Year Appraisal'
                                ? 'Second Year Appraisal'
                                : 'First Year Appraisal'}
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="lg"
                            onClick={() => {
                                setFirstYearAppraisalModal(false);
                                setIsViewMode(false);
                                setEditingAppraisalFormId(null);
                            }}
                        >
                            <X size={20} />
                        </ActionIcon>
                    </Box>
                    <Box p="xl" pb={60}>
                        {/* ── Branded header ── */}
                        <Paper p={0} radius="lg" withBorder style={{ border: '3px solid #267FBA', overflow: 'hidden' }}>
                            <Box style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '2px' }}>Lets Care All</Text>
                                    <Text size="lg" fw={800} c="white" mt={4}>
                                        {reviewFormSubType === 'Second Year Appraisal' ? 'Preparation for Appraisal Year 2025-26' : 'Preparation for Appraisal'}
                                    </Text>
                                    <Text size="sm" c="rgba(255,255,255,0.8)" mt={2}>{reviewFormSubType}</Text>
                                </Box>
                                <img src="/assets/logo.png" alt="Logo" style={{ height: 55, borderRadius: '50%', background: 'white', padding: '4px' }} />
                            </Box>

                            <Box p="xl">
                                <Text size="sm" c="dimmed" mb="md" style={{ fontStyle: 'italic' }}>
                                    This section is to be completed by the Appraisee prior to the appraisal interview.
                                </Text>

                                {/* ── Name / Job title / Date ── */}
                                <SimpleGrid cols={2} mb="md">
                                    <TextInput label="Name" required value={firstYearAppraisalData.appraiseeName}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiseeName: e.target.value }))} />
                                    <TextInput label="Job Title" value={firstYearAppraisalData.appraiseeJobTitle}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiseeJobTitle: e.target.value }))} />
                                </SimpleGrid>
                                <TextInput label="Date" type="date" mb="md" value={firstYearAppraisalData.appraisalDate}
                                    readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraisalDate: e.target.value }))} />

                                {/* ── Key responsibilities ── */}
                                <Textarea label="Describe your understanding of your key responsibilities and duties:" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.keyResponsibilities} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, keyResponsibilities: e.target.value }))} />

                                <Textarea label="Which parts of the job do you feel you do well?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.partsDoneWell} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, partsDoneWell: e.target.value }))} />

                                {/* ── Objectives table ── */}
                                <Text fw={700} size="sm" mb="xs" mt="lg" c="#139639">
                                    List the objectives you set out to achieve (Objective / Measure / Score 1–5)
                                </Text>
                                {(firstYearAppraisalData.objectives || []).map((obj, idx) => (
                                    <SimpleGrid cols={3} key={idx} mb="xs">
                                        <Textarea placeholder="Objective" value={obj.objective} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.objectives];
                                                updated[idx] = { ...updated[idx], objective: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, objectives: updated }));
                                            }} />
                                        <Textarea placeholder="Measure/Standard" value={obj.measure} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.objectives];
                                                updated[idx] = { ...updated[idx], measure: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, objectives: updated }));
                                            }} />
                                        <Select placeholder="Score" data={['1','2','3','4','5']} value={obj.score} readOnly={isViewMode && !isAdmin}
                                            onChange={v => {
                                                const updated = [...firstYearAppraisalData.objectives];
                                                updated[idx] = { ...updated[idx], score: v || '' };
                                                setFirstYearAppraisalData(p => ({ ...p, objectives: updated }));
                                            }} />
                                    </SimpleGrid>
                                ))}
                                {!(isViewMode && !isAdmin) && (
                                    <Button variant="light" size="xs" mb="md"
                                        onClick={() => setFirstYearAppraisalData(p => ({
                                            ...p,
                                            objectives: [...p.objectives, { objective: '', measure: '', score: '' }]
                                        }))}>+ Add Objective</Button>
                                )}

                                {/* ── Capability scores table ── */}
                                <Text fw={700} size="sm" mb="xs" mt="lg" c="#139639">
                                    Score your own capability (1=Poor, 2=Adequate, 3=Satisfactory, 4=Good, 5=Excellent)
                                </Text>
                                <Paper withBorder p="sm" mb="md" radius="md">
                                    {['Customer/ Clients Relations','Time Management','Reporting and Administration',
                                      'Communication Skills','Delegation Skills','IT/Equipment/Machinery Skills',
                                      'Ability to reflect on own performance','Problem-solving and decision making',
                                      'Team working and developing others','Energy, determination and work rate',
                                      'Professional Development','Steadiness under pressure',
                                      'Adaptability, flexibility and mobility','Personal appearance and image',
                                      'Clinical Skills','Personal Care','Emotional Support','Cultural Competence',
                                      'Safety and Infection Control','Documentation and Record Keeping',
                                      'Ethical Practice','Care Planning and Coordination','Reliability and Punctuality'
                                    ].map(area => (
                                        <Group key={area} mb={6} justify="space-between" wrap="wrap" align="flex-start">
                                            <Text size="xs" fw={500} style={{ flex: 1, minWidth: 140 }}>{area}</Text>
                                            <Select w={80} size="xs" data={['1','2','3','4','5']}
                                                value={firstYearAppraisalData.capabilityScores?.[area]?.score || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                onChange={v => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    capabilityScores: { ...p.capabilityScores, [area]: { ...p.capabilityScores?.[area], score: v || '' } }
                                                }))} />
                                            <Textarea w={200} size="xs" placeholder="Notes"
                                                value={firstYearAppraisalData.capabilityScores?.[area]?.notes || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                                onChange={e => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    capabilityScores: { ...p.capabilityScores, [area]: { ...p.capabilityScores?.[area], notes: e.target.value } }
                                                }))} />
                                        </Group>
                                    ))}
                                </Paper>

                                {/* ── New role capabilities ── */}
                                <Textarea label="New role requirements (specify)" mb="xs"
                                    value={firstYearAppraisalData.newRoleRequirements} readOnly={isViewMode && !isAdmin}
                                    autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, newRoleRequirements: e.target.value }))} />
                                <Paper withBorder p="sm" mb="md" radius="md">
                                    <Text fw={600} size="xs" mb="xs" c="#267FBA">New role requirements capabilities</Text>
                                    {['Leadership and Management','Care Planning and Coordination',
                                      'Problem Solving and Decision-Making','Resource Management',
                                      'Teamwork and Collaboration','Knowledge and Competence',
                                      'Supervision and Management'
                                    ].map(area => (
                                        <Group key={area} mb={6} justify="space-between" wrap="wrap" align="flex-start">
                                            <Text size="xs" fw={500} style={{ flex: 1, minWidth: 140 }}>{area}</Text>
                                            <Select w={80} size="xs" data={['1','2','3','4','5']}
                                                value={firstYearAppraisalData.newRoleCapabilities?.[area]?.score || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                onChange={v => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    newRoleCapabilities: { ...p.newRoleCapabilities, [area]: { ...p.newRoleCapabilities?.[area], score: v || '' } }
                                                }))} />
                                            <Textarea w={200} size="xs" placeholder="Notes"
                                                value={firstYearAppraisalData.newRoleCapabilities?.[area]?.notes || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                                onChange={e => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    newRoleCapabilities: { ...p.newRoleCapabilities, [area]: { ...p.newRoleCapabilities?.[area], notes: e.target.value } }
                                                }))} />
                                        </Group>
                                    ))}
                                </Paper>

                                {/* ── Difficulties / support / training ── */}
                                <Textarea label="Which parts of your job do you have difficulties with?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.difficulties} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, difficulties: e.target.value }))} />
                                <Textarea label="Do you consider you have been adequately supported by your line manager?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.supportFromManager} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, supportFromManager: e.target.value }))} />
                                <Textarea label="What further training/support do you feel you need?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.trainingNeeded} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, trainingNeeded: e.target.value }))} />
                                <Textarea label="What further support do you feel you need?" autosize minRows={2} mb="md"
                                    value={firstYearAppraisalData.supportNeeded} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, supportNeeded: e.target.value }))} />
                                <Textarea label="Compliance Responsibilities: Is there any change in your DBS status?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.complianceResponsibilities} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, complianceResponsibilities: e.target.value }))} />
                                <Textarea label="How do you feel you are regarded by managers?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.relationshipWithManagers} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, relationshipWithManagers: e.target.value }))} />
                                <Textarea label="How do you feel about your relationship with co-workers?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.relationshipWithCoworkers} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, relationshipWithCoworkers: e.target.value }))} />
                                <Textarea label="What work position would you like to occupy in 2 years?" autosize minRows={2} mb="md"
                                    value={firstYearAppraisalData.careerGoals2Years} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, careerGoals2Years: e.target.value }))} />
                                <Textarea label="What work position would you like to occupy in 5 years?" autosize minRows={2} mb="md"
                                    value={firstYearAppraisalData.careerGoals5Years} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, careerGoals5Years: e.target.value }))} />
                                <Textarea label="Any other points you would like to raise?" autosize minRows={2} mb="md"
                                    value={firstYearAppraisalData.otherPoints} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, otherPoints: e.target.value }))} />

                                <Box mt="xl">
                                    <Text fw={700} size="sm" mb={4} c="dimmed">
                                        Comments from the reviewer:
                                    </Text>
                                    <Textarea
                                        placeholder="e.g. She is progressing well..."
                                        value={firstYearAppraisalData.reviewerComments1 || ''}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={(e) => setFirstYearAppraisalData(prev => ({
                                            ...prev, reviewerComments1: e.target.value
                                        }))}
                                        autosize
                                        minRows={3}
                                        radius="md"
                                    />
                                </Box>
                            </Box>
                        </Paper>

                        {/* ═══════ Performance Appraisal Form (Appraiser Section) ═══════ */}
                        <Paper p={0} radius="lg" withBorder mt="xl" style={{ border: '3px solid #139639', overflow: 'hidden' }}>
                            <Box style={{ background: 'linear-gradient(135deg, #267FBA 0%, #139639 100%)', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '2px' }}>Lets Care All</Text>
                                    <Text size="lg" fw={800} c="white" mt={4}>Performance Appraisal Form</Text>
                                    <Text size="sm" c="rgba(255,255,255,0.8)" mt={2}>This section is to be completed by the Appraiser prior to the appraisal interview.</Text>
                                </Box>
                                <img src="/assets/logo.png" alt="Logo" style={{ height: 55, borderRadius: '50%', background: 'white', padding: '4px' }} />
                            </Box>

                            <Box p="xl">
                                <SimpleGrid cols={2} mb="md">
                                    <TextInput label="Name of Appraisee" value={firstYearAppraisalData.appraiseeName}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiseeName: e.target.value }))} />
                                    <TextInput label="Job Title" value={firstYearAppraisalData.appraiseeJobTitle}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiseeJobTitle: e.target.value }))} />
                                </SimpleGrid>
                                <SimpleGrid cols={2} mb="md">
                                    <TextInput label="Length of time in current position" value={firstYearAppraisalData.lengthInPosition}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, lengthInPosition: e.target.value }))} />
                                    <TextInput label="Employer/Supervisor/Appraiser Name" value={firstYearAppraisalData.appraiserName}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiserName: e.target.value }))} />
                                </SimpleGrid>
                                <SimpleGrid cols={2} mb="md">
                                    <TextInput label="Appraiser Job Title" value={firstYearAppraisalData.appraiserJobTitle}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiserJobTitle: e.target.value }))} />
                                    <TextInput label="Date" type="date" value={firstYearAppraisalData.appraiserDate}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiserDate: e.target.value }))} />
                                </SimpleGrid>

                                <Textarea label="Current Business Needs" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.currentBusinessNeeds} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, currentBusinessNeeds: e.target.value }))} />
                                <Textarea label="Record of gathered information relevant to the appraisal" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.gatheredInformation} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, gatheredInformation: e.target.value }))} />
                                <Textarea label="Current Performance — key strengths" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.currentPerformanceStrengths} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, currentPerformanceStrengths: e.target.value }))} />

                                {/* ── Appraiser Objectives ── */}
                                <Text fw={700} size="sm" mb="xs" mt="lg" c="#139639">
                                    Objectives agreed (Objective / Measure / Score 1–5 / Comment)
                                </Text>
                                {(firstYearAppraisalData.appraiserObjectives || []).map((obj, idx) => (
                                    <SimpleGrid cols={4} key={idx} mb="xs">
                                        <Textarea placeholder="Objective" value={obj.objective} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.appraiserObjectives];
                                                updated[idx] = { ...updated[idx], objective: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, appraiserObjectives: updated }));
                                            }} />
                                        <Textarea placeholder="Measure" value={obj.measure} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.appraiserObjectives];
                                                updated[idx] = { ...updated[idx], measure: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, appraiserObjectives: updated }));
                                            }} />
                                        <Select placeholder="Score" data={['1','2','3','4','5']} value={obj.score} readOnly={isViewMode && !isAdmin}
                                            onChange={v => {
                                                const updated = [...firstYearAppraisalData.appraiserObjectives];
                                                updated[idx] = { ...updated[idx], score: v || '' };
                                                setFirstYearAppraisalData(p => ({ ...p, appraiserObjectives: updated }));
                                            }} />
                                        <Textarea placeholder="Comment" value={obj.comment} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.appraiserObjectives];
                                                updated[idx] = { ...updated[idx], comment: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, appraiserObjectives: updated }));
                                            }} />
                                    </SimpleGrid>
                                ))}
                                {!(isViewMode && !isAdmin) && (
                                    <Button variant="light" size="xs" mb="md"
                                        onClick={() => setFirstYearAppraisalData(p => ({
                                            ...p,
                                            appraiserObjectives: [...p.appraiserObjectives, { objective: '', measure: '', score: '', comment: '' }]
                                        }))}>+ Add Objective</Button>
                                )}

                                {/* ── Appraiser capability scores ── */}
                                <Text fw={700} size="sm" mb="xs" mt="lg" c="#139639">
                                    Score the appraisee's capability (1=Poor … 5=Excellent)
                                </Text>
                                <Paper withBorder p="sm" mb="md" radius="md">
                                    {['Customer/ Clients Relations','Time Management','Reporting and Administration',
                                      'Communication Skills','Delegation Skills','IT/Equipment/Machinery Skills',
                                      'Ability to reflect on own performance','Problem-solving and decision making',
                                      'Team working and developing others','Energy, determination and work rate',
                                      'Professional Development','Steadiness under pressure',
                                      'Adaptability, flexibility and mobility','Personal appearance and image',
                                      'Clinical Skills','Personal Care','Emotional Support','Cultural Competence',
                                      'Safety and Infection Control','Documentation and Record Keeping',
                                      'Ethical Practice','Care Planning and Coordination','Reliability and Punctuality'
                                    ].map(area => (
                                        <Group key={area} mb={6} justify="space-between" wrap="wrap" align="flex-start">
                                            <Text size="xs" fw={500} style={{ flex: 1, minWidth: 140 }}>{area}</Text>
                                            <Select w={80} size="xs" data={['1','2','3','4','5']}
                                                value={firstYearAppraisalData.appraiserCapabilityScores?.[area]?.score || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                onChange={v => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    appraiserCapabilityScores: { ...p.appraiserCapabilityScores, [area]: { ...p.appraiserCapabilityScores?.[area], score: v || '' } }
                                                }))} />
                                            <Textarea w={200} size="xs" placeholder="Notes"
                                                value={firstYearAppraisalData.appraiserCapabilityScores?.[area]?.notes || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                                onChange={e => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    appraiserCapabilityScores: { ...p.appraiserCapabilityScores, [area]: { ...p.appraiserCapabilityScores?.[area], notes: e.target.value } }
                                                }))} />
                                        </Group>
                                    ))}
                                </Paper>

                                {/* ── Appraiser new role capabilities ── */}
                                <Textarea label="New role requirements (specify)" mb="xs"
                                    value={firstYearAppraisalData.newRoleRequirements} readOnly={isViewMode && !isAdmin}
                                    autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, newRoleRequirements: e.target.value }))} />
                                <Paper withBorder p="sm" mb="md" radius="md">
                                    <Text fw={600} size="xs" mb="xs" c="#267FBA">New role requirements capabilities</Text>
                                    {['Leadership and Management','Care Planning and Coordination',
                                      'Problem Solving and Decision-Making','Resource Management',
                                      'Teamwork and Collaboration','Knowledge and Competence',
                                      'Supervision and Management'
                                    ].map(area => (
                                        <Group key={area} mb={6} justify="space-between" wrap="wrap" align="flex-start">
                                            <Text size="xs" fw={500} style={{ flex: 1, minWidth: 140 }}>{area}</Text>
                                            <Select w={80} size="xs" data={['1','2','3','4','5']}
                                                value={firstYearAppraisalData.appraiserNewRoleCapabilities?.[area]?.score || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                onChange={v => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    appraiserNewRoleCapabilities: { ...p.appraiserNewRoleCapabilities, [area]: { ...p.appraiserNewRoleCapabilities?.[area], score: v || '' } }
                                                }))} />
                                            <Textarea w={200} size="xs" placeholder="Notes"
                                                value={firstYearAppraisalData.appraiserNewRoleCapabilities?.[area]?.notes || ''}
                                                readOnly={isViewMode && !isAdmin}
                                                autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                                onChange={e => setFirstYearAppraisalData(p => ({
                                                    ...p,
                                                    appraiserNewRoleCapabilities: { ...p.appraiserNewRoleCapabilities, [area]: { ...p.appraiserNewRoleCapabilities?.[area], notes: e.target.value } }
                                                }))} />
                                        </Group>
                                    ))}
                                </Paper>

                                {/* ── Improvement / Development / Training ── */}
                                <Textarea label="How the Appraisee can improve?" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.improvementDetails} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, improvementDetails: e.target.value }))} />
                                <Textarea label="Development and Training" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.developmentTraining} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, developmentTraining: e.target.value }))} />

                                <Text fw={700} size="sm" mb="xs" c="#139639">Training Sessions</Text>
                                <SimpleGrid cols={2} mb="xs">
                                    <Textarea label="1. Training session on" value={firstYearAppraisalData.training1} readOnly={isViewMode && !isAdmin}
                                        autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, training1: e.target.value }))} />
                                    <Textarea label="How will this be achieved?" value={firstYearAppraisalData.training1How} readOnly={isViewMode && !isAdmin}
                                        autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, training1How: e.target.value }))} />
                                </SimpleGrid>
                                <SimpleGrid cols={2} mb="xs">
                                    <Textarea label="2. Training session on" value={firstYearAppraisalData.training2} readOnly={isViewMode && !isAdmin}
                                        autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, training2: e.target.value }))} />
                                    <Textarea label="How will this be achieved?" value={firstYearAppraisalData.training2How} readOnly={isViewMode && !isAdmin}
                                        autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, training2How: e.target.value }))} />
                                </SimpleGrid>
                                <SimpleGrid cols={2} mb="md">
                                    <Textarea label="3. Training session on" value={firstYearAppraisalData.training3} readOnly={isViewMode && !isAdmin}
                                        autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, training3: e.target.value }))} />
                                    <Textarea label="How will this be achieved?" value={firstYearAppraisalData.training3How} readOnly={isViewMode && !isAdmin}
                                        autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, training3How: e.target.value }))} />
                                </SimpleGrid>

                                <Textarea label="Job Description — changes/amendments" autosize minRows={2} mb="md"
                                    value={firstYearAppraisalData.jobDescriptionChanges} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, jobDescriptionChanges: e.target.value }))} />
                                <Textarea label="Interview Notes" autosize minRows={4} mb="md"
                                    value={firstYearAppraisalData.interviewNotes} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, interviewNotes: e.target.value }))} />
                                <Textarea label="Appraisee's comments" autosize minRows={3} mb="md"
                                    value={firstYearAppraisalData.appraiseeComments} readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, appraiseeComments: e.target.value }))} />

                                <Box mt="xl" mb="md">
                                    <Text fw={700} size="sm" mb={4} c="dimmed">
                                        Comments from the reviewer:
                                    </Text>
                                    <Textarea
                                        placeholder="e.g. She is progressing well..."
                                        value={firstYearAppraisalData.reviewerComments2 || ''}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={(e) => setFirstYearAppraisalData(prev => ({
                                            ...prev, reviewerComments2: e.target.value
                                        }))}
                                        autosize
                                        minRows={3}
                                        radius="md"
                                    />
                                </Box>

                                {/* ── Signatures ── */}
                                <Box style={{ borderTop: '2px solid #267FBA' }} pt="lg" mt="lg">
                                    <Text fw={700} size="sm" mb="xs" ta="center" c="dimmed" style={{ fontStyle: 'italic' }}>
                                        I hereby confirm that this is a fair and accurate representation of the appraisal discussion.
                                    </Text>
                                    <SimpleGrid cols={2} mt="md">
                                        <Paper withBorder p="md" radius="md" style={{ borderColor: '#267FBA', background: !isAdmin ? '#f0fff4' : 'white' }}>
                                            <Text fw={700} size="sm" c="#267FBA" mb="xs">Signature (Appraisee)</Text>
                                            {!isAdmin ? (
                                                <>
                                                    <SignaturePad
                                                        label={firstYearAppraisalData.appraiseeSignature ? 'Your Signature' : '✍️ Click here to add your signature'}
                                                        value={firstYearAppraisalData.appraiseeSignature}
                                                        onChange={async (sig: string) => {
                                                            setFirstYearAppraisalData(p => ({ ...p, appraiseeSignature: sig }));
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                const today = new Date().toISOString().split('T')[0];
                                                                await axios.put(
                                                                    `/api/v1/staff/review-forms/${editingAppraisalFormId}`,
                                                                    { careStaffSignature: sig, careStaffDate: today },
                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                );
                                                                setFirstYearAppraisalData(p => ({ ...p, signatureDate: today }));
                                                                notifications.show({ title: 'Signed', message: 'Your signature has been saved.', color: '#267FBA' });
                                                                const targetUserId = profile?.user?.id || profile?.id || id;
                                                                const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, { headers: { Authorization: `Bearer ${token}` } });
                                                                setReviewForms(reviewFormsRes.data);
                                                            } catch (err) {
                                                                notifications.show({ title: 'Error', message: 'Failed to save signature.', color: 'red' });
                                                            }
                                                        }}
                                                    />
                                                    {!firstYearAppraisalData.appraiseeSignature && (
                                                        <Text size="xs" c="#267FBA" fw={600} mt={4} ta="center">👆 Tap above to open the signature pad</Text>
                                                    )}
                                                </>
                                            ) : (
                                                <SignaturePad
                                                    label="Appraisee Signature"
                                                    value={firstYearAppraisalData.appraiseeSignature}
                                                    onChange={(sig: string) => setFirstYearAppraisalData(p => ({ ...p, appraiseeSignature: sig }))}
                                                />
                                            )}
                                        </Paper>
                                        <Paper withBorder p="md" radius="md" style={{ borderColor: '#139639' }}>
                                            <Text fw={700} size="sm" c="#139639" mb="xs">Signature (Appraiser)</Text>
                                            {isAdmin ? (
                                                <SignaturePad
                                                    label="Appraiser Signature"
                                                    value={firstYearAppraisalData.appraiserSignature}
                                                    onChange={(sig: string) => setFirstYearAppraisalData(p => ({ ...p, appraiserSignature: sig }))}
                                                />
                                            ) : (
                                                <>
                                                    {firstYearAppraisalData.appraiserSignature ? (
                                                        <Paper withBorder p="xs" style={{ display: 'inline-block' }}>
                                                            <img src={firstYearAppraisalData.appraiserSignature} alt="Appraiser Signature" style={{ maxWidth: '200px', maxHeight: '80px', display: 'block' }} />
                                                        </Paper>
                                                    ) : (
                                                        <Paper withBorder p="md" style={{ textAlign: 'center', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
                                                            <Text size="sm" c="dimmed">Awaiting appraiser signature</Text>
                                                        </Paper>
                                                    )}
                                                </>
                                            )}
                                        </Paper>
                                    </SimpleGrid>
                                    <TextInput label="Date" type="date" mt="md"
                                        value={firstYearAppraisalData.signatureDate} readOnly={isViewMode && !isAdmin}
                                        onChange={e => setFirstYearAppraisalData(p => ({ ...p, signatureDate: e.target.value }))} />
                                </Box>
                            </Box>
                        </Paper>

                        {/* ═══════ Action Plan Section ═══════ */}
                        <Paper p={0} radius="lg" withBorder mt="xl" style={{ border: '3px solid #267FBA', overflow: 'hidden' }}>
                            <Box style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)', padding: '18px 28px' }}>
                                <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '2px' }}>Lets Care All</Text>
                                <Text size="lg" fw={800} c="white" mt={4}>Action Plan</Text>
                            </Box>
                            <Box p="xl">
                                <Text size="sm" c="dimmed" mb="md">Agree a plan for the forthcoming year. A timescale of action and results to be achieved should be agreed where appropriate.</Text>
                                <TextInput label="Name" mb="md" value={firstYearAppraisalData.actionPlanName}
                                    readOnly={isViewMode && !isAdmin}
                                    onChange={e => setFirstYearAppraisalData(p => ({ ...p, actionPlanName: e.target.value }))} />

                                {(firstYearAppraisalData.actionPlanItems || []).map((item, idx) => (
                                    <SimpleGrid cols={3} key={idx} mb="xs">
                                        <Textarea placeholder="Key Areas Discussed" value={item.keyArea} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.actionPlanItems];
                                                updated[idx] = { ...updated[idx], keyArea: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, actionPlanItems: updated }));
                                            }} />
                                        <Textarea placeholder="Action Plan to Follow" value={item.actionPlan} readOnly={isViewMode && !isAdmin}
                                            autosize minRows={3} maxRows={8} styles={appraisalWrapTextareaStyles} radius="md"
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.actionPlanItems];
                                                updated[idx] = { ...updated[idx], actionPlan: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, actionPlanItems: updated }));
                                            }} />
                                        <TextInput placeholder="Target Date" value={item.targetDate} readOnly={isViewMode && !isAdmin}
                                            onChange={e => {
                                                const updated = [...firstYearAppraisalData.actionPlanItems];
                                                updated[idx] = { ...updated[idx], targetDate: e.target.value };
                                                setFirstYearAppraisalData(p => ({ ...p, actionPlanItems: updated }));
                                            }} />
                                    </SimpleGrid>
                                ))}
                                {!(isViewMode && !isAdmin) && (
                                    <Button variant="light" size="xs" mb="md"
                                        onClick={() => setFirstYearAppraisalData(p => ({
                                            ...p,
                                            actionPlanItems: [...p.actionPlanItems, { keyArea: '', actionPlan: '', targetDate: '' }]
                                        }))}>+ Add Row</Button>
                                )}

                                <Box mt="xl">
                                    <Text fw={700} size="sm" mb={4} c="dimmed">
                                        Comments from the reviewer:
                                    </Text>
                                    <Textarea
                                        placeholder="e.g. She is progressing well..."
                                        value={firstYearAppraisalData.reviewerComments3 || ''}
                                        readOnly={isViewMode && !isAdmin}
                                        onChange={(e) => setFirstYearAppraisalData(prev => ({
                                            ...prev, reviewerComments3: e.target.value
                                        }))}
                                        autosize
                                        minRows={3}
                                        radius="md"
                                    />
                                </Box>
                            </Box>
                        </Paper>

                        {/* ── Close / Save buttons ── */}
                        <Group justify="flex-end" mt="xl">
                            <Button variant="default" onClick={() => {
                                setFirstYearAppraisalModal(false);
                                setIsViewMode(false);
                                setEditingAppraisalFormId(null);
                            }}>
                                {isViewMode && !isAdmin ? 'Close' : 'Cancel'}
                            </Button>
                            {(isAdmin || (!isAdmin && isViewMode)) && (
                                <Button
                                    loading={reviewFormLoading}
                                    style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)' }}
                                    onClick={async () => {
                                        setReviewFormLoading(true);
                                        try {
                                            const token = localStorage.getItem('token');
                                            const targetUserId = profile?.user?.id || profile?.id || id;

                                            const appraisalPayload = {
                                                formType: 'appraisal',
                                                formSubType: reviewFormSubType,
                                                staffName: firstYearAppraisalData.appraiseeName,
                                                startDate: null,
                                                dateOfReview: firstYearAppraisalData.appraisalDate || new Date().toISOString().split('T')[0],
                                                documentationComments: JSON.stringify({
                                                    type: 'firstYearAppraisal',
                                                    data: firstYearAppraisalData
                                                }),
                                                careStaffSignature: firstYearAppraisalData.appraiseeSignature || null,
                                                careStaffDate: firstYearAppraisalData.signatureDate || null,
                                                reviewerSignature: firstYearAppraisalData.appraiserSignature || null,
                                                reviewerDate: firstYearAppraisalData.signatureDate || null,
                                            };

                                            if (editingAppraisalFormId) {
                                                await axios.put(
                                                    `/api/v1/staff/review-forms/${editingAppraisalFormId}`,
                                                    appraisalPayload,
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                notifications.show({ title: 'Updated', message: 'Appraisal form updated successfully', color: '#267FBA' });
                                            } else {
                                                await axios.post(
                                                    `/api/v1/staff/${targetUserId}/review-forms`,
                                                    appraisalPayload,
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                notifications.show({ title: 'Saved', message: 'Appraisal form saved successfully', color: '#267FBA' });
                                            }

                                            // Refresh
                                            const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            setReviewForms(reviewFormsRes.data);
                                            setFirstYearAppraisalModal(false);
                                            setIsViewMode(false);
                                            setEditingAppraisalFormId(null);
                                        } catch (error: any) {
                                            console.error('Failed to save appraisal', error);
                                            let errorMessage = 'Failed to save appraisal form';
                                            if (error.response?.status === 401) {
                                                errorMessage = 'Session expired. Please login again.';
                                                localStorage.removeItem('token');
                                                localStorage.removeItem('role');
                                                setTimeout(() => { window.location.href = '/login'; }, 1500);
                                            } else if (error.response?.status === 403) {
                                                errorMessage = 'You do not have permission.';
                                            } else if (error.response?.data?.message) {
                                                errorMessage = error.response.data.message;
                                            }
                                            notifications.show({ title: 'Error', message: errorMessage, color: 'red' });
                                        } finally {
                                            setReviewFormLoading(false);
                                        }
                                    }}
                                >
                                    {isViewMode && !isAdmin ? 'Save Signature' : 'Save Appraisal'}
                                </Button>
                            )}
                        </Group>
                    </Box>
                </ScrollArea>
            </Modal>

            {/* Review/Appraisal/Supervision Form Modal */}
            <Modal
                opened={reviewFormModal}
                onClose={() => {
                    setReviewFormModal(false);
                    setIsViewMode(false);
                    setEditingReviewFormId(null);
                }}
                title={
                    reviewFormType === 'review' || reviewFormType === 'supervision' ? null : (
                    isViewMode ? (
                        <Group gap="md">
                            <ThemeIcon variant="gradient" gradient={{ from: '#139639', to: '#267FBA', deg: 90 }} size="lg" radius="md">
                                <FileText size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={3} size={20} fw={800} c="brandBlue.9">
                                    {`${reviewFormSubType}`}
                                </Title>
                                <Text size="sm" c="dimmed" fw={600}>Lets Care All</Text>
                            </Box>
                        </Group>
                    ) : (
                        `${reviewFormSubType}`
                    )
                    )
                }
                {...(reviewFormType === 'appraisal' ? { size: 'xl' as const } : {})}
                fullScreen={reviewFormType === 'review' || reviewFormType === 'supervision'}
                centered={reviewFormType === 'appraisal'}
                radius={reviewFormType === 'review' || reviewFormType === 'supervision' ? 0 : 'md'}
                transitionProps={reviewFormType === 'review' || reviewFormType === 'supervision' ? { transition: 'fade', duration: 200 } : undefined}
                styles={{
                    header: reviewFormType === 'review' || reviewFormType === 'supervision' ? { display: 'none' } : undefined,
                    content: reviewFormType === 'appraisal' && isViewMode ? {
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                    } : {},
                    body: reviewFormType === 'review' || reviewFormType === 'supervision' ? { padding: 0 } : (isViewMode ? {
                        padding: 0,
                        maxHeight: '80vh',
                        overflow: 'hidden',
                    } : {}),
                }}
            >
                {isViewMode ? (
                    <ScrollArea h={reviewFormType === 'review' || reviewFormType === 'supervision' ? '100vh' : 'calc(80vh - 120px)'} type="scroll" p={reviewFormType === 'review' || reviewFormType === 'supervision' ? 'md' : undefined}>
                        {(reviewFormType === 'review' || reviewFormType === 'supervision') && (
                            <Box
                                style={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 100,
                                    background: 'white',
                                    borderBottom: '1px solid #e9ecef',
                                    padding: '12px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <Text fw={700} size="lg">
                                    {reviewFormType === 'review'
                                        ? `${reviewFormSubType} Employment Review`
                                        : `${reviewFormSubType} Supervision`}
                                </Text>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="lg"
                                    onClick={() => {
                                        setReviewFormModal(false);
                                        setIsViewMode(false);
                                        setEditingReviewFormId(null);
                                    }}
                                >
                                    <X size={20} />
                                </ActionIcon>
                            </Box>
                        )}
                        <Box p="xl">

                            {/* Review/Appraisal Form View Mode – Branded Employment Review */}
                            {reviewFormType !== 'supervision' && (
                                <>
                            {/* ── Branded Employment Review Form (View) ── */}
                            <Paper p={0} radius="lg" mb="xl" withBorder style={{ border: '3px solid #267FBA', overflow: 'hidden' }}>
                                {/* Green/Blue header bar with logo */}
                                <Box style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '2px' }}>Lets Care All</Text>
                                        <Text size="lg" fw={800} c="white" mt={4}>{reviewFormSubType} Employment Review</Text>
                                    </Box>
                                    <img src="/assets/logo.png" alt="Logo" style={{ height: 55, width: 'auto', borderRadius: '50%', background: 'white', padding: '4px' }} />
                                </Box>

                                <Box p="xl">
                                    {/* Staff Info Row */}
                                    <SimpleGrid cols={2} spacing="lg" mb="lg">
                                        <Box p="md" style={{ border: '1px solid #139639', borderRadius: '8px' }}>
                                            <Text size="xs" fw={700} c="#139639" mb={4} tt="uppercase">Staff Name</Text>
                                            <Text size="md" fw={700}>{reviewFormData.staffName || '-'}</Text>
                                        </Box>
                                        <Box p="md" style={{ border: '1px solid #139639', borderRadius: '8px' }}>
                                            <Text size="xs" fw={700} c="#139639" mb={4} tt="uppercase">Start Date</Text>
                                            <Text size="md" fw={700}>{reviewFormData.startDate ? new Date(reviewFormData.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</Text>
                                        </Box>
                                    </SimpleGrid>
                                    <Box p="md" mb="lg" style={{ border: '1px solid #139639', borderRadius: '8px' }}>
                                        <Text size="xs" fw={700} c="#139639" mb={4} tt="uppercase">Date of Review</Text>
                                        <Text size="md" fw={700}>{reviewFormData.dateOfReview ? new Date(reviewFormData.dateOfReview).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</Text>
                                    </Box>

                                    {/* Documentation Comments */}
                                    {reviewFormData.documentationComments && !reviewFormData.documentationComments.startsWith('{') && (
                                        <Box p="md" mb="lg" style={{ border: '1px solid #267FBA', borderRadius: '8px', background: '#f8fdf8' }}>
                                            <Text size="xs" fw={700} c="#267FBA" mb={6} tt="uppercase">Check that all documentation is complete and add comments here:</Text>
                                            <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{reviewFormData.documentationComments}</Text>
                                        </Box>
                                    )}

                                    {/* Grading Instruction */}
                                    <Box mb="lg" p="sm" style={{ background: 'linear-gradient(135deg, #e3f0f8 0%, #e6f5eb 100%)', borderRadius: '8px', border: '1px solid #b8d4ea' }}>
                                        <Text size="sm" fw={700} c="#139639" ta="center">
                                            For the following areas please grade each section from 1–4 (1 poor, 2 below average, 3 good and 4 excellent)
                                        </Text>
                                    </Box>

                                    {/* Performance Grading – 2×2 table */}
                                    <SimpleGrid cols={2} spacing="md" mb="lg">
                                        {[
                                            { label: 'Overall work performance', grade: reviewFormData.jobPerformanceGrade, comment: reviewFormData.reviewerCommentOverallWork },
                                            { label: 'Progress in training/induction', grade: reviewFormData.trainingDevelopmentGrade, comment: reviewFormData.reviewerCommentProgressTraining },
                                            { label: 'Team-working performance', grade: reviewFormData.communicationSkillsGrade, comment: reviewFormData.reviewerCommentTeamWorking },
                                            { label: 'Attendance performance', grade: reviewFormData.attendancePunctualityGrade, comment: reviewFormData.reviewerCommentAttendance },
                                        ].map((item) => (
                                            <Box key={item.label} p="md" style={{ border: '1px solid #139639', borderRadius: '8px' }}>
                                                <Text size="sm" fw={700} c="#333" mb={8}>{item.label}</Text>
                                                <Group gap={6}>
                                                    {['1','2','3','4'].map(g => (
                                                        <Box key={g} style={{
                                                            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: item.grade === g ? (g === '4' ? '#267FBA' : g === '3' ? '#139639' : g === '2' ? '#F57C00' : '#C62828') : '#f0f0f0',
                                                            color: item.grade === g ? 'white' : '#666', fontWeight: 800, fontSize: '14px',
                                                            border: item.grade === g ? 'none' : '1px solid #ddd'
                                                        }}>
                                                            {g}
                                                        </Box>
                                                    ))}
                                                </Group>
                                                {item.comment && (
                                                    <Box mt="xs">
                                                        <Text fw={600} size="sm" mb={4} c="dimmed">Comments from the reviewer:</Text>
                                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{item.comment}</Text>
                                                    </Box>
                                                )}
                                            </Box>
                                        ))}
                                    </SimpleGrid>

                                    {/* Recommended for Further Review */}
                                    <Box p="md" mb="lg" style={{ border: `2px solid ${reviewFormData.recommendedForReview === 'YES' ? '#267FBA' : reviewFormData.recommendedForReview === 'NO' ? '#C62828' : '#139639'}`, borderRadius: '8px', background: reviewFormData.recommendedForReview === 'YES' ? '#f1f8f1' : reviewFormData.recommendedForReview === 'NO' ? '#fff5f5' : 'white' }}>
                                        <Text size="sm" fw={800} c="#333" mb={6}>Recommended for further period of review</Text>
                                        <Badge size="lg" variant="filled" color={reviewFormData.recommendedForReview === 'YES' ? 'green' : reviewFormData.recommendedForReview === 'NO' ? 'red' : 'gray'}>
                                            {reviewFormData.recommendedForReview || 'Not specified'}
                                        </Badge>
                                        {reviewFormData.reviewReasons && (
                                            <Box mt="md" p="sm" style={{ background: 'rgba(255,255,255,0.8)', borderRadius: '6px', borderLeft: '3px solid #139639' }}>
                                                <Text size="xs" fw={700} c="#139639" mb={4}>State reasons, and period of review:</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{reviewFormData.reviewReasons}</Text>
                                            </Box>
                                        )}
                                    </Box>

                                    <Divider my="md" color="#267FBA" size="sm" />

                                    {/* Signatures Section */}
                                    <SimpleGrid cols={2} spacing="lg">
                                        <Box p="md" style={{ border: '2px solid #267FBA', borderRadius: '8px', background: !isAdmin ? '#f0fff4' : 'white' }}>
                                            <Text size="sm" fw={800} c="#267FBA" mb={8}>Sign and Date (Care Staff)</Text>
                                            {!isAdmin ? (
                                                <>
                                                    <SignaturePad
                                                        label={reviewFormData.careStaffSignature ? 'Your Signature' : '✍️ Click here to add your signature'}
                                                        value={reviewFormData.careStaffSignature}
                                                        onChange={async (dataURL) => {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            setReviewFormData({ ...reviewFormData, careStaffSignature: dataURL, careStaffDate: today });
                                                            try {
                                                                const token = localStorage.getItem('token');
                                                                await axios.put(
                                                                    `/api/v1/staff/review-forms/${editingReviewFormId}`,
                                                                    { careStaffSignature: dataURL, careStaffDate: today },
                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                );
                                                                notifications.show({ title: 'Signed', message: 'Your signature has been saved.', color: '#267FBA' });
                                                                const targetUserId = profile?.user?.id || profile?.id || id;
                                                                const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, { headers: { Authorization: `Bearer ${token}` } });
                                                                setReviewForms(reviewFormsRes.data);
                                                            } catch (err) {
                                                                notifications.show({ title: 'Error', message: 'Failed to save signature.', color: 'red' });
                                                            }
                                                        }}
                                                    />
                                                    {!reviewFormData.careStaffSignature && (
                                                        <Text size="xs" c="#267FBA" fw={600} mt={4} ta="center">👆 Tap above to open the signature pad</Text>
                                                    )}
                                                </>
                                            ) : (
                                                <SignaturePad
                                                    label="Care Staff Signature"
                                                    value={reviewFormData.careStaffSignature}
                                                    onChange={(dataURL) => {
                                                        const today = new Date().toISOString().split('T')[0];
                                                        setReviewFormData({ ...reviewFormData, careStaffSignature: dataURL, careStaffDate: today });
                                                    }}
                                                />
                                            )}
                                            {reviewFormData.careStaffDate && (
                                                <Group gap={4} mt={8}>
                                                    <Calendar size={14} color="gray" />
                                                    <Text size="xs" c="dimmed" fw={600}>{new Date(reviewFormData.careStaffDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                                </Group>
                                            )}
                                        </Box>
                                        <Box p="md" style={{ border: '1px solid #139639', borderRadius: '8px' }}>
                                            <Text size="sm" fw={800} c="#139639" mb={8}>Sign and Date (Reviewer)</Text>
                                            {isAdmin ? (
                                                <SignaturePad
                                                    label="Reviewer Signature"
                                                    value={reviewFormData.reviewerSignature}
                                                    onChange={(dataURL) => {
                                                        const today = new Date().toISOString().split('T')[0];
                                                        setReviewFormData({ ...reviewFormData, reviewerSignature: dataURL, reviewerDate: today });
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    {reviewFormData.reviewerSignature ? (
                                                        <Paper withBorder p="xs" style={{ display: 'inline-block' }}>
                                                            <img src={reviewFormData.reviewerSignature} alt="Reviewer Signature" style={{ maxWidth: '200px', maxHeight: '80px', display: 'block' }} />
                                                        </Paper>
                                                    ) : (
                                                        <Paper withBorder p="md" style={{ textAlign: 'center', minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
                                                            <Text size="sm" c="dimmed">Awaiting reviewer signature</Text>
                                                        </Paper>
                                                    )}
                                                </>
                                            )}
                                            {reviewFormData.reviewerDate && (
                                                <Group gap={4} mt={8}>
                                                    <Calendar size={14} color="gray" />
                                                    <Text size="xs" c="dimmed" fw={600}>{new Date(reviewFormData.reviewerDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                                                </Group>
                                            )}
                                        </Box>
                                    </SimpleGrid>
                                </Box>
                            </Paper>
                                </>
                            )}

                            {/* Supervision Form View Mode */}
                            {reviewFormType === 'supervision' && (
                                <>
                                    {/* Staff Information Section */}
                                    <Paper p="lg" radius="lg" mb="lg" withBorder style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                        <Group gap="md" mb="md">
                                            <ThemeIcon variant="gradient" gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }} size="lg" radius="md">
                                                <User size={20} />
                                            </ThemeIcon>
                                            <Title order={4} size={20} fw={700}>Supervision Information</Title>
                                        </Group>
                                        <SimpleGrid cols={2} spacing="lg" mt="md">
                                            <Box p="md" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', borderRadius: '8px' }}>
                                                <Text size="xs" fw={600} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervisee Name</Text>
                                                <Text size="lg" fw={700} c="dark.8">{reviewFormData.superviseeName || reviewFormData.staffName || '-'}</Text>
                                            </Box>
                                            <Box p="md" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', borderRadius: '8px' }}>
                                                <Text size="xs" fw={600} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervisor Name</Text>
                                                <Text size="lg" fw={700} c="dark.8">{reviewFormData.supervisorName || '-'}</Text>
                                            </Box>
                                        </SimpleGrid>
                                        <SimpleGrid cols={2} spacing="lg" mt="md">
                                            <Box p="md" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', borderRadius: '8px' }}>
                                                <Text size="xs" fw={600} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervision Date</Text>
                                                <Text size="lg" fw={700} c="dark.8">{reviewFormData.supervisionDate ? new Date(reviewFormData.supervisionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</Text>
                                            </Box>
                                            <Box p="md" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)', borderRadius: '8px' }}>
                                                <Text size="xs" fw={600} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervision Frequency</Text>
                                                <Text size="lg" fw={700} c="dark.8">{reviewFormData.supervisionFrequency || '-'}</Text>
                                            </Box>
                                        </SimpleGrid>
                                    </Paper>

                                    {/* Supervision Questions Section */}
                                    <Paper p="lg" radius="lg" mb="lg" withBorder style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                        <Group gap="md" mb="md">
                                            <ThemeIcon variant="gradient" gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }} size="lg" radius="md">
                                                <FileText size={20} />
                                            </ThemeIcon>
                                            <Title order={4} size={20} fw={700}>Supervision Discussion</Title>
                                        </Group>
                                        {reviewFormData.agreedActionsLastReview && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Agreed Actions from Last Review</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.agreedActionsLastReview}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.roleExperience && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Role Experience</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.roleExperience}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.newSkillsUsed && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>New Skills Used</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.newSkillsUsed}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.challengesFaced && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Challenges Faced</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.challengesFaced}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.trainingImplementation && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Training Implementation</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.trainingImplementation}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.personalDevelopment && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Personal Development</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.personalDevelopment}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.goalsBeforeNextSupervision && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Goals Before Next Supervision</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.goalsBeforeNextSupervision}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.supervisorFeedback && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervisor Feedback</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.supervisorFeedback}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.otherDiscussionAreas && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Other Discussion Areas</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.otherDiscussionAreas}
                                                </Text>
                                            </Box>
                                        )}
                                        {reviewFormData.agreedActions && (
                                            <Box mb="md">
                                                <Text size="xs" fw={700} c="dimmed" mb={6} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Agreed Actions</Text>
                                                <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#495057' }}>
                                                    {reviewFormData.agreedActions}
                                                </Text>
                                            </Box>
                                        )}
                                    </Paper>

                                    {/* Signatures Section for Supervision */}
                                    {(reviewFormData.superviseeSignature || reviewFormData.supervisorSignature) && (
                                        <Paper p="lg" radius="lg" mb="lg" withBorder style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                            <Group gap="md" mb="lg">
                                                <ThemeIcon variant="gradient" gradient={{ from: 'brandBlue.6', to: 'cyan', deg: 90 }} size="lg" radius="md">
                                                    <Edit size={20} />
                                                </ThemeIcon>
                                                <Title order={4} size={20} fw={700}>Signatures & Verification</Title>
                                            </Group>
                                            <SimpleGrid cols={2} spacing="lg">
                                                {reviewFormData.superviseeSignature && (
                                                    <Paper p="lg" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}>
                                                        <Text size="xs" fw={700} c="dimmed" mb={8} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervisee Signature</Text>
                                                        <Paper p="md" radius="md" withBorder style={{ background: 'white', border: '2px dashed #dee2e6' }}>
                                                            <img src={reviewFormData.superviseeSignature} alt="Supervisee Signature" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', display: 'block' }} />
                                                        </Paper>
                                                        {reviewFormData.superviseeSignatureDate && (
                                                            <Group gap={4} mt={8} align="center">
                                                                <Calendar size={14} color="gray" />
                                                                <Text size="xs" c="dimmed" fw={600}>
                                                                    {new Date(reviewFormData.superviseeSignatureDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </Text>
                                                            </Group>
                                                        )}
                                                    </Paper>
                                                )}
                                                {reviewFormData.supervisorSignature && (
                                                    <Paper p="lg" radius="md" withBorder style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}>
                                                        <Text size="xs" fw={700} c="dimmed" mb={8} tt="uppercase" style={{ letterSpacing: '0.5px' }}>Supervisor Signature</Text>
                                                        <Paper p="md" radius="md" withBorder style={{ background: 'white', border: '2px dashed #dee2e6' }}>
                                                            <img src={reviewFormData.supervisorSignature} alt="Supervisor Signature" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', display: 'block' }} />
                                                        </Paper>
                                                        {reviewFormData.supervisorSignatureDate && (
                                                            <Group gap={4} mt={8} align="center">
                                                                <Calendar size={14} color="gray" />
                                                                <Text size="xs" c="dimmed" fw={600}>
                                                                    {new Date(reviewFormData.supervisorSignatureDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                                </Text>
                                                            </Group>
                                                        )}
                                                    </Paper>
                                                )}
                                            </SimpleGrid>
                                        </Paper>
                                    )}
                                </>
                            )}
                        </Box>
                    </ScrollArea>
                ) : (
                    <ScrollArea h={reviewFormType === 'review' || reviewFormType === 'supervision' ? '100vh' : 'calc(80vh - 120px)'} type="scroll" p={reviewFormType === 'review' || reviewFormType === 'supervision' ? 'md' : undefined}>
                        {(reviewFormType === 'review' || reviewFormType === 'supervision') && (
                            <Box
                                style={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 100,
                                    background: 'white',
                                    borderBottom: '1px solid #e9ecef',
                                    padding: '12px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <Text fw={700} size="lg">
                                    {reviewFormType === 'review'
                                        ? `${reviewFormSubType} Employment Review`
                                        : `${reviewFormSubType} Supervision`}
                                </Text>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="lg"
                                    onClick={() => {
                                        setReviewFormModal(false);
                                        setIsViewMode(false);
                                        setEditingReviewFormId(null);
                                    }}
                                >
                                    <X size={20} />
                                </ActionIcon>
                            </Box>
                        )}
                        <Box p="xl">
                            {reviewFormType === 'supervision' && (reviewFormSubType === '1st Year 6th Month' || reviewFormSubType === '2nd Year 6th Month') ? (
                                <Stack gap="lg">
                                    {/* Supervision Form Edit Mode */}
                                    <Paper p="lg" radius="lg" withBorder>
                                        <Title order={4} mb="md">Supervision Form</Title>
                                        <SimpleGrid cols={2} spacing="md" mb="md">
                                            <TextInput
                                                label="Supervisee Name"
                                                value={reviewFormData.superviseeName}
                                                onChange={(e) => setReviewFormData({ ...reviewFormData, superviseeName: e.target.value })}
                                                required
                                            />
                                            <TextInput
                                                label="Supervisor Name"
                                                value={reviewFormData.supervisorName}
                                                onChange={(e) => setReviewFormData({ ...reviewFormData, supervisorName: e.target.value })}
                                            />
                                        </SimpleGrid>
                                        <SimpleGrid cols={2} spacing="md" mb="md">
                                            <TextInput
                                                label="Supervision Date"
                                                type="date"
                                                value={reviewFormData.supervisionDate}
                                                onChange={(e) => setReviewFormData({ ...reviewFormData, supervisionDate: e.target.value })}
                                                required
                                            />
                                            <TextInput
                                                label="Supervision Frequency"
                                                value={reviewFormData.supervisionFrequency}
                                                onChange={(e) => setReviewFormData({ ...reviewFormData, supervisionFrequency: e.target.value })}
                                            />
                                        </SimpleGrid>
                                        <Textarea
                                            label="Agreed Actions from the Last Review or the topics for this supervisor"
                                            value={reviewFormData.agreedActionsLastReview}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, agreedActionsLastReview: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="How did you find your role as a care staff, and what have you learned?"
                                            value={reviewFormData.roleExperience}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, roleExperience: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="What are the new skills I have used as a care staff?"
                                            value={reviewFormData.newSkillsUsed}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, newSkillsUsed: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="What challenges have I faced since my last review, and how have I managed and overcome them?"
                                            value={reviewFormData.challengesFaced}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, challengesFaced: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="How do I continue to implement the knowledge which I gained from training for an organisation in my everyday work?"
                                            value={reviewFormData.trainingImplementation}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, trainingImplementation: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="What I like to learn for my personal development, and how I can put this learning into practice?"
                                            value={reviewFormData.personalDevelopment}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, personalDevelopment: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="What do I want to achieve before my next supervision?"
                                            value={reviewFormData.goalsBeforeNextSupervision}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, goalsBeforeNextSupervision: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="Feedback from supervisor"
                                            value={reviewFormData.supervisorFeedback}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, supervisorFeedback: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="Other areas of discussion"
                                            value={reviewFormData.otherDiscussionAreas}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, otherDiscussionAreas: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                        <Textarea
                                            label="Agreed actions"
                                            value={reviewFormData.agreedActions}
                                            onChange={(e) => setReviewFormData({ ...reviewFormData, agreedActions: e.target.value })}
                                            minRows={3}
                                            mb="md"
                                        />
                                    </Paper>

                                    <Group justify="flex-end" mt="xl">
                                        <Button variant="default" onClick={() => {
                                            setReviewFormModal(false);
                                            setIsViewMode(false);
                                            setEditingReviewFormId(null);
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button
                                            color="brandBlue"
                                            loading={reviewFormLoading}
                                            onClick={async () => {
                                                if (!reviewFormData.superviseeName || !reviewFormData.supervisionDate) {
                                                    notifications.show({
                                                        title: 'Validation Error',
                                                        message: 'Please fill in all required fields',
                                                        color: 'red',
                                                    });
                                                    return;
                                                }

                                                setReviewFormLoading(true);
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const targetUserId = profile?.user?.id || profile?.id || id;

                                                    if (!targetUserId) {
                                                        throw new Error('Staff ID not found');
                                                    }

                                                    // Prepare supervision data as JSON
                                                    const supervisionData = {
                                                        type: 'supervision',
                                                        data: {
                                                            superviseeName: reviewFormData.superviseeName,
                                                            supervisorName: reviewFormData.supervisorName,
                                                            supervisionDate: reviewFormData.supervisionDate,
                                                            supervisionFrequency: reviewFormData.supervisionFrequency,
                                                            agreedActionsLastReview: reviewFormData.agreedActionsLastReview,
                                                            roleExperience: reviewFormData.roleExperience,
                                                            newSkillsUsed: reviewFormData.newSkillsUsed,
                                                            challengesFaced: reviewFormData.challengesFaced,
                                                            trainingImplementation: reviewFormData.trainingImplementation,
                                                            personalDevelopment: reviewFormData.personalDevelopment,
                                                            goalsBeforeNextSupervision: reviewFormData.goalsBeforeNextSupervision,
                                                            supervisorFeedback: reviewFormData.supervisorFeedback,
                                                            otherDiscussionAreas: reviewFormData.otherDiscussionAreas,
                                                            agreedActions: reviewFormData.agreedActions,
                                                            superviseeSignature: reviewFormData.superviseeSignature,
                                                            superviseeSignatureDate: reviewFormData.superviseeSignatureDate,
                                                            supervisorSignature: reviewFormData.supervisorSignature,
                                                            supervisorSignatureDate: reviewFormData.supervisorSignatureDate
                                                        }
                                                    };

                                                    const formData = {
                                                        formType: 'supervision',
                                                        formSubType: reviewFormSubType,
                                                        staffName: reviewFormData.staffName || reviewFormData.superviseeName,
                                                        startDate: reviewFormData.startDate,
                                                        dateOfReview: reviewFormData.supervisionDate || reviewFormData.dateOfReview,
                                                        documentationComments: JSON.stringify(supervisionData),
                                                        careStaffSignature: reviewFormData.superviseeSignature,
                                                        careStaffDate: reviewFormData.superviseeSignatureDate,
                                                        reviewerSignature: reviewFormData.supervisorSignature,
                                                        reviewerDate: reviewFormData.supervisorSignatureDate
                                                    };

                                                    if (editingReviewFormId) {
                                                        // Update existing form
                                                        await axios.put(
                                                            `/api/v1/staff/review-forms/${editingReviewFormId}`,
                                                            formData,
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        notifications.show({
                                                            title: 'Success',
                                                            message: 'Supervision form updated successfully',
                                                            color: '#267FBA',
                                                        });
                                                    } else {
                                                        // Create new form
                                                        await axios.post(
                                                            `/api/v1/staff/${targetUserId}/review-forms`,
                                                            formData,
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        notifications.show({
                                                            title: 'Success',
                                                            message: 'Supervision form saved successfully',
                                                            color: '#267FBA',
                                                        });
                                                    }

                                                    // Refresh review forms
                                                    const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                    setReviewForms(reviewFormsRes.data);

                                                    setReviewFormModal(false);
                                                    setIsViewMode(false);
                                                    setEditingReviewFormId(null);
                                                } catch (error: any) {
                                                    console.error('Failed to save supervision form', error);
                                                    let errorMessage = 'Failed to save supervision form';
                                                    if (error.response?.status === 401) {
                                                        errorMessage = 'Your session has expired. Please login again.';
                                                        localStorage.removeItem('token');
                                                        localStorage.removeItem('role');
                                                        setTimeout(() => {
                                                            window.location.href = '/login';
                                                        }, 1500);
                                                    } else if (error.response?.status === 403) {
                                                        errorMessage = 'You do not have permission to save this form. Please ensure you are logged in as an admin.';
                                                    } else if (error.response?.data?.message) {
                                                        errorMessage = error.response.data.message;
                                                    }
                                                    notifications.show({
                                                        title: 'Error',
                                                        message: errorMessage,
                                                        color: 'red',
                                                    });
                                                } finally {
                                                    setReviewFormLoading(false);
                                                }
                                            }}
                                        >
                                            Save Form
                                        </Button>
                                    </Group>
                                </Stack>
                            ) : (
                                <Stack gap="lg">
                                    {/* ── Branded Employment Review Form (Edit Mode – Admin) ── */}
                                    <Paper p={0} radius="lg" withBorder style={{ border: '3px solid #267FBA', overflow: 'hidden' }}>
                                        {/* Green/Blue header with logo */}
                                        <Box style={{ background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                                <Text size="xl" fw={900} c="white" tt="uppercase" style={{ letterSpacing: '2px' }}>Lets Care All</Text>
                                                <Text size="lg" fw={800} c="white" mt={4}>{reviewFormSubType} Employment Review</Text>
                                            </Box>
                                            <img src="/assets/logo.png" alt="Logo" style={{ height: 55, width: 'auto', borderRadius: '50%', background: 'white', padding: '4px' }} />
                                        </Box>

                                        <Box p="xl">
                                            <SimpleGrid cols={2} spacing="md" mb="md">
                                                <TextInput
                                                    label="Staff Name"
                                                    value={reviewFormData.staffName}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, staffName: e.target.value })}
                                                    required
                                                    styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                />
                                                <TextInput
                                                    label="Start Date"
                                                    type="date"
                                                    value={reviewFormData.startDate}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, startDate: e.target.value })}
                                                    styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                />
                                            </SimpleGrid>
                                            <TextInput
                                                label="Date of Review"
                                                type="date"
                                                value={reviewFormData.dateOfReview}
                                                onChange={(e) => setReviewFormData({ ...reviewFormData, dateOfReview: e.target.value })}
                                                required
                                                mb="md"
                                                styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                            />
                                            <Textarea
                                                label="Check that all documentation is complete and add comments here:"
                                                value={reviewFormData.documentationComments}
                                                onChange={(e) => setReviewFormData({ ...reviewFormData, documentationComments: e.target.value })}
                                                minRows={3}
                                                mb="md"
                                                styles={{ label: { color: '#267FBA', fontWeight: 700 } }}
                                            />

                                            {/* Grading Instruction */}
                                            <Box mb="md" p="sm" style={{ background: 'linear-gradient(135deg, #e3f0f8 0%, #e6f5eb 100%)', borderRadius: '8px', border: '1px solid #b8d4ea' }}>
                                                <Text size="sm" fw={700} c="#139639" ta="center">
                                                    For the following areas please grade each section from 1–4 (1 poor, 2 below average, 3 good and 4 excellent)
                                                </Text>
                                            </Box>

                                            <SimpleGrid cols={2} spacing="md" mb="md">
                                                <Box>
                                                    <Select
                                                        label="Overall work performance"
                                                        value={reviewFormData.jobPerformanceGrade}
                                                        onChange={(value) => setReviewFormData({ ...reviewFormData, jobPerformanceGrade: value || '' })}
                                                        data={[
                                                            { value: '1', label: '1 – Poor' },
                                                            { value: '2', label: '2 – Below Average' },
                                                            { value: '3', label: '3 – Good' },
                                                            { value: '4', label: '4 – Excellent' },
                                                        ]}
                                                        placeholder="Select grade (1-4)"
                                                        styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                    />
                                                    <Box mt="xs">
                                                        <Text fw={600} size="sm" mb={4}>Comments from the reviewer:</Text>
                                                        <Textarea
                                                            placeholder="e.g. She is progressing well..."
                                                            value={reviewFormData.reviewerCommentOverallWork || ''}
                                                            onChange={(e) => setReviewFormData({ ...reviewFormData, reviewerCommentOverallWork: e.target.value })}
                                                            autosize
                                                            minRows={2}
                                                            radius="md"
                                                        />
                                                    </Box>
                                                </Box>
                                                <Box>
                                                    <Select
                                                        label="Progress in training/induction"
                                                        value={reviewFormData.trainingDevelopmentGrade}
                                                        onChange={(value) => setReviewFormData({ ...reviewFormData, trainingDevelopmentGrade: value || '' })}
                                                        data={[
                                                            { value: '1', label: '1 – Poor' },
                                                            { value: '2', label: '2 – Below Average' },
                                                            { value: '3', label: '3 – Good' },
                                                            { value: '4', label: '4 – Excellent' },
                                                        ]}
                                                        placeholder="Select grade (1-4)"
                                                        styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                    />
                                                    <Box mt="xs">
                                                        <Text fw={600} size="sm" mb={4}>Comments from the reviewer:</Text>
                                                        <Textarea
                                                            placeholder="e.g. She is progressing well..."
                                                            value={reviewFormData.reviewerCommentProgressTraining || ''}
                                                            onChange={(e) => setReviewFormData({ ...reviewFormData, reviewerCommentProgressTraining: e.target.value })}
                                                            autosize
                                                            minRows={2}
                                                            radius="md"
                                                        />
                                                    </Box>
                                                </Box>
                                            </SimpleGrid>
                                            <SimpleGrid cols={2} spacing="md" mb="md">
                                                <Box>
                                                    <Select
                                                        label="Team-working performance"
                                                        value={reviewFormData.communicationSkillsGrade}
                                                        onChange={(value) => setReviewFormData({ ...reviewFormData, communicationSkillsGrade: value || '' })}
                                                        data={[
                                                            { value: '1', label: '1 – Poor' },
                                                            { value: '2', label: '2 – Below Average' },
                                                            { value: '3', label: '3 – Good' },
                                                            { value: '4', label: '4 – Excellent' },
                                                        ]}
                                                        placeholder="Select grade (1-4)"
                                                        styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                    />
                                                    <Box mt="xs">
                                                        <Text fw={600} size="sm" mb={4}>Comments from the reviewer:</Text>
                                                        <Textarea
                                                            placeholder="e.g. She is progressing well..."
                                                            value={reviewFormData.reviewerCommentTeamWorking || ''}
                                                            onChange={(e) => setReviewFormData({ ...reviewFormData, reviewerCommentTeamWorking: e.target.value })}
                                                            autosize
                                                            minRows={2}
                                                            radius="md"
                                                        />
                                                    </Box>
                                                </Box>
                                                <Box>
                                                    <Select
                                                        label="Attendance performance"
                                                        value={reviewFormData.attendancePunctualityGrade}
                                                        onChange={(value) => setReviewFormData({ ...reviewFormData, attendancePunctualityGrade: value || '' })}
                                                        data={[
                                                            { value: '1', label: '1 – Poor' },
                                                            { value: '2', label: '2 – Below Average' },
                                                            { value: '3', label: '3 – Good' },
                                                            { value: '4', label: '4 – Excellent' },
                                                        ]}
                                                        placeholder="Select grade (1-4)"
                                                        styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                    />
                                                    <Box mt="xs">
                                                        <Text fw={600} size="sm" mb={4}>Comments from the reviewer:</Text>
                                                        <Textarea
                                                            placeholder="e.g. She is progressing well..."
                                                            value={reviewFormData.reviewerCommentAttendance || ''}
                                                            onChange={(e) => setReviewFormData({ ...reviewFormData, reviewerCommentAttendance: e.target.value })}
                                                            autosize
                                                            minRows={2}
                                                            radius="md"
                                                        />
                                                    </Box>
                                                </Box>
                                            </SimpleGrid>

                                            <Divider my="md" color="#267FBA" size="sm" />

                                            <Select
                                                label="Recommended for further period of review"
                                                value={reviewFormData.recommendedForReview}
                                                onChange={(value) => setReviewFormData({ ...reviewFormData, recommendedForReview: value || '' })}
                                                data={['YES', 'NO']}
                                                mb="md"
                                                styles={{ label: { color: '#267FBA', fontWeight: 700 } }}
                                            />
                                            {reviewFormData.recommendedForReview === 'YES' && (
                                                <Textarea
                                                    label="State reasons, and period of review:"
                                                    value={reviewFormData.reviewReasons}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, reviewReasons: e.target.value })}
                                                    minRows={3}
                                                    mb="md"
                                                    styles={{ label: { color: '#267FBA', fontWeight: 700 } }}
                                                />
                                            )}

                                            <Divider my="md" color="#139639" size="sm" />

                                            {/* Signatures */}
                                            <SimpleGrid cols={2} spacing="lg">
                                                <Box>
                                                    <SignaturePad
                                                        label="Sign and Date (Care Staff)"
                                                        value={reviewFormData.careStaffSignature}
                                                        onChange={(dataURL) => {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            setReviewFormData({ ...reviewFormData, careStaffSignature: dataURL, careStaffDate: today });
                                                        }}
                                                    />
                                                    <TextInput
                                                        label="Date"
                                                        type="date"
                                                        value={reviewFormData.careStaffDate}
                                                        onChange={(e) => setReviewFormData({ ...reviewFormData, careStaffDate: e.target.value })}
                                                        mt="xs"
                                                        styles={{ label: { color: '#267FBA', fontWeight: 700 } }}
                                                    />
                                                </Box>
                                                <Box>
                                                    <SignaturePad
                                                        label="Sign and Date (Reviewer)"
                                                        value={reviewFormData.reviewerSignature}
                                                        onChange={(dataURL) => {
                                                            const today = new Date().toISOString().split('T')[0];
                                                            setReviewFormData({ ...reviewFormData, reviewerSignature: dataURL, reviewerDate: today });
                                                        }}
                                                    />
                                                    <TextInput
                                                        label="Date"
                                                        type="date"
                                                        value={reviewFormData.reviewerDate}
                                                        onChange={(e) => setReviewFormData({ ...reviewFormData, reviewerDate: e.target.value })}
                                                        mt="xs"
                                                        styles={{ label: { color: '#139639', fontWeight: 700 } }}
                                                    />
                                                </Box>
                                            </SimpleGrid>
                                        </Box>
                                    </Paper>

                                    <Group justify="flex-end" mt="xl">
                                        <Button variant="default" onClick={() => {
                                            setReviewFormModal(false);
                                            setIsViewMode(false);
                                            setEditingReviewFormId(null);
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button
                                            color="brandBlue"
                                            loading={reviewFormLoading}
                                            onClick={async () => {
                                                if (!reviewFormData.staffName || !reviewFormData.dateOfReview) {
                                                    notifications.show({
                                                        title: 'Validation Error',
                                                        message: 'Please fill in all required fields',
                                                        color: 'red',
                                                    });
                                                    return;
                                                }

                                                setReviewFormLoading(true);
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const targetUserId = profile?.user?.id || profile?.id || id;

                                                    if (!targetUserId) {
                                                        throw new Error('Staff ID not found');
                                                    }

                                                    const formData = {
                                                        formType: reviewFormType,
                                                        formSubType: reviewFormSubType,
                                                        staffName: reviewFormData.staffName,
                                                        startDate: reviewFormData.startDate,
                                                        dateOfReview: reviewFormData.dateOfReview,
                                                        documentationComments: reviewFormData.documentationComments,
                                                        jobPerformanceGrade: reviewFormData.jobPerformanceGrade,
                                                        jobPerformanceReason: reviewFormData.reviewerCommentOverallWork,
                                                        trainingDevelopmentGrade: reviewFormData.trainingDevelopmentGrade,
                                                        trainingDevelopmentReason: reviewFormData.reviewerCommentProgressTraining,
                                                        communicationSkillsGrade: reviewFormData.communicationSkillsGrade,
                                                        communicationSkillsReason: reviewFormData.reviewerCommentTeamWorking,
                                                        attendancePunctualityGrade: reviewFormData.attendancePunctualityGrade,
                                                        attendancePunctualityReason: reviewFormData.reviewerCommentAttendance,
                                                        recommendedForReview: reviewFormData.recommendedForReview,
                                                        reviewReasons: reviewFormData.reviewReasons,
                                                        careStaffSignature: reviewFormData.careStaffSignature,
                                                        careStaffDate: reviewFormData.careStaffDate,
                                                        reviewerSignature: reviewFormData.reviewerSignature,
                                                        reviewerDate: reviewFormData.reviewerDate
                                                    };

                                                    if (editingReviewFormId) {
                                                        // Update existing form
                                                        await axios.put(
                                                            `/api/v1/staff/review-forms/${editingReviewFormId}`,
                                                            formData,
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        notifications.show({
                                                            title: 'Success',
                                                            message: 'Form updated successfully',
                                                            color: '#267FBA',
                                                        });
                                                    } else {
                                                        // Create new form
                                                        await axios.post(
                                                            `/api/v1/staff/${targetUserId}/review-forms`,
                                                            formData,
                                                            { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        notifications.show({
                                                            title: 'Success',
                                                            message: 'Form saved successfully',
                                                            color: '#267FBA',
                                                        });
                                                    }

                                                    // Refresh review forms
                                                    const reviewFormsRes = await axios.get(`/api/v1/staff/${targetUserId}/review-forms`, {
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                    setReviewForms(reviewFormsRes.data);

                                                    setReviewFormModal(false);
                                                    setIsViewMode(false);
                                                    setEditingReviewFormId(null);
                                                } catch (error: any) {
                                                    console.error('Failed to save form', error);
                                                    let errorMessage = 'Failed to save form';
                                                    if (error.response?.status === 401) {
                                                        errorMessage = 'Your session has expired. Please login again.';
                                                        localStorage.removeItem('token');
                                                        localStorage.removeItem('role');
                                                        setTimeout(() => {
                                                            window.location.href = '/login';
                                                        }, 1500);
                                                    } else if (error.response?.status === 403) {
                                                        errorMessage = 'You do not have permission to save this form. Please ensure you are logged in as an admin.';
                                                    } else if (error.response?.data?.message) {
                                                        errorMessage = error.response.data.message;
                                                    }
                                                    notifications.show({
                                                        title: 'Error',
                                                        message: errorMessage,
                                                        color: 'red',
                                                    });
                                                } finally {
                                                    setReviewFormLoading(false);
                                                }
                                            }}
                                        >
                                            Save Form
                                        </Button>
                                    </Group>
                                </Stack>
                            )}
                        </Box>
                    </ScrollArea>
                )}
            </Modal>
        </Box>
    );
};