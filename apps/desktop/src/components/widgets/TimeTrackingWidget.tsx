/**
 * TimeTrackingWidget - Display and manage time tracking entries
 * Features:
 * - Show currently running timer
 * - Display recent time entries
 * - Quick start/stop timer for tasks
 * - Time statistics summary
 */

import { Paper, Title, Text, Group, Stack, Badge, Button, ActionIcon, Tooltip } from '@mantine/core';
import { IconClock, IconPlayerPlay, IconPlayerStop, IconTrash } from '@tabler/icons-react';
import { useStore } from '../../store';
import { notifications } from '@mantine/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRunningEntries, getRecentTimeEntries, stopTimeEntry, deleteTimeEntry } from '../../services/api';
import { useEffect, useState } from 'react';

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function TimeTrackingWidget() {
  const { activeSpaceId } = useStore();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState(0);

  const { data: runningEntries = [] } = useQuery({
    queryKey: ['running-entries', activeSpaceId],
    queryFn: () => (activeSpaceId ? getRunningEntries(activeSpaceId) : Promise.resolve([])),
    enabled: !!activeSpaceId,
    refetchInterval: 1000, // Update every second for running timers
  });

  const { data: recentEntries = [] } = useQuery({
    queryKey: ['recent-time-entries', activeSpaceId],
    queryFn: () => (activeSpaceId ? getRecentTimeEntries(activeSpaceId, 10) : Promise.resolve([])),
    enabled: !!activeSpaceId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const stopTimerMutation = useMutation({
    mutationFn: (entryId: string) => stopTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-entries'] });
      queryClient.invalidateQueries({ queryKey: ['recent-time-entries'] });
      notifications.show({
        title: 'Timer stopped',
        message: 'Time entry has been recorded',
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

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-entries'] });
      queryClient.invalidateQueries({ queryKey: ['recent-time-entries'] });
      notifications.show({
        title: 'Entry deleted',
        message: 'Time entry has been removed',
        color: 'green',
      });
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete entry',
        color: 'red',
      });
    },
  });

  const runningEntry = runningEntries[0]; // Only one entry can run at a time

  // Calculate elapsed time for running entry
  useEffect(() => {
    if (runningEntry) {
      const interval = window.setInterval(() => {
        const now = Math.floor(Date.now() / 1000);
        setElapsedTime(now - runningEntry.started_at);
      }, 1000);

      return () => clearInterval(interval);
    }
    setElapsedTime(0);
    return;
  }, [runningEntry]);

  const totalTime = recentEntries
    .filter((entry) => !entry.is_running && entry.duration_seconds)
    .reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0);

  return (
    <Paper withBorder p="md" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={4}>Time Tracking</Title>
        <IconClock size={24} opacity={0.6} />
      </Group>

      {runningEntry ? (
        <Paper withBorder p="md" mb="md" style={{ backgroundColor: 'var(--mantine-color-green-0)' }}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600}>
              Currently Tracking
            </Text>
            <Badge color="green" variant="filled" size="sm">
              RUNNING
            </Badge>
          </Group>
          <Text size="xl" fw={700} mb="xs">
            {formatDuration(elapsedTime)}
          </Text>
          {runningEntry.description && (
            <Text size="sm" c="dimmed" mb="xs">
              {runningEntry.description}
            </Text>
          )}
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Started at {formatTimestamp(runningEntry.started_at)}
            </Text>
            <Button
              size="xs"
              leftSection={<IconPlayerStop size={14} />}
              color="red"
              onClick={() => stopTimerMutation.mutate(runningEntry.id)}
              loading={stopTimerMutation.isPending}
            >
              Stop
            </Button>
          </Group>
        </Paper>
      ) : (
        <Paper withBorder p="md" mb="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
          <Group>
            <IconPlayerPlay size={20} opacity={0.5} />
            <Text size="sm" c="dimmed">
              No timer running
            </Text>
          </Group>
        </Paper>
      )}

      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={500}>
          Recent Entries
        </Text>
        <Text size="xs" c="dimmed">
          Total: {formatDuration(totalTime)}
        </Text>
      </Group>

      {recentEntries.length === 0 ? (
        <Stack align="center" justify="center" h={120}>
          <IconClock size={48} color="var(--mantine-color-gray-5)" opacity={0.5} />
          <Text size="sm" c="dimmed" ta="center">
            No time entries yet
          </Text>
        </Stack>
      ) : (
        <Stack gap="xs" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {recentEntries.slice(0, 8).map((entry) => (
            <Group
              key={entry.id}
              justify="space-between"
              p="xs"
              style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
            >
              <div style={{ flex: 1 }}>
                <Group gap="xs">
                  <Badge size="xs" variant="light">
                    {entry.is_running ? 'Running' : formatDuration(entry.duration_seconds || 0)}
                  </Badge>
                  {entry.description && (
                    <Text size="sm" lineClamp={1}>
                      {entry.description}
                    </Text>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {formatTimestamp(entry.started_at)}
                  {entry.ended_at && ` - ${formatTimestamp(entry.ended_at)}`}
                </Text>
              </div>
              {!entry.is_running && (
                <Tooltip label="Delete entry">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => deleteEntryMutation.mutate(entry.id)}
                    loading={deleteEntryMutation.isPending}
                    aria-label={`Delete time entry ${entry.description || 'entry'}`}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
