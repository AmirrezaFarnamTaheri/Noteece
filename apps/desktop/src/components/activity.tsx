import { Paper, Text, Group, Timeline, useMantineTheme } from '@mantine/core';
import { IconArrowUpRight, IconGitCommit } from '@tabler/icons-react';
import React, { useState, useEffect } from 'react';
import classes from './activity.module.css';
import { getRecentNotes } from '../services/api';
import { useStore } from '../store';
import { Note } from '@noteece/types';
import { formatTimestamp } from '../utils/dateUtils';
import { logger } from '../utils/logger';

interface ActivityProperties {
  icon: React.ReactNode;
  title: string;
}

export const Activity: React.FC<ActivityProperties> = ({ title }) => {
  const theme = useMantineTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const { activeSpaceId } = useStore();

  useEffect(() => {
    const fetchNotes = async () => {
      if (activeSpaceId) {
        try {
          const recentNotes = await getRecentNotes(activeSpaceId, 5);
          setNotes(recentNotes);
        } catch (error) {
          logger.error('Error fetching recent notes:', error as Error);
        }
      }
    };
    void fetchNotes();
  }, [activeSpaceId]);

  return (
    <Paper
      style={{
        border: '1px solid #e0e0e0',
      }}
      p="md"
      radius="md"
      shadow="xs"
    >
      <Group justify="space-between">
        <Text className={classes.title} fz="xs" c="dimmed">
          {title}
        </Text>
        <IconArrowUpRight size={24} color={theme.colors.gray[6]} />
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <Text className={classes.value}>{notes.length}</Text>
      </Group>

      <Timeline active={notes.length} bulletSize={24} lineWidth={2} mt="xl">
        {notes.map((note) => (
          <Timeline.Item
            key={note.id.toString()}
            bullet={<IconGitCommit size={12} />}
            title={note.title}
            lineVariant="dashed"
          >
            <Text c="dimmed" size="sm">
              Modified on {formatTimestamp(note.modified_at)}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Paper>
  );
};
