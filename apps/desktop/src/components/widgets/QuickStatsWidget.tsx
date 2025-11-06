import React from 'react';
import { Card, Text, SimpleGrid, Group, ThemeIcon, Stack } from '@mantine/core';
import { IconNotes, IconChecklist, IconFolders, IconTags, IconClock, IconTarget } from '@tabler/icons-react';
import { useNotes, useTasks, useProjects } from '../../hooks/useQueries';
import { LoadingCard } from '@noteece/ui';

/**
 * Quick Stats Widget - Overview of key workspace metrics
 * Shows at-a-glance statistics for:
 * - Total notes, tasks, projects
 * - Active items
 * - Completion rates
 * - Today's activity
 */
export function QuickStatsWidget() {
  const { data: notes, isLoading: notesLoading } = useNotes();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  if (notesLoading || tasksLoading || projectsLoading) {
    return <LoadingCard lines={4} />;
  }

  const activeNotes = (notes || []).filter((note) => !note.is_trashed).length;
  const activeTasks = (tasks || []).filter((task) => task.status !== 'done' && task.status !== 'cancelled').length;
  const completedTasks = (tasks || []).filter((task) => task.status === 'done').length;
  const activeProjects = (projects || []).filter((project) => project.status === 'active').length;

  // Tasks due today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueToday = (tasks || []).filter((task) => {
    if (!task.due_at) return false;
    const dueDate = new Date(task.due_at);
    return dueDate >= today && dueDate < tomorrow;
  }).length;

  // Extract unique tags
  const allTags = new Set<string>();
  for (const note of notes || []) {
    if (note.content_md) {
      const tagMatches = note.content_md.match(/#[\w-]+/g);
      if (tagMatches) {
        for (const tag of tagMatches) allTags.add(tag);
      }
    }
  }

  const stats = [
    {
      icon: <IconNotes size={24} />,
      label: 'Notes',
      value: activeNotes,
      color: 'blue',
    },
    {
      icon: <IconChecklist size={24} />,
      label: 'Active Tasks',
      value: activeTasks,
      color: 'orange',
    },
    {
      icon: <IconTarget size={24} />,
      label: 'Completed',
      value: completedTasks,
      color: 'green',
    },
    {
      icon: <IconFolders size={24} />,
      label: 'Projects',
      value: activeProjects,
      color: 'purple',
    },
    {
      icon: <IconClock size={24} />,
      label: 'Due Today',
      value: dueToday,
      color: 'red',
    },
    {
      icon: <IconTags size={24} />,
      label: 'Tags',
      value: allTags.size,
      color: 'teal',
    },
  ];

  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="apart" mb="lg">
        <Text size="lg" fw={600}>
          Workspace Overview
        </Text>
      </Group>

      <SimpleGrid cols={2} spacing="md">
        {stats.map((stat) => (
          <Card key={stat.label} p="md" withBorder>
            <Group>
              <ThemeIcon size={50} radius="md" variant="light" color={stat.color}>
                {stat.icon}
              </ThemeIcon>
              <Stack gap={4}>
                <Text size="xl" fw={700}>
                  {stat.value}
                </Text>
                <Text size="xs" c="dimmed">
                  {stat.label}
                </Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Card>
  );
}
