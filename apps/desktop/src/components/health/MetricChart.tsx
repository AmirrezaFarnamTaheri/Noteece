import React from 'react';
import { Card, Title, Select, Group } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HealthMetric, metricTypes } from './types';

interface MetricChartProps {
  metrics: HealthMetric[];
  selectedType: string;
  onTypeChange: (type: string) => void;
}

/**
 * Health Metric Chart - Displays metric trends over time
 */
export const MetricChart: React.FC<MetricChartProps> = ({ metrics, selectedType, onTypeChange }) => {
  const filteredMetrics = metrics.filter((m) => m.metric_type === selectedType);

  const chartData = filteredMetrics
    .sort((a, b) => a.recorded_at - b.recorded_at)
    .map((m) => ({
      date: new Date(m.recorded_at * 1000).toLocaleDateString(),
      value: m.value,
    }));

  return (
    <Card withBorder p="lg">
      <Group justify="space-between" mb="md">
        <Title order={4}>Trend</Title>
        <Select value={selectedType} onChange={(v) => v && onTypeChange(v)} data={metricTypes} size="xs" w={150} />
      </Group>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#228be6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          No data for this metric type
        </div>
      )}
    </Card>
  );
};
