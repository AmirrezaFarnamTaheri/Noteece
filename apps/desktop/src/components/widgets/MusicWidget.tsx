import React, { useState, useEffect } from 'react';
import { Card, Text, Group, ActionIcon, Progress, Stack, Center } from '@mantine/core';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconMusic,
} from '@tabler/icons-react';
import classes from './MusicWidget.module.css';

const MusicWidget: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(30);

  // Simulate progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.5));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <Card radius="lg" className={classes.glassCard} padding="lg">
      <Stack gap="md">
        <Group align="flex-start" justify="space-between">
          <Group gap="md">
            <div className={classes.albumArt}>
              <Center h="100%">
                <IconMusic size={32} color="rgba(255,255,255,0.5)" />
              </Center>
            </div>
            <div>
              <Text fw={700} c="white" size="lg" lineClamp={1}>
                Deep Focus Playlist
              </Text>
              <Text size="xs" c="dimmed" fw={500}>
                Ambient Sounds • 45m left
              </Text>
            </div>
          </Group>
          {isPlaying && (
            <div className={classes.visualizer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={classes.bar} style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </Group>

        <Stack gap="xs">
          <Progress value={progress} size="sm" radius="xl" color="white" className={classes.progressBar} />
          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">
              12:34
            </Text>
            <Text size="xs" c="dimmed">
              45:00
            </Text>
          </Group>
        </Stack>

        <Group justify="center" gap="xl">
          <ActionIcon variant="transparent" color="gray" size="lg">
            <IconPlayerSkipBack size={24} />
          </ActionIcon>
          <ActionIcon
            variant="filled"
            color="white"
            size={48}
            radius="xl"
            onClick={() => setIsPlaying(!isPlaying)}
            className={classes.playButton}
          >
            {isPlaying ? (
              <IconPlayerPause size={24} color="black" fill="black" />
            ) : (
              <IconPlayerPlay size={24} color="black" fill="black" style={{ marginLeft: 2 }} />
            )}
          </ActionIcon>
          <ActionIcon variant="transparent" color="gray" size="lg">
            <IconPlayerSkipForward size={24} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
};

export default MusicWidget;
