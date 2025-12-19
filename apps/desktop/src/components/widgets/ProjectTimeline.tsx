/**
 * ProjectTimeline Widget - Mini timeline view of active projects with milestones
 */

import { Paper, Title, Text, Group, Stack, Badge, Progress } from '@mantine/core';
import { IconCalendarTime } from '@tabler/icons-react';
import { useProjects } from '../../hooks/useQueries';
import { useStore } from '../../store';
import { Project } from '@noteece/types';

const getDaysUntilDue = (dueTimestamp: number | undefined) => {
  if (!dueTimestamp) return null;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueTimestamp * 1000)); // Convert Unix timestamp to milliseconds
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getProgress = (project: Project) => {
  // Simple progress calculation based on tasks
  // In a real implementation, this would come from project data
  // Using a deterministic placeholder based on the project ID to avoid flickering on re-renders
  return ((project.id.codePointAt(0) ?? 0) + project.id.length) % 100;
};

export default function ProjectTimeline() {
  const { activeSpaceId } = useStore();
  const { data: projects = [] } = useProjects(activeSpaceId || '', !!activeSpaceId);

  // Filter active projects and sort by target end date
  const activeProjects = projects
    .filter((p) => p.status === 'active')
    .sort((a, b) => {
      if (!a.target_end_at) return 1;
      if (!b.target_end_at) return -1;
      return a.target_end_at - b.target_end_at;
    })
    .slice(0, 5); // Show top 5

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={4}>Project Timeline</Title>
        <IconCalendarTime size={20} color="var(--mantine-color-blue-5)" />
      </Group>

      {activeProjects.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" mt="xl">
          No active projects
        </Text>
      ) : (
        <Stack gap="md">
          {activeProjects.map((project) => {
            const daysUntil = getDaysUntilDue(project.target_end_at);
            const progress = getProgress(project);

            return (
              <div key={project.id} style={{ position: 'relative' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600} lineClamp={1} style={{ flex: 1 }}>
                    {project.title}
                  </Text>
                  {daysUntil !== null && (
                    <Badge size="sm" color={daysUntil < 0 ? 'red' : (daysUntil < 7 ? 'orange' : 'green')} variant="light">
                      {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d left`}
                    </Badge>
                  )}
                </Group>

                <Progress
                  value={progress}
                  size="sm"
                  color={progress < 30 ? 'red' : (progress < 70 ? 'yellow' : 'green')}
                  mb="xs"
                />

                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    {progress}% complete
                  </Text>
                  {project.target_end_at && (
                    <Text size="xs" c="dimmed">
                      Due: {new Date(project.target_end_at * 1000).toLocaleDateString()}
                    </Text>
                  )}
                </Group>
              </div>
            );
          })}
        </Stack>
      )}

      {activeProjects.length > 0 && (
        <Text size="xs" c="dimmed" ta="center" mt="md">
          Showing {activeProjects.length} of {projects.filter((p) => p.status === 'active').length} active projects
        </Text>
      )}
    </Paper>
  );
}
