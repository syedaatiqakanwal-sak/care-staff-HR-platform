import { Modal, Text, Button, Group, Stack } from '@mantine/core';
import type { ReactNode } from 'react';

export type AppConfirmModalProps = {
  opened: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * In-app confirmation dialog (replaces window.confirm).
 */
export function AppConfirmModal({
  opened,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'red',
  loading = false,
  onConfirm,
  onCancel,
}: AppConfirmModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      radius="md"
      zIndex={3000}
    >
      <Stack gap="md">
        {typeof message === 'string' ? (
          <Text size="sm" c="dimmed">
            {message}
          </Text>
        ) : (
          message
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} onClick={() => void onConfirm()} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
