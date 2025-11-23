import React, { useState, useEffect } from 'react';
import {
  Card,
  Text,
  Progress,
  Group,
  Stack,
  Button,
  Modal,
  TextInput,
  NumberInput,
  ActionIcon,
  Badge,
} from '@mantine/core';
import { IconTarget, IconPlus, IconTrash, IconCheck } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '../../store';
import { logger } from '@/utils/logger';

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  category: string;
  is_completed: boolean;
}

/**
 * Goals Tracker Widget - Track and visualize progress toward long-term goals
 * Features:
 * - Add/remove goals
 * - Track progress with visual indicators
 * - Categorize goals
 * - Quick progress updates
 */
export function GoalsTrackerWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const { activeSpaceId } = useStore();

  const form = useForm({
    initialValues: {
      title: '',
      target: 10,
      current: 0,
      category: '',
    },
  });

  const fetchGoals = async () => {
    if (activeSpaceId) {
      try {
        const fetchedGoals: Goal[] = await invoke('get_goals_cmd', { spaceId: activeSpaceId });
        // Ensure fetchedGoals is an array, even if backend returns null/undefined
        setGoals(Array.isArray(fetchedGoals) ? fetchedGoals : []);
      } catch (error) {
        logger.error('Error fetching goals:', error as Error);
      }
    }
  };

  useEffect(() => {
    void fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId]);

  const handleAddGoal = async (values: typeof form.values) => {
    if (!activeSpaceId) return;
    try {
      await invoke('create_goal_cmd', {
        spaceId: activeSpaceId,
        title: values.title,
        target: Number(values.target), // Ensure float
        category: values.category,
      });
      void fetchGoals();
      form.reset();
      setModalOpened(false);
    } catch (error) {
      logger.error('Error adding goal:', error as Error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await invoke('delete_goal_cmd', { goalId: id });
      setGoals(goals.filter((goal) => goal.id !== id));
    } catch (error) {
      logger.error('Error deleting goal:', error as Error);
    }
  };

  const handleIncrementProgress = async (goal: Goal) => {
    if (goal.current >= goal.target) return;
    const newCurrent = goal.current + 1;
    try {
      await invoke('update_goal_progress_cmd', { goalId: goal.id, current: newCurrent });
      // Optimistic update
      setGoals(
        goals.map((g) => (g.id === goal.id ? { ...g, current: newCurrent, is_completed: newCurrent >= g.target } : g)),
      );
    } catch (error) {
      logger.error('Error updating goal progress:', error as Error);
    }
  };

  return (
    <>
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconTarget size={24} />
            <Text size="lg" fw={600}>
              Goals Tracker
            </Text>
          </Group>
          <Button size="xs" leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Goal
          </Button>
        </Group>

        <Stack gap="md">
          {goals.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No goals yet. Add your first goal to start tracking!
            </Text>
          ) : (
            goals.map((goal) => {
              const percentage = Math.round((goal.current / goal.target) * 100);
              // Backend provides is_completed, but we can also calculate it
              const isCompleted = goal.is_completed || goal.current >= goal.target;

              return (
                <Card key={goal.id} p="sm" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {goal.title}
                      </Text>
                      {isCompleted && (
                        <Badge color="green" size="xs" leftSection={<IconCheck size={12} />}>
                          Completed
                        </Badge>
                      )}
                    </Group>
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={() => handleDeleteGoal(goal.id)}
                      aria-label={`Delete goal: ${goal.title}`}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>

                  <Group justify="space-between" mb="xs">
                    <Badge size="xs" variant="light">
                      {goal.category}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {goal.current} / {goal.target}
                    </Text>
                  </Group>

                  <Progress value={Math.min(percentage, 100)} size="sm" radius="xl" mb="xs" />

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {percentage}% Complete
                    </Text>
                    {!isCompleted && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleIncrementProgress(goal)}
                        aria-label={`Increment progress for ${goal.title}`}
                      >
                        +1
                      </Button>
                    )}
                  </Group>
                </Card>
              );
            })
          )}
        </Stack>
      </Card>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add New Goal" size="md">
        <form onSubmit={form.onSubmit(handleAddGoal)}>
          <Stack gap="md">
            <TextInput
              label="Goal Title"
              placeholder="e.g., Write 50 blog posts"
              required
              {...form.getInputProps('title')}
            />
            <TextInput
              label="Category"
              placeholder="e.g., Writing, Reading, Health"
              required
              {...form.getInputProps('category')}
            />
            <NumberInput
              label="Target"
              placeholder="Enter target number"
              min={1}
              required
              {...form.getInputProps('target')}
            />
            <NumberInput
              label="Current Progress"
              placeholder="Enter current progress"
              min={0}
              {...form.getInputProps('current')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setModalOpened(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Goal</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
