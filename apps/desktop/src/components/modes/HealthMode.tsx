import React, { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Container,
  Title,
  Card,
  Text,
  Button,
  Group,
  Stack,
  Select,
  NumberInput,
  Grid,
  Modal,
  Badge,
  Table,
  Center,
  Loader,
  Progress,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { IconPlus, IconTarget, IconTrendingUp, IconActivity } from '@tabler/icons-react';
import { logger } from '@/utils/logger';

interface HealthMetric {
  id: string;
  space_id: string;
  metric_type: string;
  value: number;
  unit: string;
  notes?: string;
  recorded_at: number;
  created_at: number;
}

// Maps to Core-RS Goal struct
interface Goal {
  id: string;
  space_id: string;
  title: string;
  description?: string; // We store metric_type here for health goals
  target: number;
  current: number;
  unit: string;
  category: string;
  start_date: number;
  target_date?: number;
  is_completed: boolean;
  created_at: number;
  updated_at: number;
}

const metricTypes = [
  { value: 'weight', label: 'Weight' },
  { value: 'blood_pressure', label: 'Blood Pressure' },
  { value: 'heart_rate', label: 'Heart Rate' },
  { value: 'steps', label: 'Steps' },
  { value: 'sleep_hours', label: 'Sleep Hours' },
  { value: 'water_intake', label: 'Water Intake' },
  { value: 'exercise_minutes', label: 'Exercise Minutes' },
  { value: 'calories', label: 'Calories' },
];

const HealthMode: React.FC<{ spaceId: string }> = ({ spaceId }) => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [goalModalOpened, setGoalModalOpened] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState<string>('weight');

  // Metric Form state
  const [formMetricType, setFormMetricType] = useState('weight');
  const [formValue, setFormValue] = useState<number>(0);
  const [formUnit, setFormUnit] = useState('kg');
  const [formRecordedAt, setFormRecordedAt] = useState<Date>(new Date());

  // Goal Form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState<number>(0);
  const [goalMetricType, setGoalMetricType] = useState('weight');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsData, allGoals] = await Promise.all([
        invoke<HealthMetric[]>('get_health_metrics_cmd', {
          spaceId,
          metricType: null,
          limit: 100,
        }),
        invoke<Goal[]>('get_goals_cmd', { spaceId }),
      ]);
      setMetrics(metricsData);

      // Filter goals for health category
      const healthGoals = allGoals.filter((g) => g.category === 'health');
      setGoals(healthGoals);
    } catch (error) {
      logger.error('Failed to load health data:', error as Error);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addMetric = async () => {
    try {
      await invoke('create_health_metric_cmd', {
        spaceId,
        metricType: formMetricType,
        value: formValue,
        unit: formUnit,
        recordedAt: Math.floor(formRecordedAt.getTime() / 1000),
      });

      // Update related goals automatically
      const relatedGoals = goals.filter((g) => g.description === formMetricType);
      for (const goal of relatedGoals) {
        // Simple logic: if new metric > current goal progress (or cumulative), update it
        // For now, we just set current = new value for things like Weight.
        // For Steps/Water, it should be cumulative for the day. Complexity omitted for brevity.
        if (formMetricType === 'weight') {
          await invoke('update_goal_progress_cmd', { goalId: goal.id, current: formValue });
        }
      }

      setModalOpened(false);
      setFormValue(0);
      await loadData();
    } catch (error) {
      logger.error('Failed to add metric:', error as Error);
      notifications.show({
        title: 'Error',
        message: `Failed to add metric: ${String(error)}`,
        color: 'red',
      });
    }
  };

  const addGoal = async () => {
    try {
      await invoke('create_goal_cmd', {
        spaceId,
        title: goalTitle,
        target: goalTarget,
        category: 'health',
        // We overload description to store the metric type linkage
        description: goalMetricType,
      });
      setGoalModalOpened(false);
      setGoalTitle('');
      await loadData();
    } catch (error) {
      logger.error('Failed to create goal:', error as Error);
    }
  };

  const getMetricsByType = (type: string) => {
    return metrics.filter((m) => m.metric_type === type).sort((a, b) => a.recorded_at - b.recorded_at);
  };

  const getChartData = (type: string) => {
    return getMetricsByType(type).map((m) => ({
      date: new Date(m.recorded_at * 1000).toLocaleDateString(),
      value: m.value,
      timestamp: m.recorded_at,
    }));
  };

  const calculateStats = (type: string) => {
    const typeMetrics = getMetricsByType(type);
    if (typeMetrics.length === 0) return null;

    const values = typeMetrics.map((m) => m.value);
    const latest = values.at(-1) ?? 0;
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const trend = values.length > 1 ? (values.at(-1) ?? 0) - (values.at(-2) ?? 0) : 0;

    return { latest, average, min, max, trend, count: values.length };
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  const selectedStats = calculateStats(selectedMetricType);
  const activeGoal = goals.find((g) => g.description === selectedMetricType && !g.is_completed);

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>Health Tracking</Title>
            <Text c="dimmed" size="sm">
              Monitor your health metrics and achieve your wellness goals
            </Text>
          </div>
          <Group>
            <Button variant="light" leftSection={<IconTarget size={16} />} onClick={() => setGoalModalOpened(true)}>
              Set Goal
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
              Log Metric
            </Button>
          </Group>
        </Group>

        {/* Active Goal Card */}
        {activeGoal && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Title order={4} mb="xs">
              {activeGoal.title}
            </Title>
            <Group justify="space-between" mb="xs">
              <Text size="sm">
                {activeGoal.current} / {activeGoal.target} {activeGoal.unit}
              </Text>
              <Badge color={activeGoal.is_completed ? 'green' : 'blue'}>
                {Math.round((activeGoal.current / activeGoal.target) * 100)}%
              </Badge>
            </Group>
            <Progress value={(activeGoal.current / activeGoal.target) * 100} />
          </Card>
        )}

        {/* Stats Cards */}
        {selectedStats && (
          <Grid>
            <Grid.Col span={3}>
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Latest
                  </Text>
                  <Text size="xl" fw={700}>
                    {selectedStats.latest.toFixed(1)}
                  </Text>
                  <Group gap={4}>
                    <IconActivity size={14} />
                    <Text size="xs" c="dimmed">
                      {selectedStats.count} entries
                    </Text>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Average
                  </Text>
                  <Text size="xl" fw={700}>
                    {selectedStats.average.toFixed(1)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Over all time
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Range
                  </Text>
                  <Text size="xl" fw={700}>
                    {selectedStats.min.toFixed(1)} - {selectedStats.max.toFixed(1)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Min - Max
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={3}>
              <Card shadow="sm" padding="md" radius="md" withBorder>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" tt="uppercase">
                    Trend
                  </Text>
                  <Group gap={4}>
                    <Text size="xl" fw={700}>
                      {selectedStats.trend > 0 ? '+' : ''}
                      {selectedStats.trend.toFixed(1)}
                    </Text>
                    <IconTrendingUp
                      size={20}
                      style={{
                        transform: selectedStats.trend < 0 ? 'rotate(180deg)' : undefined,
                      }}
                    />
                  </Group>
                  <Text size="xs" c="dimmed">
                    Since last entry
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        )}

        {/* Metric Selector */}
        <Select
          label="Select Metric"
          value={selectedMetricType}
          onChange={(value) => setSelectedMetricType(value || 'weight')}
          data={metricTypes}
        />

        {/* Chart */}
        {getChartData(selectedMetricType).length > 0 ? (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">
              Trend Chart
            </Title>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getChartData(selectedMetricType)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} name={selectedMetricType} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        ) : (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Center h={200}>
              <Text c="dimmed">No data available for this metric</Text>
            </Center>
          </Card>
        )}

        {/* Recent Entries */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Recent Entries
          </Title>
          {getMetricsByType(selectedMetricType).length > 0 ? (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Unit</Table.Th>
                  <Table.Th>Notes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {getMetricsByType(selectedMetricType)
                  .reverse()
                  .slice(0, 10)
                  .map((metric) => (
                    <Table.Tr key={metric.id}>
                      <Table.Td>{new Date(metric.recorded_at * 1000).toLocaleString()}</Table.Td>
                      <Table.Td>{metric.value}</Table.Td>
                      <Table.Td>{metric.unit}</Table.Td>
                      <Table.Td>{metric.notes || '-'}</Table.Td>
                    </Table.Tr>
                  ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Center h={100}>
              <Text c="dimmed">No entries yet</Text>
            </Center>
          )}
        </Card>
      </Stack>

      {/* Add Metric Modal */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Log Health Metric">
        <Stack gap="md">
          <Select
            label="Metric Type"
            value={formMetricType}
            onChange={(value) => setFormMetricType(value || 'weight')}
            data={metricTypes}
            required
          />

          <NumberInput
            label="Value"
            value={formValue}
            onChange={(value) => setFormValue(Number(value))}
            min={0}
            step={0.1}
            required
          />

          <Select
            label="Unit"
            value={formUnit}
            onChange={(value) => setFormUnit(value || 'kg')}
            data={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lbs', label: 'Pounds' },
              { value: 'bpm', label: 'BPM' },
              { value: 'steps', label: 'Steps' },
              { value: 'l', label: 'Liters' },
              { value: 'minutes', label: 'Minutes' },
              { value: 'cal', label: 'Calories' },
            ]}
          />

          <DateTimePicker
            label="Recorded At"
            value={formRecordedAt}
            onChange={(value) => value && setFormRecordedAt(typeof value === 'string' ? new Date(value) : value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={addMetric} disabled={formValue === 0}>
              Add Entry
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Goal Modal */}
      <Modal opened={goalModalOpened} onClose={() => setGoalModalOpened(false)} title="Set Health Goal">
        <Stack gap="md">
          <Select
            label="Metric Type"
            value={goalMetricType}
            onChange={(value) => setGoalMetricType(value || 'weight')}
            data={metricTypes}
            required
          />
          <Text size="xs" c="dimmed">
            This will link the goal to the selected metric type.
          </Text>

          <NumberInput
            label="Target Value"
            value={goalTarget}
            onChange={(value) => setGoalTarget(Number(value))}
            required
          />
          <Button onClick={addGoal} disabled={goalTarget === 0}>
            Set Goal
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
};

export default HealthMode;
