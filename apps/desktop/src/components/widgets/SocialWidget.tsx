import React from 'react';
import { Button, Text, Group, Stack, Title } from '@mantine/core';
import { IconBrandInstagram, IconBrandTwitter, IconBrandLinkedin, IconPlus } from '@tabler/icons-react';

export const SocialWidget = () => {
  const accounts = [
    { id: 1, platform: 'twitter', handle: '@noteece_app', followers: '1.2k' },
    { id: 2, platform: 'linkedin', handle: 'Noteece Inc.', followers: '850' },
  ];

  const getIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <IconBrandTwitter size={16} />;
      case 'instagram': return <IconBrandInstagram size={16} />;
      case 'linkedin': return <IconBrandLinkedin size={16} />;
      default: return null;
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={4}>Social Accounts</Title>
        <Button variant="subtle" size="compact-xs">
          <IconPlus size={16} />
        </Button>
      </Group>

      <Stack gap="xs">
        {accounts.map((account) => (
          <Group key={account.id} justify="space-between" p="xs" style={{ backgroundColor: 'var(--mantine-color-dark-6)', borderRadius: 'var(--mantine-radius-md)' }}>
            <Group gap="xs">
              {getIcon(account.platform)}
              <Text size="sm" fw={500}>{account.handle}</Text>
            </Group>
            <Text size="xs" c="dimmed">{account.followers}</Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  );
};
