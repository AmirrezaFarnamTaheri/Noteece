import React from 'react';
import { Card, Text, Group, Stack, RingProgress, Center, ThemeIcon } from '@mantine/core';
import { IconHeartbeat } from '@tabler/icons-react';

const HealthWidget: React.FC = () => {
  return (
    <Card withBorder radius="md" p="md">
      <Stack>
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon color="red" variant="light">
              <IconHeartbeat size={16} />
            </ThemeIcon>
            <Text fw={700}>Health</Text>
          </Group>
          <Text size="xs" c="green">
            Good
          </Text>
        </Group>

        <Group justify="center">
          <RingProgress
            size={100}
            roundCaps
            thickness={8}
            sections={[{ value: 85, color: 'red' }]}
            label={
              <Center>
                <Text fw={700} size="lg">
                  85
                </Text>
              </Center>
            }
          />
        </Group>
      </Stack>
    </Card>
  );
};

export default HealthWidget;
