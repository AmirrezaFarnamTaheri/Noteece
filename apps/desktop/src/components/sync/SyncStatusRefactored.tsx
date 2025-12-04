import React, { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Progress,
  Alert,
  Tabs,
  Modal,
  Switch,
  Select,
  TextInput,
} from '@mantine/core';
import {
  IconCloudCheck,
  IconCloudOff,
  IconCloudUpload,
  IconAlertCircle,
  IconSettings,
  IconDevices,
  IconHistory,
  IconGitMerge,
} from '@tabler/icons-react';
import { LoadingCard, EmptyState } from '@noteece/ui';
import { invoke } from '@tauri-apps/api/tauri';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useStore } from '../../store';
import { DeviceList } from './DeviceList';
import { SyncHistory } from './SyncHistory';
import { ConflictResolver } from './ConflictResolver';
import type { SyncDevice, SyncConflict, SyncHistoryEntry } from './types';

// Map backend types to component types
interface BackendSyncDevice {
  device_id: string;
  device_name: string;
  device_type: 'Desktop' | 'Mobile' | 'Web';
  last_seen: number;
  sync_address: string;
  sync_port: number;
  protocol_version: string;
}

interface BackendSyncHistory {
  id: string;
  device_id: string;
  space_id: string;
  sync_time: number;
  direction: string;
  entities_pushed: number;
  entities_pulled: number;
  conflicts_detected: number;
  success: boolean;
  error_message: string | null;
}

interface BackendSyncConflict {
  entity_type: string;
  entity_id: string;
  local_version: number[];
  remote_version: number[];
  conflict_type: 'UpdateUpdate' | 'UpdateDelete' | 'DeleteUpdate';
}

/**
 * Sync Status Component - Refactored to use sub-components
 */
const SyncStatus: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeSpaceId } = useStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  const [settingsModalOpened, setSettingsModalOpened] = useState(false);

  // Fetch sync devices
  const { data: devices = [], isLoading: devicesLoading } = useQuery<BackendSyncDevice[]>({
    queryKey: ['syncDevices'],
    queryFn: () => invoke<BackendSyncDevice[]>('get_devices_cmd'),
    refetchInterval: 30_000,
  });

  // Fetch sync conflicts
  const { data: conflicts = [], isLoading: conflictsLoading } = useQuery<BackendSyncConflict[]>({
    queryKey: ['syncConflicts', activeSpaceId],
    queryFn: () =>
      activeSpaceId
        ? invoke<BackendSyncConflict[]>('get_sync_conflicts_cmd', { space_id: activeSpaceId })
        : Promise.resolve([]),
    enabled: !!activeSpaceId,
  });

  // Fetch sync history
  const { data: history = [], isLoading: historyLoading } = useQuery<BackendSyncHistory[]>({
    queryKey: ['syncHistory', activeSpaceId],
    queryFn: () =>
      activeSpaceId
        ? invoke<BackendSyncHistory[]>('get_sync_history_for_space_cmd', {
            space_id: activeSpaceId,
            limit: 50,
          })
        : Promise.resolve([]),
    enabled: !!activeSpaceId,
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      if (!activeSpaceId) throw new Error('No active space');
      setIsSyncing(true);
      setSyncProgress(0);

      // Simulate progress
      const interval = setInterval(() => {
        setSyncProgress((p) => Math.min(p + 10, 90));
      }, 200);

      try {
        await invoke('sync_with_device_cmd', {
          space_id: activeSpaceId,
          device_id: deviceId,
        });
        setSyncProgress(100);
      } finally {
        clearInterval(interval);
        setIsSyncing(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      notifications.show({
        title: 'Sync Complete',
        message: 'Your data has been synchronized',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Sync Failed',
        message: String(error),
        color: 'red',
      });
    },
  });

  // Resolve conflict mutation
  const resolveConflictMutation = useMutation({
    mutationFn: async ({ conflictId, resolution }: { conflictId: string; resolution: string }) => {
      await invoke('resolve_sync_conflict_cmd', {
        conflict_id: conflictId,
        resolution,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncConflicts'] });
      notifications.show({
        title: 'Conflict Resolved',
        message: 'The sync conflict has been resolved',
        color: 'green',
      });
    },
  });

  // Convert backend types to component types
  const mappedDevices: SyncDevice[] = devices.map((d) => ({
    id: d.device_id,
    name: d.device_name,
    device_type: d.device_type.toLowerCase(),
    last_seen: d.last_seen,
    status: 'online' as const,
    ip_address: d.sync_address,
  }));

  const mappedHistory: SyncHistoryEntry[] = history.map((h) => ({
    id: h.id,
    device_id: h.device_id,
    device_name: devices.find((d) => d.device_id === h.device_id)?.device_name || 'Unknown',
    direction: h.direction === 'push' ? 'push' : 'pull',
    entities_synced: h.entities_pushed + h.entities_pulled,
    started_at: h.sync_time,
    completed_at: h.sync_time + 5, // Approximate
    status: h.success ? 'success' : 'failed',
    error: h.error_message || undefined,
  }));

  const mappedConflicts: SyncConflict[] = conflicts.map((c) => ({
    id: `${c.entity_type}-${c.entity_id}`,
    entity_type: c.entity_type,
    entity_id: c.entity_id,
    local_version: c.local_version[0] || 0,
    remote_version: c.remote_version[0] || 0,
    conflict_data: JSON.stringify({ type: c.conflict_type }),
    created_at: Date.now() / 1000,
  }));

  const isLoading = devicesLoading || conflictsLoading || historyLoading;

  if (!activeSpaceId) {
    return (
      <Card withBorder p="xl">
        <EmptyState
          icon={<IconAlertCircle size={48} />}
          title="No Space Selected"
          description="Please select a space to view sync status"
        />
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>Sync Status</Title>
          <Text c="dimmed" size="sm">
            Manage synchronization across your devices
          </Text>
        </div>
        <Group>
          <Badge
            color={syncEnabled ? 'green' : 'gray'}
            leftSection={syncEnabled ? <IconCloudCheck size={14} /> : <IconCloudOff size={14} />}
          >
            {syncEnabled ? 'Sync Enabled' : 'Sync Disabled'}
          </Badge>
          <Button
            variant="subtle"
            leftSection={<IconSettings size={16} />}
            onClick={() => setSettingsModalOpened(true)}
          >
            Settings
          </Button>
        </Group>
      </Group>

      {/* Sync Progress */}
      {isSyncing && (
        <Card withBorder>
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconCloudUpload size={16} />
              <Text size="sm" fw={500}>
                Syncing...
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {syncProgress}%
            </Text>
          </Group>
          <Progress value={syncProgress} animated />
        </Card>
      )}

      {/* Conflict Alert */}
      {mappedConflicts.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="orange" title="Sync Conflicts Detected">
          {mappedConflicts.length} conflict{mappedConflicts.length === 1 ? '' : 's'} need your attention.
        </Alert>
      )}

      {/* Main Content */}
      <Card withBorder>
        {isLoading ? (
          <LoadingCard />
        ) : (
          <Tabs defaultValue="devices">
            <Tabs.List>
              <Tabs.Tab value="devices" leftSection={<IconDevices size={14} />}>
                Devices ({mappedDevices.length})
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={14} />}>
                History
              </Tabs.Tab>
              <Tabs.Tab
                value="conflicts"
                leftSection={<IconGitMerge size={14} />}
                color={mappedConflicts.length > 0 ? 'orange' : undefined}
              >
                Conflicts ({mappedConflicts.length})
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="devices" pt="md">
              <DeviceList
                devices={mappedDevices}
                onSync={(deviceId) => syncMutation.mutate(deviceId)}
                onPair={() => {
                  /* Open pair modal */
                }}
                onUnpair={(_deviceId) => {
                  /* Unpair device */
                }}
              />
            </Tabs.Panel>

            <Tabs.Panel value="history" pt="md">
              <SyncHistory history={mappedHistory} />
            </Tabs.Panel>

            <Tabs.Panel value="conflicts" pt="md">
              <ConflictResolver
                conflicts={mappedConflicts}
                onResolve={(conflictId, resolution) => resolveConflictMutation.mutate({ conflictId, resolution })}
              />
            </Tabs.Panel>
          </Tabs>
        )}
      </Card>

      {/* Settings Modal */}
      <Modal opened={settingsModalOpened} onClose={() => setSettingsModalOpened(false)} title="Sync Settings">
        <Stack gap="md">
          <Switch
            label="Enable Sync"
            description="Allow this device to sync with others"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.currentTarget.checked)}
          />
          <Switch
            label="Auto Sync"
            description="Automatically sync when changes are detected"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.currentTarget.checked)}
          />
          <Select
            label="Sync Frequency"
            defaultValue="5"
            data={[
              { value: '1', label: 'Every minute' },
              { value: '5', label: 'Every 5 minutes' },
              { value: '15', label: 'Every 15 minutes' },
              { value: '30', label: 'Every 30 minutes' },
            ]}
          />
          <TextInput label="Device Name" defaultValue="My Desktop" description="How this device appears to others" />
          <Group justify="flex-end" mt="md">
            <Button onClick={() => setSettingsModalOpened(false)}>Save Settings</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export default SyncStatus;
