import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import {
  Text,
  Badge,
  Group,
  Button,
  Modal,
  TextInput,
  Textarea,
  ActionIcon,
  Tooltip,
  useMantineTheme,
  Paper,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlayerPlay, IconPlayerStop, IconPlus } from '@tabler/icons-react';
import { Task, TimeEntry } from '@noteece/types';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '../../store';
import { startTimeEntry, stopTimeEntry, getRunningEntries } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { logger } from '@/utils/logger';

interface KanbanContext {
  tasks: Task[];
  projectId: string;
}

const Kanban: React.FC = () => {
  const { tasks: initialTasks, projectId } = useOutletContext<KanbanContext>();
  const { activeSpaceId } = useStore();
  const theme = useMantineTheme();
  const [tasks, setTasks] = useState(initialTasks);
  const [opened, { open, close }] = useDisclosure(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const queryClient = useQueryClient();

  // Fetch running time entries
  const { data: runningEntries = [] } = useQuery({
    queryKey: ['running-entries', activeSpaceId],
    queryFn: () => (activeSpaceId ? getRunningEntries(activeSpaceId) : Promise.resolve([])),
    enabled: !!activeSpaceId,
    refetchInterval: 1000,
  });

  // Start time entry mutation
  const startTimerMutation = useMutation({
    mutationFn: (taskId: string) => startTimeEntry(activeSpaceId || '', taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-entries'] });
      notifications.show({
        title: 'Timer started',
        message: 'Time tracking has begun',
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to start timer',
        color: 'red',
      });
    },
  });

  // Stop time entry mutation
  const stopTimerMutation = useMutation({
    mutationFn: (entryId: string) => stopTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-entries'] });
      queryClient.invalidateQueries({ queryKey: ['recent-time-entries'] });
      notifications.show({
        title: 'Timer stopped',
        message: 'Time entry recorded',
        color: 'teal',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to stop timer',
        color: 'red',
      });
    },
  });

  const getRunningEntryForTask = (taskId: string): TimeEntry | undefined => {
    return runningEntries.find((entry) => entry.task_id === taskId);
  };

  const columns = {
    inbox: 'Inbox',
    next: 'Next',
    in_progress: 'In Progress',
    waiting: 'Waiting',
    done: 'Done',
    cancelled: 'Cancelled',
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    const destinationColumn = destination.droppableId;

    const updatedTasks = [...tasks];
    const [removed] = updatedTasks.splice(source.index, 1);
    updatedTasks.splice(destination.index, 0, { ...removed, status: destinationColumn as Task['status'] });

    setTasks(updatedTasks);
  };

  const handleCreateTask = async () => {
    try {
      const newTask: Task = await invoke('create_task_cmd', {
        spaceId: activeSpaceId,
        title: newTaskTitle,
        description: newTaskDescription,
        projectId,
      });
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      close();
    } catch (error) {
      logger.error('Error creating task:', error as Error);
    }
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: theme.spacing.md }}>
      <Group mb="md" justify="flex-end">
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={open}
          variant="filled"
          color="violet"
          radius="md"
          styles={{ root: { transition: 'all 0.2s', '&:hover': { transform: 'translateY(-1px)' } } }}
        >
          Create Task
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title="Create New Task"
        radius="lg"
        overlayProps={{ blur: 4, backgroundOpacity: 0.55 }}
        styles={{ header: { backgroundColor: theme.colors.dark[7] }, body: { backgroundColor: theme.colors.dark[7] } }}
      >
        <TextInput
          label="Title"
          placeholder="Enter task title"
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.currentTarget.value)}
          radius="md"
        />
        <Textarea
          label="Description"
          placeholder="Enter task description"
          value={newTaskDescription}
          onChange={(event) => setNewTaskDescription(event.currentTarget.value)}
          mt="md"
          radius="md"
        />
        <Button fullWidth mt="lg" onClick={handleCreateTask} radius="md" color="violet">
          Create Task
        </Button>
      </Modal>

      <DragDropContext onDragEnd={onDragEnd}>
        <Group align="flex-start" wrap="nowrap" gap="md">
          {Object.entries(columns).map(([columnId, columnTitle]) => (
            <Droppable droppableId={columnId} key={columnId}>
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  radius="lg"
                  p="md"
                  style={{
                    minWidth: 280,
                    width: 280,
                    backgroundColor: snapshot.isDraggingOver ? theme.colors.dark[5] : theme.colors.dark[8],
                    border: `1px solid ${theme.colors.dark[4]}`,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  <Group justify="space-between" mb="md">
                    <Text fw={700} size="sm" c="gray.3" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                      {columnTitle}
                    </Text>
                    <Badge variant="filled" color="dark" radius="sm">
                      {tasks.filter((task) => task.status === columnId).length}
                    </Badge>
                  </Group>

                  <div style={{ minHeight: 100 }}>
                    {tasks
                      .filter((task) => task.status === columnId)
                      .map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                marginBottom: theme.spacing.sm,
                              }}
                            >
                              <Paper
                                shadow={snapshot.isDragging ? 'xl' : 'sm'}
                                p="sm"
                                radius="md"
                                style={{
                                  backgroundColor: theme.colors.dark[6],
                                  border: `1px solid ${snapshot.isDragging ? theme.colors.violet[5] : 'rgba(255,255,255,0.05)'}`,
                                  cursor: 'grab',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                  '&:hover': {
                                    borderColor: theme.colors.dark[3],
                                  },
                                }}
                              >
                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                  <Box style={{ flex: 1 }}>
                                    <Text size="sm" fw={500} c="white" lineClamp={2}>
                                      {task.title}
                                    </Text>
                                    {task.priority && (
                                      <Badge
                                        color={
                                          (task.priority as unknown as string) === 'high'
                                            ? 'red'
                                            : ((task.priority as unknown as string) === 'medium'
                                              ? 'yellow'
                                              : 'blue')
                                        }
                                        variant="light"
                                        size="xs"
                                        mt="xs"
                                        radius="sm"
                                      >
                                        {task.priority}
                                      </Badge>
                                    )}
                                  </Box>
                                  {(() => {
                                    const runningEntry = getRunningEntryForTask(task.id);
                                    if (runningEntry) {
                                      return (
                                        <Tooltip label="Stop timer" withArrow>
                                          <ActionIcon
                                            color="red.4"
                                            variant="light"
                                            size="sm"
                                            radius="md"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              stopTimerMutation.mutate(runningEntry.id);
                                            }}
                                            loading={stopTimerMutation.isPending}
                                            aria-label="Stop timer"
                                          >
                                            <IconPlayerStop size={14} />
                                          </ActionIcon>
                                        </Tooltip>
                                      );
                                    }
                                    return (
                                      <Tooltip label="Start timer" withArrow>
                                        <ActionIcon
                                          color="teal.4"
                                          variant="light"
                                          size="sm"
                                          radius="md"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startTimerMutation.mutate(task.id);
                                          }}
                                          loading={startTimerMutation.isPending}
                                          aria-label="Start timer"
                                          style={{ opacity: 0.6, transition: 'opacity 0.2s' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                                        >
                                          <IconPlayerPlay size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                    );
                                  })()}
                                </Group>
                              </Paper>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                </Paper>
              )}
            </Droppable>
          ))}
        </Group>
      </DragDropContext>
    </div>
  );
};

export default Kanban;
