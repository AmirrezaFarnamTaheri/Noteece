import React from 'react';
import { Paper, Title, Text, Group, ActionIcon, Progress, Image, Stack, useMantineTheme, Center } from '@mantine/core';
import { IconMusic, IconPlayerPlay, IconPlayerSkipForward, IconPlayerSkipBack, IconVolume, IconMusicOff } from '@tabler/icons-react';

export const MusicWidget: React.FC = () => {
  const theme = useMantineTheme();
  // TODO: Connect to real music player state
  const currentTrack = null;

  if (!currentTrack) {
    return (
      <Paper shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <Title order={4}>Now Playing</Title>
          </Group>
          <IconMusic size={18} color={theme.colors.gray[5]} />
        </Group>
        <Center h={100}>
            <Stack align="center" gap="xs">
                <IconMusicOff size={32} color={theme.colors.gray[5]} />
                <Text size="sm" c="dimmed">No music playing</Text>
            </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={4}>Now Playing</Title>
        </Group>
        <IconMusic size={18} color={theme.colors.gray[5]} />
      </Group>
      {/* ... Player UI ... */}
    </Paper>
  );
};
