import React, { useState } from 'react';
import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  ActionIcon,
  Popover,
  ScrollArea,
  UnstyledButton,
  Divider,
  Indicator,
} from '@mantine/core';
import {
  IconBell,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconInfoCircle,
  IconCheckCircle,
  IconAlertTriangle,
} from '@tabler/icons-react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionable?: boolean;
  action?: () => void;
  actionLabel?: string;
}

export interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
  onDismissAll?: () => void;
  maxHeight?: number;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <IconCheckCircle size={18} color="var(--mantine-color-green-6)" />;
    case 'warning':
      return <IconAlertTriangle size={18} color="var(--mantine-color-yellow-6)" />;
    case 'error':
      return <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />;
    default:
      return <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />;
  }
};

const getNotificationColor = (type: Notification['type']): string => {
  switch (type) {
    case 'success':
      return 'green';
    case 'warning':
      return 'yellow';
    case 'error':
      return 'red';
    default:
      return 'blue';
  }
};

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onDismissAll,
  maxHeight = 400,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (notifications.length === 0) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md" align="center" py="xl">
          <IconBell size={48} stroke={1.5} color="var(--mantine-color-gray-4)" />
          <Text c="dimmed">No notifications</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <IconBell size={20} />
            <Text size="lg" fw={600}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Badge variant="filled" color="red" size="sm">
                {unreadCount}
              </Badge>
            )}
          </Group>
          <Group gap="xs">
            {unreadCount > 0 && onMarkAllAsRead && (
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
              >
                <IconCheck size={16} />
              </ActionIcon>
            )}
            {notifications.length > 0 && onDismissAll && (
              <ActionIcon
                variant="subtle"
                size="sm"
                color="red"
                onClick={onDismissAll}
                title="Dismiss all"
              >
                <IconX size={16} />
              </ActionIcon>
            )}
          </Group>
        </Group>

        {/* Notifications List */}
        <ScrollArea style={{ maxHeight }}>
          <Stack gap="xs">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                padding="md"
                radius="md"
                withBorder
                style={{
                  backgroundColor: notification.read
                    ? 'transparent'
                    : 'var(--mantine-color-gray-0)',
                  borderLeft: `4px solid var(--mantine-color-${getNotificationColor(
                    notification.type
                  )}-6)`,
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Group gap="xs" align="flex-start" style={{ flex: 1 }}>
                      {getNotificationIcon(notification.type)}
                      <Stack gap={4} style={{ flex: 1 }}>
                        <Text size="sm" fw={notification.read ? 400 : 600}>
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {notification.message}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatTimestamp(notification.timestamp)}
                        </Text>
                      </Stack>
                    </Group>

                    <Group gap={4}>
                      {!notification.read && onMarkAsRead && (
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          onClick={() => onMarkAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <IconCheck size={14} />
                        </ActionIcon>
                      )}
                      {onDismiss && (
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          color="red"
                          onClick={() => onDismiss(notification.id)}
                          title="Dismiss"
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Group>

                  {notification.actionable && notification.action && (
                    <UnstyledButton
                      onClick={notification.action}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        backgroundColor: `var(--mantine-color-${getNotificationColor(
                          notification.type
                        )}-1)`,
                        color: `var(--mantine-color-${getNotificationColor(
                          notification.type
                        )}-7)`,
                        fontSize: '12px',
                        fontWeight: 600,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {notification.actionLabel || 'Take Action'}
                    </UnstyledButton>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
      </Stack>
    </Card>
  );
}

// Compact popover variant
export function NotificationPopover({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}: Omit<NotificationCenterProps, 'onDismissAll' | 'maxHeight'>) {
  const [opened, setOpened] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover
      width={360}
      position="bottom-end"
      shadow="md"
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => setOpened((o) => !o)}
          style={{ position: 'relative' }}
        >
          <Indicator
            inline
            label={unreadCount > 0 ? unreadCount : undefined}
            size={16}
            offset={4}
            disabled={unreadCount === 0}
            color="red"
          >
            <IconBell size={20} />
          </Indicator>
        </ActionIcon>
      </Popover.Target>

      <Popover.Dropdown p="xs">
        <Stack gap="xs">
          <Group justify="space-between" px="xs">
            <Text size="sm" fw={600}>
              Notifications
            </Text>
            {unreadCount > 0 && onMarkAllAsRead && (
              <UnstyledButton
                onClick={() => {
                  onMarkAllAsRead();
                  setOpened(false);
                }}
                style={{
                  fontSize: '12px',
                  color: 'var(--mantine-color-blue-6)',
                  fontWeight: 600,
                }}
              >
                Mark all read
              </UnstyledButton>
            )}
          </Group>

          <Divider />

          {notifications.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No notifications
            </Text>
          ) : (
            <ScrollArea style={{ maxHeight: 320 }}>
              <Stack gap={4}>
                {notifications.slice(0, 10).map((notification) => (
                  <UnstyledButton
                    key={notification.id}
                    onClick={() => {
                      if (notification.action) {
                        notification.action();
                        setOpened(false);
                      }
                      if (onMarkAsRead && !notification.read) {
                        onMarkAsRead(notification.id);
                      }
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: 4,
                      backgroundColor: notification.read
                        ? 'transparent'
                        : 'var(--mantine-color-gray-0)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <Group gap="xs" align="flex-start" wrap="nowrap">
                      {getNotificationIcon(notification.type)}
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Text
                          size="xs"
                          fw={notification.read ? 400 : 600}
                          lineClamp={1}
                        >
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {notification.message}
                        </Text>
                      </Stack>
                      {!notification.read && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: 'var(--mantine-color-blue-6)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
