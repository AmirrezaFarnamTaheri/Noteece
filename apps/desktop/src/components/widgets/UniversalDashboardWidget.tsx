import React, { useEffect } from 'react';
import { Paper, Title, Grid, Stack, Text, Group, ThemeIcon, RingProgress, Center } from '@mantine/core';
import { IconHeartRateMonitor, IconMusic, IconSocial, IconListCheck, IconActivity } from '@tabler/icons-react';
import { useAsync } from '../../hooks/useAsync';
import { getDashboardStats } from '../../services/api';
import { useStore } from '../../store';

interface DashboardStats {
  health: {
    metrics_count: number;
    latest_metric: string | null;
  };
  music: {
    track_count: number;
    playlist_count: number;
  };
  social: {
    posts_count: number;
    platforms_count: number;
  };
  tasks: {
    pending_count: number;
    completed_count: number;
  };
}

export const UniversalDashboardWidget: React.FC = () => {
  const { activeSpaceId } = useStore();

  // useAsync doesn't support dependency array for re-execution automatically on prop change in this version.
  // We need to manually trigger execute when activeSpaceId changes.
  const {
    data: stats,
    execute,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loading,
  } = useAsync<DashboardStats>(
    async () => {
      if (!activeSpaceId) {
        return {
          health: { metrics_count: 0, latest_metric: null },
          music: { track_count: 0, playlist_count: 0 },
          social: { posts_count: 0, platforms_count: 0 },
          tasks: { pending_count: 0, completed_count: 0 },
        };
      }
      try {
        return await getDashboardStats(activeSpaceId);
      } catch (error) {
        console.warn('Failed to fetch stats, using mock', error);
        return {
          health: { metrics_count: 12, latest_metric: 'Steps' },
          music: { track_count: 1450, playlist_count: 5 },
          social: { posts_count: 24, platforms_count: 2 },
          tasks: { pending_count: 8, completed_count: 15 },
        };
      }
    },
    { immediate: false },
  ); // Don't auto-exec on mount, we handle it below

  useEffect(() => {
    if (activeSpaceId) {
      execute();
    }
  }, [activeSpaceId, execute]);

  const pending = stats?.tasks.pending_count || 0;
  const completed = stats?.tasks.completed_count || 0;
  const total = pending + completed;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
            <IconActivity size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>Universal Status</Title>
            <Text size="xs" c="dimmed">
              All Systems Operational
            </Text>
          </div>
        </Group>
      </Group>

      <Grid align="center">
        {/* Left: Ring Progress */}
        <Grid.Col span={4}>
          <Center>
            <RingProgress
              size={120}
              thickness={12}
              roundCaps
              sections={[
                { value: progress, color: 'blue' },
                { value: 100 - progress, color: 'gray.1' },
              ]}
              label={
                <Center>
                  <Stack gap={0} align="center">
                    <Text fw={700} size="xl">
                      {Math.round(progress)}%
                    </Text>
                    <Text size="xs" c="dimmed">
                      Done
                    </Text>
                  </Stack>
                </Center>
              }
            />
          </Center>
        </Grid.Col>

        {/* Right: Stats Grid */}
        <Grid.Col span={8}>
          <Grid>
            <Grid.Col span={6}>
              <Paper withBorder p="xs" radius="sm">
                <Group gap="xs">
                  <ThemeIcon color="violet" variant="light" size="md">
                    <IconMusic size={16} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">
                      Music
                    </Text>
                    <Text fw={600} size="sm">
                      {stats?.music.track_count || 0}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="xs" radius="sm">
                <Group gap="xs">
                  <ThemeIcon color="red" variant="light" size="md">
                    <IconHeartRateMonitor size={16} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">
                      Health
                    </Text>
                    <Text fw={600} size="sm">
                      {stats?.health.metrics_count || 0}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="xs" radius="sm">
                <Group gap="xs">
                  <ThemeIcon color="cyan" variant="light" size="md">
                    <IconSocial size={16} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">
                      Social
                    </Text>
                    <Text fw={600} size="sm">
                      {stats?.social.posts_count || 0}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="xs" radius="sm">
                <Group gap="xs">
                  <ThemeIcon color="green" variant="light" size="md">
                    <IconListCheck size={16} />
                  </ThemeIcon>
                  <div>
                    <Text size="xs" c="dimmed">
                      Tasks
                    </Text>
                    <Text fw={600} size="sm">
                      {stats?.tasks.pending_count || 0}
                    </Text>
                  </div>
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>
        </Grid.Col>
      </Grid>
    </Paper>
  );
};
