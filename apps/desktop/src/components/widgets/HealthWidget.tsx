import React, { useEffect, useState } from 'react';
import { Text, RingProgress, Group, Paper, Stack, ThemeIcon, Center, Button } from '@mantine/core';
import { IconHeartbeat, IconFlame, IconDroplet, IconZzz, IconPlus } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../../utils/logger';
import { useStore } from '../../store';
import { HealthMetric } from '../health/types';
import { WidgetSkeleton } from '../ui/skeletons/WidgetSkeleton';

// Helper to get icon
const getIcon = (type: string) => {
  switch (type) {
    case 'steps': {
      return <IconFlame size={18} />;
    }
    case 'water_intake':
    case 'water': {
      return <IconDroplet size={18} />;
    }
    case 'sleep_hours':
    case 'sleep': {
      return <IconZzz size={18} />;
    }
    default: {
      return <IconHeartbeat size={18} />;
    }
  }
};

// Helper to get color
const getColor = (type: string) => {
  switch (type) {
    case 'steps': {
      return 'orange';
    }
    case 'water_intake':
    case 'water': {
      return 'cyan';
    }
    case 'sleep_hours':
    case 'sleep': {
      return 'indigo';
    }
    default: {
      return 'red';
    }
  }
};

// Helper to get target (mock targets)
const getTarget = (type: string) => {
  switch (type) {
    case 'steps': {
      return 10_000;
    }
    case 'water': {
      return 2500;
    }
    case 'sleep': {
      return 8;
    }
    default: {
      return 100;
    }
  }
};

export const HealthWidget = () => {
  const { activeSpaceId } = useStore();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeSpaceId) {
      void loadMetrics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSpaceId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      // Fetch latest of each type
      const data = await invoke<HealthMetric[]>('get_health_metrics_cmd', {
        spaceId: activeSpaceId,
        metricType: null,
        limit: 20,
      });

      // Dedupe to get latest per type
      const unique: Record<string, HealthMetric> = {};
      // Sort by date desc first
      data.sort((a, b) => b.recorded_at - a.recorded_at);

      for (const m of data) {
        if (!unique[m.metric_type]) unique[m.metric_type] = m;
      }
      setMetrics(Object.values(unique));
    } catch (error) {
      logger.error('Failed to load health metrics:', error as Error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <WidgetSkeleton />;
  }

  const hasMetrics = metrics.length > 0;

  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <ThemeIcon variant="light" color="red" size="sm" radius="md">
            <IconHeartbeat size={14} />
          </ThemeIcon>
          <Text fw={700} size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
            Health
          </Text>
        </Group>
      </Group>

      {hasMetrics ? (
        <Stack gap="sm">
          {metrics.slice(0, 3).map((metric) => {
            const target = getTarget(metric.metric_type);
            const progress = Math.min((metric.value / target) * 100, 100);

            return (
              <Group key={metric.metric_type} justify="space-between" wrap="nowrap">
                <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                  <ThemeIcon variant="light" color={getColor(metric.metric_type)} size="md" radius="xl">
                    {getIcon(metric.metric_type)}
                  </ThemeIcon>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {metric.metric_type.replaceAll('_', ' ')}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {metric.value} / {target} {metric.unit}
                    </Text>
                  </div>
                </Group>
                <RingProgress
                  size={36}
                  thickness={3}
                  roundCaps
                  sections={[
                    {
                      value: progress,
                      color: getColor(metric.metric_type),
                    },
                  ]}
                  label={
                    progress >= 100 && (
                      <Center>
                        <IconPlus size={10} />
                      </Center>
                    )
                  }
                />
              </Group>
            );
          })}
        </Stack>
      ) : (
        <Stack align="center" justify="center" h={120} gap="xs">
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            <IconHeartbeat size={24} />
          </ThemeIcon>
          <Text size="sm" c="dimmed">
            No data recorded today
          </Text>
        </Stack>
      )}
    </Paper>
  );
};
