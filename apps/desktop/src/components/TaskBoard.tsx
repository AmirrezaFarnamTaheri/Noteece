import React, { useState, useEffect } from 'react';
import { Button, TextInput, Group, Paper, Title, Stack, Text, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import type { DropResult } from 'react-beautiful-dnd';
import { invoke } from '@tauri-apps/api/core';
import { Task } from './types';
import { useStore } from '../store';
import { IconPlus, IconGripVertical, IconCalendar, IconFlag } from '@tabler/icons-react';

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
type ColumnKey = 'inbox' | 'todo' | 'in_progress' | 'done';
type ColumnDef = { readonly title: string; readonly color: SafeColor; readonly icon: string };

const columns: Readonly<Record<ColumnKey, ColumnDef>> = Object.freeze({
  inbox: { title: 'Inbox', color: 'gray', icon: '📥' },
  todo: { title: 'To Do', color: 'blue', icon: '📋' },
  in_progress: { title: 'In Progress', color: 'yellow', icon: '⚡' },
  done: { title: 'Done', color: 'green', icon: '✅' },
} as const);

const TaskBoard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { activeSpaceId } = useStore();

  const fetchTasks = async () => {
    if (!activeSpaceId) return;
    try {
      const tasksData: Task[] = await invoke('get_all_tasks_in_space_cmd', { spaceId: activeSpaceId });
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  useEffect(() => {
    void fetchTasks();
  }, [activeSpaceId]);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !activeSpaceId) return;
    try {
      await invoke('create_task_cmd', { spaceId: activeSpaceId, title: newTaskTitle, description: null });
      setNewTaskTitle('');
      fetchTasks(); // Refresh the list
    } catch (error) {
      console.error('Failed to create task:', error);
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
      const updatedTask = { ...task, status: destination.droppableId };
      try {
        await invoke('update_task_cmd', { task: updatedTask });
        fetchTasks(); // Refresh the list
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    }
  };

  return (
    <Stack gap="md">
      {/* Header */}
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Task Board</Title>
            <Text size="sm" c="dimmed">
              Drag and drop tasks between columns
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
        <Group align="flex-start" gap="md" style={{ overflowX: 'auto' }}>
          {Object.entries(columns).map(([columnId, column]) => {
            const columnTasks = tasks.filter((task) => task.status === columnId);
            // Validate color against whitelist to prevent CSS injection
            const safeColor: SafeColor = SAFE_COLORS.has(column.color as SafeColor)
              ? (column.color as SafeColor)
              : 'gray';
            // Validate icon to prevent XSS
            const safeIcon = typeof column.icon === 'string' ? column.icon : '📦';
            return (
              <Droppable droppableId={columnId} key={columnId}>
                {(provided, snapshot) => (
                  <Paper
                    shadow="sm"
                    p="md"
                    radius="md"
                    withBorder
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      width: 300,
                      minHeight: 500,
                      backgroundColor: snapshot.isDraggingOver
                        ? `var(--mantine-color-${safeColor}-0)`
                        : 'var(--mantine-color-gray-0)',
                      transition: 'background-color 0.2s',
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
                            {column.title}
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
                                shadow="xs"
                                p="sm"
                                radius="md"
                                withBorder
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  backgroundColor: snapshot.isDragging
                                    ? 'var(--mantine-color-white)'
                                    : 'var(--mantine-color-white)',
                                  border: snapshot.isDragging
                                    ? `2px solid var(--mantine-color-${safeColor}-6)`
                                    : '1px solid var(--mantine-color-gray-3)',
                                  cursor: 'grab',
                                  transition: 'border 0.2s',
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
                                    {(task.deadline || task.priority) && (
                                      <Group gap="xs" mt={4}>
                                        {task.deadline && (
                                          <Tooltip label="Deadline">
                                            <Badge
                                              variant="light"
                                              color="orange"
                                              size="xs"
                                              leftSection={<IconCalendar size={10} />}
                                            >
                                              {new Date(task.deadline * 1000).toLocaleDateString()}
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
        </Group>
      </DragDropContext>
    </Stack>
  );
};

export default TaskBoard;
