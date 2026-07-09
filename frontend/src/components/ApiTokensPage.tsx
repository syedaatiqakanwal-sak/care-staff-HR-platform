import { useState, useEffect } from 'react';
import {
    Paper,
    Title,
    Text,
    Stack,
    Button,
    Table,
    Badge,
    Group,
    Modal,
    TextInput,
    Checkbox,
    Alert,
    ActionIcon,
    Tooltip,
    Box,
    Divider,
    Code,
    CopyButton,
} from '@mantine/core';
import { Key, Plus, Trash2, Copy, Check, AlertCircle, Calendar, Clock } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

interface ApiToken {
    id: string;
    name: string;
    scopes: string[];
    lastUsedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
}

export const ApiTokensPage = () => {
    const [tokens, setTokens] = useState<ApiToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newTokenModalOpen, setNewTokenModalOpen] = useState(false);
    const [newToken, setNewToken] = useState<string>('');
    const [creating, setCreating] = useState(false);
    const [tokenName, setTokenName] = useState('');
    const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
    const [expiresInDays, setExpiresInDays] = useState<string>('');

    const availableScopes = [
        { value: 'enrollment', label: 'Enrollment' },
        { value: 'plans', label: 'Plans' },
        { value: 'reminders', label: 'Reminders' },
    ];

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/v1/api/manage/tokens', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.data.success) {
                setTokens(response.data.tokens);
            }
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to fetch tokens',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateToken = async () => {
        if (!tokenName.trim()) {
            notifications.show({
                title: 'Error',
                message: 'Token name is required',
                color: 'red',
            });
            return;
        }

        if (selectedScopes.length === 0) {
            notifications.show({
                title: 'Error',
                message: 'Please select at least one scope',
                color: 'red',
            });
            return;
        }

        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                '/api/v1/api/manage/tokens',
                {
                    name: tokenName,
                    scopes: selectedScopes,
                    expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (response.data.success) {
                setNewToken(response.data.token);
                setCreateModalOpen(false);
                setNewTokenModalOpen(true);
                setTokenName('');
                setSelectedScopes([]);
                setExpiresInDays('');
                fetchTokens();
            }
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to create token',
                color: 'red',
            });
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteToken = async (id: string) => {
        if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/api/manage/tokens/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            notifications.show({
                title: 'Success',
                message: 'Token deleted successfully',
                color: '#267FBA',
            });
            fetchTokens();
        } catch (error: any) {
            notifications.show({
                title: 'Error',
                message: error.response?.data?.message || 'Failed to delete token',
                color: 'red',
            });
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString();
    };

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    return (
        <Paper p="xl" radius="24px" shadow="xs">
            <Group justify="space-between" mb="xl">
                <Box>
                    <Title order={2} size={28} fw={900} c="brandBlue.9">
                        API Tokens
                    </Title>
                    <Text size="sm" c="dimmed" fw={600} mt={4}>
                        Manage API tokens for n8n automation and integrations
                    </Text>
                </Box>
                <Button
                    leftSection={<Plus size={16} />}
                    onClick={() => setCreateModalOpen(true)}
                    color="brandBlue"
                    size="md"
                >
                    Create Token
                </Button>
            </Group>

            <Alert icon={<AlertCircle size={16} />} color="blue" mb="lg" radius="md">
                <Text size="sm">
                    <strong>Security Note:</strong> API tokens provide programmatic access to your account. Keep them
                    secure and never share them publicly. Tokens are shown only once when created.
                </Text>
            </Alert>

            {loading ? (
                <Text>Loading...</Text>
            ) : tokens.length === 0 ? (
                <Paper p="xl" withBorder radius="md">
                    <Stack align="center" gap="md">
                        <Key size={48} color="gray" />
                        <Text c="dimmed">No API tokens created yet</Text>
                        <Button onClick={() => setCreateModalOpen(true)}>Create Your First Token</Button>
                    </Stack>
                </Paper>
            ) : (
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Scopes</Table.Th>
                            <Table.Th>Last Used</Table.Th>
                            <Table.Th>Expires</Table.Th>
                            <Table.Th>Created</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {tokens.map((token) => (
                            <Table.Tr key={token.id}>
                                <Table.Td>
                                    <Text fw={600}>{token.name}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        {token.scopes.map((scope) => (
                                            <Badge key={scope} size="sm" color="blue" variant="light">
                                                {scope}
                                            </Badge>
                                        ))}
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Group gap={4}>
                                        <Clock size={14} color="gray" />
                                        <Text size="sm">{formatDate(token.lastUsedAt)}</Text>
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    {token.expiresAt ? (
                                        <Group gap={4}>
                                            <Calendar size={14} color={isExpired(token.expiresAt) ? 'red' : 'gray'} />
                                            <Text size="sm" c={isExpired(token.expiresAt) ? 'red' : 'default'}>
                                                {formatDate(token.expiresAt)}
                                            </Text>
                                        </Group>
                                    ) : (
                                        <Badge color="gray" variant="light">
                                            Never
                                        </Badge>
                                    )}
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{formatDate(token.createdAt)}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Tooltip label="Delete Token">
                                        <ActionIcon
                                            color="red"
                                            variant="light"
                                            onClick={() => handleDeleteToken(token.id)}
                                        >
                                            <Trash2 size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}

            {/* Create Token Modal */}
            <Modal
                opened={createModalOpen}
                onClose={() => {
                    setCreateModalOpen(false);
                    setTokenName('');
                    setSelectedScopes([]);
                    setExpiresInDays('');
                }}
                title="Create API Token"
                size="lg"
            >
                <Stack gap="md">
                    <TextInput
                        label="Token Name"
                        placeholder="e.g., n8n Production"
                        value={tokenName}
                        onChange={(e) => setTokenName(e.target.value)}
                        required
                    />

                    <Box>
                        <Text size="sm" fw={600} mb="xs">
                            Scopes (Select at least one)
                        </Text>
                        <Stack gap="xs">
                            {availableScopes.map((scope) => (
                                <Checkbox
                                    key={scope.value}
                                    label={scope.label}
                                    checked={selectedScopes.includes(scope.value)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedScopes([...selectedScopes, scope.value]);
                                        } else {
                                            setSelectedScopes(selectedScopes.filter((s) => s !== scope.value));
                                        }
                                    }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    <TextInput
                        label="Expires In (Days)"
                        placeholder="Leave empty for no expiration"
                        type="number"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        description="Optional: Token will expire after this many days"
                    />

                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="subtle"
                            onClick={() => {
                                setCreateModalOpen(false);
                                setTokenName('');
                                setSelectedScopes([]);
                                setExpiresInDays('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreateToken} loading={creating} color="brandBlue">
                            Create Token
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            {/* New Token Display Modal */}
            <Modal
                opened={newTokenModalOpen}
                onClose={() => {
                    setNewTokenModalOpen(false);
                    setNewToken('');
                }}
                title="Token Created Successfully"
                size="lg"
            >
                <Stack gap="md">
                    <Alert color="#267FBA" icon={<Check size={16} />}>
                        <Text size="sm" fw={600}>
                            Save this token now! It will not be shown again.
                        </Text>
                    </Alert>

                    <Box>
                        <Text size="sm" fw={600} mb="xs">
                            Your API Token:
                        </Text>
                        <Code block style={{ wordBreak: 'break-all' }}>
                            {newToken}
                        </Code>
                    </Box>

                    <CopyButton value={newToken}>
                        {({ copied, copy }) => (
                            <Button
                                fullWidth
                                leftSection={copied ? <Check size={16} /> : <Copy size={16} />}
                                color={copied ? 'green' : 'brandBlue'}
                                onClick={copy}
                            >
                                {copied ? 'Copied!' : 'Copy Token'}
                            </Button>
                        )}
                    </CopyButton>

                    <Button
                        variant="subtle"
                        fullWidth
                        onClick={() => {
                            setNewTokenModalOpen(false);
                            setNewToken('');
                        }}
                    >
                        I've Saved It
                    </Button>
                </Stack>
            </Modal>
        </Paper>
    );
};
