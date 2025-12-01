import React from 'react';
import { Paper, Title, Text, Group, Button, Stack, ThemeIcon, Progress, Badge } from '@mantine/core';
import {
  IconMusic,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconDeviceSpeaker,
} from '@tabler/icons-react';
import classes from './MusicWidget.module.css';

// Create CSS module for glassmorphism effects
const styles = `
.glassCard {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  position: relative;
}

.albumArt {
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #7950f2, #15aabf);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.visualizer {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
  margin-left: auto;
}

.bar {
  width: 3px;
  background-color: var(--mantine-color-violet-5);
  animation: bounce 1s infinite ease-in-out;
}

@keyframes bounce {
  0%, 100% { height: 4px; opacity: 0.5; }
  50% { height: 16px; opacity: 1; }
}
`;

export const MusicWidget: React.FC = () => {
  return (
    <>
      <style>{styles}</style>
      <Paper shadow="sm" p="md" radius="md" className="glassCard">
        <Group justify="space-between" mb="xs">
          <Group gap="xs">
            <ThemeIcon variant="light" color="violet" size="sm" radius="md">
              <IconDeviceSpeaker size={14} />
            </ThemeIcon>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.5 }}>
              Now Playing
            </Text>
          </Group>
          <Badge size="xs" variant="dot" color="gray">
            Disconnected
          </Badge>
        </Group>

        <Group align="center" mb="md" wrap="nowrap">
          <div className="albumArt">
            <IconMusic size={24} color="white" style={{ opacity: 0.8 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} truncate>
              Focus Flow
            </Text>
            <Text size="xs" c="dimmed" truncate>
              Connect service to play
            </Text>
          </div>
        </Group>

        <Stack gap={8}>
          <Progress value={0} size="xs" radius="xl" color="violet" />

          <Group justify="center" gap="lg" mt={4}>
            <IconPlayerSkipBack size={20} style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            <ThemeIcon
              size={40}
              radius="xl"
              color="violet"
              variant="light"
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              <IconPlayerPlay size={20} />
            </ThemeIcon>
            <IconPlayerSkipForward size={20} style={{ opacity: 0.5, cursor: 'not-allowed' }} />
          </Group>
        </Stack>

        {/* Overlay for demo/connect action */}
        {/* <Overlay color="#000" backgroundOpacity={0.3} blur={2} center>
          <Button variant="white" color="dark" size="xs" leftSection={<IconBrandSpotify size={14} />}>
            Connect Spotify
          </Button>
        </Overlay> */}
      </Paper>
    </>
  );
};
