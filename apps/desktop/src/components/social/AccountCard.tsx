/**
 * AccountCard Component
 *
 * Displays a single social media account with actions
 */

import {
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  Switch,
  Menu,
  Button,
  Modal,
  Select,
  NumberInput,
  Stack,
} from '@mantine/core';
import { IconDots, IconTrash, IconSettings, IconExternalLink } from '@tabler/icons-react';
import { invoke } from '@tauri-apps/api/tauri';
import type { SocialAccount } from '@noteece/types';
import { SUPPORTED_PLATFORMS } from '@noteece/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSocialAccount, deleteSocialAccount } from '../../services/socialApi';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

interface AccountCardProperties {
  account: SocialAccount;
}

export function AccountCard({ account }: AccountCardProperties) {
  const queryClient = useQueryClient();
  const platform = SUPPORTED_PLATFORMS[account.platform as keyof typeof SUPPORTED_PLATFORMS];
  const [settingsModalOpened, setSettingsModalOpened] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState<number | string>(account.sync_frequency_minutes || 60);

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => updateSocialAccount(account.id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts'] });
      notifications.show({
        title: 'Success',
        message: `Account ${account.enabled ? 'disabled' : 'enabled'}`,
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: `Failed to update account: ${String(error)}`,
        color: 'red',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSocialAccount(account.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts'] });
      notifications.show({
        title: 'Success',
        message: 'Account deleted',
        color: 'green',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: `Failed to delete account: ${String(error)}`,
        color: 'red',
      });
    },
  });

  const openWebViewMutation = useMutation({
    mutationFn: async () => {
      return await invoke<string>('open_social_webview', {
        accountId: account.id,
      });
    },
    onSuccess: (windowLabel) => {
      notifications.show({
        title: 'WebView Opened',
        message: `${platform?.name || 'Social media'} window opened. Login and browse to extract content.`,
        color: 'blue',
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: `Failed to open WebView: ${String(error)}`,
        color: 'red',
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate(checked);
  };

  const handleOpenWebView = () => {
    openWebViewMutation.mutate();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete @${account.username} from ${platform?.name}?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group>
          <Text size="xl">{platform?.icon || '📱'}</Text>
          <div>
            <Text fw={700}>{account.display_name || account.username}</Text>
            <Text size="sm" c="dimmed">
              @{account.username}
            </Text>
          </div>
        </Group>
        <Group>
          <Switch
            checked={account.enabled}
            onChange={(event) => handleToggle(event.currentTarget.checked)}
            disabled={toggleMutation.isPending}
          />
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle">
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconSettings size={14} />}
                onClick={() => {
                  // Open account settings modal
                  setSettingsModalOpened(true);
                }}
              >
                Settings
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>
                Delete Account
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Group mt="md">
        <Badge color={platform?.color || 'gray'} variant="light">
          {platform?.name || account.platform}
        </Badge>
        {account.last_sync ? (
          <Badge color="green" variant="outline">
            Last synced: {new Date(account.last_sync * 1000).toLocaleString()}
          </Badge>
        ) : (
          <Badge color="gray" variant="outline">
            Never synced
          </Badge>
        )}
        {account.sync_frequency_minutes && (
          <Badge variant="outline">Sync every {account.sync_frequency_minutes}min</Badge>
        )}
      </Group>

      <Group mt="md" justify="space-between">
        <Button
          leftSection={<IconExternalLink size={16} />}
          onClick={handleOpenWebView}
          loading={openWebViewMutation.isPending}
          variant="light"
          size="sm"
        >
          Open in WebView
        </Button>
        <Text size="xs" c="dimmed">
          Login and browse to extract content automatically
        </Text>
      </Group>

      {/* Settings Modal */}
      <Modal
        opened={settingsModalOpened}
        onClose={() => setSettingsModalOpened(false)}
        title={`${platform?.name || 'Account'} Settings`}
      >
        <Stack gap="md">
          <NumberInput
            label="Sync Frequency (minutes)"
            description="How often to sync this account"
            placeholder="Enter sync frequency"
            value={syncFrequency}
            onChange={setSyncFrequency}
            min={5}
            max={1440}
          />
          <Select
            label="Extraction Mode"
            description="How to extract content from this platform"
            placeholder="Select extraction mode"
            data={[
              { value: 'webview', label: 'WebView (Manual)' },
              { value: 'api', label: 'API (If Available)' },
              { value: 'hybrid', label: 'Hybrid (WebView + API)' },
            ]}
            defaultValue="webview"
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setSettingsModalOpened(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                updateSocialAccount(account.id, {
                  syncFrequencyMinutes: Number(syncFrequency),
                });
                setSettingsModalOpened(false);
                notifications.show({
                  title: 'Success',
                  message: 'Account settings updated',
                  color: 'green',
                });
              }}
            >
              Save Settings
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}
