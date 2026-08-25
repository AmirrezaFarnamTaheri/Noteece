import React, { useState, useEffect } from 'react';
import { Paper, Text, Group, Progress, Stack, useMantineTheme, Badge } from '@mantine/core';
import { IconTarget, IconArrowUpRight, IconTrendingUp } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { Task } from '@noteece/types';
import { useActiveSpace } from '../../hooks/useActiveSpace';
import { getStartOfToday, getEndOfToday } from '../../utils/dateUtils';
import classes from '../Dashboard.module.css';
import { logger } from '@/utils/logger';

export const WeeklyProgress: React.FC = () => {
  const theme = useMantineTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const { activeSpaceId } = useActiveSpace();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!activeSpaceId) return;
      try {
        const tasksData: Task[] = await invoke('get_all_tasks_in_space_cmd', {
          spaceId: activeSpaceId,
        });
        setTasks(tasksData);
      } catch (error) {
        logger.error('Error fetching tasks:', error as Error);
      }
    };
    void fetchTasks();
  }, [activeSpaceId]);

  // Get current week's tasks (completed in last 7 days)
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const completedThisWeek = tasks.filter((t) => t.completed_at && t.completed_at >= weekAgo);

  const todayStart = getStartOfToday();
  const todayEnd = getEndOfToday();
  const completedToday = tasks.filter(
    (t) => t.completed_at && t.completed_at >= todayStart && t.completed_at <= todayEnd,
  );

  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate daily average
  const dailyAverage = completedThisWeek.length / 7;

  return (
    <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
      <Group justify="space-between" mb="md">
        <Group>
          <IconTarget size={20} />
          <Text className={classes.title} fz="xs" c="dimmed">
            Weekly Progress
          </Text>
        </Group>
        <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
      </Group>

      <Stack gap="md" mt="xl">
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={500}>
              Overall Completion
            </Text>
            <Text size="sm" fw={700} c={completionRate > 70 ? 'green' : 'orange'}>
              {completionRate.toFixed(0)}%
            </Text>
          </Group>
          <Progress
            value={completionRate}
            color={completionRate > 70 ? 'green' : completionRate > 40 ? 'yellow' : 'red'}
            size="lg"
            radius="xl"
          />
        </div>

        <Group justify="space-around" mt="md">
          <Stack align="center" gap={0}>
            <Text size="xl" fw={700}>
              {completedToday.length}
            </Text>
            <Text size="xs" c="dimmed">
              Today
            </Text>
          </Stack>

          <Stack align="center" gap={0}>
            <Text size="xl" fw={700}>
              {completedThisWeek.length}
            </Text>
            <Text size="xs" c="dimmed">
              This Week
            </Text>
          </Stack>

          <Stack align="center" gap={0}>
            <Group gap={4}>
              <IconTrendingUp size={16} color={theme.colors.blue[6]} />
              <Text size="xl" fw={700}>
                {dailyAverage.toFixed(1)}
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Daily Avg
            </Text>
          </Stack>
        </Group>

        <Group justify="center" mt="sm">
          <Badge color="blue" variant="light">
            {activeTasks.length} active tasks
          </Badge>
        </Group>
      </Stack>
    </Paper>
  );
};
