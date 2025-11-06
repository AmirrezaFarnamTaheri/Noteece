import React from 'react';
import { Card, Group, Text, Stack, RingProgress, Center } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';

export interface QuickStatProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  icon?: React.ReactNode;
}

export function QuickStatsCard({ title, value, subtitle, trend, trendValue, color = 'blue', icon }: QuickStatProps) {
  const getTrendIcon = () => {
    if (!trend || trend === 'neutral') return null;
    return trend === 'up' ? (
      <IconTrendingUp size={16} color="green" />
    ) : (
      <IconTrendingDown size={16} color="red" />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === 'neutral') return 'dimmed';
    return trend === 'up' ? 'green' : 'red';
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Text size="sm" c="dimmed" fw={500} tt="uppercase">
            {title}
          </Text>
          {icon && <div style={{ color: `var(--mantine-color-${color}-6)` }}>{icon}</div>}
        </Group>

        <Text size="xl" fw={700} style={{ fontSize: '2rem' }}>
          {value}
        </Text>

        {(subtitle || trendValue) && (
          <Group gap="xs">
            {trendValue && (
              <Group gap={4}>
                {getTrendIcon()}
                <Text size="sm" c={getTrendColor()} fw={500}>
                  {trendValue}
                </Text>
              </Group>
            )}
            {subtitle && (
              <Text size="sm" c="dimmed">
                {subtitle}
              </Text>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export interface QuickStatsGridProps {
  stats: QuickStatProps[];
  cols?: number;
}

export function QuickStatsGrid({ stats, cols = 4 }: QuickStatsGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1rem',
      }}
    >
      {stats.map((stat, index) => (
        <QuickStatsCard key={index} {...stat} />
      ))}
    </div>
  );
}

// Progress Ring variant
export interface ProgressStatProps {
  title: string;
  value: number; // 0-100
  label: string;
  color?: string;
  subtitle?: string;
}

export function ProgressStat({ title, value, label, color = 'blue', subtitle }: ProgressStatProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs" align="center">
        <Text size="sm" c="dimmed" fw={500} tt="uppercase">
          {title}
        </Text>

        <RingProgress
          size={120}
          thickness={12}
          sections={[{ value, color }]}
          label={
            <Center>
              <Text size="lg" fw={700}>
                {label}
              </Text>
            </Center>
          }
        />

        {subtitle && (
          <Text size="sm" c="dimmed" ta="center">
            {subtitle}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
