
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
import { Mail, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';
import { setSessionFromLogin } from '../utils/auth';

function loginErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return 'Login failed. Please try again.';
    }
    if (!error.response) {
        return 'Cannot reach the server (network error). If you are on a dev machine, start the API on port 3000 (e.g. cd backend && npm run start:dev).';
    }
    const status = error.response.status;
    if (status === 502 || status === 503 || status === 504) {
        return 'The login service is unavailable: the reverse proxy could not reach the API. On the server, confirm the Nest process is running (e.g. pm2 status) and nginx upstream matches the API port.';
    }
    const raw = error.response.data?.message ?? error.response.data?.error;
    if (Array.isArray(raw)) return raw.join(' ');
    if (typeof raw === 'string') return raw;
    return 'Login failed. Please check your email and password.';
}

export const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/v1/auth/login/admin', {
                email,
                password
            });

            setSessionFromLogin(response.data);

            notifications.show({
                title: 'Welcome Back!',
                message: 'Successfully logged in.',
                color: '#267FBA',
                icon: <Check size={16} />,
            });
            navigate('/dashboard');
        } catch (error: unknown) {
            console.error('Login failed:', error);
            notifications.show({
                title: 'Login Failed',
                message: loginErrorMessage(error),
                color: 'red',
                icon: <X size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box bg="#F4F7FA" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <Stack align="center" gap="xl" maw={400} w="100%">
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

                <Paper p={30} radius="xl" withBorder w="100%" shadow="sm">
                    <Title order={2} ta="center" fw={800} mb={4} c="brandBlue.5">Welcome Back</Title>
                    <Text c="dimmed" size="sm" ta="center" mb={20}>
                        Log in to the admin portal
                    </Text>

                    <form onSubmit={handleLogin}>
                        <Stack gap="md">
                            <TextInput
                                label="Email Address"
                                placeholder="name@example.com"
                                required
                                leftSection={<Mail size={16} />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                required
                                leftSection={<Lock size={16} />}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <Group justify="flex-end">
                                <Anchor component={Link} to="/forgot-password" size="xs" c="brandBlue.5" fw={600}>
                                    Forgot Password?
                                </Anchor>
                            </Group>

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
                                Login
                            </Button>
                        </Stack>
                    </form>


                </Paper>
            </Stack>
        </Box>
    );
};
