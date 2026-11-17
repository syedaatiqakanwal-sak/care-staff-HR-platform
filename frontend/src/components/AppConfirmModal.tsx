import { Modal, Text, Button, Group } from '@mantine/core';
import type { ReactNode } from 'react';

export type AppConfirmOptions = {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: string;
};

type AppConfirmModalProps = {
    opened: boolean;
    options: AppConfirmOptions | null;
    loading?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

/** In-app confirmation dialog — use instead of window.confirm / browser alerts. */
export function AppConfirmModal({
    opened,
    options,
    loading = false,
    onCancel,
    onConfirm,
}: AppConfirmModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onCancel}
            title={options?.title || 'Confirm'}
            centered
            radius="md"
        >
            <Text size="sm" mb="lg">
                {options?.message}
            </Text>
            <Group justify="flex-end" gap="sm">
                <Button variant="default" onClick={onCancel} disabled={loading}>
                    {options?.cancelLabel || 'Cancel'}
                </Button>
                <Button
                    color={options?.confirmColor || 'brandBlue'}
                    onClick={onConfirm}
                    loading={loading}
                >
                    {options?.confirmLabel || 'Confirm'}
                </Button>
            </Group>
        </Modal>
    );
}
