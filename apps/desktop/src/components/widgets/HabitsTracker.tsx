/**
 * HabitsTracker Widget - Track daily habits with visual indicators
 */

import { useState } from 'react';
import { Paper, Title, Text, Group, Stack, Checkbox, Progress, Badge } from '@mantine/core';
import { IconRun } from '@tabler/icons-react';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
}

export default function HabitsTracker() {
  // In a real implementation, this would come from the backend
  const [habits, setHabits] = useState<Habit[]>([
    { id: '1', name: 'Morning Pages', completed: false, streak: 12 },
    { id: '2', name: 'Exercise', completed: true, streak: 8 },
    { id: '3', name: 'Read for 30min', completed: false, streak: 5 },
    { id: '4', name: 'Meditate', completed: true, streak: 15 },
    { id: '5', name: 'Review Notes', completed: false, streak: 3 },
  ]);

  const handleToggle = (id: string) => {
    setHabits((previous) =>
      previous.map((habit) => {
        if (habit.id !== id) {
          return habit;
        }

        const newCompleted = !habit.completed;
        let newStreak = habit.streak;
        if (newCompleted) {
          // Increment streak on completion
          newStreak += 1;
        } else {
          // Decrement streak on "un-completion"
          newStreak = Math.max(0, newStreak - 1);
        }

        return {
          ...habit,
          completed: newCompleted,
          streak: newStreak,
        };
      }),
    );
  };

  const completionRate = (habits.filter((h) => h.completed).length / habits.length) * 100;

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={4}>Daily Habits</Title>
        <IconRun size={20} color="var(--mantine-color-teal-5)" />
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
            color={completionRate === 100 ? 'green' : completionRate > 50 ? 'blue' : 'red'}
          />
        </div>

        <Stack gap="xs" mt="sm">
          {habits.map((habit) => (
            <Group key={habit.id} gap="xs" wrap="nowrap">
              <Checkbox checked={habit.completed} onChange={() => handleToggle(habit.id)} size="sm" color="teal" />
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
                color={habit.streak > 10 ? 'orange' : habit.streak > 5 ? 'blue' : 'gray'}
              >
                🔥 {habit.streak}
              </Badge>
            </Group>
          ))}
        </Stack>

        {completionRate === 100 && (
          <Text size="sm" c="teal" fw={600} ta="center" mt="md">
            🎉 All habits completed today!
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
