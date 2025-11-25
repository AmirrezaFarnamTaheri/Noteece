/**
 * Health Charts - Visualize health metrics over time
 */

import React, { useMemo } from 'react';
import { Card, Title, Text, Group, Select, Stack, Badge } from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';
import { HealthMetric, METRIC_TYPES } from './HealthMetricsPanel';

interface HealthChartsProps {
  metrics: HealthMetric[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  timeRange: '7d' | '30d' | '90d' | '365d';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '365d') => void;
}

export const HealthCharts: React.FC<HealthChartsProps> = ({
  metrics,
  selectedType,
  onTypeChange,
  timeRange,
  onTimeRangeChange,
}) => {
  // Filter and prepare chart data
  const chartData = useMemo(() => {
    const now = Date.now();
    const rangeMs = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '365d': 365 * 24 * 60 * 60 * 1000,
    }[timeRange];

    const cutoff = now - rangeMs;

    return metrics
      .filter((m) => m.metric_type === selectedType && m.recorded_at * 1000 >= cutoff)
      .sort((a, b) => a.recorded_at - b.recorded_at)
      .map((m) => ({
        date: new Date(m.recorded_at * 1000).toLocaleDateString(),
        value: m.value,
        notes: m.notes,
      }));
  }, [metrics, selectedType, timeRange]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: 'neutral', percentage: 0 };

    const first = chartData[0].value;
    const lastItem = chartData.at(-1);
    const last = lastItem?.value ?? first;
    const percentage = ((last - first) / first) * 100;

    return {
      direction: percentage > 1 ? 'up' : percentage < -1 ? 'down' : 'neutral',
      percentage: Math.abs(percentage),
    };
  }, [chartData]);

  // Calculate average
  const average = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;
  }, [chartData]);

  const selectedTypeInfo = METRIC_TYPES.find((m) => m.value === selectedType);

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={5}>Trends</Title>
        <Group gap="xs">
          <Select
            size="xs"
            value={selectedType}
            onChange={(v) => onTypeChange(v || 'weight')}
            data={METRIC_TYPES}
            style={{ width: 150 }}
          />
          <Select
            size="xs"
            value={timeRange}
            onChange={(v) => onTimeRangeChange((v as typeof timeRange) || '30d')}
            data={[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: '365d', label: '1 Year' },
            ]}
            style={{ width: 100 }}
          />
        </Group>
      </Group>

      {chartData.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          No data for {selectedTypeInfo?.label || selectedType} in this period
        </Text>
      ) : (
        <>
          {/* Stats Row */}
          <Group mb="md" gap="lg">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Average
              </Text>
              <Group gap={4}>
                <Text fw={600}>{average.toFixed(1)}</Text>
                <Text size="xs" c="dimmed">
                  {selectedTypeInfo?.unit}
                </Text>
              </Group>
            </Stack>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Trend
              </Text>
              <Group gap={4}>
                {trend.direction === 'up' && <IconTrendingUp size={16} color="green" />}
                {trend.direction === 'down' && <IconTrendingDown size={16} color="red" />}
                {trend.direction === 'neutral' && <IconMinus size={16} color="gray" />}
                <Text fw={600}>{trend.percentage.toFixed(1)}%</Text>
              </Group>
            </Stack>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Data Points
              </Text>
              <Text fw={600}>{chartData.length}</Text>
            </Stack>
          </Group>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [
                  `${value} ${selectedTypeInfo?.unit || ''}`,
                  selectedTypeInfo?.label || selectedType,
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--mantine-color-blue-6)"
                fill="var(--mantine-color-blue-1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
};
