import React from 'react';
import { Table, Badge, ActionIcon, Group, Text, Tooltip, ScrollArea } from '@mantine/core';
import { IconEye, IconTrash, IconRefresh } from '@tabler/icons-react';
import { OcrJob, statusColors } from './types';

interface OcrJobListProps {
  jobs: OcrJob[];
  onView: (job: OcrJob) => void;
  onRetry: (jobId: string) => void;
  onDelete: (jobId: string) => void;
}

/**
 * OCR Job List - Displays list of OCR processing jobs
 */
export const OcrJobList: React.FC<OcrJobListProps> = ({ jobs, onView, onRetry, onDelete }) => {
  if (jobs.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No OCR jobs yet. Upload an image to get started.
      </Text>
    );
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const rows = jobs.map((job) => (
    <Table.Tr key={job.id}>
      <Table.Td>
        <Text size="sm" lineClamp={1}>
          {job.image_path.split('/').pop()}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={statusColors[job.status]} variant="light">
          {job.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        {job.confidence ? (
          <Text size="sm">{(job.confidence * 100).toFixed(1)}%</Text>
        ) : (
          <Text size="sm" c="dimmed">
            -
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {formatDate(job.created_at)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {job.status === 'completed' && (
            <Tooltip label="View Result">
              <ActionIcon variant="subtle" onClick={() => onView(job)}>
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          {job.status === 'failed' && (
            <Tooltip label="Retry">
              <ActionIcon variant="subtle" color="blue" onClick={() => onRetry(job.id)}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Delete">
            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(job.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <ScrollArea>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Image</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Confidence</Table.Th>
            <Table.Th>Created</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  );
};
