import { useState } from 'react';
import {
    Modal,
    Stack,
    TextInput,
    PasswordInput,
    Button,
    Group,
    Text,
    Checkbox,
} from '@mantine/core';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { Check, X } from 'lucide-react';

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
            setForm({
                firstName: '',
                middleName: '',
                lastName: '',
                email: '',
                phone: '',
                lcaNumber: '',
                password: '',
            });
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
            onClose={onClose}
            title="Add new staff member"
            size="md"
            radius="lg"
        >
            <Stack gap="sm">
                <Text size="sm" c="dimmed">
                    Creates an internal staff account (not public self-registration).
                </Text>
                <TextInput
                    label="First name"
                    required
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                />
                <TextInput
                    label="Middle name"
                    value={form.middleName}
                    onChange={(e) => setField('middleName', e.target.value)}
                />
                <TextInput
                    label="Last name"
                    required
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                />
                <TextInput
                    label="Email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                />
                <TextInput
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                />
                <TextInput
                    label="Staff number"
                    placeholder="e.g. LCACS000303"
                    description="Format: LCACS000 followed by digits"
                    value={form.lcaNumber}
                    onChange={(e) => setField('lcaNumber', e.target.value)}
                />
                <Checkbox
                    label="Auto-generate secure password"
                    checked={autoPassword}
                    onChange={(e) => setAutoPassword(e.currentTarget.checked)}
                />
                {!autoPassword && (
                    <PasswordInput
                        label="Initial password"
                        description="Uppercase, lowercase, number, and special character required"
                        value={form.password}
                        onChange={(e) => setField('password', e.target.value)}
                    />
                )}
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button color="brandGreen.6" loading={loading} onClick={handleSubmit}>
                        Create staff
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
