import React from 'react';
import { Paper, Title, Text, Group, Button, useMantineTheme, Stack } from '@mantine/core';
import { IconMusic, IconBrandSpotify } from '@tabler/icons-react';

export const MusicWidget: React.FC = () => {
  const theme = useMantineTheme();

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={4}>Music</Title>
        </Group>
        <IconMusic size={18} color={theme.colors.gray[5]} />
      </Group>

      <Stack align="center" py="md" gap="md">
        <Text size="sm" c="dimmed" ta="center">
          Connect your music service to see what's playing.
        </Text>
        <Button variant="light" color="violet" size="xs" leftSection={<IconBrandSpotify size={16} />} disabled>
          Connect Spotify (Coming Soon)
        </Button>
      </Stack>
    </Paper>
  );
};
