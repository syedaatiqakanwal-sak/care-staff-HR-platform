
import {
    Paper,
    TextInput,
    PasswordInput,
    Button,
    Title,
    Text,
    Anchor,
    Stack,
    Box,
    Group
} from '@mantine/core';
import { Mail, Lock, User, Phone, ShieldCheck, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

export const SignupPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        ilccs: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            notifications.show({
                title: 'Error',
                message: 'Passwords do not match',
                color: 'red',
                icon: <X size={16} />,
            });
            return;
        }

        setLoading(true);

        try {
            await axios.post('/api/v1/auth/register', {
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                ilccsNumber: formData.ilccs
            });

            const isAdmin = localStorage.getItem('role') === 'admin';

            notifications.show({
                title: 'Account Created',
                message: isAdmin ? 'Staff member added successfully. Redirecting to Dashboard...' : 'Welcome to Lets Care All! Redirecting to login...',
                color: '#E51690',
                icon: <Check size={16} />,
                autoClose: 2000,
            });
            setTimeout(() => {
                if (isAdmin) {
                    navigate('/dashboard');
                } else {
                    navigate('/login');
                }
            }, 1500);
        } catch (error: any) {
            console.error('Signup failed:', error);
            const message = error.response?.data?.message || 'Registration failed.';
            notifications.show({
                title: 'Registration Failed',
                message: Array.isArray(message) ? message.join(', ') : message,
                color: 'red',
                icon: <X size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box bg="#F4F7FA" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <Stack align="center" gap="md" maw={440} w="100%">
                <Link to="/">
                    <Box
                        style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                        }}
                    >
                        <img src="/assets/logo.png" alt="Lets Care All Logo" style={{ height: 80, width: 'auto' }} />
                    </Box>
                </Link>

                <Paper p={{ base: 'md', md: 30 }} radius="xl" withBorder w="100%" shadow="sm">
                    <Title order={2} ta="center" fw={800} mb={4} c="brandBlue.5">Create Account</Title>
                    <Text c="dimmed" size="sm" ta="center" mb={30}>
                        Join the Lets Care All team
                    </Text>

                    <form onSubmit={handleSignup}>
                        <Stack gap="md">
                            <Group grow wrap="wrap">
                                <TextInput
                                    label="First Name"
                                    placeholder="John"
                                    required
                                    leftSection={<User size={16} />}
                                    value={formData.firstName}
                                    onChange={(e) => handleChange('firstName', e.target.value)}
                                    w={{ base: '100%', sm: 'auto' }}
                                />
                                <TextInput
                                    label="Last Name"
                                    placeholder="Doe"
                                    required
                                    leftSection={<User size={16} />}
                                    value={formData.lastName}
                                    onChange={(e) => handleChange('lastName', e.target.value)}
                                    w={{ base: '100%', sm: 'auto' }}
                                />
                            </Group>

                            <TextInput
                                label="ILCCS Number"
                                placeholder="ILCCS-12345"
                                required
                                leftSection={<ShieldCheck size={16} />}
                                value={formData.ilccs}
                                onChange={(e) => handleChange('ilccs', e.target.value)}
                            />
                            <TextInput
                                label="Email Address"
                                placeholder="name@example.com"
                                required
                                leftSection={<Mail size={16} />}
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                            />
                            <TextInput
                                label="Phone Number"
                                placeholder="+44 7700 900000"
                                required
                                leftSection={<Phone size={16} />}
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Create a password"
                                required
                                leftSection={<Lock size={16} />}
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                            />
                            <PasswordInput
                                label="Confirm Password"
                                placeholder="Confirm your password"
                                required
                                leftSection={<Lock size={16} />}
                                value={formData.confirmPassword}
                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                mt="lg"
                                radius="md"
                                color="brandBlue.5"
                                size="md"
                                fw={700}
                                loading={loading}
                            >
                                Sign Up
                            </Button>
                        </Stack>
                    </form>

                    <Text ta="center" mt="xl" size="sm">
                        Already have an account?{' '}
                        <Anchor component={Link} to="/login" fw={600} color="brandBlue.5">
                            Login
                        </Anchor>
                    </Text>
                </Paper>
            </Stack>
        </Box>
    );
};
