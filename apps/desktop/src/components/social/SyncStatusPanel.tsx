/**
 * SyncStatusPanel Component
 *
 * Displays sync status and statistics for social media accounts
 */

import { Card, Group, Text, Badge, Stack, Progress, Title } from '@mantine/core';
import { IconClock, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';

interface SyncStats {
  total_accounts: number;
  accounts_synced_today: number;
  total_syncs_today: number;
  average_posts_per_sync: number;
  last_sync_time: number | null;
}

interface SyncTask {
  account_id: string;
  platform: string;
  username: string;
  last_sync: number | null;
  sync_frequency_minutes: number;
  next_sync: number;
}

interface SyncStatusPanelProperties {
  spaceId: string;
}

export function SyncStatusPanel({ spaceId }: SyncStatusPanelProperties) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['syncStats', spaceId],
    queryFn: async () => {
      return await invoke<SyncStats>('get_sync_stats_cmd', { spaceId });
    },
    refetchInterval: 30_000, // Refresh every 30 seconds
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['syncTasks', spaceId],
    queryFn: async () => {
      return await invoke<SyncTask[]>('get_sync_tasks_cmd', { spaceId });
    },
    refetchInterval: 30_000,
  });

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - date.getTime();

    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getSyncProgress = () => {
    if (!stats) return 0;
    if (stats.total_accounts === 0) return 0;
    return (stats.accounts_synced_today / stats.total_accounts) * 100;
  };

  if (statsLoading || tasksLoading) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>Loading sync status...</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {/* Sync Statistics Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Sync Status</Title>
          <Badge leftSection={<IconClock size={14} />} variant="light" color="blue">
            Auto-sync enabled
          </Badge>
        </Group>

        <Stack gap="md">
          {/* Progress */}
          <div>
            <Group justify="space-between" mb="xs">
              <Text size="sm" fw={500}>
                Daily Sync Progress
              </Text>
              <Text size="sm" c="dimmed">
                {stats?.accounts_synced_today || 0} / {stats?.total_accounts || 0} accounts
              </Text>
            </Group>
            <Progress value={getSyncProgress()} color="blue" size="lg" radius="xl" />
          </div>

          {/* Statistics Grid */}
          <Group grow>
            <Card padding="md" radius="md" withBorder bg="blue.0">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Syncs Today
              </Text>
              <Text size="xl" fw={700} c="blue">
                {stats?.total_syncs_today || 0}
              </Text>
            </Card>

            <Card padding="md" radius="md" withBorder bg="green.0">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Avg Posts/Sync
              </Text>
              <Text size="xl" fw={700} c="green">
                {stats?.average_posts_per_sync.toFixed(1) || '0.0'}
              </Text>
            </Card>

            <Card padding="md" radius="md" withBorder bg="grape.0">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Last Sync
              </Text>
              <Text size="xl" fw={700} c="grape">
                {formatLastSync(stats?.last_sync_time || null)}
              </Text>
            </Card>
          </Group>
        </Stack>
      </Card>

      {/* Pending Syncs Card */}
      {tasks && tasks.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Accounts Needing Sync</Title>
            <Badge color="orange" variant="light">
              {tasks.length} pending
            </Badge>
          </Group>

          <Stack gap="sm">
            {tasks.slice(0, 5).map((task) => (
              <Card key={task.account_id} padding="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Group>
                    <IconAlertCircle size={16} color="orange" />
                    <div>
                      <Text size="sm" fw={500}>
                        @{task.username}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {task.platform}
                      </Text>
                    </div>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Last: {formatLastSync(task.last_sync)}
                  </Text>
                </Group>
              </Card>
            ))}
          </Stack>

          {tasks.length > 5 && (
            <Text size="sm" c="dimmed" ta="center" mt="md">
              +{tasks.length - 5} more accounts pending sync
            </Text>
          )}
        </Card>
      )}

      {/* No Pending Syncs */}
      {tasks && tasks.length === 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder bg="green.0">
          <Group>
            <IconCheck size={20} color="green" />
            <div>
              <Text size="sm" fw={500} c="green">
                All accounts are up to date
              </Text>
              <Text size="xs" c="dimmed">
                No accounts need syncing at this time
              </Text>
            </div>
          </Group>
        </Card>
      )}
    </Stack>
  );
}
