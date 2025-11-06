import React, { useState } from 'react';
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

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  category: string;
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
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', title: 'Write 50 blog posts', target: 50, current: 23, category: 'Writing' },
    { id: '2', title: 'Read 24 books', target: 24, current: 18, category: 'Reading' },
    { id: '3', title: 'Exercise 100 times', target: 100, current: 67, category: 'Health' },
  ]);
  const [modalOpened, setModalOpened] = useState(false);

  const form = useForm({
    initialValues: {
      title: '',
      target: 10,
      current: 0,
      category: '',
    },
  });

  const handleAddGoal = (values: typeof form.values) => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      ...values,
    };
    setGoals([...goals, newGoal]);
    form.reset();
    setModalOpened(false);
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter((goal) => goal.id !== id));
  };

  const handleIncrementProgress = (id: string) => {
    setGoals(
      goals.map((goal) =>
        goal.id === id && goal.current < goal.target ? { ...goal, current: goal.current + 1 } : goal,
      ),
    );
  };

  return (
    <>
      <Card p="lg" radius="md" withBorder>
        <Group justify="apart" mb="md">
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
              const isCompleted = goal.current >= goal.target;

              return (
                <Card key={goal.id} p="sm" withBorder>
                  <Group justify="apart" mb="xs">
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

                  <Group justify="apart" mb="xs">
                    <Badge size="xs" variant="light">
                      {goal.category}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {goal.current} / {goal.target}
                    </Text>
                  </Group>

                  <Progress value={percentage} size="sm" radius="xl" mb="xs" />

                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {percentage}% Complete
                    </Text>
                    {!isCompleted && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => handleIncrementProgress(goal.id)}
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
