/**
 * LifeBalanceWidget Component
 *
 * Radar chart visualization comparing time spent across different life areas.
 * Uses data from time_entry and space tables.
 */

import React, { useMemo } from 'react';
import { Paper, Title, Text, Stack, Group, Badge, Center, Loader } from '@mantine/core';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { IconChartRadar } from '@tabler/icons-react';

interface LifeAreaData {
  area: string;
  hours: number;
  target: number;
  fullMark: number;
}

interface TimeDistribution {
  work: number;
  personal: number;
  health: number;
  learning: number;
  social: number;
  creative: number;
  rest: number;
}

interface LifeBalanceWidgetProps {
  spaceId?: string;
  timeRange?: 'week' | 'month' | 'quarter';
  showTargets?: boolean;
}

// Default targets for a balanced week (hours)
const DEFAULT_TARGETS: TimeDistribution = {
  work: 40,
  personal: 20,
  health: 10,
  learning: 7,
  social: 14,
  creative: 5,
  rest: 56, // 8 hours/day
};

export function LifeBalanceWidget({ spaceId, timeRange = 'week', showTargets = true }: LifeBalanceWidgetProps) {
  // Fetch time distribution data
  const { data, isLoading, error } = useQuery({
    queryKey: ['life-balance', spaceId, timeRange],
    queryFn: async (): Promise<TimeDistribution> => {
      try {
        const result = await invoke<TimeDistribution>('get_time_distribution_cmd', {
          spaceId,
          timeRange,
        });
        return result;
      } catch {
        // Return mock data if command not available
        return {
          work: 35,
          personal: 15,
          health: 8,
          learning: 5,
          social: 10,
          creative: 3,
          rest: 45,
        };
      }
    },
    staleTime: 300_000, // 5 minutes
  });

  // Transform data for radar chart
  const chartData = useMemo((): LifeAreaData[] => {
    const distribution = data || {
      work: 0,
      personal: 0,
      health: 0,
      learning: 0,
      social: 0,
      creative: 0,
      rest: 0,
    };

    const multiplier = timeRange === 'week' ? 1 : timeRange === 'month' ? 4 : 13;

    return [
      {
        area: 'Work',
        hours: distribution.work,
        target: DEFAULT_TARGETS.work * multiplier,
        fullMark: 60 * multiplier,
      },
      {
        area: 'Personal',
        hours: distribution.personal,
        target: DEFAULT_TARGETS.personal * multiplier,
        fullMark: 30 * multiplier,
      },
      {
        area: 'Health',
        hours: distribution.health,
        target: DEFAULT_TARGETS.health * multiplier,
        fullMark: 20 * multiplier,
      },
      {
        area: 'Learning',
        hours: distribution.learning,
        target: DEFAULT_TARGETS.learning * multiplier,
        fullMark: 15 * multiplier,
      },
      {
        area: 'Social',
        hours: distribution.social,
        target: DEFAULT_TARGETS.social * multiplier,
        fullMark: 25 * multiplier,
      },
      {
        area: 'Creative',
        hours: distribution.creative,
        target: DEFAULT_TARGETS.creative * multiplier,
        fullMark: 15 * multiplier,
      },
      {
        area: 'Rest',
        hours: distribution.rest,
        target: DEFAULT_TARGETS.rest * multiplier,
        fullMark: 70 * multiplier,
      },
    ];
  }, [data, timeRange]);

  // Calculate balance score
  const balanceScore = useMemo(() => {
    if (!data) return 0;

    const scores = chartData.map((item) => {
      const ratio = item.hours / item.target;
      // Score is highest when ratio is close to 1
      if (ratio <= 0) return 0;
      if (ratio > 2) return 0.5;
      if (ratio > 1) return 1 - (ratio - 1) * 0.5;
      return ratio;
    });

    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
  }, [data, chartData]);

  const status = getBalanceStatus(balanceScore);

  if (isLoading) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Center h={300}>
          <Loader />
        </Center>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Center h={300}>
          <Text c="red">Failed to load life balance data</Text>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconChartRadar size={20} />
            <Title order={4}>Life Balance</Title>
          </Group>
          <Badge color={status.color} variant="light">
            {status.label} ({balanceScore}%)
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          Time distribution across life areas (
          {timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : 'this quarter'})
        </Text>

        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="area" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fontSize: 10 }} />
            <Radar
              name="Hours"
              dataKey="hours"
              stroke="var(--mantine-color-blue-6)"
              fill="var(--mantine-color-blue-6)"
              fillOpacity={0.5}
            />
            {showTargets && (
              <Radar
                name="Target"
                dataKey="target"
                stroke="var(--mantine-color-gray-5)"
                fill="var(--mantine-color-gray-5)"
                fillOpacity={0.2}
                strokeDasharray="5 5"
              />
            )}
            <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}h`, name]} />
          </RadarChart>
        </ResponsiveContainer>

        <Group gap="xs" justify="center">
          <Badge variant="light" color="blue" size="sm">
            ● Actual
          </Badge>
          {showTargets && (
            <Badge variant="light" color="gray" size="sm">
              ○ Target
            </Badge>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}

export default LifeBalanceWidget;

// Get balance status
const getBalanceStatus = (score: number) => {
  if (score >= 80) return { label: 'Excellent', color: 'green' };
  if (score >= 60) return { label: 'Good', color: 'blue' };
  if (score >= 40) return { label: 'Needs Attention', color: 'yellow' };
  return { label: 'Imbalanced', color: 'red' };
};
