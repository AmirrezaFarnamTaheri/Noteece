import React, { useState, useEffect } from 'react';
import { Paper, Text, Group, Stack, Badge, Avatar, useMantineTheme } from '@mantine/core';
import { IconFolderOpen, IconArrowUpRight } from '@tabler/icons-react';
import { Project } from '@noteece/types';
import { getAllProjectsInSpace } from '../../services/api';
import { useActiveSpace } from '../../hooks/useActiveSpace';
import { formatTimestamp } from '../../utils/dateUtils';
import classes from '../Dashboard.module.css';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': {
      return 'green';
    }
    case 'blocked': {
      return 'red';
    }
    case 'proposed': {
      return 'blue';
    }
    case 'done': {
      return 'gray';
    }
    default: {
      return 'gray';
    }
  }
};

export const RecentProjects: React.FC = () => {
  const theme = useMantineTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const { activeSpaceId } = useActiveSpace();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!activeSpaceId) return;
      try {
        const projectsData = await getAllProjectsInSpace(activeSpaceId);
        // Get only active projects, sorted by start date
        const activeProjects = projectsData
          .filter((p) => p.status === 'active')
          .sort((a, b) => (b.start_at || 0) - (a.start_at || 0))
          .slice(0, 5);
        setProjects(activeProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    void fetchProjects();
  }, [activeSpaceId]);

  return (
    <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
      <Group justify="space-between" mb="md">
        <Group>
          <IconFolderOpen size={20} />
          <Text className={classes.title} fz="xs" c="dimmed">
            Active Projects
          </Text>
        </Group>
        <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
      </Group>

      <Stack gap="sm" mt="xl">
        {projects.map((project) => (
          <Paper key={project.id} p="xs" withBorder>
            <Group justify="space-between">
              <Group gap="sm">
                <Avatar color={getStatusColor(project.status)} radius="sm" size="sm">
                  {project.title[0]}
                </Avatar>
                <Stack gap={0}>
                  <Text size="sm" fw={500} lineClamp={1}>
                    {project.title}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {project.start_at ? `Started ${formatTimestamp(project.start_at)}` : 'No start date'}
                  </Text>
                </Stack>
              </Group>
              <Badge size="sm" color={getStatusColor(project.status)} variant="light">
                {project.status}
              </Badge>
            </Group>
          </Paper>
        ))}

        {projects.length === 0 && (
          <Text size="sm" c="dimmed" ta="center">
            No active projects. Create one to get started!
          </Text>
        )}
      </Stack>
    </Paper>
  );
};
