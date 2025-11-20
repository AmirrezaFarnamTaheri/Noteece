import React from 'react';
import { Paper, Title, Text, Group, ActionIcon, Progress, Image, Stack, useMantineTheme } from '@mantine/core';
import { IconMusic, IconPlayerPlay, IconPlayerSkipForward, IconPlayerSkipBack, IconVolume } from '@tabler/icons-react';

export const MusicWidget: React.FC = () => {
  const theme = useMantineTheme();

  // Mock data
  const currentTrack = {
    title: 'Lo-Fi Study Beats',
    artist: 'Chillhop Music',
    progress: 45, // percentage
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&w=100&q=80',
  };

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={4}>Now Playing</Title>
        </Group>
        <IconMusic size={18} color={theme.colors.gray[5]} />
      </Group>

      <Group wrap="nowrap">
        <Image
          src={currentTrack.cover}
          width={60}
          height={60}
          radius="md"
          fallbackSrc="https://placehold.co/60x60?text=Music"
        />
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={600} lineClamp={1}>
            {currentTrack.title}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {currentTrack.artist}
          </Text>

          <Group gap="xs" mt={8}>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconPlayerSkipBack size={14} />
            </ActionIcon>
            <ActionIcon variant="filled" size="sm" color="violet" radius="xl">
              <IconPlayerPlay size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconPlayerSkipForward size={14} />
            </ActionIcon>
          </Group>
        </div>
      </Group>

      <Group mt="sm" align="center" gap="xs">
        <Text size="xs" c="dimmed">
          1:23
        </Text>
        <Progress value={currentTrack.progress} size="sm" radius="xl" style={{ flex: 1 }} color="violet" />
        <Text size="xs" c="dimmed">
          3:45
        </Text>
      </Group>
    </Paper>
  );
};
