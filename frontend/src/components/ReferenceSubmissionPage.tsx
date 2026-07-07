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
    ScrollArea,
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
                    color: '#E51690',
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
                <Paper p="xl" radius="lg" withBorder>
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
                        <CheckCircle size={64} color="#E51690" />
                        <Title order={2}>Reference Already Submitted</Title>
                        <Text c="dimmed" ta="center">
                            This reference has already been completed and submitted. Thank you for your response.
                        </Text>
                    </Stack>
                </Paper>
            </Container>
        );
    }

    const isPersonal = referenceData?.referenceType === 'personal';
    const criteriaList = isPersonal
        ? [
              'Dignity and respect',
              'Hard-working',
              'Honest and Trustworthy',
              'Compassion and empathy',
              'Motivation, commitment and attitude',
              'Attitude',
              'Relationship with others',
              'Caring and Friendly',
              'Ability to engage others',
          ]
        : [
              'Attendance Record',
              'Dignity and respect',
              'Compassion, empathy, ability to empower others',
              'Motivation, commitment and attitude to work',
              'Learning and development interest',
              'Team working ability',
              'Lone working. Ability to work on Own initiative',
              'Understanding and compliance with quality and safety',
              'Attitude',
              'Relationship with Colleagues & Peers',
              'Ability to engage with clients, service users & their families',
              'Overall contribution as a member of staff',
          ];

    return (
            <Container size="lg" py="xl" px={{ base: 'md', sm: 'lg' }}>
            <Paper p="xl" radius="lg" withBorder>
                {/* Header */}
                <Box
                    p="xl"
                    mb="xl"
                    style={{
                        background: 'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)',
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
                        </SimpleGrid>
                    </Paper>

                    {/* Basic Information */}
                    <Paper p="md" withBorder>
                        <Title order={4} mb="md">
                            Reference Information
                        </Title>
                        <Stack gap="md">
                            <TextInput
                                label="Relation Candidate is known to you (e.g., Working Colleague, Study Fellow, etc.)"
                                value={formData.relationship}
                                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                required
                            />
                            <TextInput
                                label="How long have you known the Candidate? (e.g., Over 10 years or 5 Years Plus)"
                                value={formData.yearsKnown}
                                onChange={(e) => setFormData({ ...formData, yearsKnown: e.target.value })}
                                required
                            />

                            {!isPersonal && (
                                <>
                                    <TextInput
                                        label="Position(s) Held"
                                        value={formData.positionHeld}
                                        onChange={(e) => setFormData({ ...formData, positionHeld: e.target.value })}
                                    />
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        <TextInput
                                            label="Employment Start Date"
                                            type="date"
                                            value={formData.employmentStartDate}
                                            onChange={(e) =>
                                                setFormData({ ...formData, employmentStartDate: e.target.value })
                                            }
                                        />
                                        <TextInput
                                            label="Employment End Date"
                                            type="date"
                                            value={formData.employmentEndDate}
                                            onChange={(e) =>
                                                setFormData({ ...formData, employmentEndDate: e.target.value })
                                            }
                                        />
                                    </SimpleGrid>
                                    <TextInput
                                        label="Final Salary"
                                        value={formData.finalSalary}
                                        onChange={(e) => setFormData({ ...formData, finalSalary: e.target.value })}
                                    />
                                    <Textarea
                                        label="Main Duties / Responsibilities"
                                        value={formData.mainDuties}
                                        onChange={(e) => setFormData({ ...formData, mainDuties: e.target.value })}
                                        minRows={3}
                                    />
                                    <TextInput
                                        label="Reason for leaving"
                                        value={formData.reasonForLeaving}
                                        onChange={(e) => setFormData({ ...formData, reasonForLeaving: e.target.value })}
                                    />
                                </>
                            )}
                        </Stack>
                    </Paper>

                    {/* Comments Section */}
                    <Paper p="md" withBorder>
                        <Textarea
                            label="Please state here your views on the person's ability to work in this role and detail:"
                            value={formData.comments}
                            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                            minRows={5}
                            required
                        />
                    </Paper>

                    {/* Criteria Ratings Table */}
                    <Paper p="md" withBorder>
                        <Title order={4} mb="md">
                            Please advise on the following aspects by ticking the relevant box
                        </Title>
                        <ScrollArea.Autosize mah="50vh" type="auto" viewportProps={{ style: { minWidth: 560 } }}>
                            <Table
                                withTableBorder
                                withColumnBorders
                                fz="xs"
                                horizontalSpacing="xs"
                                style={{ minWidth: 560 }}
                            >
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Criteria</Table.Th>
                                        <Table.Th style={{ textAlign: 'center' }}>Excellent</Table.Th>
                                        <Table.Th style={{ textAlign: 'center' }}>Good</Table.Th>
                                        <Table.Th style={{ textAlign: 'center' }}>Average</Table.Th>
                                        <Table.Th style={{ textAlign: 'center' }}>Unable to Comment</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {criteriaList.map((criterion) => (
                                        <Table.Tr key={criterion}>
                                            <Table.Td>{criterion}</Table.Td>
                                            {['Excellent', 'Good', 'Average', 'Unable to Comment'].map((rating) => (
                                                <Table.Td key={rating} style={{ textAlign: 'center' }}>
                                                    <Radio
                                                        checked={formData.criteriaRatings[criterion] === rating}
                                                        onChange={() =>
                                                            setFormData({
                                                                ...formData,
                                                                criteriaRatings: {
                                                                    ...formData.criteriaRatings,
                                                                    [criterion]: rating,
                                                                },
                                                            })
                                                        }
                                                        value={rating}
                                                    />
                                                </Table.Td>
                                            ))}
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea.Autosize>
                    </Paper>

                    {/* Professional Reference Specific Questions */}
                    {!isPersonal && (
                        <Paper p="md" withBorder>
                            <Stack gap="md">
                                <Box>
                                    <Text fw={600} mb="xs">
                                        Was the Candidate subject to any formal form of performance management/safeguarding
                                        / disciplinary action within the last 12 months?
                                    </Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio
                                            label="Yes"
                                            checked={formData.performanceManagement === true}
                                            onChange={() =>
                                                setFormData({ ...formData, performanceManagement: true })
                                            }
                                        />
                                        <Radio
                                            label="No"
                                            checked={formData.performanceManagement === false}
                                            onChange={() =>
                                                setFormData({ ...formData, performanceManagement: false })
                                            }
                                        />
                                    </Group>
                                    {formData.performanceManagement === true && (
                                        <Textarea
                                            label="If yes, please give further details"
                                            value={formData.performanceManagementDetails}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    performanceManagementDetails: e.target.value,
                                                })
                                            }
                                            minRows={2}
                                            mt="xs"
                                        />
                                    )}
                                </Box>

                                <Box>
                                    <Text fw={600} mb="xs">
                                        Would you employ the Candidate again?
                                    </Text>
                                    <Group gap="sm" wrap="wrap">
                                        <Radio
                                            label="Yes"
                                            checked={formData.wouldEmployAgain === true}
                                            onChange={() => setFormData({ ...formData, wouldEmployAgain: true })}
                                        />
                                        <Radio
                                            label="No"
                                            checked={formData.wouldEmployAgain === false}
                                            onChange={() => setFormData({ ...formData, wouldEmployAgain: false })}
                                        />
                                    </Group>
                                    {formData.wouldEmployAgain === false && (
                                        <Textarea
                                            label="If No, please give further details"
                                            value={formData.wouldEmployAgainDetails}
                                            onChange={(e) =>
                                                setFormData({ ...formData, wouldEmployAgainDetails: e.target.value })
                                            }
                                            minRows={2}
                                            mt="xs"
                                        />
                                    )}
                                </Box>

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

                    {/* Additional Comments */}
                    <Paper p="md" withBorder>
                        <Textarea
                            label="We welcome any additional comments you may have below. Please include anything not previously mentioned which would help or hinder this person's application to Lets Care All."
                            value={formData.additionalComments}
                            onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                            minRows={4}
                        />
                    </Paper>

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
                        <Text size="sm" style={{ lineHeight: 1.6 }}>
                            Individuals have a right under the General Data Protection Regulations to see copies of
                            references received about them. Therefore, we cannot guarantee the complete confidentiality
                            of any reference received.
                        </Text>
                        <Text size="sm" mt="sm" style={{ lineHeight: 1.6 }}>
                            We will only collect data for specified, explicit and legitimate use in relation to the
                            recruitment process. By submitting this form, you consent to hold the information contained.
                        </Text>
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
