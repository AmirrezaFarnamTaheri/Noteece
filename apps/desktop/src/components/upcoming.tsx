import { Paper, Text, Group, Timeline, useMantineTheme, Badge } from '@mantine/core';
import { IconArrowUpRight, IconGitCommit } from '@tabler/icons-react';
import React, { useState, useEffect } from 'react';
import classes from './upcoming.module.css';
import { getUpcomingTasks } from '../services/api';
import { useStore } from '../store';
import { Task } from '@noteece/types';
import { formatRelativeTime, isOverdue } from '../utils/dateUtils';
import { logger } from '@/utils/logger';

interface UpcomingProperties {
  icon: React.ReactNode;
  title: string;
}

export const Upcoming: React.FC<UpcomingProperties> = ({ icon, title }) => {
  const theme = useMantineTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const { activeSpaceId } = useStore();

  useEffect(() => {
    const fetchTasks = async () => {
      if (activeSpaceId) {
        try {
          const upcomingTasks = await getUpcomingTasks(activeSpaceId, 5);
          setTasks(upcomingTasks);
        } catch (error) {
          logger.error('Error fetching upcoming tasks:', error as Error);
        }
      }
    };
    void fetchTasks();
  }, [activeSpaceId]);

  return (
    <Paper
      style={{
        border: '1px solid #e0e0e0',
      }}
      p="md"
      radius="md"
      shadow="xs"
    >
      <Group justify="space-between">
        <Group>
          {icon}
          <Text className={classes.title} fz="xs" c="dimmed">
            {title}
          </Text>
        </Group>

        <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <Text className={classes.value}>{tasks.length}</Text>
      </Group>

      <Timeline active={tasks.length} bulletSize={24} lineWidth={2} mt="xl">
        {tasks.map((task) => (
          <Timeline.Item
            key={task.id}
            bullet={<IconGitCommit size={12} />}
            title={
              <Group justify="space-between">
                <Text size="sm">{task.title}</Text>
                <Badge color={task.status === 'done' ? 'green' : 'orange'} size="sm">
                  {task.status}
                </Badge>
              </Group>
            }
            lineVariant="dashed"
          >
            <Text c={task.due_at && isOverdue(task.due_at) ? 'red' : 'dimmed'} size="sm">
              {task.due_at ? `Due ${formatRelativeTime(task.due_at, 'No due date')}` : 'No due date'}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Paper>
  );
};
