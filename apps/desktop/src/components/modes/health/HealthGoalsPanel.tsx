/**
 * Health Goals Panel - Track health-related goals
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
  Progress,
  Badge,
  TextInput,
} from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconPlus, IconTarget, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { logger } from '@/utils/logger';
import { METRIC_TYPES } from './HealthMetricsPanel';

export interface HealthGoal {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string;
  category: string;
  start_date: number;
  target_date?: number;
  is_completed: boolean;
  created_at: number;
}

interface HealthGoalsPanelProps {
  spaceId: string;
  goals: HealthGoal[];
  onGoalAdded: () => void;
  onGoalUpdated: () => void;
}

export const HealthGoalsPanel: React.FC<HealthGoalsPanelProps> = ({
  spaceId,
  goals,
  onGoalAdded,
  onGoalUpdated,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [metricType, setMetricType] = useState<string>('');
  const [target, setTarget] = useState<number>(0);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUnitForType = (type: string) => {
    return METRIC_TYPES.find(m => m.value === type)?.unit || '';
  };

  const handleSubmit = async () => {
    if (!title || !metricType || !target) return;

    setIsSubmitting(true);
    try {
      await invoke('create_goal_cmd', {
        spaceId,
        title,
        description: metricType, // Store metric type in description
        target,
        current: 0,
        unit: getUnitForType(metricType),
        category: 'health',
        startDate: Math.floor(Date.now() / 1000),
        targetDate: targetDate ? Math.floor(targetDate.getTime() / 1000) : null,
      });

      notifications.show({
        title: 'Goal Created',
        message: 'Health goal added successfully',
        color: 'green',
      });

      setModalOpen(false);
      setTitle('');
      setMetricType('');
      setTarget(0);
      setTargetDate(null);
      onGoalAdded();
    } catch (error) {
      logger.error('Failed to create goal', error as Error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create goal',
        color: 'red',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const markComplete = async (goalId: string) => {
    try {
      await invoke('complete_goal_cmd', { goalId });
      onGoalUpdated();
      notifications.show({
        title: 'Goal Completed',
        message: 'Congratulations on achieving your goal!',
        color: 'green',
        icon: <IconCheck />,
      });
    } catch (error) {
      logger.error('Failed to complete goal', error as Error);
    }
  };

  const activeGoals = goals.filter(g => !g.is_completed && g.category === 'health');

  return (
    <>
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconTarget size={20} />
            <Title order={5}>Health Goals</Title>
          </Group>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setModalOpen(true)}
          >
            Add Goal
          </Button>
        </Group>

        {activeGoals.length === 0 ? (
          <Text c="dimmed" ta="center" py="lg">
            No active health goals
          </Text>
        ) : (
          <Stack gap="sm">
            {activeGoals.map((goal) => {
              const progress = goal.target > 0 
                ? Math.min((goal.current / goal.target) * 100, 100) 
                : 0;
              
              return (
                <Card key={goal.id} withBorder p="sm">
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{goal.title}</Text>
                    <Badge color={progress >= 100 ? 'green' : 'blue'} size="sm">
                      {goal.current} / {goal.target} {goal.unit}
                    </Badge>
                  </Group>
                  <Progress 
                    value={progress} 
                    color={progress >= 100 ? 'green' : 'blue'}
                    size="md"
                    mb="xs"
                  />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {goal.target_date 
                        ? `Due: ${new Date(goal.target_date * 1000).toLocaleDateString()}`
                        : 'No deadline'
                      }
                    </Text>
                    {progress >= 100 && (
                      <Button
                        size="xs"
                        variant="light"
                        color="green"
                        onClick={() => void markComplete(goal.id)}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Health Goal"
      >
        <Stack gap="md">
          <TextInput
            label="Goal Title"
            placeholder="e.g., Lose 5kg, Walk 10k steps daily"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
          />

          <Select
            label="Metric Type"
            placeholder="What are you tracking?"
            value={metricType}
            onChange={(v) => setMetricType(v || '')}
            data={METRIC_TYPES}
            required
          />

          <NumberInput
            label="Target"
            placeholder="Enter target value"
            value={target}
            onChange={(v) => setTarget(typeof v === 'number' ? v : 0)}
            suffix={getUnitForType(metricType)}
            required
          />

          <DatePicker
            label="Target Date (optional)"
            placeholder="When do you want to achieve this?"
            value={targetDate}
            onChange={setTargetDate}
            minDate={new Date()}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
              disabled={!title || !metricType || !target}
            >
              Create Goal
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

