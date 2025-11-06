import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, Text, Badge, Group, Button, Modal, TextInput, Textarea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Task, TaskStatus } from '@noteece/types';
import { invoke } from '@tauri-apps/api/tauri';
import { updateTask } from '@/services/api';
import classes from './Kanban.module.css';

interface KanbanProps {
  tasks: Task[];
  projectId: string;
  spaceId: string;
}

const Kanban: React.FC<KanbanProps> = ({ tasks: initialTasks, projectId, spaceId }) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [opened, { open, close }] = useDisclosure(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  const columns: Record<TaskStatus, string> = {
    inbox: 'Inbox',
    next: 'Next',
    in_progress: 'In Progress',
    waiting: 'Waiting',
    done: 'Done',
    cancelled: 'Cancelled',
  };

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    const sourceColumn = source.droppableId as TaskStatus;
    const destColumn = destination.droppableId as TaskStatus;

    const updatedTasks = [...tasks];
    const [movedTask] = updatedTasks.splice(source.index, 1);
    const updatedTask = { ...movedTask, status: destColumn };
    updatedTasks.splice(destination.index, 0, updatedTask);

    setTasks(updatedTasks);

    try {
      await updateTask(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert the state if the API call fails
      setTasks(tasks);
    }
  };

  const handleCreateTask = async () => {
    try {
      const newTask: Task = await invoke('create_task_cmd', {
        spaceId,
        title: newTaskTitle,
        description: newTaskDescription,
        projectId,
      });
      setTasks([...tasks, newTask]);
      setNewTaskTitle('');
      setNewTaskDescription('');
      close();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <div className={classes.kanbanContainer}>
      <Button onClick={open} className={classes.createTaskButton}>
        Create Task
      </Button>
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
        <div className={classes.columnsContainer}>
          {Object.entries(columns).map(([columnId, columnTitle]) => (
            <Droppable droppableId={columnId} key={columnId}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={classes.column}>
                  <Card shadow="sm" p="lg" radius="md" withBorder>
                    <Text weight={500}>{columnTitle}</Text>
                    <div className={classes.taskList}>
                      {tasks
                        .filter((task) => task.status === columnId)
                        .map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={classes.taskCard}
                              >
                                <Card shadow="sm" p="sm" radius="md" withBorder mt="sm">
                                  <Text>{task.title}</Text>
                                  <Badge color="blue" variant="light">
                                    {task.priority}
                                  </Badge>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  </Card>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default Kanban;
