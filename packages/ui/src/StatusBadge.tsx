import React from 'react';
import { Badge, MantineColor } from '@mantine/core';

export interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, MantineColor>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'filled' | 'light' | 'outline' | 'dot';
}

const defaultColorMap: Record<string, MantineColor> = {
  inbox: 'gray',
  next: 'blue',
  in_progress: 'yellow',
  waiting: 'orange',
  done: 'green',
  cancelled: 'red',
  active: 'green',
  completed: 'teal',
  archived: 'gray',
  blocked: 'red',
  proposed: 'blue',
  on_hold: 'orange',
  new: 'blue',
  learning: 'yellow',
  review: 'green',
  relearning: 'orange',
};

/**
 * Displays a colored badge for status values
 * @param status - Status string
 * @param colorMap - Optional custom color mapping
 * @param size - Badge size (default: sm)
 * @param variant - Badge variant (default: light)
 */
export function StatusBadge({ status, colorMap = defaultColorMap, size = 'sm', variant = 'light' }: StatusBadgeProps) {
  const color = colorMap[status] || 'gray';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge color={color} size={size} variant={variant}>
      {label}
    </Badge>
  );
}
