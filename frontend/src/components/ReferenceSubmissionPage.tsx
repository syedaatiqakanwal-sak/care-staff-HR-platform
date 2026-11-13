import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    Textarea,
    Button,
    Stack,
    Group,
    Box,
    SimpleGrid,
    Table,
    Checkbox,
    Radio,
    Loader,
    Alert,
    Divider,
    Badge,
} from '@mantine/core';
import { SignaturePad } from './SignaturePad';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ReferenceData {
    id: string;
    token: string;
    referenceType: string;
    candidateName: string;
    name: string;
    email: string;
    status: string;
}


function CriteriaRatings({
    criteria,
    ratings,
    options,
    onRate,
}: {
    criteria: string[];
    ratings: Record<string, string>;
    options: string[];
    onRate: (criterion: string, rating: string) => void;
}) {
    return (
        <>
            <Stack gap="sm" hiddenFrom="sm">
                {criteria.map((criterion) => (
                    <Box
                        key={criterion}
                        p="sm"
                        style={{ border: '1px solid #E6EBF0', borderRadius: 10 }}
                    >
                        <Text fw={700} size="sm" mb={8}>{criterion}</Text>
                        <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                            {options.map((rating) => (
                                <Radio
                                    key={rating}
                                    label={rating}
                                    checked={ratings[criterion] === rating}
                                    onChange={() => onRate(criterion, rating)}
                                    value={rating}
                                    styles={{ label: { whiteSpace: 'normal', lineHeight: 1.3 } }}
                                />
                            ))}
                        </SimpleGrid>
                    </Box>
                ))}
            </Stack>
            <Box visibleFrom="sm">
                <Table withTableBorder withColumnBorders fz="xs" horizontalSpacing="xs">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Criteria</Table.Th>
                            {options.map((rating) => (
                                <Table.Th key={rating} style={{ textAlign: 'center' }}>{rating}</Table.Th>
                            ))}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {criteria.map((criterion) => (
                            <Table.Tr key={criterion}>
                                <Table.Td>{criterion}</Table.Td>
                                {options.map((rating) => (
                                    <Table.Td key={rating} style={{ textAlign: 'center' }}>
                                        <Radio
                                            checked={ratings[criterion] === rating}
                                            onChange={() => onRate(criterion, rating)}
                                            value={rating}
                                            aria-label={`${criterion}: ${rating}`}
                                        />
                                    </Table.Td>
                                ))}
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Box>
        </>
    );
}

export const ReferenceSubmissionPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [alreadySubmitted, setAlreadySubmitted] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        relationship: '',
        yearsKnown: '',
        comments: '',
        recommendation: null as boolean | null,
        signature: '',
        signatureDate: new Date().toISOString().split('T')[0],
        criteriaRatings: {} as Record<string, string>,
        additionalComments: '',
        // Professional reference specific fields
        positionHeld: '',
        employmentStartDate: '',
        employmentEndDate: '',
        finalSalary: '',
        mainDuties: '',
        reasonForLeaving: '',
        performanceManagement: null as boolean | null,
        performanceManagementDetails: '',
        wouldEmployAgain: null as boolean | null,
        wouldEmployAgainDetails: '',
        honestTrustworthy: null as boolean | null,
        reliableTrustworthy: null as boolean | null,
        attendanceTimekeeping: null as boolean | null,
        suitableForPost: null as boolean | null,
        companyName: '',
        companyAddress: '',
        telephone: '',
        position: '',
    });

    useEffect(() => {
        if (token) {
            loadReference();
        }
    }, [token]);

    const loadReference = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`/api/v1/reference/submit/${token}`);
            
            if (response.data.success) {
                const ref = response.data.reference;
                setReferenceData(ref);
                
                if (ref.status === 'submitted') {
                    setAlreadySubmitted(true);
                    setError('This reference has already been submitted.');
                }
            } else {
                setError(response.data.message || 'Failed to load reference form');
            }
        } catch (err: any) {
            console.error('Error loading reference:', err);
            
            let errorMessage = 'Reference link is invalid or expired.';
            
            if (err.response) {
                // Server responded with error
                errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
                
                if (err.response.status === 400) {
                    if (errorMessage.includes('already been submitted')) {
                        setAlreadySubmitted(true);
                    } else if (errorMessage.includes('expired')) {
                        errorMessage = 'This reference link has expired. Please contact the administrator.';
                    }
                } else if (err.response.status === 404) {
                    errorMessage = 'Reference link is invalid or expired.';
                }
            } else if (err.request) {
                // Request was made but no response received
                errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!referenceData) return;

        // Basic validation
        if (!formData.relationship || !formData.yearsKnown) {
            notifications.show({
                title: 'Validation Error',
                message: 'Please fill in all required fields',
                color: 'red',
            });
            return;
        }

        try {
            setSubmitting(true);
            const response = await axios.post(`/api/v1/reference/submit/${token}`, formData);
            
            if (response.data.success) {
                notifications.show({
                    title: 'Success',
                    message: response.data.message || 'Thank you. Your reference has been successfully submitted.',
                    color: '#267FBA',
                    icon: <CheckCircle size={16} />,
                });
                
                // Show success state
                setAlreadySubmitted(true);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to submit reference';
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <XCircle size={16} />,
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Container size="md" py="xl">
                <Paper p={{ base: 'sm', sm: 'xl' }} radius="lg" withBorder>
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text>Loading reference form...</Text>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    if (error && !referenceData && !loading) {
        return (
            <Container size="md" py="xl">
                <Paper p="xl" radius="lg" withBorder>
                    <Stack align="center" gap="md">
                        <AlertCircle size={64} color="red" />
                        <Title order={2}>Reference Link Error</Title>
                        <Alert icon={<AlertCircle size={16} />} title="Error" color="red" style={{ width: '100%' }}>
                            {error}
                        </Alert>
                        <Text c="dimmed" ta="center" mt="md">
                            If you believe this is an error, please contact the administrator or the person who requested this reference.
                        </Text>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    if (alreadySubmitted) {
        return (
            <Container size="md" py="xl">
                <Paper p="xl" radius="lg" withBorder>
                    <Stack align="center" gap="md">
                        <CheckCircle size={64} color="#267FBA" />
                        <Title order={2}>Reference Submitted</Title>
                        <Text c="dimmed" ta="center">
                            This reference has been completed and submitted. Thank you for your response.
                        </Text>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    const isPersonal = referenceData?.referenceType === 'personal';
    const criteriaList = [
        'Dignity and respect',
        'Hard-working',
        'Honest and Trustworthy',
        'Compassion and empathy',
        'Motivation, commitment and attitude',
        'Attitude',
        'Relationship with others',
        'Caring and Friendly',
        'Ability to engage others',
    ];
    const professionalCriteriaA = [
        'Attendance Record',
        'Dignity and respect',
        'Compassion, empathy, ability to empower others',
        'Motivation, commitment and attitude to work',
        'Learning and development interest',
        'Team working ability',
        'Lone working. Ability to work on Own initiative',
    ];
    const professionalCriteriaB = [
        'Understanding and compliance with quality and safety',
        'Attitude',
        'Relationship with Colleagues & Peers',
        'Ability to engage with clients, service users & their families',
        'Overall contribution as a member of staff',
    ];

    return (
            <Container size="lg" py={{ base: 'md', sm: 'xl' }} px={{ base: 'sm', sm: 'lg' }}>
            <Paper p="xl" radius="lg" withBorder>
                {/* Header */}
                <Box
                    p={{ base: 'md', sm: 'xl' }}
                    mb={{ base: 'md', sm: 'xl' }}
                    style={{
                        background: 'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)',
                        color: 'white',
                        borderRadius: '8px',
                    }}
                >
                    <Title order={1} c="white" mb="xs">
                        LETS CARE ALL
                    </Title>
                    <Text size="lg" c="rgba(255,255,255,0.9)">
                        {isPersonal ? 'CHARACTER REFERENCE REQUEST FORM' : 'REFERENCE REQUEST FORM'}
                    </Text>
                </Box>

                <Stack gap="xl">
                    {/* Reference Information */}
                    <Paper p="md" withBorder>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <Box>
                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                    Name of Referee
                                </Text>
                                <Text size="lg">{referenceData?.name || '-'}</Text>
                            </Box>
                            <Box>
                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                    Candidate Name
                                </Text>
                                <Text size="lg">{referenceData?.candidateName || '-'}</Text>
                            </Box>
                            <Box>
                                <Text size="sm" fw={600} c="dimmed" mb={4}>
                                    {isPersonal ? 'Position Applied For' : 'Position Applied for'}
                                </Text>
                                <Text size="lg">Care Assistant (CARE Staff)</Text>
                            </Box>
                        </SimpleGrid>
                        {isPersonal && (
                            <Text size="sm" mt="md" style={{ lineHeight: 1.6 }}>
                                The above person has applied for the Care Worker position and has named you as a character referee. I would be grateful if you could express your opinion on the suitability of the Candidate for the specified post. Your reply will be kept in line with Data Protection Policies and the General Data Protection Regulation.
                            </Text>
                        )}
                    </Paper>

                    {/* Basic Information */}
                    <Paper p="md" withBorder>
                        {!isPersonal && (
                        <Title order={4} mb="md">
                            Reference Information
                        </Title>
                        )}
                        <Stack gap="md">
                            {!isPersonal && (
                                <>
                                    <TextInput
                                        label="Position(s) Held at your Organisation"
                                        value={formData.positionHeld}
                                        onChange={(e) => setFormData({ ...formData, positionHeld: e.target.value })}
                                    />
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        <TextInput
                                            label="Employment start date"
                                            type="date"
                                            value={formData.employmentStartDate}
                                            onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
                                        />
                                        <TextInput
                                            label="Final Salary"
                                            value={formData.finalSalary}
                                            onChange={(e) => setFormData({ ...formData, finalSalary: e.target.value })}
                                        />
                                    </SimpleGrid>
                                    <TextInput
                                        label="Employment end date"
                                        type="date"
                                        value={formData.employmentEndDate}
                                        onChange={(e) => setFormData({ ...formData, employmentEndDate: e.target.value })}
                                    />
                                    <Textarea
                                        label="Main Duties / Responsibilities"
                                        value={formData.mainDuties}
                                        onChange={(e) => setFormData({ ...formData, mainDuties: e.target.value })}
                                        minRows={3}
                                    />
                                </>
                            )}
                            <TextInput
                                label={isPersonal
                                    ? 'Relation to the Candidate is known to you: i.e. Working Colleague, Study Fellow, Study & Work Colleague, etc.'
                                    : 'Capacity in which Candidate is known (e.g, Employee, Co-Worker, Colleague)'}
                                value={formData.relationship}
                                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                required
                            />
                            <TextInput
                                label={isPersonal
                                    ? 'How long have you known the Candidate? i.e. Over 10 years or 5 Years Plus'
                                    : 'How long have you known the Candidate?'}
                                value={formData.yearsKnown}
                                onChange={(e) => setFormData({ ...formData, yearsKnown: e.target.value })}
                                required
                            />

                            {!isPersonal && (
                                <TextInput
                                    label="Reason for leaving"
                                    value={formData.reasonForLeaving}
                                    onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                                />
                            )}
                        </Stack>
                    </Paper>

                    {isPersonal && (
                    <Paper p="md" withBorder>
                        <Textarea
                            label="Please state here your views on the person's ability to work in this role and detail:"
                            value={formData.comments}
                            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                            minRows={5}
                            required
                        />
                    </Paper>
                    )}

                    {!isPersonal && (
                        <Paper p="md" withBorder>
                            <Stack gap="md">
                                <Box>
                                    <Text fw={600} mb="xs">Was the Candidate subject to any formal form of performance management/safeguarding / disciplinary action within the last 12 months? Please tick (✔ or X) Appropriate</Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio label="Yes" checked={formData.performanceManagement === true} onChange={() => setFormData({ ...formData, performanceManagement: true })} />
                                        <Radio label="No" checked={formData.performanceManagement === false} onChange={() => setFormData({ ...formData, performanceManagement: false })} />
                                    </Group>
                                    {formData.performanceManagement === true && (
                                        <Textarea label="If yes, please give further details:" value={formData.performanceManagementDetails} onChange={(e) => setFormData({ ...formData, performanceManagementDetails: e.target.value })} minRows={2} mt="xs" />
                                    )}
                                </Box>
                                <Box>
                                    <Text fw={600} mb="xs">Would you employ the Candidate again? Please tick (✔ or X) Appropriate</Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio label="Yes" checked={formData.wouldEmployAgain === true} onChange={() => setFormData({ ...formData, wouldEmployAgain: true })} />
                                        <Radio label="No" checked={formData.wouldEmployAgain === false} onChange={() => setFormData({ ...formData, wouldEmployAgain: false })} />
                                    </Group>
                                    {formData.wouldEmployAgain === false && (
                                        <Textarea label="If No, please give further details:" value={formData.wouldEmployAgainDetails} onChange={(e) => setFormData({ ...formData, wouldEmployAgainDetails: e.target.value })} minRows={2} mt="xs" />
                                    )}
                                </Box>
                            </Stack>
                        </Paper>
                    )}

                    {/* Criteria Ratings Table */}
                    <Paper p="md" withBorder>
                        <Title order={4} mb="md">
                            {isPersonal
                                ? "Please advise on the following aspects of the Candidate's character (where applicable) by ticking the relevant box to indicate the level in each category, and add any comments you feel are appropriate."
                                : "Please advise on the following aspects of the Candidate's Employment (where applicable) by ticking the relevant box to indicate the level in each category - please add any comments you feel appropriate."}
                        </Title>
                        <Text size="sm" mb="sm">{isPersonal ? "Criteria: Assign (✔ or X) to the applicant's performance" : "Criteria: Assign (✔ or X) to the Candidate's performance"}</Text>
                        <CriteriaRatings
                            criteria={isPersonal ? criteriaList : professionalCriteriaA}
                            ratings={formData.criteriaRatings}
                            options={['Excellent', 'Good', 'Average', isPersonal ? 'Unable to comment' : 'Unable to Comment']}
                            onRate={(criterion, rating) => setFormData({
                                ...formData,
                                criteriaRatings: { ...formData.criteriaRatings, [criterion]: rating },
                            })}
                        />
                        {!isPersonal && (
                            <>
                                <Text size="sm" mt="md" mb="sm">Criteria: Assign X to the Candidate's performance</Text>
                                <CriteriaRatings
                                    criteria={professionalCriteriaB}
                                    ratings={formData.criteriaRatings}
                                    options={['Excellent', 'Good', 'Average', 'Unable to comment']}
                                    onRate={(criterion, rating) => setFormData({
                                        ...formData,
                                        criteriaRatings: { ...formData.criteriaRatings, [criterion]: rating },
                                    })}
                                />
                            </>
                        )}
                        {isPersonal && (
                            <Textarea
                                mt="md"
                                label="Comments"
                                value={formData.additionalComments}
                                onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                                minRows={3}
                            />
                        )}
                    </Paper>

                    {/* Professional Reference Specific Questions */}
                    {!isPersonal && (
                        <Paper p="md" withBorder>
                            <Stack gap="md">
                                <Box>
                                    <Text fw={600} mb="xs">Did you find the applicant honest and trustworthy?</Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio
                                            label="Yes"
                                            checked={formData.honestTrustworthy === true}
                                            onChange={() => setFormData({ ...formData, honestTrustworthy: true })}
                                        />
                                        <Radio
                                            label="No"
                                            checked={formData.honestTrustworthy === false}
                                            onChange={() => setFormData({ ...formData, honestTrustworthy: false })}
                                        />
                                    </Group>
                                </Box>

                                <Box>
                                    <Text fw={600} mb="xs">
                                        Did you find the Candidate to be reliable/trustworthy in carrying out their
                                        duties?
                                    </Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio
                                            label="Yes"
                                            checked={formData.reliableTrustworthy === true}
                                            onChange={() => setFormData({ ...formData, reliableTrustworthy: true })}
                                        />
                                        <Radio
                                            label="No"
                                            checked={formData.reliableTrustworthy === false}
                                            onChange={() => setFormData({ ...formData, reliableTrustworthy: false })}
                                        />
                                    </Group>
                                </Box>

                                <Box>
                                    <Text fw={600} mb="xs">Was the applicant's attendance/timekeeping acceptable?</Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio
                                            label="Yes"
                                            checked={formData.attendanceTimekeeping === true}
                                            onChange={() => setFormData({ ...formData, attendanceTimekeeping: true })}
                                        />
                                        <Radio
                                            label="No"
                                            checked={formData.attendanceTimekeeping === false}
                                            onChange={() => setFormData({ ...formData, attendanceTimekeeping: false })}
                                        />
                                    </Group>
                                </Box>

                                <Box>
                                    <Text fw={600} mb="xs">
                                        Do you think the Candidate is a suitable person to undertake this post?
                                    </Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio
                                            label="Yes"
                                            checked={formData.suitableForPost === true}
                                            onChange={() => setFormData({ ...formData, suitableForPost: true })}
                                        />
                                        <Radio
                                            label="No"
                                            checked={formData.suitableForPost === false}
                                            onChange={() => setFormData({ ...formData, suitableForPost: false })}
                                        />
                                    </Group>
                                </Box>
                            </Stack>
                        </Paper>
                    )}

                    {!isPersonal && (
                    <Paper p="md" withBorder>
                        <Text size="sm" mb="xs">We welcome any additional comments you may have below. Please include anything not previously mentioned which would help or hinder this person's application to Lets Care All; please include any in-house training:</Text>
                        <Textarea
                            label="Please provide any additional comments here (continue on an additional sheet if necessary):"
                            value={formData.additionalComments}
                            onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                            minRows={4}
                        />
                    </Paper>
                    )}

                    {/* Signature Section */}
                    <Paper p="md" withBorder>
                        <Title order={4} mb="md">
                            Signature
                        </Title>
                        <Stack gap="md">
                            <SignaturePad
                                label="Referee Signature"
                                value={formData.signature}
                                onChange={(dataURL) => setFormData({ ...formData, signature: dataURL })}
                                disabled={false}
                            />
                            <TextInput
                                label="Date"
                                type="date"
                                value={formData.signatureDate}
                                onChange={(e) => setFormData({ ...formData, signatureDate: e.target.value })}
                            />
                            {!isPersonal && (
                                <>
                                    <TextInput
                                        label="Company Name"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    />
                                    <Textarea
                                        label="Company Address"
                                        value={formData.companyAddress}
                                        onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                                        minRows={2}
                                    />
                                    <TextInput
                                        label="Telephone No"
                                        value={formData.telephone}
                                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                    />
                                </>
                            )}
                            {isPersonal && (
                                <TextInput
                                    label="Telephone No"
                                    value={formData.telephone}
                                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                />
                            )}
                            <TextInput
                                label="Email"
                                value={referenceData?.email || ''}
                                disabled
                            />
                            <TextInput
                                label="Your Position"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            />
                        </Stack>
                    </Paper>

                    {/* Privacy Notice */}
                    <Paper p="md" withBorder style={{ background: '#f9f9f9' }}>
                        <Title order={5} mb="sm">
                            Privacy Notice
                        </Title>
                        <Stack gap="sm">
                                <Text size="sm" style={{ lineHeight: 1.6 }}>Individuals have a right under the General Data Protection Regulation to see copies of references received about them. Therefore, we cannot guarantee the complete confidentiality of any reference received.</Text>
                                <Text size="sm" style={{ lineHeight: 1.6 }}>We will only collect data for specified, explicit and legitimate use in relation to the recruitment process. By signing this document, you consent to the holding of the information contained.</Text>
                                <Text size="sm" style={{ lineHeight: 1.6 }}>We are required to keep this information within the Candidate's personnel file. We cannot estimate the exact period it will be held. When that period is over, we will delete your data.</Text>
                                <Text size="sm" style={{ lineHeight: 1.6 }}>We have privacy policies that you can request for further information. Please be assured that your data will be securely stored by the Data Protection Officer (DPO) and used only for the successful recruitment of the Candidate.</Text>
                                <Text size="sm" style={{ lineHeight: 1.6 }}>{isPersonal
                                    ? "You have the right to have your data forgotten, to rectify or access your data, to restrict processing, to withdraw your consent, and to be kept informed about the processing of your data. If you would like to discuss this further or withdraw your consent at any time, don't hesitate to get in touch with us via email to the DPO at info@letscareall.org.uk"
                                    : 'You have the right to have your data forgotten, to rectify or access your data, to restrict processing, to withdraw your consent, and to be kept informed about the processing of your data. If you would like to discuss this further or withdraw your consent at any time, please get in touch with us via email at DPO at info@letscareall.org.uk.'}</Text>
                            </Stack>
                    </Paper>

                    <Paper p="md" withBorder style={{ background: '#fffacd' }}>
                        <Title order={5} mb="sm">Office use only</Title>
                        <Text size="sm" c="dimmed" mb="sm">This section is completed by Lets Care All after the reference is returned.</Text>
                        <Stack gap="sm">
                            <TextInput label="Reference verified via email by Name" disabled />
                            {!isPersonal && (
                                <TextInput label="Verbal Reference Taken By (only if it is not possible by email or by post)" disabled />
                            )}
                            <TextInput label="Date" type="date" disabled />
                            {!isPersonal && <TextInput label="Reason Stated" disabled />}
                            <Textarea label="Additional Note" minRows={3} disabled />
                        </Stack>
                    </Paper>

                    {/* Submit Button */}
                    <Group justify="center" mt="xl" w="100%">
                        <Button
                            size="lg"
                            onClick={handleSubmit}
                            loading={submitting}
                            disabled={alreadySubmitted}
                            w={{ base: '100%', sm: 240 }}
                        >
                            Submit Reference
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        </Container>
    );
};
