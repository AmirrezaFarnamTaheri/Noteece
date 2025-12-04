import React, { useState, useMemo } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  TextInput,
  Grid,
  Card,
  Text,
  Badge,
  ActionIcon,
  Progress,
  Menu,
  Paper,
  useMantineTheme,
  Stack,
  ThemeIcon,
  type MantineTheme,
} from '@mantine/core';
import {
  IconPlus,
  IconDotsVertical,
  IconSearch,
  IconFilter,
  IconLayoutKanban,
  IconList,
  IconSortAscending,
  IconFolder,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { useQueryClient } from '@tanstack/react-query';
import { useProjects } from '../hooks/useQueries';
import { useStore } from '../store';
import { Project } from '@noteece/types';
import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '@/utils/logger';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'done': {
      return 'teal';
    }
    case 'active': {
      return 'violet';
    }
    case 'blocked': {
      return 'red';
    }
    case 'proposed': {
      return 'blue';
    }
    default: {
      return 'gray';
    }
  }
};

const ProjectHub: React.FC = () => {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeSpaceId } = useStore();
  const { data: projects = [] } = useProjects(activeSpaceId || '', !!activeSpaceId);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
  const [search, setSearch] = useState('');

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
  }, [projects, search]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const project = projects.find((p) => p.id === draggableId);
    if (project) {
      // Optimistic update
      const updatedProject = { ...project, status: destination.droppableId };

      try {
        await invoke('update_project_cmd', { project: updatedProject });
        queryClient.invalidateQueries({ queryKey: ['projects', activeSpaceId] });
      } catch (error) {
        logger.error('Failed to update project status:', error as Error);
        // Revert on error would require more complex state management or just refetch
        queryClient.invalidateQueries({ queryKey: ['projects', activeSpaceId] });
      }
    }
  };

  // Kanban columns definition
  const columns = {
    proposed: { title: 'Proposed', color: 'blue' },
    active: { title: 'Active', color: 'violet' },
    blocked: { title: 'Blocked', color: 'red' },
    done: { title: 'Done', color: 'teal' },
  };

  return (
    <Container fluid p="xl" style={{ minHeight: '100vh', backgroundColor: theme.colors.dark[9] }}>
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2} fw={800}>
              Projects
            </Title>
            <Text c="dimmed" size="sm">
              Manage your ongoing initiatives
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={18} />}
            color="violet"
            radius="md"
            onClick={() => navigate('/main/projects/new')}
          >
            New Project
          </Button>
        </Group>

        <Card withBorder radius="lg" p="sm" style={{ backgroundColor: theme.colors.dark[8] }}>
          <Group justify="space-between">
            <Group gap="xs">
              <TextInput
                placeholder="Search projects..."
                leftSection={<IconSearch size={16} />}
                variant="filled"
                radius="md"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ width: 300 }}
              />
              <Button variant="subtle" color="gray" leftSection={<IconFilter size={16} />}>
                Filter
              </Button>
              <Button variant="subtle" color="gray" leftSection={<IconSortAscending size={16} />}>
                Sort
              </Button>
            </Group>
            <SegmentedControlWithIcons viewMode={viewMode} setViewMode={setViewMode} />
          </Group>
        </Card>

        {viewMode === 'grid' && (
          <Grid>
            {filteredProjects.map((project) => (
              <Grid.Col key={project.id} span={{ base: 12, sm: 6, lg: 4, xl: 3 }}>
                <ProjectCard project={project} navigate={navigate} theme={theme} getStatusColor={getStatusColor} />
              </Grid.Col>
            ))}
          </Grid>
        )}

        {viewMode === 'list' && (
          <Paper withBorder radius="lg" style={{ backgroundColor: theme.colors.dark[8], overflow: 'hidden' }}>
            <Stack gap={0}>
              {filteredProjects.map((project) => (
                <Group
                  key={project.id}
                  p="md"
                  style={{ borderBottom: `1px solid ${theme.colors.dark[6]}` }}
                  justify="space-between"
                >
                  <Group>
                    <ThemeIcon color={getStatusColor(project.status)} variant="light">
                      <IconFolder size={18} />
                    </ThemeIcon>
                    <Text fw={600}>{project.title}</Text>
                  </Group>
                  <Group>
                    <Badge color={getStatusColor(project.status)}>{project.status}</Badge>
                    <Button variant="default" size="xs" onClick={() => navigate(`/main/projects/${project.id}`)}>
                      Open
                    </Button>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Paper>
        )}

        {viewMode === 'kanban' && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
              {Object.entries(columns).map(([columnId, column]) => {
                const columnProjects = filteredProjects.filter((p) => p.status === columnId);
                return (
                  <Droppable droppableId={columnId} key={columnId}>
                    {(provided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        shadow="sm"
                        p="md"
                        radius="md"
                        withBorder
                        style={{
                          minWidth: 300,
                          backgroundColor: snapshot.isDraggingOver ? theme.colors.dark[6] : theme.colors.dark[8],
                          borderColor: theme.colors.dark[6],
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <Group justify="space-between" mb="md">
                          <Group gap="xs">
                            <ThemeIcon color={column.color} variant="light" size="sm">
                              <IconFolder size={14} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">
                              {column.title}
                            </Text>
                          </Group>
                          <Badge size="sm" variant="outline" color={column.color}>
                            {columnProjects.length}
                          </Badge>
                        </Group>

                        <Stack gap="sm">
                          {columnProjects.map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, _snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                  }}
                                >
                                  <ProjectCard
                                    project={project}
                                    navigate={navigate}
                                    theme={theme}
                                    getStatusColor={getStatusColor}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Stack>
                      </Paper>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </Stack>
    </Container>
  );
};

interface SegmentedControlProps {
  viewMode: 'grid' | 'list' | 'kanban';
  setViewMode: (mode: 'grid' | 'list' | 'kanban') => void;
}

const SegmentedControlWithIcons: React.FC<SegmentedControlProps> = ({ viewMode, setViewMode }) => (
  <Group gap={4}>
    <ActionIcon
      variant={viewMode === 'grid' ? 'filled' : 'subtle'}
      color={viewMode === 'grid' ? 'violet' : 'gray'}
      onClick={() => setViewMode('grid')}
      radius="md"
    >
      <IconLayoutGrid size={18} />
    </ActionIcon>
    <ActionIcon
      variant={viewMode === 'list' ? 'filled' : 'subtle'}
      color={viewMode === 'list' ? 'violet' : 'gray'}
      onClick={() => setViewMode('list')}
      radius="md"
    >
      <IconList size={18} />
    </ActionIcon>
    <ActionIcon
      variant={viewMode === 'kanban' ? 'filled' : 'subtle'}
      color={viewMode === 'kanban' ? 'violet' : 'gray'}
      onClick={() => setViewMode('kanban')}
      radius="md"
    >
      <IconLayoutKanban size={18} />
    </ActionIcon>
  </Group>
);

interface ProjectCardProps {
  project: Project;
  navigate: NavigateFunction;
  theme: MantineTheme;
  getStatusColor: (status: string) => string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, navigate, theme, getStatusColor }) => (
  <Card
    padding="lg"
    radius="lg"
    withBorder
    style={{
      backgroundColor: theme.colors.dark[7],
      cursor: 'pointer',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
    }}
    className="hover:scale-[1.01] hover:border-violet-500 hover:shadow-md"
    onClick={() => navigate(`/main/projects/${project.id}`)}
  >
    <Group justify="space-between" mb="xs">
      <Badge color={getStatusColor(project.status)} variant="light">
        {project.status}
      </Badge>
      <Menu position="bottom-end" shadow="md">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item>Edit</Menu.Item>
          <Menu.Item color="red">Delete</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>

    <Text fw={700} size="lg" mt="sm" mb="xs" lineClamp={1}>
      {project.title}
    </Text>

    <Text size="sm" c="dimmed" lineClamp={2} mb="md" h={40}>
      {project.goal_outcome || 'No description provided.'}
    </Text>

    <Group justify="space-between" mt="md" align="center">
      <Text size="xs" c="dimmed">
        Confidence: {project.confidence || 0}%
      </Text>
      <Progress value={project.confidence || 30} size="sm" w={100} color={getStatusColor(project.status)} />
    </Group>
  </Card>
);

export default ProjectHub;
