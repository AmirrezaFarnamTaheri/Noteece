/**
 * HabitsTracker Widget - Track daily habits with visual indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Title,
  Text,
  Group,
  Stack,
  Checkbox,
  Progress,
  Badge,
  Button,
  Modal,
  TextInput,
  Select,
  ActionIcon,
} from '@mantine/core';
import { IconRun, IconPlus, IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '../../store';
import { logger } from '@/utils/logger';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
  last_completed_at: number | null;
  frequency: string;
}

export default function HabitsTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const { activeSpaceId } = useStore();

  const form = useForm({
    initialValues: {
      name: '',
      frequency: 'daily',
    },
  });

  const fetchHabits = useCallback(async () => {
    if (activeSpaceId) {
      try {
        const fetchedHabits = await invoke<Habit[]>('get_habits_cmd', { spaceId: activeSpaceId });

        // Determine if "completed" today based on last_completed_at
        const today = new Date().setHours(0, 0, 0, 0);

        const habitsWithStatus = fetchedHabits.map((h) => {
          const lastCompleted = h.last_completed_at ? new Date(h.last_completed_at * 1000).setHours(0, 0, 0, 0) : 0;
          return {
            ...h,
            completed: lastCompleted === today,
          };
        });

        setHabits(habitsWithStatus);
      } catch (error) {
        logger.error('Error fetching habits:', error as Error);
      }
    }
  }, [activeSpaceId]);

  useEffect(() => {
    void fetchHabits();
  }, [fetchHabits]);

  const handleAddHabit = async (values: typeof form.values) => {
    if (!activeSpaceId) return;
    try {
      await invoke('create_habit_cmd', {
        spaceId: activeSpaceId,
        name: values.name,
        frequency: values.frequency,
      });
      void fetchHabits();
      form.reset();
      setModalOpened(false);
    } catch (error) {
      logger.error('Error adding habit:', error as Error);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      await invoke('delete_habit_cmd', { habitId: id });
      setHabits(habits.filter((h) => h.id !== id));
    } catch (error) {
      logger.error('Error deleting habit:', error as Error);
    }
  };

  const handleToggle = async (habit: Habit) => {
    if (habit.completed) return; // Already done today

    try {
      await invoke('complete_habit_cmd', { habitId: habit.id });
      // Optimistic update
      setHabits((previous) =>
        previous.map((h) => {
          if (h.id !== habit.id) return h;
          return {
            ...h,
            completed: true,
            streak: h.streak + 1,
          };
        }),
      );
    } catch (error) {
      logger.error('Error completing habit:', error as Error);
    }
  };

  const completionRate = habits.length > 0 ? (habits.filter((h) => h.completed).length / habits.length) * 100 : 0;

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={4}>Daily Habits</Title>
          <IconRun size={20} color="var(--mantine-color-teal-5)" />
        </Group>
        <Button size="xs" leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)} variant="light">
          Add
        </Button>
      </Group>

      <Stack gap="sm">
        <div>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600}>
              Today&apos;s Progress
            </Text>
            <Text size="sm" c="dimmed">
              {Math.round(completionRate)}%
            </Text>
          </Group>
          <Progress
            value={completionRate}
            size="lg"
            color={completionRate === 100 ? 'green' : (completionRate > 50 ? 'blue' : 'red')}
          />
        </div>

        <Stack gap="xs" mt="sm">
          {habits.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center">
              No habits tracked.
            </Text>
          ) : (
            habits.map((habit) => (
              <Group key={habit.id} gap="xs" wrap="nowrap">
                <Checkbox
                  checked={habit.completed}
                  onChange={() => handleToggle(habit)}
                  size="sm"
                  color="teal"
                  disabled={habit.completed} // Prevent un-checking for now as logic is complex
                />
                <Text
                  size="sm"
                  style={{
                    flex: 1,
                    textDecoration: habit.completed ? 'line-through' : 'none',
                    opacity: habit.completed ? 0.7 : 1,
                  }}
                >
                  {habit.name}
                </Text>
                <Badge
                  size="sm"
                  variant="light"
                  color={habit.streak > 10 ? 'orange' : (habit.streak > 5 ? 'blue' : 'gray')}
                >
                  🔥 {habit.streak}
                </Badge>
                <ActionIcon
                  size="sm"
                  color="red"
                  variant="subtle"
                  onClick={() => handleDeleteHabit(habit.id)}
                  aria-label={`Delete habit ${habit.name}`}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>

        {completionRate === 100 && habits.length > 0 && (
          <Text size="sm" c="teal" fw={600} ta="center" mt="md">
            🎉 All habits completed today!
          </Text>
        )}
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add New Habit" size="sm">
        <form onSubmit={form.onSubmit(handleAddHabit)}>
          <Stack gap="md">
            <TextInput label="Habit Name" placeholder="e.g., Read 30 mins" required {...form.getInputProps('name')} />
            <Select
              label="Frequency"
              data={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              required
              {...form.getInputProps('frequency')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Habit</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Paper>
  );
}
