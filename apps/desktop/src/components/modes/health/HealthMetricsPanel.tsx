/**
 * Health Metrics Panel - Display and add health metrics
 */

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Select,
  NumberInput,
  Button,
  Modal,
  Table,
  Badge,
  Textarea,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { IconPlus, IconActivity } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { logger } from '@/utils/logger';

export interface HealthMetric {
  id: string;
  space_id: string;
  metric_type: string;
  value: number;
  unit: string;
  notes?: string;
  recorded_at: number;
  created_at: number;
}

export const METRIC_TYPES = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'steps', label: 'Steps', unit: 'steps' },
  { value: 'sleep', label: 'Sleep', unit: 'hours' },
  { value: 'water', label: 'Water Intake', unit: 'ml' },
  { value: 'calories', label: 'Calories', unit: 'kcal' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'blood_pressure_sys', label: 'Blood Pressure (Systolic)', unit: 'mmHg' },
  { value: 'blood_pressure_dia', label: 'Blood Pressure (Diastolic)', unit: 'mmHg' },
  { value: 'mood', label: 'Mood', unit: 'score' },
  { value: 'energy', label: 'Energy Level', unit: 'score' },
];

interface HealthMetricsPanelProps {
  spaceId: string;
  metrics: HealthMetric[];
  onMetricAdded: () => void;
}

export const HealthMetricsPanel: React.FC<HealthMetricsPanelProps> = ({
  spaceId,
  metrics,
  onMetricAdded,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [value, setValue] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [recordedAt, setRecordedAt] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUnitForType = (type: string) => {
    return METRIC_TYPES.find(m => m.value === type)?.unit || '';
  };

  const handleSubmit = async () => {
    if (!selectedType || value === undefined) return;

    setIsSubmitting(true);
    try {
      await invoke('create_health_metric_cmd', {
        spaceId,
        metricType: selectedType,
        value,
        unit: getUnitForType(selectedType),
        notes: notes || null,
        recordedAt: Math.floor(recordedAt.getTime() / 1000),
      });

      notifications.show({
        title: 'Metric Added',
        message: 'Health metric recorded successfully',
        color: 'green',
      });

      setModalOpen(false);
      setSelectedType('');
      setValue(0);
      setNotes('');
      setRecordedAt(new Date());
      onMetricAdded();
    } catch (error) {
      logger.error('Failed to add metric', error as Error);
      notifications.show({
        title: 'Error',
        message: 'Failed to add metric',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get recent metrics (last 10)
  const recentMetrics = metrics.slice(0, 10);

  return (
    <>
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconActivity size={20} />
            <Title order={5}>Health Metrics</Title>
          </Group>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setModalOpen(true)}
          >
            Add Metric
          </Button>
        </Group>

        {recentMetrics.length === 0 ? (
          <Text c="dimmed" ta="center" py="lg">
            No metrics recorded yet
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Value</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentMetrics.map((metric) => (
                <Table.Tr key={metric.id}>
                  <Table.Td>
                    <Badge variant="light">
                      {METRIC_TYPES.find(m => m.value === metric.metric_type)?.label || metric.metric_type}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {metric.value} {metric.unit}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(metric.recorded_at * 1000).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Health Metric"
      >
        <Stack gap="md">
          <Select
            label="Metric Type"
            placeholder="Select type"
            value={selectedType}
            onChange={(v) => setSelectedType(v || '')}
            data={METRIC_TYPES}
            required
          />

          <NumberInput
            label="Value"
            placeholder="Enter value"
            value={value}
            onChange={(v) => setValue(typeof v === 'number' ? v : 0)}
            suffix={getUnitForType(selectedType)}
            required
          />

          <DateTimePicker
            label="Recorded At"
            value={recordedAt}
            onChange={(d) => setRecordedAt(d || new Date())}
          />

          <Textarea
            label="Notes (optional)"
            placeholder="Any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
              disabled={!selectedType}
            >
              Add Metric
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

