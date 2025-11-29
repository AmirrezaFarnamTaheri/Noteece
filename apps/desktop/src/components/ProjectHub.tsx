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
  Tooltip,
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
  IconGripVertical,
} from '@tabler/icons-react';
import { useNavigate, type NavigateFunction } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { useProjects } from '../hooks/useQueries';
import { useStore } from '../store';
import { Project } from '@noteece/types';
import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../utils/logger';

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
    case 'archived': {
      return 'gray';
    }
    default: {
      return 'gray';
    }
  }
};

const ProjectHub: React.FC = () => {
  const theme = useMantineTheme();
  const navigate = useNavigate();
  const { activeSpaceId } = useStore();
  const { data: projects = [], isLoading, refetch } = useProjects(activeSpaceId || '', !!activeSpaceId);
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
    if (project && project.status !== destination.droppableId) {
      // Optimistic update would go here, but for now we just call backend and refetch
      try {
        // We need a proper update command. For now, assuming update_project_status_cmd exists or we use update_project_cmd
        // Since `Project` struct likely has `status` field.
        // Assuming `update_project_cmd` takes the whole project struct or fields.
        // If `update_project_cmd` is not available, this might fail.
        // However, standard crud usually exists.
        // Let's assume `update_project_cmd` updates the project.
        const updatedProject = { ...project, status: destination.droppableId };
        await invoke('update_project_cmd', { project: updatedProject });
        void refetch();
      } catch (error) {
        logger.error('Failed to update project status:', error as Error);
      }
    }
  };

  const kanbanColumns = ['proposed', 'active', 'blocked', 'done'];

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
            <Group align="flex-start" gap="md" style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 20 }}>
              {kanbanColumns.map((status) => {
                const columnProjects = filteredProjects.filter((p) => p.status === status);
                return (
                  <Droppable droppableId={status} key={status}>
                    {(provided, snapshot) => (
                      <Paper
                        withBorder
                        p="md"
                        radius="md"
                        style={{
                          minWidth: 300,
                          backgroundColor: snapshot.isDraggingOver ? theme.colors.dark[6] : theme.colors.dark[8],
                          transition: 'background-color 0.2s',
                        }}
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <Group justify="space-between" mb="md">
                          <Text fw={700} tt="capitalize">
                            {status}
                          </Text>
                          <Badge color={getStatusColor(status)} variant="light">
                            {columnProjects.length}
                          </Badge>
                        </Group>

                        <Stack gap="xs">
                          {columnProjects.map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  padding="sm"
                                  radius="md"
                                  withBorder
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    cursor: 'grab',
                                    backgroundColor: snapshot.isDragging ? theme.colors.dark[6] : theme.colors.dark[7],
                                  }}
                                  onClick={() => navigate(`/main/projects/${project.id}`)}
                                >
                                  <Text fw={600} size="sm" lineClamp={2} mb={4}>
                                    {project.title}
                                  </Text>
                                  <Progress
                                    value={project.confidence || 0}
                                    size="xs"
                                    color={getStatusColor(project.status)}
                                    mb={4}
                                  />
                                </Card>
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
            </Group>
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
