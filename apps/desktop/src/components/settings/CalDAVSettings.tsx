import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Container,
  Title,
  Card,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  PasswordInput,
  Select,
  Switch,
  NumberInput,
  Badge,
  Modal,
  Alert,
  Loader,
  Center,
  ActionIcon,
  Table,
} from '@mantine/core';
import { IconPlus, IconRefresh, IconTrash, IconCheck, IconAlertCircle, IconClock } from '@tabler/icons-react';

interface CalDavAccount {
  id: string;
  url: string;
  username: string;
  calendar_path: string;
  sync_token?: string;
  last_sync?: number;
  enabled: boolean;
  auto_sync: boolean;
  sync_frequency_minutes: number;
  sync_direction: 'pull' | 'push' | 'bidirectional';
  created_at: number;
}

interface SyncResult {
  account_id: string;
  sync_time: number;
  direction: string;
  events_pulled: number;
  events_pushed: number;
  conflicts: number;
  errors: string[];
  success: boolean;
}

const CalDAVSettings: React.FC = () => {
  const [accounts, setAccounts] = useState<CalDavAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const syncingMapRef = React.useRef<Set<string>>(new Set());

  // Safe number parser to prevent NaN in UI
  const safeNum = (v: unknown): number => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formCalendarPath, setFormCalendarPath] = useState('/calendars/');

  useEffect(() => {
    void loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const result = await invoke<CalDavAccount[]>('get_caldav_accounts_cmd');
      setAccounts(result);
    } catch (error) {
      console.error('Failed to load CalDAV accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async () => {
    try {
      await invoke('add_caldav_account_cmd', {
        url: formUrl,
        username: formUsername,
        password: formPassword,
        calendarPath: formCalendarPath,
      });

      setModalOpened(false);
      setFormUrl('');
      setFormUsername('');
      setFormPassword('');
      setFormCalendarPath('/calendars/');

      await loadAccounts();
    } catch (error) {
      console.error('Failed to add account:', error);
      alert(`Failed to add account: ${String(error)}`);
    }
  };

  const syncAccount = async (accountId: string) => {
    // Per-account locking to allow different accounts to sync concurrently
    if (syncingMapRef.current.has(accountId)) {
      return;
    }
    syncingMapRef.current.add(accountId);
    setSyncing(accountId);
    try {
      const result = await invoke<Partial<SyncResult>>('sync_caldav_account_cmd', { accountId });

      const success = Boolean(result?.success);
      const pulled = safeNum(result?.events_pulled);
      const pushed = safeNum(result?.events_pushed);
      const conflicts = safeNum(result?.conflicts);
      const errors = Array.isArray(result?.errors) ? (result!.errors as string[]) : [];

      if (success) {
        alert(
          `Sync completed:\n` +
            `Pulled: ${pulled} events\n` +
            `Pushed: ${pushed} events\n` +
            `Conflicts: ${conflicts}`
        );
      } else {
        const errorMsg = errors.length ? errors.join(', ') : 'Unknown error';
        alert(`Sync failed: ${errorMsg}`);
      }

      await loadAccounts();
    } catch (e) {
      alert(`Sync failed: ${String(e)}`);
    } finally {
      syncingMapRef.current.delete(accountId);
      // Clear global spinner only if this account is the one shown
      setSyncing((curr) => (curr === accountId ? null : curr));
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this CalDAV account?')) {
      return;
    }

    try {
      await invoke('delete_caldav_account_cmd', { accountId });
      await loadAccounts();
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2}>CalDAV Sync</Title>
            <Text c="dimmed" size="sm">
              Synchronize tasks and events with external calendars
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
            Add Account
          </Button>
        </Group>

        {accounts.length === 0 ? (
          <Alert icon={<IconAlertCircle size={16} />} title="No accounts configured">
            Add a CalDAV account to start synchronizing your calendar
          </Alert>
        ) : (
          <Stack gap="md">
            {accounts.map((account) => (
              <Card key={account.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Group gap="xs" mb={4}>
                        <Text fw={600}>{account.url}</Text>
                        <Badge color={account.enabled ? 'green' : 'gray'} size="sm">
                          {account.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                        <Badge variant="light" size="sm">
                          {account.sync_direction}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed">
                        User: {account.username}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Path: {account.calendar_path}
                      </Text>
                    </div>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconRefresh size={14} />}
                        onClick={() => syncAccount(account.id)}
                        loading={syncing === account.id}
                      >
                        Sync Now
                      </Button>
                      <ActionIcon variant="light" color="red" onClick={() => deleteAccount(account.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  <Group gap="md" mt="xs">
                    {account.last_sync && (
                      <Group gap={4}>
                        <IconClock size={14} />
                        <Text size="xs" c="dimmed">
                          Last synced: {new Date(account.last_sync * 1000).toLocaleString()}
                        </Text>
                      </Group>
                    )}
                    {account.auto_sync && (
                      <Group gap={4}>
                        <IconCheck size={14} />
                        <Text size="xs" c="dimmed">
                          Auto-sync every {account.sync_frequency_minutes} minutes
                        </Text>
                      </Group>
                    )}
                  </Group>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Add CalDAV Account" size="lg">
        <Stack gap="md">
          <TextInput
            label="CalDAV Server URL"
            placeholder="https://caldav.example.com"
            value={formUrl}
            onChange={(e) => setFormUrl(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Username"
            placeholder="your.email@example.com"
            value={formUsername}
            onChange={(e) => setFormUsername(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="Password"
            placeholder="Your CalDAV password"
            value={formPassword}
            onChange={(e) => setFormPassword(e.currentTarget.value)}
            required
          />

          <TextInput
            label="Calendar Path"
            placeholder="/calendars/"
            value={formCalendarPath}
            onChange={(e) => setFormCalendarPath(e.currentTarget.value)}
            description="Path to your calendar on the server"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={addAccount} disabled={!formUrl || !formUsername || !formPassword}>
              Add Account
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default CalDAVSettings;
