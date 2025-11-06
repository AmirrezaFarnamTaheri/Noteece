import React from 'react';
import { Timeline, Text, Card, Group, Badge, Stack } from '@mantine/core';
import {
  IconNotes,
  IconCircleCheck,
  IconBriefcase,
  IconClock,
  IconTag,
} from '@tabler/icons-react';

export interface ActivityItem {
  id: string;
  type: 'note' | 'task' | 'project' | 'time_entry' | 'tag';
  title: string;
  description?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'note':
      return <IconNotes size={16} />;
    case 'task':
      return <IconCircleCheck size={16} />;
    case 'project':
      return <IconBriefcase size={16} />;
    case 'time_entry':
      return <IconClock size={16} />;
    case 'tag':
      return <IconTag size={16} />;
    default:
      return <IconNotes size={16} />;
  }
};

const getActivityColor = (type: ActivityItem['type']) => {
  switch (type) {
    case 'note':
      return 'blue';
    case 'task':
      return 'green';
    case 'project':
      return 'violet';
    case 'time_entry':
      return 'orange';
    case 'tag':
      return 'pink';
    default:
      return 'gray';
  }
};

const formatTimestamp = (timestamp: number): string => {
  // Defensive validation to handle invalid timestamps
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return 'Unknown time';

  const now = Date.now() / 1000;
  const diff = now - ts;

  if (!Number.isFinite(diff)) return 'Unknown time';
  if (diff < 0) return 'In the future';

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? 'Unknown time' : d.toLocaleDateString();
};

export interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
  showTimeAgo?: boolean;
}

export function ActivityTimeline({ activities, maxItems = 10, showTimeAgo = true }: ActivityTimelineProps) {
  const sortedActivities = [...activities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxItems);

  if (sortedActivities.length === 0) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md" align="center" py="xl">
          <IconNotes size={48} stroke={1.5} color="gray" />
          <Text c="dimmed">No recent activity</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Text size="lg" fw={600} mb="md">
        Recent Activity
      </Text>

      <Timeline active={sortedActivities.length} bulletSize={24} lineWidth={2}>
        {sortedActivities.map((activity) => (
          <Timeline.Item
            key={activity.id}
            bullet={getActivityIcon(activity.type)}
            title={
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  {activity.title}
                </Text>
                <Badge size="xs" color={getActivityColor(activity.type)}>
                  {activity.type}
                </Badge>
              </Group>
            }
          >
            {activity.description && (
              <Text size="sm" c="dimmed" mt={4}>
                {activity.description}
              </Text>
            )}
            {showTimeAgo && (
              <Text size="xs" c="dimmed" mt={4}>
                {formatTimestamp(activity.timestamp)}
              </Text>
            )}
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  );
}

// Compact variant
export function CompactActivityList({ activities, maxItems = 5 }: ActivityTimelineProps) {
  const sortedActivities = [...activities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxItems);

  return (
    <Stack gap="xs">
      {sortedActivities.map((activity) => (
        <Group key={activity.id} gap="xs" p="xs" style={{ borderRadius: 4, ':hover': { backgroundColor: 'var(--mantine-color-gray-0)' } }}>
          <div style={{ color: `var(--mantine-color-${getActivityColor(activity.type)}-6)` }}>
            {getActivityIcon(activity.type)}
          </div>
          <Stack gap={0} style={{ flex: 1 }}>
            <Text size="sm" fw={500} lineClamp={1}>
              {activity.title}
            </Text>
            <Text size="xs" c="dimmed">
              {formatTimestamp(activity.timestamp)}
            </Text>
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}
