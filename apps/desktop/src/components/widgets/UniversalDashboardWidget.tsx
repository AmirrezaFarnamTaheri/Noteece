import React from 'react';
import { Paper, Title, Grid, Stack, Text, Group, ThemeIcon, RingProgress } from '@mantine/core';
import { IconHeartRateMonitor, IconMusic, IconSocial, IconListCheck } from '@tabler/icons-react';
import { useAsync } from '../../hooks/useAsync';
import { invoke } from '@tauri-apps/api/tauri';
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

  // Fetch stats
  const { data: stats, loading } = useAsync<DashboardStats>(async () => {
    if (!activeSpaceId) return null;
    return await invoke('get_dashboard_stats_cmd', { spaceId: activeSpaceId });
  }, [activeSpaceId]);

  if (loading) return <Text>Loading dashboard...</Text>;

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Stack>
        <Title order={3}>Universal Overview</Title>
        <Grid>
          {/* Tasks */}
          <Grid.Col span={6}>
            <Group>
              <ThemeIcon color="blue" variant="light" size="lg">
                <IconListCheck size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Tasks
                </Text>
                <Text fw={500}>{stats?.tasks.pending_count || 0} Pending</Text>
              </div>
            </Group>
          </Grid.Col>

          {/* Health */}
          <Grid.Col span={6}>
            <Group>
              <ThemeIcon color="red" variant="light" size="lg">
                <IconHeartRateMonitor size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Health
                </Text>
                <Text fw={500}>{stats?.health.metrics_count || 0} Metrics</Text>
              </div>
            </Group>
          </Grid.Col>

          {/* Music */}
          <Grid.Col span={6}>
            <Group>
              <ThemeIcon color="violet" variant="light" size="lg">
                <IconMusic size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Music
                </Text>
                <Text fw={500}>{stats?.music.track_count || 0} Tracks</Text>
              </div>
            </Group>
          </Grid.Col>

          {/* Social */}
          <Grid.Col span={6}>
            <Group>
              <ThemeIcon color="cyan" variant="light" size="lg">
                <IconSocial size={20} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Social
                </Text>
                <Text fw={500}>{stats?.social.posts_count || 0} Posts</Text>
              </div>
            </Group>
          </Grid.Col>
        </Grid>
      </Stack>
    </Paper>
  );
};
