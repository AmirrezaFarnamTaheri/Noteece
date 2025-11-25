import React from 'react';
import { Card, Group, Text, RingProgress, Stack, Badge } from '@mantine/core';
import { IconTrophy, IconFlame, IconBrain } from '@tabler/icons-react';

export interface ReviewStatsData {
  reviewed: number;
  correct: number;
  streak: number;
  totalDue?: number;
}

interface ReviewStatsProps {
  stats: ReviewStatsData;
}

/**
 * Review Stats Component - Shows session statistics
 */
export const ReviewStats: React.FC<ReviewStatsProps> = ({ stats }) => {
  const accuracy = stats.reviewed > 0 
    ? Math.round((stats.correct / stats.reviewed) * 100) 
    : 0;

  return (
    <Card withBorder p="md">
      <Group justify="space-around">
        {/* Accuracy Ring */}
        <Stack align="center" gap="xs">
          <RingProgress
            size={80}
            thickness={8}
            sections={[{ value: accuracy, color: accuracy >= 70 ? 'green' : 'orange' }]}
            label={
              <Text ta="center" fw={700} size="lg">
                {accuracy}%
              </Text>
            }
          />
          <Text size="sm" c="dimmed">Accuracy</Text>
        </Stack>

        {/* Reviewed Count */}
        <Stack align="center" gap="xs">
          <Group gap={4}>
            <IconBrain size={24} />
            <Text fw={700} size="xl">{stats.reviewed}</Text>
          </Group>
          <Text size="sm" c="dimmed">Reviewed</Text>
        </Stack>

        {/* Correct Count */}
        <Stack align="center" gap="xs">
          <Group gap={4}>
            <IconTrophy size={24} color="gold" />
            <Text fw={700} size="xl">{stats.correct}</Text>
          </Group>
          <Text size="sm" c="dimmed">Correct</Text>
        </Stack>

        {/* Streak */}
        <Stack align="center" gap="xs">
          <Group gap={4}>
            <IconFlame size={24} color="orange" />
            <Text fw={700} size="xl">{stats.streak}</Text>
          </Group>
          <Text size="sm" c="dimmed">Streak</Text>
        </Stack>
      </Group>
    </Card>
  );
};

