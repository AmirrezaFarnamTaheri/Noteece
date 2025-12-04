/**
 * GamificationWidget Component
 *
 * Displays XP, levels, streak freezes, and achievements.
 * Provides gamification elements to encourage consistent usage.
 */

import React from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Progress,
  ActionIcon,
  Tooltip,
  Center,
  Loader,
  RingProgress,
  ThemeIcon,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { IconFlame, IconSnowflake, IconTrophy, IconStar, IconTarget, IconRocket } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface GamificationData {
  xp: number;
  level: number;
  xp_to_next_level: number;
  streak_days: number;
  streak_freezes: number;
  max_streak: number;
  total_tasks_completed: number;
  total_habits_completed: number;
  achievements_unlocked: number;
  total_achievements: number;
}

interface _Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: number;
  progress?: number;
  max_progress?: number;
}

interface GamificationWidgetProps {
  userId?: string;
  compact?: boolean;
}

// XP required for each level (exponential growth)
const getXpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Level titles
const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  5: 'Apprentice',
  10: 'Journeyman',
  15: 'Expert',
  20: 'Master',
  25: 'Grandmaster',
  30: 'Legend',
  35: 'Mythic',
  40: 'Transcendent',
};

const getLevelTitle = (level: number): string => {
  const titles = Object.entries(LEVEL_TITLES).reverse();
  for (const [lvl, title] of titles) {
    if (level >= Number.parseInt(lvl)) {
      return title;
    }
  }
  return 'Novice';
};

export function GamificationWidget({ userId, compact = false }: GamificationWidgetProps) {
  const queryClient = useQueryClient();

  // Fetch gamification data
  const { data, isLoading } = useQuery({
    queryKey: ['gamification', userId],
    queryFn: async (): Promise<GamificationData> => {
      try {
        return await invoke('get_gamification_data_cmd', { userId });
      } catch {
        // Return mock data if command not available
        return {
          xp: 2450,
          level: 8,
          xp_to_next_level: 550,
          streak_days: 14,
          streak_freezes: 3,
          max_streak: 45,
          total_tasks_completed: 234,
          total_habits_completed: 156,
          achievements_unlocked: 12,
          total_achievements: 30,
        };
      }
    },
    staleTime: 60_000,
  });

  // Use streak freeze mutation
  const useFreezeMutation = useMutation({
    mutationFn: async () => {
      return await invoke('use_streak_freeze_cmd', { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      notifications.show({
        title: 'Streak Freeze Used',
        message: 'Your streak is protected for today!',
        color: 'cyan',
        icon: <IconSnowflake size={16} />,
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to use streak freeze',
        color: 'red',
      });
    },
  });

  if (isLoading || !data) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Center h={compact ? 100 : 200}>
          <Loader />
        </Center>
      </Paper>
    );
  }

  const levelProgress = ((data.xp % getXpForLevel(data.level)) / getXpForLevel(data.level)) * 100;
  const levelTitle = getLevelTitle(data.level);

  if (compact) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <RingProgress
              size={60}
              thickness={6}
              sections={[{ value: levelProgress, color: 'violet' }]}
              label={
                <Center>
                  <Text size="sm" fw={700}>
                    {data.level}
                  </Text>
                </Center>
              }
            />
            <Stack gap={2}>
              <Text size="sm" fw={600}>
                {levelTitle}
              </Text>
              <Text size="xs" c="dimmed">
                {data.xp.toLocaleString()} XP
              </Text>
            </Stack>
          </Group>

          <Group gap="md">
            <Tooltip label={`${data.streak_days} day streak`}>
              <Badge leftSection={<IconFlame size={14} />} color="orange" variant="light" size="lg">
                {data.streak_days}
              </Badge>
            </Tooltip>

            <Tooltip label={`${data.streak_freezes} streak freezes available`}>
              <Badge leftSection={<IconSnowflake size={14} />} color="cyan" variant="light" size="lg">
                {data.streak_freezes}
              </Badge>
            </Tooltip>
          </Group>
        </Group>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconTrophy size={20} />
            <Title order={4}>Progress & Achievements</Title>
          </Group>
          <Badge color="violet" variant="light">
            Level {data.level}
          </Badge>
        </Group>

        {/* Level Progress */}
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {levelTitle}
            </Text>
            <Text size="xs" c="dimmed">
              {data.xp.toLocaleString()} / {(data.xp + data.xp_to_next_level).toLocaleString()} XP
            </Text>
          </Group>
          <Progress value={levelProgress} color="violet" size="lg" radius="xl" striped animated />
          <Text size="xs" c="dimmed" ta="center">
            {data.xp_to_next_level.toLocaleString()} XP to level {data.level + 1}
          </Text>
        </Stack>

        {/* Streak Section */}
        <Paper p="sm" radius="md" bg="var(--mantine-color-orange-0)">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon color="orange" variant="light" size="lg">
                <IconFlame size={20} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="sm" fw={600}>
                  {data.streak_days} Day Streak
                </Text>
                <Text size="xs" c="dimmed">
                  Best: {data.max_streak} days
                </Text>
              </Stack>
            </Group>

            <Group gap="xs">
              <Tooltip label={`${data.streak_freezes} freezes available`}>
                <Badge leftSection={<IconSnowflake size={12} />} color="cyan" variant="filled">
                  {data.streak_freezes}
                </Badge>
              </Tooltip>
              <Tooltip label="Use a streak freeze to protect your streak">
                <ActionIcon
                  variant="light"
                  color="cyan"
                  disabled={data.streak_freezes === 0}
                  onClick={() => useFreezeMutation.mutate()}
                  loading={useFreezeMutation.isPending}
                >
                  <IconSnowflake size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Paper>

        {/* Stats Grid */}
        <Group grow>
          <Paper p="sm" radius="md" withBorder ta="center">
            <ThemeIcon color="green" variant="light" size="lg" mb="xs">
              <IconTarget size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>
              {data.total_tasks_completed}
            </Text>
            <Text size="xs" c="dimmed">
              Tasks Done
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder ta="center">
            <ThemeIcon color="blue" variant="light" size="lg" mb="xs">
              <IconRocket size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>
              {data.total_habits_completed}
            </Text>
            <Text size="xs" c="dimmed">
              Habits Done
            </Text>
          </Paper>

          <Paper p="sm" radius="md" withBorder ta="center">
            <ThemeIcon color="yellow" variant="light" size="lg" mb="xs">
              <IconStar size={20} />
            </ThemeIcon>
            <Text size="lg" fw={700}>
              {data.achievements_unlocked}/{data.total_achievements}
            </Text>
            <Text size="xs" c="dimmed">
              Achievements
            </Text>
          </Paper>
        </Group>
      </Stack>
    </Paper>
  );
}

export default GamificationWidget;
