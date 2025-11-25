import React from 'react';
import { Card, Text, Progress, Badge, Group, Stack } from '@mantine/core';
import { IconTarget } from '@tabler/icons-react';
import { HealthGoal } from './types';

interface GoalCardProps {
  goal: HealthGoal;
}

/**
 * Goal Card - Displays a single health goal with progress
 */
export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const isComplete = goal.is_completed || progress >= 100;

  return (
    <Card withBorder p="md">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <IconTarget size={16} />
          <Text fw={500}>{goal.title}</Text>
        </Group>
        <Badge color={isComplete ? 'green' : 'blue'} variant="light">
          {isComplete ? 'Complete' : 'In Progress'}
        </Badge>
      </Group>

      <Stack gap="xs">
        <Progress value={progress} color={isComplete ? 'green' : 'blue'} size="lg" radius="xl" />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Current: {goal.current} {goal.unit}
          </Text>
          <Text size="sm" c="dimmed">
            Target: {goal.target} {goal.unit}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
};
