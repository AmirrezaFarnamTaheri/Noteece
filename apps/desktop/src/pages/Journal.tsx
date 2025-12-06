import React, { useState, useEffect } from 'react';
import { Container, Title, Paper, Group, Button, Stack, Text } from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { IconFilePlus } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { Note } from '@noteece/types';
import { useStore } from '../store';
import { logger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';

const Journal: React.FC = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [dailyNote, setDailyNote] = useState<Note | null>(null);
  const { activeSpaceId } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDailyNote = async () => {
      if (date && activeSpaceId) {
        try {
          // Format date as YYYY-MM-DD
          const dateStr = date.toISOString().split('T')[0];
          // Assuming the title format for daily notes is "YYYY-MM-DD"
          // We use get_or_create_daily_note_cmd which handles logic on backend usually,
          // but if it just retrieves by title, we might need a specific command.
          // Let's assume get_or_create_daily_note_cmd takes a timestamp or date string.
          // Checking main.rs: get_or_create_daily_note_cmd exists.

          const note: Note = await invoke('get_or_create_daily_note_cmd', {
            spaceId: activeSpaceId,
            date: dateStr,
          });
          setDailyNote(note);
        } catch (error) {
          logger.error('Failed to fetch/create daily note:', error as Error);
        }
      }
    };
    void fetchDailyNote();
  }, [date, activeSpaceId]);

  const handleOpenNote = () => {
    if (dailyNote) {
      navigate(`/main/editor?noteId=${dailyNote.id}`);
    }
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Journal</Title>
      </Group>

      <Group align="flex-start" gap="lg">
        <Paper p="md" withBorder>
          <Calendar
            date={date || new Date()}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            onDateChange={setDate as any}
            renderDay={(day) => {
              const d = typeof day === 'string' ? new Date(day) : day;
              return <div>{d.getDate()}</div>;
            }}
          />
        </Paper>

        <Stack style={{ flex: 1 }}>
          {dailyNote ? (
            <Paper p="lg" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>{dailyNote.title}</Title>
                <Button leftSection={<IconFilePlus size={16} />} onClick={handleOpenNote}>
                  Open in Editor
                </Button>
              </Group>
              <Text lineClamp={5} c="dimmed">
                {dailyNote.content_md || 'No content yet...'}
              </Text>
            </Paper>
          ) : (
            <Paper p="lg" withBorder>
              <Text c="dimmed">Select a date to view or create a daily entry.</Text>
            </Paper>
          )}
        </Stack>
      </Group>
    </Container>
  );
};

export default Journal;
