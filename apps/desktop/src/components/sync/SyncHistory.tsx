import React from 'react';
import { Table, Badge, Group, Text, Tooltip, ScrollArea } from '@mantine/core';
import { IconArrowUp, IconArrowDown, IconCheck, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { SyncHistoryEntry, statusColors } from './types';

interface SyncHistoryProps {
  history: SyncHistoryEntry[];
  limit?: number;
}

const DirectionIcon: React.FC<{ direction: 'push' | 'pull' }> = ({ direction }) => {
  return direction === 'push' ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />;
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'success': {
      return <IconCheck size={16} color="green" />;
    }
    case 'partial': {
      return <IconAlertTriangle size={16} color="orange" />;
    }
    case 'failed': {
      return <IconX size={16} color="red" />;
    }
    default: {
      return null;
    }
  }
};

const formatDuration = (start: number, end: number): string => {
  const duration = end - start;
  if (duration < 60) return `${duration}s`;
  return `${Math.floor(duration / 60)}m ${duration % 60}s`;
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Sync History Component - Shows recent sync operations
 */
export const SyncHistory: React.FC<SyncHistoryProps> = ({ history, limit = 20 }) => {
  const displayHistory = limit ? history.slice(0, limit) : history;

  if (displayHistory.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No sync history yet
      </Text>
    );
  }

  const rows = displayHistory.map((entry) => (
    <Table.Tr key={entry.id}>
      <Table.Td>
        <Group gap="xs">
          <DirectionIcon direction={entry.direction} />
          <Text size="sm">{entry.device_name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{entry.entities_synced} items</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDuration(entry.started_at, entry.completed_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <StatusIcon status={entry.status} />
          <Badge size="sm" color={statusColors[entry.status]} variant="light">
            {entry.status}
          </Badge>
        </Group>
      </Table.Td>
      <Table.Td>
        <Tooltip label={new Date(entry.completed_at * 1000).toLocaleString()}>
          <Text size="sm" c="dimmed">
            {formatTime(entry.completed_at)}
          </Text>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <ScrollArea>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Device</Table.Th>
            <Table.Th>Items</Table.Th>
            <Table.Th>Duration</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Time</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  );
};
