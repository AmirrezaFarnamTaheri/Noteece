import React, { useState, useEffect } from 'react';
import { Button, Text, Group, Stack, ThemeIcon, Badge, Paper } from '@mantine/core';
import { IconBrandInstagram, IconBrandTwitter, IconBrandLinkedin, IconPlus, IconUsers } from '@tabler/icons-react';
import { WidgetSkeleton } from '../ui/skeletons/WidgetSkeleton';

const getColor = (platform: string) => {
  switch (platform) {
    case 'twitter': {
      return 'cyan';
    }
    case 'instagram': {
      return 'pink';
    }
    case 'linkedin': {
      return 'blue';
    }
    default: {
      return 'gray';
    }
  }
};

const SocialWidget = () => {
  // Mock loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock data for now, would be connected to `socialConfigService` status later
  const accounts = [
    { id: 1, platform: 'twitter', handle: '@noteece_app', followers: '1.2k', status: 'connected' },
    { id: 2, platform: 'linkedin', handle: 'Noteece Inc.', followers: '850', status: 'connected' },
  ];

  if (isLoading) {
    return <WidgetSkeleton />;
  }

  const getIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': {
        return <IconBrandTwitter size={14} />;
      }
      case 'instagram': {
        return <IconBrandInstagram size={14} />;
      }
      case 'linkedin': {
        return <IconBrandLinkedin size={14} />;
      }
      default: {
        return <IconUsers size={14} />;
      }
    }
  };

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <ThemeIcon variant="light" color="blue" size="sm" radius="md">
            <IconUsers size={14} />
          </ThemeIcon>
          <Text fw={700} size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
            Social
          </Text>
        </Group>
        <Button variant="subtle" size="compact-xs" p={0} w={24} h={24}>
          <IconPlus size={16} />
        </Button>
      </Group>

      <Stack gap="xs">
        {accounts.map((account) => (
          <Group
            key={account.id}
            justify="space-between"
            p="xs"
            wrap="nowrap"
            style={{
              backgroundColor: 'var(--mantine-color-default-hover)',
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
              <ThemeIcon size="sm" radius="xl" color={getColor(account.platform)} variant="light">
                {getIcon(account.platform)}
              </ThemeIcon>
              <Text size="sm" fw={500} truncate>
                {account.handle}
              </Text>
            </Group>
            <Badge size="xs" variant="transparent" color="gray">
              {account.followers}
            </Badge>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
};

export default SocialWidget;
