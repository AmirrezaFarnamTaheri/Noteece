import React, { useState } from 'react';
import { Paper, Text, Group, Textarea, Button, Stack } from '@mantine/core';
import { IconNotebook, IconCheck } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useActiveSpace } from '../../hooks/useActiveSpace';
import { showSuccess, showError } from '../../utils/notifications';
import classes from '../Dashboard.module.css';
import { logger } from '../../utils/logger';

export const QuickCapture: React.FC = () => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { activeSpaceId } = useActiveSpace();

  const handleQuickNote = async () => {
    if (!note.trim() || !activeSpaceId) return;

    setLoading(true);
    try {
      const title = note.split('\n')[0].slice(0, 50) || 'Quick Note';
      await invoke('create_note_cmd', {
        spaceId: activeSpaceId,
        title,
        contentMd: note,
      });
      showSuccess({
        message: 'Quick note created successfully!',
      });
      setNote('');
    } catch (error) {
      showError({
        message: 'Failed to create quick note',
      });
      logger.error('Error creating quick note:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCapture = async () => {
    if (!note.trim() || !activeSpaceId) return;

    setLoading(true);
    try {
      await invoke('create_task_cmd', {
        spaceId: activeSpaceId,
        title: note.trim(),
        description: null,
      });
      showSuccess({
        message: 'Task created successfully!',
      });
      setNote('');
    } catch (error) {
      showError({
        message: 'Failed to create task',
      });
      logger.error('Error creating task:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper style={{ border: '1px solid #e0e0e0' }} p="md" radius="md" shadow="xs">
      <Group mb="md">
        <IconNotebook size={20} />
        <Text className={classes.title} fz="xs" c="dimmed">
          Quick Capture
        </Text>
      </Group>

      <Stack gap="sm">
        <Textarea
          placeholder="Capture a quick thought, task, or note..."
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
          minRows={3}
          maxRows={6}
          autosize
        />

        <Group justify="flex-end" gap="xs">
          <Button
            size="xs"
            variant="light"
            onClick={handleTaskCapture}
            disabled={!note.trim() || loading}
            loading={loading}
          >
            Add as Task
          </Button>
          <Button
            size="xs"
            leftSection={<IconCheck size={16} />}
            onClick={handleQuickNote}
            disabled={!note.trim() || loading}
            loading={loading}
          >
            Save as Note
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};
