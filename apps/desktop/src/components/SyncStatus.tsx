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

interface SyncDevice {
  id: string;
  name: string;
  lastSync: number;
  status: 'online' | 'offline';
}

interface SyncConflict {
  id: string;
  noteId: string;
  noteTitle: string;
  deviceA: string;
  deviceB: string;
  timestamp: number;
  resolved: boolean;
}

interface SyncEvent {
  id: string;
  type: 'push' | 'pull' | 'conflict' | 'error';
  message: string;
  timestamp: number;
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
  // In a real implementation, this would connect to the Rust backend sync system
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now() - 5 * 60 * 1000);
  const [syncProgress, setSyncProgress] = useState(0);
  const [settingsModalOpened, setSettingsModalOpened] = useState(false);
  const [conflictModalOpened, setConflictModalOpened] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

  // Mock data - in reality this would come from the backend
  const [devices] = useState<SyncDevice[]>([
    { id: '1', name: 'MacBook Pro', lastSync: Date.now() - 5 * 60 * 1000, status: 'online' },
    { id: '2', name: 'Windows Desktop', lastSync: Date.now() - 2 * 60 * 60 * 1000, status: 'offline' },
    { id: '3', name: 'iPad', lastSync: Date.now() - 30 * 60 * 1000, status: 'online' },
  ]);

  const [conflicts] = useState<SyncConflict[]>([
    {
      id: '1',
      noteId: 'note-123',
      noteTitle: 'Project Planning',
      deviceA: 'MacBook Pro',
      deviceB: 'Windows Desktop',
      timestamp: Date.now() - 1 * 60 * 60 * 1000,
      resolved: false,
    },
    {
      id: '2',
      noteId: 'note-456',
      noteTitle: 'Meeting Notes',
      deviceA: 'iPad',
      deviceB: 'MacBook Pro',
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      resolved: true,
    },
  ]);

  const [syncEvents] = useState<SyncEvent[]>([
    {
      id: '1',
      type: 'push',
      message: 'Synced 5 notes to cloud',
      timestamp: Date.now() - 5 * 60 * 1000,
    },
    {
      id: '2',
      type: 'pull',
      message: 'Pulled 3 notes from cloud',
      timestamp: Date.now() - 15 * 60 * 1000,
    },
    {
      id: '3',
      type: 'conflict',
      message: "Conflict detected in 'Project Planning'",
      timestamp: Date.now() - 1 * 60 * 60 * 1000,
    },
    {
      id: '4',
      type: 'push',
      message: 'Synced 12 notes to cloud',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
    },
  ]);

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);

    // Simulate sync progress
    const interval = setInterval(() => {
      setSyncProgress((previous) => {
        if (previous >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setLastSyncTime(Date.now());
          return 100;
        }
        return previous + 10;
      });
    }, 200);
  };

  const handleResolveConflict = (conflictId: string, resolution: 'keep_a' | 'keep_b' | 'merge') => {
    console.log(`Resolving conflict ${conflictId} with resolution: ${resolution}`);
    // In reality, this would call the Rust backend to resolve the conflict
    setConflictModalOpened(false);
    setSelectedConflict(null);
  };

  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);
  const syncStatus = isSyncing ? 'syncing' : syncEnabled ? 'connected' : 'disconnected';

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
                {devices.filter((d) => d.status === 'online').length}/{devices.length}
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
                {devices.map((device) => (
                  <Table.Tr key={device.id}>
                    <Table.Td>
                      <Group gap="xs">
                        <IconDevices size={16} />
                        <Text size="sm">{device.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={device.status === 'online' ? 'green' : 'gray'} size="sm">
                        {device.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {getRelativeTime(device.lastSync)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
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
                <Card key={conflict.id} p="lg" radius="md" withBorder>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {conflict.noteTitle}
                        </Text>
                        {conflict.resolved ? (
                          <Badge color="green" size="xs" leftSection={<IconCheck size={12} />}>
                            Resolved
                          </Badge>
                        ) : (
                          <Badge color="yellow" size="xs" leftSection={<IconAlertCircle size={12} />}>
                            Pending
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        Conflict between {conflict.deviceA} and {conflict.deviceB}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {getRelativeTime(conflict.timestamp)}
                      </Text>
                    </Stack>
                    {!conflict.resolved && (
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
          <Card p="lg" radius="md" withBorder>
            <ScrollArea h={400}>
              <Timeline bulletSize={24} lineWidth={2}>
                {syncEvents.map((event) => {
                  const iconMap = {
                    push: <IconCloudUpload size={16} />,
                    pull: <IconCloudCheck size={16} />,
                    conflict: <IconAlertCircle size={16} />,
                    error: <IconX size={16} />,
                  };

                  const colorMap = {
                    push: 'blue',
                    pull: 'green',
                    conflict: 'yellow',
                    error: 'red',
                  };

                  return (
                    <Timeline.Item
                      key={event.id}
                      bullet={iconMap[event.type]}
                      title={event.message}
                      color={colorMap[event.type]}
                    >
                      <Text size="xs" c="dimmed">
                        {getRelativeTime(event.timestamp)}
                      </Text>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </ScrollArea>
          </Card>
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
              This note was modified on two different devices. Choose which version to keep, or merge them manually.
            </Alert>

            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Note: {selectedConflict.noteTitle}
              </Text>
              <Text size="xs" c="dimmed">
                Conflict occurred {getRelativeTime(selectedConflict.timestamp)}
              </Text>
            </Stack>

            <Group grow>
              <Button variant="default" onClick={() => handleResolveConflict(selectedConflict.id, 'keep_a')}>
                Keep {selectedConflict.deviceA} Version
              </Button>
              <Button variant="default" onClick={() => handleResolveConflict(selectedConflict.id, 'keep_b')}>
                Keep {selectedConflict.deviceB} Version
              </Button>
            </Group>

            <Button fullWidth onClick={() => handleResolveConflict(selectedConflict.id, 'merge')}>
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
