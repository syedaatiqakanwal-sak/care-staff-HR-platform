import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Center, Stack, Text, Title, ThemeIcon } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Unhandled error caught by ErrorBoundary:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Center h="100vh" p="md">
                    <Stack align="center" gap="md" maw={420}>
                        <ThemeIcon size={64} radius="xl" color="red" variant="light">
                            <AlertTriangle size={32} />
                        </ThemeIcon>
                        <Box ta="center">
                            <Title order={3} mb={4}>
                                Something went wrong
                            </Title>
                            <Text c="dimmed" size="sm">
                                An unexpected error occurred while rendering this page. Please reload to continue.
                            </Text>
                        </Box>
                        <Button color="brandGreen.6" onClick={this.handleReload}>
                            Reload
                        </Button>
                    </Stack>
                </Center>
            );
        }

        return this.props.children;
    }
}
