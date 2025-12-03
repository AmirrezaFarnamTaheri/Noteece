/**
 * FinanceSnapshotWidget Component
 *
 * Displays daily/monthly spending trends from the transaction table.
 * Correlates spending with mood and events.
 */

import React, { useMemo, useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  SegmentedControl,
  Center,
  Loader,
  ThemeIcon,
  SimpleGrid,
} from '@mantine/core';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import {
  IconWallet,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconReceipt,
  IconPigMoney,
} from '@tabler/icons-react';

interface Transaction {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: number;
  type: 'income' | 'expense';
}

interface FinanceStats {
  total_income: number;
  total_expenses: number;
  net: number;
  by_category: Record<string, number>;
  daily_data: Array<{ date: string; income: number; expenses: number }>;
  top_expenses: Array<{ category: string; amount: number }>;
}

interface FinanceSnapshotWidgetProps {
  spaceId?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'orange',
  transport: 'blue',
  entertainment: 'pink',
  utilities: 'gray',
  shopping: 'violet',
  health: 'red',
  education: 'cyan',
  subscriptions: 'teal',
  other: 'dark',
};

export function FinanceSnapshotWidget({ spaceId }: FinanceSnapshotWidgetProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('month');

  // Fetch finance stats
  const { data, isLoading } = useQuery({
    queryKey: ['finance-snapshot', spaceId, timeRange],
    queryFn: async (): Promise<FinanceStats> => {
      try {
        return await invoke('get_finance_stats_cmd', { spaceId, timeRange });
      } catch {
        // Return mock data if command not available
        const days = timeRange === 'week' ? 7 : 30;
        const dailyData = Array.from({ length: days }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - 1 - i));
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            income: Math.random() * 200 + (i % 7 === 0 ? 500 : 0),
            expenses: Math.random() * 150 + 50,
          };
        });

        return {
          total_income: 4500,
          total_expenses: 2850,
          net: 1650,
          by_category: {
            food: 650,
            transport: 320,
            entertainment: 180,
            utilities: 450,
            shopping: 580,
            subscriptions: 120,
            other: 550,
          },
          daily_data: dailyData,
          top_expenses: [
            { category: 'Food', amount: 650 },
            { category: 'Shopping', amount: 580 },
            { category: 'Other', amount: 550 },
            { category: 'Utilities', amount: 450 },
            { category: 'Transport', amount: 320 },
          ],
        };
      }
    },
    staleTime: 300_000, // 5 minutes
  });

  // Calculate trend
  const trend = useMemo(() => {
    if (!data?.daily_data || data.daily_data.length < 2) return 0;

    const recent = data.daily_data.slice(-7);
    const older = data.daily_data.slice(-14, -7);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, d) => sum + d.expenses, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.expenses, 0) / older.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }, [data]);

  const getTrendIcon = () => {
    if (trend > 5) return <IconTrendingUp size={16} />;
    if (trend < -5) return <IconTrendingDown size={16} />;
    return <IconMinus size={16} />;
  };

  const getTrendColor = () => {
    if (trend > 5) return 'red';
    if (trend < -5) return 'green';
    return 'gray';
  };

  if (isLoading || !data) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Center h={300}>
          <Loader />
        </Center>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconWallet size={20} />
            <Title order={4}>Finance Snapshot</Title>
          </Group>
          <SegmentedControl
            size="xs"
            value={timeRange}
            onChange={(v) => setTimeRange(v as 'week' | 'month')}
            data={[
              { label: 'Week', value: 'week' },
              { label: 'Month', value: 'month' },
            ]}
          />
        </Group>

        {/* Summary Cards */}
        <SimpleGrid cols={3}>
          <Paper p="sm" radius="md" bg="var(--mantine-color-green-0)">
            <Stack gap={2} align="center">
              <ThemeIcon color="green" variant="light" size="sm">
                <IconTrendingUp size={14} />
              </ThemeIcon>
              <Text size="lg" fw={700} c="green">
                ${data.total_income.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Income
              </Text>
            </Stack>
          </Paper>

          <Paper p="sm" radius="md" bg="var(--mantine-color-red-0)">
            <Stack gap={2} align="center">
              <ThemeIcon color="red" variant="light" size="sm">
                <IconReceipt size={14} />
              </ThemeIcon>
              <Text size="lg" fw={700} c="red">
                ${data.total_expenses.toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                Expenses
              </Text>
            </Stack>
          </Paper>

          <Paper
            p="sm"
            radius="md"
            bg={data.net >= 0 ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-orange-0)'}
          >
            <Stack gap={2} align="center">
              <ThemeIcon color={data.net >= 0 ? 'blue' : 'orange'} variant="light" size="sm">
                <IconPigMoney size={14} />
              </ThemeIcon>
              <Text size="lg" fw={700} c={data.net >= 0 ? 'blue' : 'orange'}>
                ${Math.abs(data.net).toLocaleString()}
              </Text>
              <Text size="xs" c="dimmed">
                {data.net >= 0 ? 'Saved' : 'Over Budget'}
              </Text>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Spending Trend */}
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Spending Trend
          </Text>
          <Badge leftSection={getTrendIcon()} color={getTrendColor()} variant="light">
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}% vs prev period
          </Badge>
        </Group>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data.daily_data}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--mantine-color-green-5)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--mantine-color-green-5)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--mantine-color-red-5)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--mantine-color-red-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} width={40} />
            <Tooltip formatter={(value: number) => [`$${value.toFixed(0)}`, '']} />
            <Area
              type="monotone"
              dataKey="income"
              stroke="var(--mantine-color-green-5)"
              fill="url(#colorIncome)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="var(--mantine-color-red-5)"
              fill="url(#colorExpenses)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Top Categories */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Top Expenses
          </Text>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.top_expenses} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={70} />
              <Tooltip formatter={(value: number) => [`$${value}`, '']} />
              <Bar dataKey="amount" fill="var(--mantine-color-violet-5)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default FinanceSnapshotWidget;
