/**
 * SocialAccountList Component
 *
 * Displays list of all social media accounts with add button
 */

import { Stack, Group, Title, Button, Text, Loader, Center } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getSocialAccounts } from '../../services/socialApi';
import { AccountCard } from './AccountCard';
import { AddAccountModal } from './AddAccountModal';

interface SocialAccountListProperties {
  spaceId: string;
}

export function SocialAccountList({ spaceId }: SocialAccountListProperties) {
  const [addModalOpened, setAddModalOpened] = useState(false);

  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['socialAccounts', spaceId],
    queryFn: () => getSocialAccounts(spaceId),
  });

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Center py="xl">
        <Text c="red">Failed to load accounts: {String(error)}</Text>
      </Center>
    );
  }

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={2}>Social Accounts</Title>
            <Text size="sm" c="dimmed">
              {accounts?.length || 0} account{accounts?.length === 1 ? '' : 's'} connected
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpened(true)}>
            Add Account
          </Button>
        </Group>

        {accounts && accounts.length > 0 ? (
          <Stack gap="md">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </Stack>
        ) : (
          <Center py="xl">
            <Stack align="center">
              <Text size="xl">📱</Text>
              <Text size="lg" fw={500}>
                No accounts yet
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Add your first social media account to start aggregating your feeds
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpened(true)} mt="md">
                Add Your First Account
              </Button>
            </Stack>
          </Center>
        )}
      </Stack>

      <AddAccountModal opened={addModalOpened} onClose={() => setAddModalOpened(false)} spaceId={spaceId} />
    </>
  );
}
