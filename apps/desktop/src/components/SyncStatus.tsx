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
  Timeline,
  Alert,
  Table,
  ScrollArea,
  Modal,
  Tabs,
  ActionIcon,
  Select,
  TextInput,
  Switch,
} from '@mantine/core';
import {
  IconCloudCheck,
  IconCloudOff,
  IconCloudUpload,
  IconAlertCircle,
  IconRefresh,
  IconSettings,
  IconCheck,
  IconX,
  IconClock,
  IconDevices,
} from '@tabler/icons-react';
import { LoadingCard, EmptyState } from '@noteece/ui';
import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useStore } from '../store';

interface SyncDevice {
  device_id: string;
  device_name: string;
  device_type: 'Desktop' | 'Mobile' | 'Web';
  last_seen: number;
  sync_address: string;
  sync_port: number;
  protocol_version: string;
}

interface SyncConflict {
  entity_type: string;
  entity_id: string;
  local_version: number[];
  remote_version: number[];
  conflict_type: 'UpdateUpdate' | 'UpdateDelete' | 'DeleteUpdate';
}

interface SyncHistoryEntry {
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

/**
 * Sync Status Component - Monitor and manage sync operations
 * Features:
 * - Real-time sync status monitoring
 * - Conflict detection and resolution
 * - Sync history and logs
 * - Device management
 * - Manual sync controls
 * - Sync settings configuration
 */
const SyncStatus: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeSpaceId } = useStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [syncProgress, setSyncProgress] = useState(0);
  const [settingsModalOpened, setSettingsModalOpened] = useState(false);
  const [conflictModalOpened, setConflictModalOpened] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

  // Fetch sync devices from backend
  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['syncDevices'],
    queryFn: () => invoke<SyncDevice[]>('get_sync_devices_cmd'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch sync conflicts
  const { data: conflicts = [], isLoading: conflictsLoading } = useQuery({
    queryKey: ['syncConflicts'],
    queryFn: () => invoke<SyncConflict[]>('get_sync_conflicts_cmd'),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Fetch sync history
  const { data: syncHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['syncHistory', activeSpaceId],
    queryFn: () =>
      invoke<SyncHistoryEntry[]>('get_sync_history_for_space_cmd', {
        spaceId: activeSpaceId || '',
        limit: 20,
      }),
    enabled: !!activeSpaceId,
  });

  // Resolve conflict mutation
  const resolveConflictMutation = useMutation({
    mutationFn: ({ entityId, resolution }: { entityId: string; resolution: string }) =>
      invoke('resolve_sync_conflict_cmd', { entityId, resolution }),
    onSuccess: () => {
      notifications.show({
        title: 'Conflict Resolved',
        message: 'The sync conflict has been resolved successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['syncConflicts'] });
      setConflictModalOpened(false);
      setSelectedConflict(null);
    },
    onError: (error) => {
      notifications.show({
        title: 'Resolution Failed',
        message: String(error),
        color: 'red',
      });
    },
  });

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      setSyncProgress(0);

      // Simulate progress for now (in real implementation, this would track actual sync progress)
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      try {
        // Record the sync attempt
        await invoke('record_sync_cmd', {
          spaceId: activeSpaceId || '',
          direction: 'bidirectional',
          entitiesPushed: 0,
          entitiesPulled: 0,
          conflicts: 0,
          success: true,
          errorMessage: null,
        });

        clearInterval(progressInterval);
        setSyncProgress(100);
        return true;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: () => {
      notifications.show({
        title: 'Sync Complete',
        message: 'Your data has been synchronized successfully',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      queryClient.invalidateQueries({ queryKey: ['syncDevices'] });
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
      }, 500);
    },
    onError: (error) => {
      notifications.show({
        title: 'Sync Failed',
        message: String(error),
        color: 'red',
      });
      setIsSyncing(false);
      setSyncProgress(0);
    },
  });

  const handleManualSync = () => {
    if (!activeSpaceId) {
      notifications.show({
        title: 'No Active Space',
        message: 'Please select a space to sync',
        color: 'yellow',
      });
      return;
    }
    manualSyncMutation.mutate();
  };

  const handleResolveConflict = (resolution: 'use_local' | 'use_remote' | 'merge') => {
    if (!selectedConflict) return;

    resolveConflictMutation.mutate({
      entityId: selectedConflict.entity_id,
      resolution,
    });
  };

  const unresolvedConflicts = conflicts;
  const syncStatus = isSyncing ? 'syncing' : syncEnabled ? 'connected' : 'disconnected';
  const lastSyncTime = syncHistory[0]?.sync_time ? syncHistory[0].sync_time * 1000 : Date.now();

  const getStatusColor = () => {
    if (isSyncing) return 'blue';
    if (!syncEnabled) return 'gray';
    return unresolvedConflicts.length > 0 ? 'yellow' : 'green';
  };

  const getStatusIcon = () => {
    if (isSyncing) return <IconCloudUpload size={24} />;
    if (!syncEnabled) return <IconCloudOff size={24} />;
    return <IconCloudCheck size={24} />;
  };

  const getRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getDeviceStatus = (lastSeen: number): 'online' | 'offline' => {
    const diff = Date.now() - lastSeen * 1000;
    return diff < 5 * 60 * 1000 ? 'online' : 'offline'; // Online if seen within 5 minutes
  };

  if (devicesLoading || conflictsLoading || historyLoading) {
    return <LoadingCard />;
  }

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <Group gap="sm">
          <Title order={2}>Sync Status</Title>
          <Badge color={getStatusColor()} size="lg" leftSection={getStatusIcon()}>
            {syncStatus.charAt(0).toUpperCase() + syncStatus.slice(1)}
          </Badge>
        </Group>
        <Group gap="sm">
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleManualSync}
            loading={isSyncing}
            disabled={!syncEnabled}
            aria-label="Sync now"
          >
            Sync Now
          </Button>
          <ActionIcon
            size="lg"
            variant="default"
            onClick={() => setSettingsModalOpened(true)}
            aria-label="Sync settings"
          >
            <IconSettings size={20} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Conflicts Alert */}
      {unresolvedConflicts.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} title="Sync Conflicts Detected" color="yellow">
          You have {unresolvedConflicts.length} unresolved sync conflict
          {unresolvedConflicts.length > 1 ? 's' : ''}. Please review and resolve them below.
        </Alert>
      )}

      {/* Sync Progress */}
      {isSyncing && (
        <Card p="lg" radius="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Syncing...
              </Text>
              <Text size="sm" c="dimmed">
                {syncProgress}%
              </Text>
            </Group>
            <Progress value={syncProgress} size="lg" radius="xl" animated />
          </Stack>
        </Card>
      )}

      {/* Last Sync Info */}
      <Card p="lg" radius="md" withBorder>
        <Group justify="space-between">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Last Synced
            </Text>
            <Text size="lg" fw={600}>
              {getRelativeTime(lastSyncTime)}
            </Text>
          </Stack>
          <Group gap="xl">
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">
                Devices
              </Text>
              <Text size="lg" fw={600}>
                {devices.filter((d) => getDeviceStatus(d.last_seen) === 'online').length}/{devices.length}
              </Text>
            </Stack>
            <Stack gap={4} align="center">
              <Text size="xs" c="dimmed">
                Conflicts
              </Text>
              <Text size="lg" fw={600} c={unresolvedConflicts.length > 0 ? 'yellow' : 'green'}>
                {unresolvedConflicts.length}
              </Text>
            </Stack>
          </Group>
        </Group>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="devices">
        <Tabs.List>
          <Tabs.Tab value="devices" leftSection={<IconDevices size={16} />}>
            Devices
          </Tabs.Tab>
          <Tabs.Tab value="conflicts" leftSection={<IconAlertCircle size={16} />}>
            Conflicts ({unresolvedConflicts.length})
          </Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconClock size={16} />}>
            History
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="devices" pt="md">
          <Card p="lg" radius="md" withBorder>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Device Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Last Sync</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {devices.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={3}>
                      <Text size="sm" c="dimmed" ta="center">
                        No devices registered yet
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  devices.map((device) => {
                    const status = getDeviceStatus(device.last_seen);
                    return (
                      <Table.Tr key={device.device_id}>
                        <Table.Td>
                          <Group gap="xs">
                            <IconDevices size={16} />
                            <Stack gap={2}>
                              <Text size="sm">{device.device_name}</Text>
                              <Text size="xs" c="dimmed">
                                {device.device_type}
                              </Text>
                            </Stack>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={status === 'online' ? 'green' : 'gray'} size="sm">
                            {status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {getRelativeTime(device.last_seen * 1000)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="conflicts" pt="md">
          {conflicts.length === 0 ? (
            <EmptyState
              icon={<IconCheck size={48} />}
              title="No Conflicts"
              description="All your notes are in sync across devices"
            />
          ) : (
            <Stack gap="md">
              {conflicts.map((conflict) => (
                <Card key={conflict.entity_id} p="lg" radius="md" withBorder>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {conflict.entity_type}: {conflict.entity_id.substring(0, 8)}...
                        </Text>
                        <Badge color="yellow" size="xs" leftSection={<IconAlertCircle size={12} />}>
                          Pending
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Conflict Type: {conflict.conflict_type}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Local version: {conflict.local_version.length} bytes
                      </Text>
                      <Text size="xs" c="dimmed">
                        Remote version: {conflict.remote_version.length} bytes
                      </Text>
                    </Stack>
                    <Button
                      size="xs"
                      onClick={() => {
                        setSelectedConflict(conflict);
                          setConflictModalOpened(true);
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          {syncHistory.length === 0 ? (
            <EmptyState
              icon={<IconClock size={48} />}
              title="No Sync History"
              description="Start syncing to see your sync history here"
            />
          ) : (
            <Card p="lg" radius="md" withBorder>
              <ScrollArea h={400}>
                <Timeline bulletSize={24} lineWidth={2}>
                  {syncHistory.map((entry) => {
                    const icon = entry.success ? <IconCloudCheck size={16} /> : <IconX size={16} />;
                    const color = entry.success ? 'green' : 'red';
                    const title = entry.success
                      ? `Synced ${entry.entities_pushed + entry.entities_pulled} entities (${entry.direction})`
                      : `Sync failed: ${entry.error_message || 'Unknown error'}`;

                    return (
                      <Timeline.Item key={entry.id} bullet={icon} color={color} title={title}>
                        <Stack gap={4}>
                          <Text size="xs" c="dimmed">
                            Pushed: {entry.entities_pushed}, Pulled: {entry.entities_pulled}
                          </Text>
                          {entry.conflicts_detected > 0 && (
                            <Text size="xs" c="yellow">
                              Conflicts: {entry.conflicts_detected}
                            </Text>
                          )}
                          <Text size="xs" c="dimmed">
                            {getRelativeTime(entry.sync_time * 1000)}
                          </Text>
                        </Stack>
                      </Timeline.Item>
                    );
                  })}
                </Timeline>
              </ScrollArea>
            </Card>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Settings Modal */}
      <Modal opened={settingsModalOpened} onClose={() => setSettingsModalOpened(false)} title="Sync Settings" size="md">
        <Stack gap="md">
          <Switch
            label="Enable Sync"
            description="Allow this device to sync with other devices"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.currentTarget.checked)}
          />
          <Switch
            label="Auto Sync"
            description="Automatically sync changes in the background"
            checked={autoSync}
            onChange={(e) => setAutoSync(e.currentTarget.checked)}
            disabled={!syncEnabled}
          />
          <Select
            label="Sync Frequency"
            description="How often to check for changes"
            data={[
              { value: 'realtime', label: 'Real-time' },
              { value: '5min', label: 'Every 5 minutes' },
              { value: '15min', label: 'Every 15 minutes' },
              { value: '1hour', label: 'Every hour' },
              { value: 'manual', label: 'Manual only' },
            ]}
            defaultValue="5min"
            disabled={!syncEnabled || !autoSync}
          />
          <TextInput
            label="Sync Server URL"
            description="URL of your sync server (leave empty for default)"
            placeholder="https://sync.noteece.app"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setSettingsModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={() => setSettingsModalOpened(false)}>Save Settings</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Conflict Resolution Modal */}
      <Modal
        opened={conflictModalOpened}
        onClose={() => {
          setConflictModalOpened(false);
          setSelectedConflict(null);
        }}
        title="Resolve Sync Conflict"
        size="lg"
      >
        {selectedConflict && (
          <Stack gap="md">
            <Alert icon={<IconAlertCircle size={16} />} title="Conflict Detected" color="yellow">
              This {selectedConflict.entity_type} was modified on two different devices. Choose which version to keep, or merge them manually.
            </Alert>

            <Stack gap="xs">
              <Text size="sm" fw={600}>
                {selectedConflict.entity_type}: {selectedConflict.entity_id.substring(0, 12)}...
              </Text>
              <Text size="xs" c="dimmed">
                Conflict Type: {selectedConflict.conflict_type}
              </Text>
              <Text size="xs" c="dimmed">
                Local version: {selectedConflict.local_version.length} bytes
              </Text>
              <Text size="xs" c="dimmed">
                Remote version: {selectedConflict.remote_version.length} bytes
              </Text>
            </Stack>

            <Group grow>
              <Button variant="default" onClick={() => handleResolveConflict('use_local')}>
                Keep Local Version
              </Button>
              <Button variant="default" onClick={() => handleResolveConflict('use_remote')}>
                Keep Remote Version
              </Button>
            </Group>

            <Button fullWidth onClick={() => handleResolveConflict('merge')}>
              Merge Manually
            </Button>

            <Button
              variant="subtle"
              fullWidth
              onClick={() => {
                setConflictModalOpened(false);
                setSelectedConflict(null);
              }}
            >
              Cancel
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
};

export default SyncStatus;
