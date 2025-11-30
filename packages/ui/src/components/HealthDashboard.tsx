import React from 'react';
import { Card, Group, Text, Stack, RingProgress, Center, Grid, ThemeIcon } from '@mantine/core';
import {
  IconHeart,
  IconMoodSmile,
  IconBed,
  IconGlass,
  IconWalk,
  IconWeight,
  IconTrendingUp,
  IconTrendingDown,
} from '@tabler/icons-react';

export interface HealthMetric {
  id: string;
  type: 'mood' | 'sleep' | 'water' | 'steps' | 'weight' | 'heart_rate' | 'exercise';
  value: number;
  unit: string;
  timestamp: number;
  notes?: string;
}

export interface HealthGoal {
  type: string;
  target: number;
  unit: string;
}

export interface HealthDashboardProps {
  metrics: HealthMetric[];
  goals?: HealthGoal[];
  period?: 'today' | 'week' | 'month';
}

const getMetricIcon = (type: HealthMetric['type']) => {
  switch (type) {
    case 'mood':
      return <IconMoodSmile size={20} />;
    case 'sleep':
      return <IconBed size={20} />;
    case 'water':
      return <IconGlass size={20} />;
    case 'steps':
      return <IconWalk size={20} />;
    case 'weight':
      return <IconWeight size={20} />;
    case 'heart_rate':
      return <IconHeart size={20} />;
    default:
      return <IconHeart size={20} />;
  }
};

const getMetricColor = (type: HealthMetric['type']): string => {
  switch (type) {
    case 'mood':
      return 'yellow';
    case 'sleep':
      return 'indigo';
    case 'water':
      return 'cyan';
    case 'steps':
      return 'green';
    case 'weight':
      return 'violet';
    case 'heart_rate':
      return 'red';
    default:
      return 'gray';
  }
};

const formatMetricLabel = (type: HealthMetric['type']): string => {
  switch (type) {
    case 'mood':
      return 'Mood';
    case 'sleep':
      return 'Sleep';
    case 'water':
      return 'Hydration';
    case 'steps':
      return 'Steps';
    case 'weight':
      return 'Weight';
    case 'heart_rate':
      return 'Heart Rate';
    case 'exercise':
      return 'Exercise';
    default:
      return type;
  }
};

export function HealthDashboard({ metrics, goals = [], period = 'today' }: HealthDashboardProps) {
  // Get latest value for each metric type
  const getLatestMetric = (type: HealthMetric['type']): HealthMetric | undefined => {
    return metrics.filter((m) => m.type === type).sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  // Calculate average for a metric type
  const getAverageMetric = (type: HealthMetric['type']): number => {
    const typeMetrics = metrics.filter((m) => m.type === type);
    if (typeMetrics.length === 0) return 0;
    const sum = typeMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / typeMetrics.length;
  };

  // Get progress towards goal
  const getGoalProgress = (type: string): number => {
    const goal = goals.find((g) => g.type === type);
    if (!goal) return 0;

    const latest = getLatestMetric(type as HealthMetric['type']);
    if (!latest) return 0;

    return Math.min((latest.value / goal.target) * 100, 100);
  };

  // Get trend (compare to average)
  const getTrend = (type: HealthMetric['type']): 'up' | 'down' | 'neutral' => {
    const latest = getLatestMetric(type);
    if (!latest) return 'neutral';

    const average = getAverageMetric(type);
    if (Math.abs(latest.value - average) < average * 0.05) return 'neutral';

    return latest.value > average ? 'up' : 'down';
  };

  const metricTypes: HealthMetric['type'][] = ['mood', 'sleep', 'water', 'steps'];

  if (metrics.length === 0) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md" align="center" py="xl">
          <IconHeart size={48} stroke={1.5} color="gray" />
          <Text c="dimmed">No health data tracked yet</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="lg" fw={600}>
            Health Dashboard
          </Text>
          <Text size="xs" c="dimmed" tt="uppercase">
            {period}
          </Text>
        </Group>

        <Grid>
          {metricTypes.map((type) => {
            const latest = getLatestMetric(type);
            if (!latest) return null;

            const trend = getTrend(type);
            const progress = getGoalProgress(type);
            const hasGoal = goals.some((g) => g.type === type);

            return (
              <Grid.Col key={type} span={6}>
                <Card padding="md" radius="md" withBorder style={{ height: '100%' }}>
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <ThemeIcon variant="light" color={getMetricColor(type)} size="lg">
                        {getMetricIcon(type)}
                      </ThemeIcon>
                      {trend !== 'neutral' && (
                        <ThemeIcon variant="light" color={trend === 'up' ? 'green' : 'red'} size="sm">
                          {trend === 'up' ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                        </ThemeIcon>
                      )}
                    </Group>

                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                        {formatMetricLabel(type)}
                      </Text>
                      <Group gap={4} align="baseline">
                        <Text size="xl" fw={700}>
                          {latest.value}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {latest.unit}
                        </Text>
                      </Group>
                    </div>

                    {hasGoal && (
                      <Stack gap={4}>
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Goal progress
                          </Text>
                          <Text size="xs" fw={600}>
                            {Math.round(progress)}%
                          </Text>
                        </Group>
                        <div
                          style={{
                            width: '100%',
                            height: 4,
                            backgroundColor: 'var(--mantine-color-gray-2)',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${progress}%`,
                              height: '100%',
                              backgroundColor: `var(--mantine-color-${getMetricColor(type)}-6)`,
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                      </Stack>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            );
          })}
        </Grid>
      </Stack>
    </Card>
  );
}

// Compact single metric card
export function HealthMetricCard({ metric, goal }: { metric: HealthMetric; goal?: HealthGoal }) {
  const progress = goal ? Math.min((metric.value / goal.target) * 100, 100) : 0;

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <ThemeIcon variant="light" color={getMetricColor(metric.type)} size="lg">
            {getMetricIcon(metric.type)}
          </ThemeIcon>
          <Text size="xs" c="dimmed">
            {new Date(metric.timestamp * 1000).toLocaleDateString()}
          </Text>
        </Group>

        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {formatMetricLabel(metric.type)}
          </Text>
          <Group gap={4} align="baseline">
            <Text size="xl" fw={700}>
              {metric.value}
            </Text>
            <Text size="sm" c="dimmed">
              {metric.unit}
            </Text>
          </Group>
        </div>

        {goal && (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Goal: {goal.target} {goal.unit}
              </Text>
              <Text size="xs" fw={600} c={progress >= 100 ? 'green' : undefined}>
                {Math.round(progress)}%
              </Text>
            </Group>
            <div
              style={{
                width: '100%',
                height: 4,
                backgroundColor: 'var(--mantine-color-gray-2)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: `var(--mantine-color-${getMetricColor(metric.type)}-6)`,
                }}
              />
            </div>
          </Stack>
        )}

        {metric.notes && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {metric.notes}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

// Ring progress summary view
export function HealthSummaryRing({ metrics, goals }: Pick<HealthDashboardProps, 'metrics' | 'goals'>) {
  const metricTypes: HealthMetric['type'][] = ['mood', 'sleep', 'water', 'steps'];

  const getLatestMetric = (type: HealthMetric['type']): HealthMetric | undefined => {
    return metrics.filter((m) => m.type === type).sort((a, b) => b.timestamp - a.timestamp)[0];
  };

  const getGoalProgress = (type: string): number => {
    const goal = goals?.find((g) => g.type === type);
    if (!goal) return 0;

    const latest = getLatestMetric(type as HealthMetric['type']);
    if (!latest) return 0;

    return Math.min((latest.value / goal.target) * 100, 100);
  };

  const overallProgress = metricTypes.reduce((sum, type) => sum + getGoalProgress(type), 0) / metricTypes.length;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md" align="center">
        <Text size="lg" fw={600}>
          Health Score
        </Text>

        <RingProgress
          size={160}
          thickness={16}
          sections={[
            {
              value: overallProgress,
              color: overallProgress >= 80 ? 'green' : overallProgress >= 50 ? 'yellow' : 'red',
            },
          ]}
          label={
            <Center>
              <Stack gap={0} align="center">
                <Text size="xl" fw={700}>
                  {Math.round(overallProgress)}%
                </Text>
                <Text size="xs" c="dimmed">
                  Overall
                </Text>
              </Stack>
            </Center>
          }
        />

        <Stack gap="xs" style={{ width: '100%' }}>
          {metricTypes.map((type) => {
            const latest = getLatestMetric(type);
            if (!latest) return null;

            const progress = getGoalProgress(type);

            return (
              <Group key={type} justify="space-between">
                <Group gap="xs">
                  <ThemeIcon variant="light" color={getMetricColor(type)} size="sm">
                    {getMetricIcon(type)}
                  </ThemeIcon>
                  <Text size="sm">{formatMetricLabel(type)}</Text>
                </Group>
                <Text size="sm" fw={600} c={progress >= 100 ? 'green' : undefined}>
                  {Math.round(progress)}%
                </Text>
              </Group>
            );
          })}
        </Stack>
      </Stack>
    </Card>
  );
}
