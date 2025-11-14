/**
 * AddAccountModal Component
 *
 * Modal for adding a new social media account
 */

import { Modal, TextInput, Select, Button, Stack, Group, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addSocialAccount } from '../../services/socialApi';
import { notifications } from '@mantine/notifications';
import { SUPPORTED_PLATFORMS, type Platform } from '@noteece/types';

interface AddAccountModalProperties {
  opened: boolean;
  onClose: () => void;
  spaceId: string;
}

export function AddAccountModal({ opened, onClose, spaceId }: AddAccountModalProperties) {
  const queryClient = useQueryClient();

  const form = useForm({
    initialValues: {
      platform: '' as Platform,
      username: '',
      displayName: '',
      credentials: '',
    },
    validate: {
      platform: (value) => (value ? null : 'Please select a platform'),
      username: (value) => (value.length > 0 ? null : 'Username is required'),
      credentials: (value) => (value.length > 0 ? null : 'Credentials are required'),
    },
  });

  const addMutation = useMutation({
    mutationFn: (values: typeof form.values) =>
      addSocialAccount(spaceId, values.platform, values.username, values.displayName || null, values.credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts'] });
      notifications.show({
        title: 'Success',
        message: 'Account added successfully',
        color: 'green',
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: `Failed to add account: ${error}`,
        color: 'red',
      });
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    addMutation.mutate(values);
  });

  const platformOptions = Object.values(SUPPORTED_PLATFORMS).map((platform) => ({
    value: platform.id,
    label: `${platform.icon} ${platform.name}`,
  }));

  const selectedPlatform = form.values.platform ? SUPPORTED_PLATFORMS[form.values.platform] : null;

  return (
    <Modal opened={opened} onClose={onClose} title="Add Social Media Account" size="md">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Select
            label="Platform"
            placeholder="Select a platform"
            data={platformOptions}
            searchable
            required
            {...form.getInputProps('platform')}
          />

          <TextInput label="Username" placeholder="@username" required {...form.getInputProps('username')} />

          <TextInput
            label="Display Name (optional)"
            placeholder="How you want it displayed"
            {...form.getInputProps('displayName')}
          />

          <TextInput
            label="Credentials"
            placeholder={
              selectedPlatform?.authMethod === 'oauth'
                ? 'OAuth token'
                : selectedPlatform?.authMethod === 'password'
                  ? 'Password'
                  : selectedPlatform?.authMethod === 'token'
                    ? 'API token'
                    : 'Session cookies (JSON)'
            }
            type="password"
            required
            {...form.getInputProps('credentials')}
          />

          {selectedPlatform && (
            <Text size="sm" c="dimmed">
              Authentication method: {selectedPlatform.authMethod}
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={addMutation.isPending}>
              Add Account
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
