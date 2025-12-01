import React from 'react';
import { Table, Text, ScrollArea, Badge } from '@mantine/core';
import { HealthMetric } from './types';

interface MetricTableProps {
  metrics: HealthMetric[];
  limit?: number;
}

/**
 * Metric Table - Displays recent health metrics in a table
 */
export const MetricTable: React.FC<MetricTableProps> = ({ metrics, limit = 10 }) => {
  const displayMetrics = metrics.sort((a, b) => b.recorded_at - a.recorded_at).slice(0, limit);

  if (displayMetrics.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No health metrics recorded yet
      </Text>
    );
  }

  const rows = displayMetrics.map((metric) => (
    <Table.Tr key={metric.id}>
      <Table.Td>
        <Badge color={getMetricColor(metric.metric_type)} variant="light">
          {metric.metric_type.replaceAll('_', ' ')}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text fw={500}>
          {metric.value} {metric.unit}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {formatDate(metric.recorded_at)}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {metric.notes || '-'}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <ScrollArea>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Type</Table.Th>
            <Table.Th>Value</Table.Th>
            <Table.Th>Recorded</Table.Th>
            <Table.Th>Notes</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  );
};

const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString();
};

const getMetricColor = (type: string): string => {
  // Use switch to avoid object injection sink
  switch (type) {
    case 'weight':
      return 'blue';
    case 'blood_pressure':
    case 'blood_pressure_sys':
    case 'blood_pressure_dia':
      return 'red';
    case 'heart_rate':
      return 'pink';
    case 'steps':
      return 'green';
    case 'sleep_hours':
    case 'sleep':
      return 'violet';
    case 'water_intake':
    case 'water':
      return 'cyan';
    case 'exercise_minutes':
      return 'orange';
    case 'calories':
      return 'yellow';
    default:
      return 'gray';
  }
};
