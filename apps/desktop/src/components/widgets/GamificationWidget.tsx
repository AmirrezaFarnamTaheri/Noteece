import React from 'react';
import { Card, Text, Group, RingProgress, Stack, Center, ThemeIcon } from '@mantine/core';
import { IconTrophy } from '@tabler/icons-react';

const GamificationWidget: React.FC = () => {
  return (
    <Card withBorder radius="md" p="md">
      <Stack>
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon color="yellow" variant="light">
              <IconTrophy size={16} />
            </ThemeIcon>
            <Text fw={700}>Level 5</Text>
          </Group>
          <Text size="xs" c="dimmed">
            Explorer
          </Text>
        </Group>

        <Group justify="center">
          <RingProgress
            size={120}
            roundCaps
            thickness={8}
            sections={[{ value: 65, color: 'yellow' }]}
            label={
              <Center>
                <Stack gap={0} align="center">
                  <Text fw={700} size="xl">
                    65%
                  </Text>
                  <Text size="xs" c="dimmed">
                    XP
                  </Text>
                </Stack>
              </Center>
            }
          />
        </Group>
      </Stack>
    </Card>
  );
};

export default GamificationWidget;
