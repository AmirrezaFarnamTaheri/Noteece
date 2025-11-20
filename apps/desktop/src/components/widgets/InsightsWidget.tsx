/**
 * InsightsWidget - AI-powered insights and suggestions from your workspace
 */

import { Paper, Title, Text, Group, Stack, Badge, ActionIcon } from '@mantine/core';
import { IconBulb, IconRefresh, IconSparkles } from '@tabler/icons-react';
import { useNotes, useTasks, useProjects } from '../../hooks/useQueries';
import { useStore } from '../../store';

interface Insight {
  id: string;
  type: 'suggestion' | 'achievement' | 'warning';
  title: string;
  description: string;
  icon: string;
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'achievement': {
      return 'green';
    }
    case 'warning': {
      return 'orange';
    }
    case 'suggestion': {
      return 'blue';
    }
    default: {
      return 'gray';
    }
  }
};

export default function InsightsWidget() {
  const { activeSpaceId } = useStore();
  const { data: notes = [] } = useNotes(activeSpaceId || '', !!activeSpaceId);
  const { data: tasks = [] } = useTasks(activeSpaceId || '', !!activeSpaceId);
  const { data: projects = [] } = useProjects(activeSpaceId || '', !!activeSpaceId);

  // Generate insights based on workspace data
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    // Notes insights
    const recentNotes = notes.filter((note) => {
      if (!note?.created_at) return false;
      const createdDate = new Date(note.created_at);
      if (Number.isNaN(createdDate.getTime())) return false;
      const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    if (recentNotes.length > 10) {
      insights.push({
        id: '1',
        type: 'achievement',
        title: 'Productive Week!',
        description: `You created ${recentNotes.length} notes this week. Keep it up!`,
        icon: '🎉',
      });
    } else if (recentNotes.length === 0 && notes.length > 0) {
      insights.push({
        id: '1b',
        type: 'suggestion',
        title: 'Write Something New',
        description: 'No notes this week yet. Start capturing your thoughts!',
        icon: '✍️',
      });
    }

    // Tasks insights
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_at) return false;
      return new Date(task.due_at * 1000) < new Date() && task.status !== 'done';
    });

    if (overdueTasks.length > 0) {
      insights.push({
        id: '2',
        type: 'warning',
        title: 'Overdue Tasks',
        description: `You have ${overdueTasks.length} overdue ${overdueTasks.length === 1 ? 'task' : 'tasks'}. Consider reviewing your priorities.`,
        icon: '⚠️',
      });
    }

    // Task completion rate
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const totalTasks = tasks.length;
    if (totalTasks > 0) {
      const completionRate = Math.round((completedTasks / totalTasks) * 100);
      if (completionRate > 75) {
        insights.push({
          id: '2b',
          type: 'achievement',
          title: 'High Achiever!',
          description: `${completionRate}% task completion rate. You're crushing it!`,
          icon: '🏆',
        });
      } else if (completionRate < 25) {
        insights.push({
          id: '2c',
          type: 'suggestion',
          title: 'Task Backlog',
          description: 'Many pending tasks. Try breaking them into smaller steps.',
          icon: '📋',
        });
      }
    }

    // Project insights
    const activeProjects = projects.filter((p) => p.status === 'active');
    if (activeProjects.length > 5) {
      insights.push({
        id: '3',
        type: 'suggestion',
        title: 'Too Many Active Projects',
        description: `Consider focusing on fewer projects at once for better results.`,
        icon: '💡',
      });
    } else if (activeProjects.length === 0 && projects.length > 0) {
      insights.push({
        id: '3b',
        type: 'suggestion',
        title: 'Inactive Projects',
        description: 'All projects are inactive. Time to start something new?',
        icon: '🚀',
      });
    }

    // Orphaned notes
    const orphanedNotes = notes.filter((note) => {
      const content = note?.content_md ?? '';
      const title = note?.title ?? '';
      return !content.includes('[[') && !title.includes('Daily');
    });

    if (orphanedNotes.length > 20) {
      insights.push({
        id: '4',
        type: 'suggestion',
        title: 'Unlinked Notes',
        description: `${orphanedNotes.length} notes have no connections. Try linking related ideas!`,
        icon: '🔗',
      });
    }

    // Achievement: consistency
    const noteDates = notes
      .filter((n) => n?.created_at)
      .map((n) => {
        const date = new Date(n.created_at);
        return Number.isNaN(date.getTime()) ? null : date.toDateString();
      })
      .filter((d): d is string => d !== null);
    const uniqueDates = new Set(noteDates);
    if (uniqueDates.size >= 7) {
      insights.push({
        id: '5',
        type: 'achievement',
        title: 'Consistent Creator',
        description: `You've created notes on ${uniqueDates.size} different days!`,
        icon: '⭐',
      });
    }

    // Velocity insight (recent activity vs past activity)
    const lastWeekNotes = notes.filter((note) => {
      if (!note?.created_at) return false;
      const createdDate = new Date(note.created_at);
      const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7 && daysDiff > 0;
    }).length;

    const previousWeekNotes = notes.filter((note) => {
      if (!note?.created_at) return false;
      const createdDate = new Date(note.created_at);
      const daysDiff = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && daysDiff <= 14;
    }).length;

    if (lastWeekNotes > previousWeekNotes * 1.5) {
      insights.push({
        id: '6',
        type: 'achievement',
        title: 'Momentum Building',
        description: 'Your productivity is trending up! Keep the momentum going!',
        icon: '📈',
      });
    } else if (previousWeekNotes > lastWeekNotes * 1.5 && previousWeekNotes > 0) {
      insights.push({
        id: '6b',
        type: 'suggestion',
        title: 'Slowing Down',
        description: 'Activity has decreased. Consider setting small daily goals.',
        icon: '📉',
      });
    }

    // Word count insight
    let totalWords = 0;
    for (const note of notes) {
      const words = (note?.content_md ?? '').split(/\s+/).filter((w) => w.length > 0);
      totalWords += words.length;
    }

    if (totalWords > 50_000) {
      insights.push({
        id: '7',
        type: 'achievement',
        title: 'Prolific Writer',
        description: `${totalWords.toLocaleString()} words written! That's novel-length!`,
        icon: '📚',
      });
    } else if (totalWords > 10_000) {
      insights.push({
        id: '7b',
        type: 'achievement',
        title: 'Growing Collection',
        description: `${totalWords.toLocaleString()} words written across all notes!`,
        icon: '📝',
      });
    }

    // Priority task insight
    const highPriorityTasks = tasks.filter((t) => t.priority === 1 || t.priority === 2);
    const highPriorityPending = highPriorityTasks.filter((t) => t.status !== 'done').length;

    if (highPriorityPending > 3) {
      insights.push({
        id: '8',
        type: 'warning',
        title: 'Urgent Items Pending',
        description: `${highPriorityPending} high-priority tasks need attention.`,
        icon: '🔥',
      });
    }

    // Milestone: first note/task/project
    if (notes.length === 1 && insights.length < 3) {
      insights.push({
        id: '9',
        type: 'achievement',
        title: 'First Note Created!',
        description: 'Welcome to Noteece! This is the start of something great.',
        icon: '🌱',
      });
    }

    // Sort by priority: warnings first, then achievements, then suggestions
    const sortOrder = { warning: 0, achievement: 1, suggestion: 2 };
    insights.sort((a, b) => sortOrder[a.type] - sortOrder[b.type]);

    return insights.slice(0, 3); // Show top 3
  };

  const insights = generateInsights();

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconSparkles size={20} color="var(--mantine-color-yellow-5)" />
          <Title order={4}>Insights</Title>
        </Group>
        <ActionIcon variant="subtle" size="sm">
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>

      {insights.length === 0 ? (
        <Stack align="center" justify="center" h={150}>
          <IconBulb size={48} color="var(--mantine-color-gray-6)" opacity={0.5} />
          <Text size="sm" c="dimmed" ta="center">
            Keep working to unlock insights!
          </Text>
        </Stack>
      ) : (
        <Stack gap="md">
          {insights.map((insight) => (
            <Paper key={insight.id} withBorder p="sm" style={{ backgroundColor: 'var(--mantine-color-dark-6)' }}>
              <Group gap="xs" wrap="nowrap" align="flex-start">
                <Text size="xl">{insight.icon}</Text>
                <div style={{ flex: 1 }}>
                  <Group gap="xs" mb="xs">
                    <Text size="sm" fw={600}>
                      {insight.title}
                    </Text>
                    <Badge size="xs" color={getTypeColor(insight.type)} variant="light">
                      {insight.type}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {insight.description}
                  </Text>
                </div>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
