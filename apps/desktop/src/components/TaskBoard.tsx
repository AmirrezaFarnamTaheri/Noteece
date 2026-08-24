import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, TextInput, Group, Paper, Title, Stack, Text, Badge, Tooltip } from '@mantine/core';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import { useQueryClient } from '@tanstack/react-query';
import type { Task } from './types';
import { useStore } from '../store';
import { useTasks, useUpdateTask, queryKeys } from '../hooks/useQueries';
import * as api from '../services/api';
import { IconPlus, IconGripVertical, IconCalendar, IconFlag } from '@tabler/icons-react';
import { logger } from '@/utils/logger';

// Whitelist of safe Mantine color tokens to prevent CSS injection
const SAFE_COLORS = new Set([
  'gray',
  'blue',
  'yellow',
  'green',
  'red',
  'orange',
  'cyan',
  'teal',
  'pink',
  'purple',
] as const);

type SafeColor = 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'orange' | 'cyan' | 'teal' | 'pink' | 'purple';

const colorTokenMap: Record<SafeColor, { bgActive: string; bgIdle: string; borderActive: string; borderIdle: string }> =
  {
    gray: {
      bgActive: 'var(--mantine-color-gray-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-gray-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    blue: {
      bgActive: 'var(--mantine-color-blue-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-blue-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    yellow: {
      bgActive: 'var(--mantine-color-yellow-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-yellow-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    green: {
      bgActive: 'var(--mantine-color-green-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-green-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    red: {
      bgActive: 'var(--mantine-color-red-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-red-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    orange: {
      bgActive: 'var(--mantine-color-orange-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-orange-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    cyan: {
      bgActive: 'var(--mantine-color-cyan-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-cyan-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    teal: {
      bgActive: 'var(--mantine-color-teal-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-teal-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    pink: {
      bgActive: 'var(--mantine-color-pink-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-pink-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
    purple: {
      bgActive: 'var(--mantine-color-purple-9)',
      bgIdle: 'var(--mantine-color-dark-8)',
      borderActive: 'var(--mantine-color-purple-6)',
      borderIdle: 'var(--mantine-color-dark-4)',
    },
  };

type ColumnKey = 'inbox' | 'next' | 'in_progress' | 'waiting' | 'done' | 'cancelled';
type ColumnDef = { readonly titleKey: string; readonly color: SafeColor; readonly icon: string };

const columns: Readonly<Record<ColumnKey, ColumnDef>> = Object.freeze({
  inbox: { titleKey: 'tasks.columns.inbox', color: 'gray', icon: '📥' },
  next: { titleKey: 'tasks.columns.next', color: 'blue', icon: '📋' },
  in_progress: { titleKey: 'tasks.columns.inProgress', color: 'yellow', icon: '⚡' },
  waiting: { titleKey: 'tasks.columns.waiting', color: 'orange', icon: '⏳' },
  done: { titleKey: 'tasks.columns.done', color: 'green', icon: '✅' },
  cancelled: { titleKey: 'tasks.columns.cancelled', color: 'gray', icon: '❌' },
} as const);

const TaskBoard: React.FC = () => {
  const { t } = useTranslation();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { activeSpaceId } = useStore();
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useTasks(activeSpaceId ?? '', !!activeSpaceId);
  const updateTaskMutation = useUpdateTask();

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !activeSpaceId) return;
    try {
      await api.createTask(activeSpaceId, newTaskTitle, null);
      setNewTaskTitle('');
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.bySpace(activeSpaceId) });
    } catch (error) {
      logger.error('Failed to create task:', error as Error);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const task = tasks.find((t) => t.id === draggableId);
    if (task) {
      // Cast destination.droppableId to the allowed union type as we control the droppables
      const newStatus = destination.droppableId as Task['status'];
      const updatedTask = { ...task, status: newStatus };
      try {
        await updateTaskMutation.mutateAsync(updatedTask);
      } catch (error) {
        logger.error('Failed to update task:', error as Error);
      }
    }
  };

  return (
    <Stack gap="md">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>{t('tasks.taskBoard')}</Title>
            <Text size="sm" c="dimmed">
              {t('tasks.dragDrop')}
            </Text>
          </div>
          <Group gap="xs">
            <TextInput
              placeholder="New task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              style={{ minWidth: 300 }}
            />
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreateTask}>
              Add Task
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          style={{
            display: 'flex',
            gap: 'var(--mantine-spacing-md)',
            overflowX: 'auto',
            paddingBottom: 'var(--mantine-spacing-md)',
          }}
        >
          {Object.entries(columns).map(([columnId, column]) => {
            const columnTasks = tasks.filter((task) => task.status === columnId);
            // Validate color against whitelist to prevent CSS injection
            const safeColor: SafeColor = SAFE_COLORS.has(column.color as SafeColor)
              ? (column.color as SafeColor)
              : 'gray';
            // Validate icon to prevent XSS
            const safeIcon = typeof column.icon === 'string' ? column.icon : '📦';
            const tokens = colorTokenMap[safeColor] ?? colorTokenMap.gray;
            return (
              <Droppable droppableId={columnId} key={columnId}>
                {(provided, snapshot) => (
                  <Paper
                    shadow={snapshot.isDraggingOver ? 'md' : 'sm'}
                    p="md"
                    radius="md"
                    withBorder
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: '0 0 320px',
                      minHeight: 500,
                      backgroundColor: snapshot.isDraggingOver ? tokens.bgActive : tokens.bgIdle,
                      borderColor: snapshot.isDraggingOver ? tokens.borderActive : tokens.borderIdle,
                      transition: 'background-color 0.2s, border-color 0.2s',
                    }}
                  >
                    <Stack gap="md">
                      {/* Column Header */}
                      <Group justify="space-between" align="center">
                        <Group gap="xs">
                          <span style={{ fontSize: '1.2rem' }} aria-hidden="true">
                            {safeIcon}
                          </span>
                          <Text fw={600} size="md">
                            {t(column.titleKey)}
                          </Text>
                        </Group>
                        <Badge variant="light" color={safeColor} size="sm">
                          {columnTasks.length}
                        </Badge>
                      </Group>

                      {/* Tasks */}
                      <Stack gap="xs">
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <Paper
                                shadow={snapshot.isDragging ? 'xl' : 'xs'}
                                p="sm"
                                radius="md"
                                withBorder
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                role="article"
                                aria-label={`Task: ${task.title}, Status: ${t(column.titleKey)}${task.priority ? `, Priority: ${task.priority}` : ''}`}
                                style={{
                                  ...provided.draggableProps.style,
                                  backgroundColor: snapshot.isDragging
                                    ? 'var(--mantine-color-dark-6)'
                                    : 'var(--mantine-color-dark-7)',
                                  backdropFilter: snapshot.isDragging ? 'blur(10px)' : 'none',
                                  border: snapshot.isDragging
                                    ? `1px solid var(--mantine-color-${safeColor}-5)`
                                    : '1px solid var(--mantine-color-dark-4)',
                                  cursor: 'grab',
                                  transition: 'border 0.2s, box-shadow 0.2s, background-color 0.2s',
                                  transform: snapshot.isDragging
                                    ? `${provided.draggableProps.style?.transform} scale(1.02)`
                                    : provided.draggableProps.style?.transform,
                                }}
                              >
                                <Group gap="xs" wrap="nowrap">
                                  <div {...provided.dragHandleProps}>
                                    <IconGripVertical size={16} color="var(--mantine-color-gray-5)" />
                                  </div>
                                  <Stack gap={4} style={{ flex: 1 }}>
                                    <Text size="sm" fw={500} lineClamp={2}>
                                      {task.title}
                                    </Text>
                                    {task.description && (
                                      <Text size="xs" c="dimmed" lineClamp={1}>
                                        {task.description}
                                      </Text>
                                    )}
                                    {(task.due_at || task.priority) && (
                                      <Group gap="xs" mt={4}>
                                        {task.due_at && (
                                          <Tooltip label="Deadline">
                                            <Badge
                                              variant="light"
                                              color="orange"
                                              size="xs"
                                              leftSection={<IconCalendar size={10} />}
                                            >
                                              {new Date(task.due_at).toLocaleDateString()}
                                            </Badge>
                                          </Tooltip>
                                        )}
                                        {task.priority && (
                                          <Tooltip label="Priority">
                                            <Badge
                                              variant="light"
                                              color="red"
                                              size="xs"
                                              leftSection={<IconFlag size={10} />}
                                            >
                                              {task.priority}
                                            </Badge>
                                          </Tooltip>
                                        )}
                                      </Group>
                                    )}
                                  </Stack>
                                </Group>
                              </Paper>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {columnTasks.length === 0 && (
                          <Text size="sm" c="dimmed" ta="center" py="xl">
                            No tasks
                          </Text>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </Stack>
  );
};

export default TaskBoard;
