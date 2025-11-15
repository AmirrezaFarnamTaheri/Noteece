import React from 'react';
import { Card, Text, Group, Stack, Badge, Progress, SimpleGrid, ThemeIcon, Tooltip } from '@mantine/core';
import {
  IconTrophy,
  IconFlame,
  IconStar,
  IconTarget,
  IconBolt,
  IconRocket,
  IconMedal,
  IconCrown,
} from '@tabler/icons-react';
import { useNotes, useTasks } from '../../hooks/useQueries';
import { LoadingCard } from '@noteece/ui';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

/**
 * Achievement Badges Widget - Gamification with unlockable achievements
 * Features:
 * - Track progress toward achievements
 * - Visual badges for milestones
 * - Encourages consistent usage
 * - Celebrates user accomplishments
 */
export function AchievementBadgesWidget() {
  const { data: notes, isLoading: notesLoading } = useNotes('', false);
  const { data: tasks, isLoading: tasksLoading } = useTasks('', false);

  if (notesLoading || tasksLoading) {
    return <LoadingCard lines={4} />;
  }

  const activeNotes = (notes || []).filter((note) => !note.is_trashed);
  const completedTasks = (tasks || []).filter((task) => task.status === 'done');

  // Calculate achievements
  const totalNotes = activeNotes.length;
  const totalCompleted = completedTasks.length;

  // Calculate streaks
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

  const achievements: Achievement[] = [
    {
      id: 'first-note',
      title: 'First Steps',
      description: 'Create your first note',
      icon: <IconStar size={24} />,
      color: 'yellow',
      unlocked: totalNotes >= 1,
      progress: Math.min(totalNotes, 1),
      target: 1,
    },
    {
      id: 'ten-notes',
      title: 'Getting Started',
      description: 'Create 10 notes',
      icon: <IconRocket size={24} />,
      color: 'blue',
      unlocked: totalNotes >= 10,
      progress: Math.min(totalNotes, 10),
      target: 10,
    },
    {
      id: 'fifty-notes',
      title: 'Prolific Writer',
      description: 'Create 50 notes',
      icon: <IconBolt size={24} />,
      color: 'orange',
      unlocked: totalNotes >= 50,
      progress: Math.min(totalNotes, 50),
      target: 50,
    },
    {
      id: 'hundred-notes',
      title: 'Note Master',
      description: 'Create 100 notes',
      icon: <IconCrown size={24} />,
      color: 'purple',
      unlocked: totalNotes >= 100,
      progress: Math.min(totalNotes, 100),
      target: 100,
    },
    {
      id: 'task-completer',
      title: 'Task Completer',
      description: 'Complete 25 tasks',
      icon: <IconTarget size={24} />,
      color: 'green',
      unlocked: totalCompleted >= 25,
      progress: Math.min(totalCompleted, 25),
      target: 25,
    },
    {
      id: 'streak-week',
      title: 'Week Warrior',
      description: '7-day writing streak',
      icon: <IconFlame size={24} />,
      color: 'red',
      unlocked: currentStreak >= 7,
      progress: Math.min(currentStreak, 7),
      target: 7,
    },
    {
      id: 'streak-month',
      title: 'Consistency King',
      description: '30-day writing streak',
      icon: <IconMedal size={24} />,
      color: 'teal',
      unlocked: currentStreak >= 30,
      progress: Math.min(currentStreak, 30),
      target: 30,
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Complete 100 tasks',
      icon: <IconTrophy size={24} />,
      color: 'gold',
      unlocked: totalCompleted >= 100,
      progress: Math.min(totalCompleted, 100),
      target: 100,
    },
  ];

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="apart" mb="md">
        <Group gap="xs">
          <IconTrophy size={24} />
          <Text size="lg" fw={600}>
            Achievements
          </Text>
        </Group>
        <Badge size="lg" variant="light" color="yellow">
          {unlockedCount} / {achievements.length}
        </Badge>
      </Group>

      <Progress value={(unlockedCount / achievements.length) * 100} size="sm" radius="xl" mb="lg" />

      <SimpleGrid cols={2} spacing="md">
        {achievements.map((achievement) => (
          <Tooltip key={achievement.id} label={achievement.description} position="top" withArrow>
            <Card
              p="md"
              withBorder
              style={{
                opacity: achievement.unlocked ? 1 : 0.5,
                cursor: 'pointer',
              }}
            >
              <Stack gap="xs" align="center">
                <ThemeIcon
                  size={60}
                  radius="xl"
                  variant={achievement.unlocked ? 'filled' : 'light'}
                  color={achievement.color}
                >
                  {achievement.icon}
                </ThemeIcon>
                <Text size="sm" fw={600} ta="center">
                  {achievement.title}
                </Text>
                {!achievement.unlocked && achievement.progress !== undefined && (
                  <Stack gap={4} w="100%">
                    <Text size="xs" c="dimmed" ta="center">
                      {achievement.progress} / {achievement.target}
                    </Text>
                    <Progress
                      value={((achievement.progress || 0) / (achievement.target || 1)) * 100}
                      size="xs"
                      radius="xl"
                      color={achievement.color}
                    />
                  </Stack>
                )}
                {achievement.unlocked && (
                  <Badge size="xs" color={achievement.color}>
                    Unlocked!
                  </Badge>
                )}
              </Stack>
            </Card>
          </Tooltip>
        ))}
      </SimpleGrid>
    </Card>
  );
}
