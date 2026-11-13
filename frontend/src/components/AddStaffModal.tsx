import { useEffect, useRef, useState } from 'react';
import {
    Modal,
    Stack,
    TextInput,
    PasswordInput,
    Button,
    Group,
    Text,
    Checkbox,
    Box,
    Paper,
    SimpleGrid,
    Title,
    Divider,
    ScrollArea,
} from '@mantine/core';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { Check, X, UserPlus, Hash, Mail, Phone, Lock } from 'lucide-react';

const BRAND_GREEN = '#139639';
const BRAND_SOFT = '#F0FAF4';
const BRAND_BORDER = '#C8E6D0';
const BRAND_LABEL = '#2F6B45';

const inputStyles = {
    label: {
        fontWeight: 700,
        fontSize: 12,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        color: BRAND_LABEL,
        marginBottom: 6,
    },
    input: {
        borderColor: BRAND_BORDER,
        borderRadius: 10,
        minHeight: 42,
        fontWeight: 500,
    },
    description: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 4,
    },
};

function generatePassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%&*';
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    const base = Array.from({ length: 10 }, () =>
        pick(upper + lower + digits),
    ).join('');
    return `${pick(upper)}${pick(lower)}${pick(digits)}${base}${pick(special)}`;
}

type AddStaffModalProps = {
    opened: boolean;
    onClose: () => void;
    onCreated: (userId?: string) => void;
};

export function AddStaffModal({ opened, onClose, onCreated }: AddStaffModalProps) {
    const [loading, setLoading] = useState(false);
    const [autoPassword, setAutoPassword] = useState(true);
    const numberEdited = useRef(false);
    const [form, setForm] = useState({
        firstName: '',
        middleName: '',
        lastName: '',
        email: '',
        phone: '',
        lcaNumber: '',
        password: '',
    });

    const setField = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setForm({
            firstName: '',
            middleName: '',
            lastName: '',
            email: '',
            phone: '',
            lcaNumber: '',
            password: '',
        });
        setAutoPassword(true);
        numberEdited.current = false;
    };

    useEffect(() => {
        if (!opened) return;
        let cancelled = false;
        const token = localStorage.getItem('token');
        axios
            .get('/api/v1/staff/next-staff-number', {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                const next = res.data?.lcaNumber as string | undefined;
                if (!cancelled && next && !numberEdited.current) {
                    setField('lcaNumber', next);
                }
            })
            .catch(() => {
                /* The field stays editable if the suggestion cannot be loaded. */
            });
        return () => {
            cancelled = true;
        };
    }, [opened]);

    const handleClose = () => {
        if (!loading) {
            resetForm();
            onClose();
        }
    };

    const handleSubmit = async () => {
        const email = form.email.trim();
        if (!form.firstName.trim() || !form.lastName.trim() || !email) {
            notifications.show({
                title: 'Missing fields',
                message: 'First name, last name, and email are required.',
                color: 'red',
                icon: <X size={16} />,
            });
            return;
        }

        const password = autoPassword ? generatePassword() : form.password;
        if (!password || password.length < 8) {
            notifications.show({
                title: 'Password required',
                message: 'Enter a password (min 8 characters) or use auto-generate.',
                color: 'red',
                icon: <X size={16} />,
            });
            return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(
                '/api/v1/users',
                {
                    email,
                    password,
                    role: 'STAFF',
                    firstName: form.firstName.trim(),
                    middleName: form.middleName.trim() || undefined,
                    lastName: form.lastName.trim(),
                    phone: form.phone.trim() || undefined,
                    lcaNumber: form.lcaNumber.trim() || undefined,
                    isActive: true,
                },
                { headers: { Authorization: `Bearer ${token}` } },
            );

            const userId = res.data?.user?.id as string | undefined;
            notifications.show({
                title: 'Staff created',
                message: autoPassword
                    ? `Account created. Temporary password: ${password} (share securely with the employee).`
                    : 'New staff member added successfully.',
                color: '#267FBA',
                icon: <Check size={16} />,
                autoClose: autoPassword ? 12000 : 4000,
            });
            resetForm();
            onCreated(userId);
        } catch (error: unknown) {
            const msg = axios.isAxiosError(error)
                ? (error.response?.data?.message as string) ||
                  'Failed to create staff member'
                : 'Failed to create staff member';
            notifications.show({
                title: 'Could not create staff',
                message: Array.isArray(msg) ? msg.join(', ') : msg,
                color: 'red',
                icon: <X size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            size="lg"
            radius="md"
            centered
            padding={0}
            withCloseButton={false}
            zIndex={400}
            styles={{
                inner: {
                    padding: '16px',
                    alignItems: 'center',
                },
                content: {
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100dvh - 32px)',
                    width: '100%',
                },
                body: {
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    maxHeight: 'calc(100dvh - 32px)',
                },
            }}
        >
            <Box
                px={{ base: 'md', sm: 'xl' }}
                pt="md"
                pb="sm"
                style={{
                    background: BRAND_SOFT,
                    borderBottom: `1px solid ${BRAND_BORDER}`,
                    borderLeft: `4px solid ${BRAND_GREEN}`,
                    flexShrink: 0,
                }}
            >
                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                    <Group gap="sm" align="flex-start" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                background: '#fff',
                                border: `1px solid ${BRAND_BORDER}`,
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <UserPlus size={18} color={BRAND_GREEN} />
                        </Box>
                        <Box style={{ minWidth: 0 }}>
                            <Title
                                order={3}
                                style={{
                                    color: '#1A1D21',
                                    fontWeight: 800,
                                    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                                    lineHeight: 1.25,
                                }}
                            >
                                Add new staff member
                            </Title>
                            <Text size="xs" mt={4} style={{ color: BRAND_LABEL, lineHeight: 1.4 }}>
                                Creates an internal staff account (not public self-registration).
                            </Text>
                        </Box>
                    </Group>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="compact-sm"
                        px={6}
                        onClick={handleClose}
                        disabled={loading}
                        aria-label="Close"
                        style={{ flexShrink: 0 }}
                    >
                        <X size={18} />
                    </Button>
                </Group>
            </Box>

            <ScrollArea
                type="always"
                offsetScrollbars
                scrollbars="y"
                h="calc(100dvh - 250px)"
                styles={{
                    viewport: { paddingBottom: 16 },
                }}
            >
                <Box px={{ base: 'md', sm: 'xl' }} py="md">
                    <Stack gap="md">
                        <Box>
                            <Text
                                size="xs"
                                fw={700}
                                tt="uppercase"
                                mb="xs"
                                style={{ letterSpacing: '0.06em', color: BRAND_LABEL }}
                            >
                                Personal details
                            </Text>
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                <TextInput
                                    label="First name"
                                    required
                                    placeholder="e.g. Jane"
                                    value={form.firstName}
                                    onChange={(e) => setField('firstName', e.target.value)}
                                    styles={inputStyles}
                                />
                                <TextInput
                                    label="Middle name"
                                    placeholder="Optional"
                                    value={form.middleName}
                                    onChange={(e) => setField('middleName', e.target.value)}
                                    styles={inputStyles}
                                />
                            </SimpleGrid>
                            <Box mt="sm">
                                <TextInput
                                    label="Last name"
                                    required
                                    placeholder="e.g. Smith"
                                    value={form.lastName}
                                    onChange={(e) => setField('lastName', e.target.value)}
                                    styles={inputStyles}
                                />
                            </Box>
                        </Box>

                        <Divider color="#EEF2F6" />

                        <Box>
                            <Text
                                size="xs"
                                fw={700}
                                tt="uppercase"
                                mb="xs"
                                style={{ letterSpacing: '0.06em', color: BRAND_LABEL }}
                            >
                                Contact & staff number
                            </Text>
                            <Stack gap="sm">
                                <TextInput
                                    label="Email"
                                    type="email"
                                    required
                                    placeholder="name@letscareall.org.uk"
                                    leftSection={<Mail size={14} color={BRAND_GREEN} />}
                                    value={form.email}
                                    onChange={(e) => setField('email', e.target.value)}
                                    styles={inputStyles}
                                />
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                                    <TextInput
                                        label="Phone"
                                        placeholder="Optional"
                                        leftSection={<Phone size={14} color={BRAND_GREEN} />}
                                        value={form.phone}
                                        onChange={(e) => setField('phone', e.target.value)}
                                        styles={inputStyles}
                                    />
                                    <TextInput
                                        label="Staff number"
                                        placeholder="e.g. LCACS000384"
                                        description="Filled with the next LCACS number. You can change it."
                                        leftSection={<Hash size={14} color={BRAND_GREEN} />}
                                        value={form.lcaNumber}
                                        onChange={(e) => {
                                            numberEdited.current = true;
                                            setField('lcaNumber', e.target.value);
                                        }}
                                        styles={inputStyles}
                                    />
                                </SimpleGrid>
                            </Stack>
                        </Box>

                        <Divider color="#EEF2F6" />

                        <Paper
                            p="sm"
                            radius="md"
                            style={{
                                background: BRAND_SOFT,
                                border: `1px solid ${BRAND_BORDER}`,
                            }}
                        >
                            <Group gap="sm" mb={autoPassword ? 0 : 'sm'} align="flex-start">
                                <Lock size={16} color={BRAND_GREEN} style={{ marginTop: 2 }} />
                                <Box style={{ flex: 1, minWidth: 0 }}>
                                    <Checkbox
                                        label="Auto-generate secure password"
                                        description="A temporary password will be shown after create — share it securely."
                                        checked={autoPassword}
                                        onChange={(e) => setAutoPassword(e.currentTarget.checked)}
                                        color="green"
                                        styles={{
                                            label: { fontWeight: 600, color: '#1A1D21' },
                                            description: { color: BRAND_LABEL, fontSize: 12 },
                                        }}
                                    />
                                </Box>
                            </Group>
                            {!autoPassword && (
                                <PasswordInput
                                    label="Initial password"
                                    description="Uppercase, lowercase, number, and special character required"
                                    value={form.password}
                                    onChange={(e) => setField('password', e.target.value)}
                                    styles={inputStyles}
                                />
                            )}
                        </Paper>
                    </Stack>
                </Box>
            </ScrollArea>

            <Box
                px={{ base: 'md', sm: 'xl' }}
                py="sm"
                style={{
                    borderTop: '1px solid #EEF2F6',
                    background: '#FAFBFC',
                    flexShrink: 0,
                }}
            >
                <Group justify="flex-end" gap="sm" wrap="wrap">
                    <Button
                        variant="default"
                        onClick={handleClose}
                        disabled={loading}
                        radius="md"
                        fullWidth={false}
                        styles={{
                            root: {
                                borderColor: '#D1D5DB',
                                color: '#1A1D21',
                                fontWeight: 600,
                                minWidth: 100,
                            },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        loading={loading}
                        onClick={handleSubmit}
                        radius="md"
                        leftSection={!loading ? <UserPlus size={16} /> : undefined}
                        styles={{
                            root: {
                                backgroundColor: BRAND_GREEN,
                                color: '#fff',
                                border: 'none',
                                fontWeight: 700,
                                minWidth: 130,
                                '&:hover': {
                                    backgroundColor: '#0f7a2f',
                                },
                            },
                        }}
                    >
                        Create staff
                    </Button>
                </Group>
            </Box>
        </Modal>
    );
}
