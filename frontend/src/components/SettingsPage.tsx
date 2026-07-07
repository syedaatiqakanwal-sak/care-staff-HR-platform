import { Paper, Title, Text, Stack, Button, Box, Group, Divider, Card, ThemeIcon } from '@mantine/core';
import { Key, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
    const navigate = useNavigate();
    const isAdmin = localStorage.getItem('role') === 'admin';

    return (
        <Paper p={{ base: 'md', md: 'xl' }} radius="24px" shadow="xs">
            <Box mb={{ base: 'md', md: 'xl' }}>
                <Title order={4} size={28} fw={900} c="brandBlue.9">Account Settings</Title>
                <Text size="sm" c="dimmed" fw={600}>Manage your account settings and integrations.</Text>
            </Box>

            <Stack gap="md">
                {isAdmin && (
                    <>
                        <Card p={{ base: 'md', md: 'lg' }} radius="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
                            <Group justify="space-between" align="center" wrap="wrap">
                                <Group gap="md" wrap="wrap">
                                    <ThemeIcon size={40} radius="md" color="brandBlue" variant="light">
                                        <Key size={20} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={700} size="lg" c="dark">API Tokens</Text>
                                        <Text size="sm" c="dimmed">
                                            Manage API tokens for n8n automation and integrations
                                        </Text>
                                    </Box>
                                </Group>
                                <Button
                                    rightSection={<ArrowRight size={16} />}
                                    onClick={() => navigate('/settings/api-tokens')}
                                    color="brandBlue"
                                    variant="filled"
                                    w={{ base: '100%', xs: 'auto' }}
                                >
                                    Manage Tokens
                                </Button>
                            </Group>
                        </Card>
                        <Divider />
                    </>
                )}

            </Stack>
        </Paper>
    );
};
