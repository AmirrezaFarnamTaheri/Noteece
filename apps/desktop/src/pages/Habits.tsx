import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Group,
  Button,
  Text,
  SimpleGrid,
  ActionIcon,
  Badge,
  Modal,
  TextInput,
  Select,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconCheck } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { Habit } from '@noteece/types';
import { useStore } from '../store';
import { logger } from '@/utils/logger';
import { notifications } from '@mantine/notifications';

interface HabitWithStats extends Habit {
  streak_days?: number;
}

const Habits: React.FC = () => {
  const [habits, setHabits] = useState<HabitWithStats[]>([]);
  const { activeSpaceId } = useStore();
  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      title: '',
      frequency: 'daily',
    },
    validate: {
      title: (value) => (value.length < 2 ? 'Title must be at least 2 chars' : null),
    },
  });

  const fetchHabits = async () => {
    if (activeSpaceId) {
      try {
        const data: HabitWithStats[] = await invoke('get_habits_cmd', { spaceId: activeSpaceId });
        setHabits(data);
      } catch (error) {
        logger.error('Failed to fetch habits:', error as Error);
      }
    }
  };

  useEffect(() => {
    void fetchHabits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId]);

  const handleCreateHabit = async (values: typeof form.values) => {
    try {
      await invoke('create_habit_cmd', {
        spaceId: activeSpaceId,
        title: values.title,
        frequency: values.frequency,
        targetCount: 1,
      });
      notifications.show({ title: 'Success', message: 'Habit created' });
      close();
      form.reset();
      void fetchHabits();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to create habit', color: 'red' });
    }
  };

  const handleComplete = async (habitId: string) => {
    try {
      await invoke('complete_habit_cmd', { habitId, date: new Date().toISOString().split('T')[0] });
      void fetchHabits();
      notifications.show({ title: 'Great job!', message: 'Habit completed for today' });
    } catch (error) {
      logger.error('Failed to complete habit', error as Error);
    }
  };

  const handleDelete = async (habitId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await invoke('delete_habit_cmd', { habitId });
      void fetchHabits();
    } catch (error) {
      logger.error('Failed to delete habit', error as Error);
    }
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Habits</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={open}>
          New Habit
        </Button>
      </Group>

      <Modal opened={opened} onClose={close} title="Create New Habit">
        <form onSubmit={form.onSubmit(handleCreateHabit)}>
          <TextInput
            label="Habit Title"
            placeholder="e.g., Read 30 mins"
            required
            mb="md"
            {...form.getInputProps('title')}
          />
          <Select
            label="Frequency"
            data={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
            required
            mb="lg"
            {...form.getInputProps('frequency')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </Group>
        </form>
      </Modal>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {habits.map((habit) => (
          <Paper key={habit.id} p="md" withBorder radius="md">
            <Group justify="space-between" mb="xs">
              <Text fw={500}>{habit.title}</Text>
              <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(habit.id)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>

            <Group mb="md">
              <Badge variant="dot" color={habit.frequency === 'daily' ? 'green' : 'blue'}>
                {habit.frequency}
              </Badge>
              <Text size="sm" c="dimmed">
                Streak: {habit.streak_days || 0} days
              </Text>
            </Group>

            <Button
              fullWidth
              variant="light"
              leftSection={<IconCheck size={16} />}
              onClick={() => handleComplete(habit.id)}
            >
              Check In
            </Button>
          </Paper>
        ))}
      </SimpleGrid>
      {habits.length === 0 && (
        <Text c="dimmed" ta="center" mt="xl">
          No habits tracked yet. Start building good routines!
        </Text>
      )}
    </Container>
  );
};

export default Habits;
