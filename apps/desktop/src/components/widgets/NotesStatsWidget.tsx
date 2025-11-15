import React from 'react';
import { Card, Text, Group, Stack, RingProgress, SimpleGrid } from '@mantine/core';
import { IconNotes, IconFileText, IconCalendar, IconTrendingUp } from '@tabler/icons-react';
import { useNotes } from '../../hooks/useQueries';
import { LoadingCard } from '@noteece/ui';

/**
 * Notes Statistics Widget - Display comprehensive note statistics
 * Shows:
 * - Total note count
 * - Total word count
 * - Average note length
 * - Notes created this week
 * - Writing streak
 */
export function NotesStatsWidget() {
  const { data: notes, isLoading } = useNotes('', false);

  if (isLoading) {
    return <LoadingCard lines={4} />;
  }

  const activeNotes = notes?.filter((note) => !note.is_trashed) || [];
  const totalNotes = activeNotes.length;

  // Calculate word count
  let totalWords = 0;
  for (const note of activeNotes) {
    const words = note.content_md?.split(/\s+/).filter((w) => w.length > 0).length || 0;
    totalWords += words;
  }

  const avgWordsPerNote = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

  // Notes created this week
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const notesThisWeek = activeNotes.filter((note) => note.created_at && note.created_at > oneWeekAgo).length;

  // Calculate writing streak (consecutive days with notes)
  const notesByDay = new Map<string, number>();
  for (const note of activeNotes) {
    if (note.created_at) {
      const date = new Date(note.created_at).toDateString();
      notesByDay.set(date, (notesByDay.get(date) || 0) + 1);
    }
  }

  let currentStreak = 0;
  const today = new Date();
  for (let index = 0; index < 365; index++) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    const dateString = date.toDateString();
    if (notesByDay.has(dateString)) {
      currentStreak++;
    } else {
      break;
    }
  }

  const streakPercentage = Math.min((currentStreak / 30) * 100, 100);

  const stats = [
    {
      icon: <IconNotes size={20} />,
      label: 'Total Notes',
      value: totalNotes.toLocaleString(),
      color: 'blue',
    },
    {
      icon: <IconFileText size={20} />,
      label: 'Total Words',
      value: totalWords.toLocaleString(),
      color: 'green',
    },
    {
      icon: <IconCalendar size={20} />,
      label: 'This Week',
      value: notesThisWeek.toString(),
      color: 'orange',
    },
    {
      icon: <IconTrendingUp size={20} />,
      label: 'Avg Words/Note',
      value: avgWordsPerNote.toLocaleString(),
      color: 'purple',
    },
  ];

  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="apart" mb="lg">
        <Text size="lg" fw={600}>
          Notes Statistics
        </Text>
      </Group>

      <SimpleGrid cols={2} spacing="lg" mb="xl">
        {stats.map((stat) => (
          <Stack key={stat.label} gap="xs" align="center">
            <div style={{ color: `var(--mantine-color-${stat.color}-6)` }}>{stat.icon}</div>
            <Text size="xl" fw={700}>
              {stat.value}
            </Text>
            <Text size="xs" c="dimmed" ta="center">
              {stat.label}
            </Text>
          </Stack>
        ))}
      </SimpleGrid>

      <Card p="md" withBorder>
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Writing Streak
            </Text>
            <Text size="xs" c="dimmed">
              {currentStreak} consecutive days
            </Text>
          </Stack>
          <RingProgress
            size={80}
            thickness={8}
            sections={[{ value: streakPercentage, color: 'teal' }]}
            label={
              <Text ta="center" size="xs" fw={700}>
                {currentStreak}d
              </Text>
            }
          />
        </Group>
      </Card>
    </Card>
  );
}
