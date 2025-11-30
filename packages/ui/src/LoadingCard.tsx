import React from 'react';
import { Card, LoadingOverlay, Skeleton, Stack } from '@mantine/core';

export interface LoadingCardProps {
  /** Show loading overlay (default: false) */
  overlay?: boolean;
  /** Number of skeleton lines (default: 3) */
  lines?: number;
  /** Card height */
  height?: number;
}

/**
 * Loading state component for cards with skeleton or overlay
 * @param overlay - Use loading overlay instead of skeleton
 * @param lines - Number of skeleton lines to show
 * @param height - Card height
 */
export function LoadingCard({ overlay = false, lines = 3, height }: LoadingCardProps) {
  if (overlay) {
    return (
      <Card p="lg" radius="md" withBorder style={{ position: 'relative', height }}>
        <LoadingOverlay visible={true} />
      </Card>
    );
  }

  return (
    <Card p="lg" radius="md" withBorder>
      <Stack gap="sm">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={20} radius="sm" />
        ))}
      </Stack>
    </Card>
  );
}
