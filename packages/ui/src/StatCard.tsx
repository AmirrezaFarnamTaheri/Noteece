import React from 'react';
import { Card, Text, Group, ThemeIcon, Stack } from '@mantine/core';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';

export interface StatCardProps {
  /** Statistic title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Icon to display */
  icon: React.ReactNode;
  /** Icon color */
  iconColor?: string;
  /** Optional change percentage */
  change?: number;
  /** Optional description */
  description?: string;
}

/**
 * Card component for displaying a statistic with optional trend
 * @param title - Statistic label
 * @param value - Main statistic value
 * @param icon - Icon to display
 * @param iconColor - Icon color
 * @param change - Percentage change (positive/negative)
 * @param description - Optional description text
 */
export function StatCard({ title, value, icon, iconColor = 'blue', change, description }: StatCardProps) {
  const hasPositiveChange = change !== undefined && change > 0;
  const hasNegativeChange = change !== undefined && change < 0;

  return (
    <Card p="lg" radius="md" withBorder>
      <Group justify="apart">
        <Stack gap="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text size="xl" fw={700}>
            {value}
          </Text>
          {change !== undefined && (
            <Group gap="xs">
              {hasPositiveChange && <IconArrowUp size={16} color="green" />}
              {hasNegativeChange && <IconArrowDown size={16} color="red" />}
              <Text size="sm" c={hasPositiveChange ? 'green' : hasNegativeChange ? 'red' : 'dimmed'} fw={500}>
                {Math.abs(change)}%
              </Text>
            </Group>
          )}
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
        <ThemeIcon size={60} radius="md" variant="light" color={iconColor}>
          {icon}
        </ThemeIcon>
      </Group>
    </Card>
  );
}
