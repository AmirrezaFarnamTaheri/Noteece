import React from 'react';
import { Card, Text, Group, Stack, Progress, ThemeIcon } from '@mantine/core';
import { IconYinYang } from '@tabler/icons-react';

const LifeBalanceWidget: React.FC = () => {
  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon color="cyan" variant="light">
            <IconYinYang size={16} />
          </ThemeIcon>
          <Text fw={700}>Life Balance</Text>
        </Group>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="xs">Work</Text>
            <Text size="xs">60%</Text>
          </Group>
          <Progress value={60} color="blue" size="sm" />

          <Group justify="space-between">
            <Text size="xs">Health</Text>
            <Text size="xs">30%</Text>
          </Group>
          <Progress value={30} color="green" size="sm" />

          <Group justify="space-between">
            <Text size="xs">Leisure</Text>
            <Text size="xs">10%</Text>
          </Group>
          <Progress value={10} color="orange" size="sm" />
        </Stack>
      </Stack>
    </Card>
  );
};

export default LifeBalanceWidget;
