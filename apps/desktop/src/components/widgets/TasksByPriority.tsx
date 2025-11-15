import React, { useState, useEffect } from 'react';
import { Paper, Text, Group, Stack, Badge, RingProgress, useMantineTheme } from '@mantine/core';
import { IconFlag, IconArrowUpRight } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { Task } from '@noteece/types';
import { useActiveSpace } from '../../hooks/useActiveSpace';
import classes from '../Dashboard.module.css';
import { logger } from '../../utils/logger';

interface PriorityStats {
  priority: number;
  count: number;
  label: string;
  color: string;
}

export const TasksByPriority: React.FC = () => {
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
        // Only include incomplete tasks
        setTasks(tasksData.filter((t) => t.status !== 'done' && t.status !== 'cancelled'));
      } catch (error) {
        logger.error('Error fetching tasks:', error as Error);
      }
    };
    void fetchTasks();
  }, [activeSpaceId]);

  const priorityStats: PriorityStats[] = [
    {
      priority: 1,
      count: tasks.filter((t) => t.priority === 1).length,
      label: 'Critical',
      color: 'red',
    },
    {
      priority: 2,
      count: tasks.filter((t) => t.priority === 2).length,
      label: 'High',
      color: 'orange',
    },
    {
      priority: 3,
      count: tasks.filter((t) => t.priority === 3).length,
      label: 'Medium',
      color: 'yellow',
    },
    {
      priority: 4,
      count: tasks.filter((t) => t.priority === 4).length,
      label: 'Low',
      color: 'blue',
    },
  ];

  const totalTasks = tasks.length;
  const highPriorityCount = tasks.filter((t) => t.priority === 1 || t.priority === 2).length;
  const percentage = totalTasks > 0 ? (highPriorityCount / totalTasks) * 100 : 0;

  return (
    <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
      <Group justify="space-between" mb="md">
        <Group>
          <IconFlag size={20} />
          <Text className={classes.title} fz="xs" c="dimmed">
            Tasks by Priority
          </Text>
        </Group>
        <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
      </Group>

      <Group align="center" gap="xl">
        <RingProgress
          size={120}
          thickness={12}
          sections={[
            { value: percentage, color: 'red' },
            { value: 100 - percentage, color: 'gray' },
          ]}
          label={
            <Stack align="center" gap={0}>
              <Text size="xl" fw={700}>
                {highPriorityCount}
              </Text>
              <Text size="xs" c="dimmed">
                High Priority
              </Text>
            </Stack>
          }
        />

        <Stack gap="xs" style={{ flex: 1 }}>
          {priorityStats.map((stat) => (
            <Group key={stat.priority} justify="space-between">
              <Group gap="xs">
                <Badge color={stat.color} size="sm" variant="dot">
                  {stat.label}
                </Badge>
              </Group>
              <Text size="sm" fw={500}>
                {stat.count}
              </Text>
            </Group>
          ))}
        </Stack>
      </Group>

      <Text size="xs" c="dimmed" mt="md" ta="center">
        {totalTasks} active tasks total
      </Text>
    </Paper>
  );
};
