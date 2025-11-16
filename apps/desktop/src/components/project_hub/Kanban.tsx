import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import { Card, Text, Badge, Group, Button, Modal, TextInput, Textarea, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';
import { Task, TimeEntry } from '@noteece/types';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '../../store';
import { startTimeEntry, stopTimeEntry, getRunningEntries } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { logger } from '../../utils/logger';

interface KanbanContext {
  tasks: Task[];
  projectId: string;
}

const Kanban: React.FC = () => {
  const { tasks: initialTasks, projectId } = useOutletContext<KanbanContext>();
  const { activeSpaceId } = useStore();
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
        color: 'green',
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
        color: 'green',
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

    const sourceColumn = source.droppableId;
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
    <div>
      <Button onClick={open}>Create Task</Button>
      <Modal opened={opened} onClose={close} title="Create New Task">
        <TextInput
          label="Title"
          placeholder="Enter task title"
          value={newTaskTitle}
          onChange={(event) => setNewTaskTitle(event.currentTarget.value)}
        />
        <Textarea
          label="Description"
          placeholder="Enter task description"
          value={newTaskDescription}
          onChange={(event) => setNewTaskDescription(event.currentTarget.value)}
          mt="md"
        />
        <Button fullWidth mt="md" onClick={handleCreateTask}>
          Create
        </Button>
      </Modal>

      <DragDropContext onDragEnd={onDragEnd}>
        <Group>
          {Object.entries(columns).map(([columnId, columnTitle]) => (
            <Droppable droppableId={columnId} key={columnId}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  <Card shadow="sm" p="lg" radius="md" withBorder>
                    <Text fw={500}>{columnTitle}</Text>
                    {tasks
                      .filter((task) => task.status === columnId)
                      .map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                              <Card shadow="sm" p="sm" radius="md" withBorder mt="sm">
                                <Group justify="space-between">
                                  <div style={{ flex: 1 }}>
                                    <Text>{task.title}</Text>
                                    {task.priority && (
                                      <Badge color="blue" variant="light" size="xs" mt="xs">
                                        Priority {task.priority}
                                      </Badge>
                                    )}
                                  </div>
                                  {(() => {
                                    const runningEntry = getRunningEntryForTask(task.id);
                                    if (runningEntry) {
                                      return (
                                        <Tooltip label="Stop timer">
                                          <ActionIcon
                                            color="red"
                                            variant="light"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              stopTimerMutation.mutate(runningEntry.id);
                                            }}
                                            loading={stopTimerMutation.isPending}
                                            aria-label="Stop timer"
                                          >
                                            <IconPlayerStop size={16} />
                                          </ActionIcon>
                                        </Tooltip>
                                      );
                                    }
                                    return (
                                      <Tooltip label="Start timer">
                                        <ActionIcon
                                          color="green"
                                          variant="light"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startTimerMutation.mutate(task.id);
                                          }}
                                          loading={startTimerMutation.isPending}
                                          aria-label="Start timer"
                                        >
                                          <IconPlayerPlay size={16} />
                                        </ActionIcon>
                                      </Tooltip>
                                    );
                                  })()}
                                </Group>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </Card>
                </div>
              )}
            </Droppable>
          ))}
        </Group>
      </DragDropContext>
    </div>
  );
};

export default Kanban;
