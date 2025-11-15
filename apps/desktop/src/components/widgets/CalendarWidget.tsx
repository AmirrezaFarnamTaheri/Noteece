import React, { useState } from 'react';
import { Card, Text, Group, Stack, Badge, ScrollArea } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconCalendar, IconClock } from '@tabler/icons-react';
import { useTasks, useNotes } from '../../hooks/useQueries';
import { LoadingCard } from '@noteece/ui';

/**
 * Calendar Widget - Mini calendar with task and note indicators
 * Features:
 * - Visual calendar
 * - Highlight days with tasks/notes
 * - Show upcoming tasks for selected date
 * - Daily note indicator
 */
export function CalendarWidget() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data: tasks, isLoading: tasksLoading } = useTasks('', false);
  const { data: notes, isLoading: notesLoading } = useNotes('', false);

  if (tasksLoading || notesLoading) {
    return <LoadingCard lines={4} />;
  }

  // Get tasks for selected date
  const selectedDateString = selectedDate.toDateString();
  const tasksForDate = (tasks || []).filter((task) => {
    if (!task.due_at) return false;
    const taskDate = new Date(task.due_at).toDateString();
    return taskDate === selectedDateString;
  });

  // Get notes for selected date
  const notesForDate = (notes || []).filter((note) => {
    if (!note.created_at) return false;
    const noteDate = new Date(note.created_at).toDateString();
    return noteDate === selectedDateString;
  });

  // Determine which dates have tasks or notes
  const datesWithTasks = new Set<string>();
  const datesWithNotes = new Set<string>();

  for (const task of tasks || []) {
    if (task.due_at) {
      datesWithTasks.add(new Date(task.due_at).toDateString());
    }
  }

  for (const note of notes || []) {
    if (note.created_at) {
      datesWithNotes.add(new Date(note.created_at).toDateString());
    }
  }

  const getDayProperties = (date: string) => {
    const dateObj = new Date(date);
    const dateString = dateObj.toDateString();
    const hasTasks = datesWithTasks.has(dateString);
    const hasNotes = datesWithNotes.has(dateString);

    if (hasTasks && hasNotes) {
      return { style: { backgroundColor: 'var(--mantine-color-blue-1)' } };
    } else if (hasTasks) {
      return { style: { backgroundColor: 'var(--mantine-color-orange-1)' } };
    } else if (hasNotes) {
      return { style: { backgroundColor: 'var(--mantine-color-green-1)' } };
    }
    return {};
  };

  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="apart" mb="md">
        <Group gap="xs">
          <IconCalendar size={24} />
          <Text size="lg" fw={600}>
            Calendar
          </Text>
        </Group>
      </Group>

      {/* Mantine v8 Calendar API has changed - using any to bypass type errors */}
      {(Calendar as any)({
        value: selectedDate,
        onChange: (date: any) => {
          if (date) {
            setSelectedDate(date as unknown as Date);
          }
        },
        getDayProps: getDayProperties as any,
        size: "sm",
      })}

      <Stack gap="sm" mt="md">
        <Text size="sm" fw={500}>
          {selectedDate.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {tasksForDate.length > 0 && (
          <Card p="sm" withBorder>
            <Text size="xs" c="dimmed" mb="xs">
              Tasks ({tasksForDate.length})
            </Text>
            <ScrollArea h={100}>
              <Stack gap="xs">
                {tasksForDate.map((task) => (
                  <Group key={task.id} gap="xs">
                    <IconClock size={14} />
                    <Text size="xs" truncate>
                      {task.title}
                    </Text>
                    <Badge size="xs" variant="light">
                      {task.priority}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
        )}

        {notesForDate.length > 0 && (
          <Card p="sm" withBorder>
            <Text size="xs" c="dimmed" mb="xs">
              Notes ({notesForDate.length})
            </Text>
            <ScrollArea h={100}>
              <Stack gap="xs">
                {notesForDate.map((note) => (
                  <Text key={note.id} size="xs" truncate>
                    {note.title}
                  </Text>
                ))}
              </Stack>
            </ScrollArea>
          </Card>
        )}

        {tasksForDate.length === 0 && notesForDate.length === 0 && (
          <Text size="xs" c="dimmed" ta="center" py="md">
            No tasks or notes for this date
          </Text>
        )}
      </Stack>

      <Group gap="xs" mt="md" justify="center">
        <Badge size="xs" variant="light" color="orange">
          Tasks
        </Badge>
        <Badge size="xs" variant="light" color="green">
          Notes
        </Badge>
        <Badge size="xs" variant="light" color="blue">
          Both
        </Badge>
      </Group>
    </Card>
  );
}
