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
    PinInput,
    Group
} from '@mantine/core';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

export const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Email, 2=OTP, 3=New Password
    const [loading, setLoading] = useState(false);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Step 1: Request OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/v1/auth/forgot-password', { email });
            notifications.show({
                title: 'OTP Sent',
                message: 'Please check your email (simulated: check backend console) for the code.',
                color: 'blue',
                icon: <Mail size={16} />
            });
            setStep(2);
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to send OTP.',
                color: 'red',
                icon: <X size={16} />
            });
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        if (otp.length !== 6) return;
        setLoading(true);
        try {
            await axios.post('/api/v1/auth/verify-otp', { email, otp });
            notifications.show({
                title: 'Verified',
                message: 'OTP verified successfully.',
                color: '#267FBA',
                icon: <Check size={16} />
            });
            setStep(3);
        } catch (error: any) {
            notifications.show({
                title: 'Invalid Code',
                message: error.response?.data?.message || 'Verification failed.',
                color: 'red',
                icon: <X size={16} />
            });
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            notifications.show({ title: 'Mismatch', message: 'Passwords do not match.', color: 'red' });
            return;
        }
        setLoading(true);
        try {
            await axios.post('/api/v1/auth/reset-password', { email, otp, newPassword });
            notifications.show({
                title: 'Success',
                message: 'Password changed! Logging you in...',
                color: '#267FBA',
                icon: <Check size={16} />
            });
            setTimeout(() => navigate('/login'), 2000);
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to reset password.',
                color: 'red',
                icon: <X size={16} />
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box bg="#F4F7FA" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <Stack align="center" gap="md" maw={420} w="100%">
                {/* Logo */}
                <Link to="/">
                    <Box style={{ backgroundColor: 'white', padding: '12px', borderRadius: '50%', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}>
                        <img src="/assets/logo.png" alt="Lets Care All Logo" style={{ height: 60, width: 'auto' }} />
                    </Box>
                </Link>

                <Paper p={{ base: 'md', md: 30 }} radius="xl" withBorder w="100%" shadow="sm">
                    <Title order={3} ta="center" fw={800} mb={4} c="brandBlue.5">
                        {step === 1 && 'Forgot Password?'}
                        {step === 2 && 'Verify OTP'}
                        {step === 3 && 'New Password'}
                    </Title>
                    <Text c="dimmed" size="sm" ta="center" mb={24}>
                        {step === 1 && 'Enter your email to receive a verification code.'}
                        {step === 2 && `Enter the 6-digit code sent to ${email}`}
                        {step === 3 && 'Create a strong new password.'}
                    </Text>

                    {step === 1 && (
                        <form onSubmit={handleRequestOtp}>
                            <Stack>
                                <TextInput
                                    label="Email Address"
                                    placeholder="name@example.com"
                                    required
                                    leftSection={<Mail size={16} />}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Button type="submit" fullWidth color="brandBlue.5" radius="md" loading={loading}>
                                    Send Code
                                </Button>
                            </Stack>
                        </form>
                    )}

                    {step === 2 && (
                        <Stack align="center" gap="sm">
                            <PinInput
                                length={6}
                                type="number"
                                size="sm"
                                radius="md"
                                value={otp}
                                onChange={setOtp}
                                onComplete={() => { }} // Manual submit prefered or auto? Manual is safer for UX.
                            />
                            <Button fullWidth onClick={handleVerifyOtp} color="brandBlue.5" radius="md" loading={loading} mt="sm">
                                Verify Code
                            </Button>
                            <Button variant="subtle" size="xs" onClick={() => setStep(1)} color="gray">
                                Wrong email? Try again
                            </Button>
                        </Stack>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <Stack>
                                <PasswordInput
                                    label="New Password"
                                    placeholder="Enter new password"
                                    required
                                    leftSection={<Lock size={16} />}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <PasswordInput
                                    label="Confirm Password"
                                    placeholder="Confirm new password"
                                    required
                                    leftSection={<Lock size={16} />}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <Button type="submit" fullWidth color="brandPink.6" radius="md" loading={loading} mt="sm">
                                    Change Password
                                </Button>
                            </Stack>
                        </form>
                    )}

                    <Group justify="center" mt="xl">
                        <Anchor component={Link} to="/login" size="sm" c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowLeft size={14} /> Back to Login
                        </Anchor>
                    </Group>
                </Paper>
            </Stack>
        </Box>
    );
};
