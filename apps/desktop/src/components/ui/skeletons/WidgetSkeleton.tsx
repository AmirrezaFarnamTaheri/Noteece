import React from 'react';
import { Skeleton, Card, Group, Stack } from '@mantine/core';

export const WidgetSkeleton = () => {
  return (
    <Card withBorder p="md" radius="md">
      <Group justify="space-between" mb="xs">
        <Group>
          <Skeleton height={20} width={20} radius="xl" />
          <Skeleton height={16} width={80} radius="xl" />
        </Group>
        <Skeleton height={20} width={20} radius="xl" />
      </Group>
      <Stack gap="xs">
        <Group justify="space-between">
          <Skeleton height={24} width="60%" radius="sm" />
          <Skeleton height={24} width="20%" radius="sm" />
        </Group>
        <Group justify="space-between">
          <Skeleton height={24} width="50%" radius="sm" />
          <Skeleton height={24} width="25%" radius="sm" />
        </Group>
      </Stack>
    </Card>
  );
};
