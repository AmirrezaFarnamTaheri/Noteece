/**
 * DueTodayWidget - Tasks due today with quick complete actions
 */

import { memo } from 'react';
import { Paper, Title, Text, Group, Stack, Checkbox, Badge } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import { useTasks, useUpdateTask } from '../../hooks/useQueries';
import { useStore } from '../../store';
import { Task } from '@noteece/types';
import { notifications } from '@mantine/notifications';

const getPriorityColor = (priority: number | undefined) => {
  switch (priority) {
    case 1: {
      return 'red';
    }
    case 2: {
      return 'yellow';
    }
    case 3: {
      return 'blue';
    }
    case 4: {
      return 'gray';
    }
    default: {
      return 'gray';
    }
  }
};

const getPriorityLabel = (priority: number) => {
  switch (priority) {
    case 1: {
      return 'High';
    }
    case 2: {
      return 'Medium';
    }
    case 3: {
      return 'Low';
    }
    case 4: {
      return 'Lowest';
    }
    default: {
      return String(priority);
    }
  }
};

function DueTodayWidget() {
  const { activeSpaceId } = useStore();
  const { data: tasks = [] } = useTasks(activeSpaceId || '', !!activeSpaceId);
  const updateTaskMutation = useUpdateTask();

  // Filter tasks due today (local)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isSameLocalDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

  const todayLocal = new Date();
  const tasksToday = tasks.filter((task) => {
    const dueAt = task.due_at;
    if (typeof dueAt !== 'number') return false;
    const due = new Date(dueAt * 1000);
    if (Number.isNaN(due.getTime())) return false;
    return isSameLocalDay(due, todayLocal) && task.status !== 'done' && task.status !== 'cancelled';
  });

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'inbox' : 'done';

    try {
      await updateTaskMutation.mutateAsync({
        ...task,
        status: newStatus,
      });

      notifications.show({
        title: newStatus === 'done' ? 'Task completed!' : 'Task reopened',
        message: task.title,
        color: newStatus === 'done' ? 'green' : 'blue',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update task',
        color: 'red',
      });
    }
  };

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={4}>Due Today</Title>
        <Badge size="lg" color={tasksToday.length > 0 ? 'red' : 'green'} variant="filled">
          {tasksToday.length}
        </Badge>
      </Group>

      {tasksToday.length === 0 ? (
        <Stack align="center" justify="center" h={150}>
          <IconCalendarEvent size={48} color="var(--mantine-color-green-5)" opacity={0.5} />
          <Text size="sm" c="dimmed" ta="center">
            All clear for today!
          </Text>
        </Stack>
      ) : (
        <Stack gap="sm">
          {tasksToday.slice(0, 8).map((task) => (
            <Group key={task.id} gap="xs" wrap="nowrap">
              <Checkbox checked={task.status === 'done'} onChange={() => handleToggleTask(task)} size="sm" />
              <Text
                size="sm"
                lineClamp={1}
                style={{
                  flex: 1,
                  textDecoration: task.status === 'done' ? 'line-through' : 'none',
                  opacity: task.status === 'done' ? 0.6 : 1,
                }}
              >
                {task.title}
              </Text>
              {task.priority && (
                <Badge size="xs" color={getPriorityColor(task.priority)} variant="light">
                  {getPriorityLabel(task.priority)}
                </Badge>
              )}
            </Group>
          ))}

          {tasksToday.length > 8 && (
            <Text size="xs" c="dimmed" ta="center">
              +{tasksToday.length - 8} more tasks
            </Text>
          )}
        </Stack>
      )}
    </Paper>
  );
}

export default memo(DueTodayWidget);
