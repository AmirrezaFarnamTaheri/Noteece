/**
 * TemporalGraph Component
 *
 * Interactive visualization of correlations and patterns over time.
 * Uses Foresight 2.0 output to display temporal relationships.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2024-2025 Amirreza 'Farnam' Taheri <taherifarnam@gmail.com>
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  SegmentedControl,
  ActionIcon,
  Tooltip,
  Center,
  Loader,
  Box,
  Slider,
  ThemeIcon,
  Button,
} from '@mantine/core';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceLine,
  Brush,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { IconChartDots3, IconZoomIn, IconZoomOut, IconRefresh, IconFilter, IconInfoCircle } from '@tabler/icons-react';

interface CorrelationPoint {
  timestamp: number;
  date: string;
  metric1: number;
  metric2: number;
  correlation: number;
  label?: string;
}

interface TemporalPattern {
  id: string;
  name: string;
  description: string;
  strength: number;
  start_time: number;
  end_time: number;
  data_points: CorrelationPoint[];
  type: 'positive' | 'negative' | 'cyclic' | 'anomaly';
}

interface TemporalGraphProps {
  spaceId?: string;
  metric1?: string;
  metric2?: string;
  onPatternClick?: (pattern: TemporalPattern) => void;
}

const CORRELATION_COLORS = {
  strong_positive: 'var(--mantine-color-green-6)',
  weak_positive: 'var(--mantine-color-teal-5)',
  neutral: 'var(--mantine-color-gray-5)',
  weak_negative: 'var(--mantine-color-orange-5)',
  strong_negative: 'var(--mantine-color-red-6)',
};

function getCorrelationColor(value: number): string {
  if (value > 0.7) return CORRELATION_COLORS.strong_positive;
  if (value > 0.3) return CORRELATION_COLORS.weak_positive;
  if (value > -0.3) return CORRELATION_COLORS.neutral;
  if (value > -0.7) return CORRELATION_COLORS.weak_negative;
  return CORRELATION_COLORS.strong_negative;
}

function getCorrelationLabel(value: number): string {
  if (value > 0.7) return 'Strong Positive';
  if (value > 0.3) return 'Weak Positive';
  if (value > -0.3) return 'No Correlation';
  if (value > -0.7) return 'Weak Negative';
  return 'Strong Negative';
}

export function TemporalGraph({
  spaceId,
  metric1 = 'productivity',
  metric2 = 'sleep_hours',
  onPatternClick,
}: TemporalGraphProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'scatter'>('timeline');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [brushRange, setBrushRange] = useState<[number, number] | null>(null);

  // Fetch temporal correlation data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['temporal-graph', spaceId, metric1, metric2, timeRange],
    queryFn: async (): Promise<TemporalPattern[]> => {
      try {
        return await invoke('get_temporal_correlations_cmd', {
          spaceId,
          metric1,
          metric2,
          timeRange,
        });
      } catch (error) {
        // Return empty array instead of mock data
        console.warn("Failed to fetch temporal correlations", error);
        return [];
      }
    },
    staleTime: 300_000,
  });

  // Process data for visualization
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const allPoints: CorrelationPoint[] = [];
    for (const pattern of data) {
      allPoints.push(...pattern.data_points);
    }

    return allPoints.sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  // Filter data based on brush selection
  const filteredData = useMemo(() => {
    if (!brushRange || chartData.length === 0) return chartData;
    return chartData.slice(brushRange[0], brushRange[1] + 1);
  }, [chartData, brushRange]);

  // Calculate average correlation
  const avgCorrelation = useMemo(() => {
    if (filteredData.length === 0) return 0;
    return filteredData.reduce((sum, p) => sum + p.correlation, 0) / filteredData.length;
  }, [filteredData]);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const point = payload[0].payload as CorrelationPoint;
    return (
      <Paper shadow="md" p="sm" radius="md" withBorder>
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            {point.date}
          </Text>
          <Group gap="xs">
            <Badge size="xs" color="blue">
              {metric1}: {point.metric1.toFixed(1)}
            </Badge>
            <Badge size="xs" color="violet">
              {metric2}: {point.metric2.toFixed(1)}
            </Badge>
          </Group>
          <Badge size="sm" color={point.correlation > 0.3 ? 'green' : point.correlation < -0.3 ? 'red' : 'gray'}>
            Correlation: {(point.correlation * 100).toFixed(0)}%
          </Badge>
          {point.label && (
            <Text size="xs" c="dimmed">
              {point.label}
            </Text>
          )}
        </Stack>
      </Paper>
    );
  };

  if (isLoading) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Center h={400}>
          <Loader />
        </Center>
      </Paper>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Center>
            <Stack align="center" gap="md">
                <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                    <IconInfoCircle size={40} />
                </ThemeIcon>
                <Title order={4}>Insufficient Data</Title>
                <Text size="sm" c="dimmed" ta="center" maw={400}>
                    Not enough correlation data available to generate a temporal graph.
                    Continue tracking your metrics to see insights here.
                </Text>
            </Stack>
        </Center>
      </Paper>
    )
  }

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon color="indigo" variant="light" size="lg">
              <IconChartDots3 size={20} />
            </ThemeIcon>
            <Box>
              <Title order={4}>Temporal Correlations</Title>
              <Text size="xs" c="dimmed">
                {metric1} vs {metric2}
              </Text>
            </Box>
          </Group>

          <Group gap="xs">
            <SegmentedControl
              size="xs"
              value={timeRange}
              onChange={(v) => setTimeRange(v as typeof timeRange)}
              data={[
                { label: 'Week', value: 'week' },
                { label: 'Month', value: 'month' },
                { label: 'Quarter', value: 'quarter' },
              ]}
            />

            <SegmentedControl
              size="xs"
              value={viewMode}
              onChange={(v) => setViewMode(v as typeof viewMode)}
              data={[
                { label: 'Timeline', value: 'timeline' },
                { label: 'Scatter', value: 'scatter' },
              ]}
            />
          </Group>
        </Group>

        {/* Controls */}
        <Group justify="space-between" align="center">
          <Badge
            size="lg"
            variant="light"
            color={avgCorrelation > 0.3 ? 'green' : avgCorrelation < -0.3 ? 'red' : 'gray'}
          >
            Avg Correlation: {(avgCorrelation * 100).toFixed(0)}% ({getCorrelationLabel(avgCorrelation)})
          </Badge>

          <Group gap="xs">
            <Tooltip label="Zoom Out">
              <ActionIcon variant="light" onClick={handleZoomOut}>
                <IconZoomOut size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Zoom In">
              <ActionIcon variant="light" onClick={handleZoomIn}>
                <IconZoomIn size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Refresh">
              <ActionIcon variant="light" onClick={() => refetch()}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Zoom slider */}
        <Box px="md">
          <Text size="xs" c="dimmed" mb={4}>
            Zoom: {(zoomLevel * 100).toFixed(0)}%
          </Text>
          <Slider
            value={zoomLevel}
            onChange={setZoomLevel}
            min={0.5}
            max={3}
            step={0.1}
            marks={[
              { value: 0.5, label: '50%' },
              { value: 1, label: '100%' },
              { value: 2, label: '200%' },
              { value: 3, label: '300%' },
            ]}
          />
        </Box>

        {/* Chart */}
        <Box style={{ height: 350 * zoomLevel, overflow: 'hidden' }}>
          {viewMode === 'timeline' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  label={{ value: metric1, angle: -90, position: 'insideLeft', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  label={{ value: metric2, angle: 90, position: 'insideRight', fontSize: 10 }}
                />
                <RechartsTooltip content={<CustomTooltip />} />

                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="metric1"
                  stroke="var(--mantine-color-blue-6)"
                  strokeWidth={2}
                  dot={false}
                  name={metric1}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="metric2"
                  stroke="var(--mantine-color-violet-6)"
                  strokeWidth={2}
                  dot={false}
                  name={metric2}
                />

                {/* Correlation strength as background */}
                <ReferenceLine y={0} stroke="var(--mantine-color-gray-4)" />

                <Brush
                  dataKey="date"
                  height={30}
                  stroke="var(--mantine-color-blue-4)"
                  onChange={(range) => {
                    if (range.startIndex !== undefined && range.endIndex !== undefined) {
                      setBrushRange([range.startIndex, range.endIndex]);
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="metric1"
                  tick={{ fontSize: 10 }}
                  name={metric1}
                  label={{ value: metric1, position: 'bottom', fontSize: 12 }}
                />
                <YAxis
                  dataKey="metric2"
                  tick={{ fontSize: 10 }}
                  name={metric2}
                  label={{ value: metric2, angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <ZAxis dataKey="correlation" range={[50, 200]} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Scatter data={chartData} fill="var(--mantine-color-indigo-6)" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </Box>

        {/* Patterns list */}
        {data && data.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Detected Patterns
            </Text>
            <Group gap="xs">
              {data.map((pattern) => (
                <Badge
                  key={pattern.id}
                  variant="light"
                  color={
                    pattern.type === 'positive'
                      ? 'green'
                      : pattern.type === 'negative'
                        ? 'red'
                        : pattern.type === 'cyclic'
                          ? 'blue'
                          : 'orange'
                  }
                  style={{ cursor: onPatternClick ? 'pointer' : 'default' }}
                  onClick={() => onPatternClick?.(pattern)}
                >
                  {pattern.name} ({(pattern.strength * 100).toFixed(0)}%)
                </Badge>
              ))}
            </Group>
          </Stack>
        )}

        {/* Legend */}
        <Group gap="md" justify="center">
          <Group gap="xs">
            <Box
              w={12}
              h={12}
              style={{
                backgroundColor: 'var(--mantine-color-blue-6)',
                borderRadius: 2,
              }}
            />
            <Text size="xs">{metric1}</Text>
          </Group>
          <Group gap="xs">
            <Box
              w={12}
              h={12}
              style={{
                backgroundColor: 'var(--mantine-color-violet-6)',
                borderRadius: 2,
              }}
            />
            <Text size="xs">{metric2}</Text>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}

export default TemporalGraph;
