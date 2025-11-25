import React from 'react';
import {
  Card,
  Group,
  Stack,
  Text,
  Badge,
  Progress,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconRefresh,
  IconLink,
  IconUnlink,
} from '@tabler/icons-react';
import { SyncDevice, statusColors } from './types';

interface DeviceListProps {
  devices: SyncDevice[];
  currentDeviceId?: string;
  onSync: (deviceId: string) => void;
  onPair: () => void;
  onUnpair: (deviceId: string) => void;
}

const DeviceIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'mobile':
      return <IconDeviceMobile size={24} />;
    case 'tablet':
      return <IconDeviceTablet size={24} />;
    default:
      return <IconDeviceDesktop size={24} />;
  }
};

const formatLastSeen = (timestamp: number): string => {
  const now = Date.now() / 1000;
  const diff = now - timestamp;

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
};

/**
 * Device List Component - Shows connected devices and their sync status
 */
export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  currentDeviceId,
  onSync,
  onPair,
  onUnpair,
}) => {
  if (devices.length === 0) {
    return (
      <Card withBorder p="lg">
        <Stack align="center" gap="md">
          <IconDeviceDesktop size={48} opacity={0.5} />
          <Text c="dimmed">No devices paired</Text>
          <ActionIcon
            variant="light"
            size="lg"
            onClick={onPair}
            title="Pair a device"
          >
            <IconLink size={20} />
          </ActionIcon>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      {devices.map((device) => {
        const isCurrentDevice = device.id === currentDeviceId;

        return (
          <Card key={device.id} withBorder p="sm">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="md">
                <DeviceIcon type={device.device_type} />
                <div>
                  <Group gap="xs">
                    <Text fw={500}>{device.name}</Text>
                    {isCurrentDevice && (
                      <Badge size="xs" variant="light">
                        This device
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    Last seen: {formatLastSeen(device.last_seen)}
                  </Text>
                </div>
              </Group>

              <Group gap="xs">
                <Badge color={statusColors[device.status]} variant="light">
                  {device.status}
                </Badge>

                {!isCurrentDevice && (
                  <>
                    <Tooltip label="Sync now">
                      <ActionIcon
                        variant="subtle"
                        onClick={() => onSync(device.id)}
                        disabled={device.status === 'syncing'}
                      >
                        <IconRefresh size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Unpair device">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onUnpair(device.id)}
                      >
                        <IconUnlink size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </>
                )}
              </Group>
            </Group>

            {device.status === 'syncing' && device.sync_progress !== undefined && (
              <Progress
                value={device.sync_progress}
                size="xs"
                mt="sm"
                animated
              />
            )}
          </Card>
        );
      })}
    </Stack>
  );
};

