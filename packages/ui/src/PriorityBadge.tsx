import React from 'react';
import { Badge, MantineColor } from '@mantine/core';

export interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const priorityConfig: Record<PriorityBadgeProps['priority'], { color: MantineColor; label: string }> = {
  low: { color: 'gray', label: 'Low' },
  medium: { color: 'blue', label: 'Medium' },
  high: { color: 'orange', label: 'High' },
  urgent: { color: 'red', label: 'Urgent' },
};

/**
 * Displays a colored badge for task/project priority
 * @param priority - Priority level (low, medium, high, urgent)
 * @param size - Badge size (default: sm)
 */
export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <Badge color={config.color} size={size} variant="filled">
      {config.label}
    </Badge>
  );
}
