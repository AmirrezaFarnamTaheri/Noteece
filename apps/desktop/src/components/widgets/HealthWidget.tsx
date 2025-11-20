import React from 'react';
import { Paper, Title, Text, Group, RingProgress, Center, Stack, ThemeIcon, useMantineTheme } from '@mantine/core';
import { IconHeartRateMonitor, IconWalk, IconMoon } from '@tabler/icons-react';

export const HealthWidget: React.FC = () => {
  const theme = useMantineTheme();

  // Mock data for now - would connect to Health Hub backend later
  const steps = 8432;
  const stepGoal = 10000;
  const sleepHours = 7.5;
  const sleepGoal = 8;

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
           <ThemeIcon color="red" variant="light">
             <IconHeartRateMonitor size={18} />
           </ThemeIcon>
           <Title order={4}>Health Pulse</Title>
        </Group>
        <Text c="dimmed" size="xs">Today</Text>
      </Group>

      <Group grow align="flex-start">
        <Stack align="center" gap="xs">
          <RingProgress
            size={80}
            roundCaps
            thickness={8}
            sections={[{ value: (steps / stepGoal) * 100, color: 'teal' }]}
            label={
              <Center>
                <IconWalk size={22} style={{ color: theme.colors.teal[6] }} />
              </Center>
            }
          />
          <div>
            <Text align="center" fw={700}>{steps}</Text>
            <Text align="center" c="dimmed" size="xs">Steps</Text>
          </div>
        </Stack>

        <Stack align="center" gap="xs">
           <RingProgress
            size={80}
            roundCaps
            thickness={8}
            sections={[{ value: (sleepHours / sleepGoal) * 100, color: 'indigo' }]}
            label={
              <Center>
                <IconMoon size={22} style={{ color: theme.colors.indigo[6] }} />
              </Center>
            }
          />
          <div>
            <Text align="center" fw={700}>{sleepHours}h</Text>
            <Text align="center" c="dimmed" size="xs">Sleep</Text>
          </div>
        </Stack>
      </Group>
    </Paper>
  );
};
