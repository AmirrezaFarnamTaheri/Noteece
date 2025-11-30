import React, { useState } from 'react';
import { Card, Group, Text, Stack, UnstyledButton, Badge, Tooltip, Progress } from '@mantine/core';
import { IconFlame, IconCheck, IconX } from '@tabler/icons-react';

export interface HabitEntry {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  currentStreak: number;
  longestStreak: number;
  completedDates: number[]; // Unix timestamps
  color?: string;
}

export interface HabitTrackerProps {
  habits: HabitEntry[];
  onToggleDay?: (habitId: string, date: number) => void;
  daysToShow?: number;
}

export function HabitTracker({ habits, onToggleDay, daysToShow = 7 }: HabitTrackerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayLabels = () => {
    const labels: string[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    return labels;
  };

  const getDayTimestamps = () => {
    const timestamps: number[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      timestamps.push(Math.floor(date.getTime() / 1000));
    }
    return timestamps;
  };

  const dayLabels = getDayLabels();
  const dayTimestamps = getDayTimestamps();

  const isDateCompleted = (habit: HabitEntry, timestamp: number): boolean => {
    return habit.completedDates.some((ts) => {
      const date1 = new Date(ts * 1000);
      const date2 = new Date(timestamp * 1000);
      date1.setHours(0, 0, 0, 0);
      date2.setHours(0, 0, 0, 0);
      return date1.getTime() === date2.getTime();
    });
  };

  const calculateCompletionRate = (habit: HabitEntry): number => {
    const completed = dayTimestamps.filter((ts) => isDateCompleted(habit, ts)).length;
    return (completed / daysToShow) * 100;
  };

  if (habits.length === 0) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md" align="center" py="xl">
          <IconFlame size={48} stroke={1.5} color="gray" />
          <Text c="dimmed">No habits tracked yet</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="lg" fw={600}>
            Habit Tracker
          </Text>
          <Badge variant="light" color="orange">
            {habits.length} habit{habits.length !== 1 ? 's' : ''}
          </Badge>
        </Group>

        <Stack gap="xs">
          {habits.map((habit) => (
            <Stack key={habit.id} gap={4}>
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      {habit.name}
                    </Text>
                    {habit.currentStreak > 0 && (
                      <Tooltip label={`${habit.currentStreak} day streak`}>
                        <Group gap={2}>
                          <IconFlame size={14} color="orange" />
                          <Text size="xs" c="orange" fw={600}>
                            {habit.currentStreak}
                          </Text>
                        </Group>
                      </Tooltip>
                    )}
                  </Group>
                  {habit.description && (
                    <Text size="xs" c="dimmed">
                      {habit.description}
                    </Text>
                  )}
                </div>

                <Text size="xs" c="dimmed">
                  Best: {habit.longestStreak}
                </Text>
              </Group>

              <Group gap={4}>
                {dayTimestamps.map((timestamp, idx) => {
                  const completed = isDateCompleted(habit, timestamp);
                  return (
                    <Tooltip key={timestamp} label={dayLabels[idx]}>
                      <UnstyledButton
                        onClick={() => onToggleDay?.(habit.id, timestamp)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: completed
                            ? `var(--mantine-color-${habit.color || 'blue'}-1)`
                            : 'var(--mantine-color-gray-1)',
                          border: `1px solid ${
                            completed
                              ? `var(--mantine-color-${habit.color || 'blue'}-4)`
                              : 'var(--mantine-color-gray-3)'
                          }`,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {completed ? (
                          <IconCheck size={16} color={`var(--mantine-color-${habit.color || 'blue'}-6)`} />
                        ) : (
                          <Text size="xs" c="dimmed">
                            {dayLabels[idx][0]}
                          </Text>
                        )}
                      </UnstyledButton>
                    </Tooltip>
                  );
                })}
              </Group>

              <Progress value={calculateCompletionRate(habit)} color={habit.color || 'blue'} size="xs" radius="xl" />
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

// Compact variant for dashboard
export function CompactHabitList({ habits, maxItems = 3 }: { habits: HabitEntry[]; maxItems?: number }) {
  const topHabits = habits.sort((a, b) => b.currentStreak - a.currentStreak).slice(0, maxItems);

  return (
    <Stack gap="xs">
      {topHabits.map((habit) => (
        <Group key={habit.id} justify="space-between" p="xs" style={{ borderRadius: 4 }}>
          <Group gap="xs">
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: `var(--mantine-color-${habit.color || 'blue'}-6)`,
              }}
            />
            <Text size="sm" fw={500} lineClamp={1}>
              {habit.name}
            </Text>
          </Group>
          <Group gap={4}>
            <IconFlame size={14} color="orange" />
            <Text size="sm" fw={600} c="orange">
              {habit.currentStreak}
            </Text>
          </Group>
        </Group>
      ))}
    </Stack>
  );
}

// Single habit card
export function HabitCard({ habit, onToggleToday }: { habit: HabitEntry; onToggleToday?: () => void }) {
  const today = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const completedToday = habit.completedDates.some((ts) => {
    const date1 = new Date(ts * 1000);
    const date2 = new Date(today * 1000);
    date1.setHours(0, 0, 0, 0);
    date2.setHours(0, 0, 0, 0);
    return date1.getTime() === date2.getTime();
  });

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Text size="md" fw={600}>
              {habit.name}
            </Text>
            {habit.description && (
              <Text size="xs" c="dimmed" mt={2}>
                {habit.description}
              </Text>
            )}
          </div>

          <UnstyledButton
            onClick={onToggleToday}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: completedToday
                ? `var(--mantine-color-${habit.color || 'blue'}-1)`
                : 'var(--mantine-color-gray-1)',
              border: `2px solid ${
                completedToday ? `var(--mantine-color-${habit.color || 'blue'}-6)` : 'var(--mantine-color-gray-3)'
              }`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {completedToday ? (
              <IconCheck size={20} color={`var(--mantine-color-${habit.color || 'blue'}-6)`} />
            ) : (
              <IconX size={20} color="var(--mantine-color-gray-5)" />
            )}
          </UnstyledButton>
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <IconFlame size={16} color="orange" />
            <Text size="sm" fw={600} c="orange">
              {habit.currentStreak} day streak
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Best: {habit.longestStreak}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
