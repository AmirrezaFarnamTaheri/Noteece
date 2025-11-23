import React, { useEffect, useState } from 'react';
import { Text, RingProgress, Group, Paper, Stack, ThemeIcon, Center, Loader } from '@mantine/core';
import { IconHeartbeat, IconFlame, IconDroplet, IconZzz } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '../../store';

interface HealthMetric {
  metric_type: string;
  value: number;
  unit: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'steps': {
      return <IconFlame size={20} />;
    }
    case 'water_intake': {
      return <IconDroplet size={20} />;
    }
    case 'sleep_hours': {
      return <IconZzz size={20} />;
    }
    default: {
      return <IconHeartbeat size={20} />;
    }
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'steps': {
      return 'orange';
    }
    case 'water_intake': {
      return 'cyan';
    }
    case 'sleep_hours': {
      return 'indigo';
    }
    default: {
      return 'red';
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
        limit: 20, // Get recent 20 and filter in frontend for latest unique
      });

      // Simple dedupe to get latest per type
      const unique: Record<string, HealthMetric> = {};
      for (const m of data) {
        if (!unique[m.metric_type]) unique[m.metric_type] = m;
      }
      setMetrics(Object.values(unique));
    } catch (error) {
      console.error('Failed to load health metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data if empty
  const displayMetrics =
    metrics.length > 0
      ? metrics
      : [
          { metric_type: 'steps', value: 0, unit: 'steps' },
          { metric_type: 'sleep_hours', value: 0, unit: 'hrs' },
        ];

  if (loading)
    return (
      <Center h={100}>
        <Loader size="sm" />
      </Center>
    );

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="md">
        <Text fw={700} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
          Health & Wellness
        </Text>
        <IconHeartbeat size={18} className="text-red-400" />
      </Group>

      <Stack gap="xs">
        {displayMetrics.slice(0, 3).map((metric) => (
          <Group key={metric.metric_type} justify="space-between">
            <Group gap="xs">
              <ThemeIcon variant="light" color={getColor(metric.metric_type)} size="md" radius="xl">
                {getIcon(metric.metric_type)}
              </ThemeIcon>
              <div>
                <Text size="sm" fw={600}>
                  {metric.metric_type.replace('_', ' ')}
                </Text>
                <Text size="xs" c="dimmed">
                  {metric.value} {metric.unit}
                </Text>
              </div>
            </Group>
            <RingProgress
              size={40}
              thickness={4}
              roundCaps
              sections={[
                {
                  value: Math.min((metric.value / (metric.metric_type === 'steps' ? 10_000 : 8)) * 100, 100),
                  color: getColor(metric.metric_type),
                },
              ]}
            />
          </Group>
        ))}
      </Stack>
    </Paper>
  );
};
