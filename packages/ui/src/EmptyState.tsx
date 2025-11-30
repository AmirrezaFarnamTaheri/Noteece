import React from 'react';
import { Stack, Text, Button, ThemeIcon } from '@mantine/core';
import { IconMoodEmpty } from '@tabler/icons-react';

export interface EmptyStateProps {
  /** Icon to display (default: IconMoodEmpty) */
  icon?: React.ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Call-to-action button label */
  actionLabel?: string;
  /** Callback when action button is clicked */
  onAction?: () => void;
}

/**
 * Empty state component for when there's no data to display
 * @param icon - Icon component to display
 * @param title - Main message
 * @param description - Optional description
 * @param actionLabel - Optional action button label
 * @param onAction - Optional action button callback
 */
export function EmptyState({
  icon = <IconMoodEmpty size={48} />,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" gap="md" py={60}>
      <ThemeIcon size={80} radius="xl" variant="light" color="gray">
        {icon}
      </ThemeIcon>
      <Stack align="center" gap="xs">
        <Text size="lg" fw={600}>
          {title}
        </Text>
        {description && (
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            {description}
          </Text>
        )}
      </Stack>
      {actionLabel && onAction && (
        <Button onClick={onAction} mt="md">
          {actionLabel}
        </Button>
      )}
    </Stack>
  );
}
