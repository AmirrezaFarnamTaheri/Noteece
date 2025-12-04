import React from 'react';
import { Card, Text, Group, Stack, Avatar, ThemeIcon } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';

const SocialWidget: React.FC = () => {
  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon color="grape" variant="light">
              <IconUsers size={16} />
            </ThemeIcon>
            <Text fw={700}>Social</Text>
          </Group>
          <Text size="xs" c="dimmed">
            3 Online
          </Text>
        </Group>

        <Avatar.Group spacing="sm">
          <Avatar src={null} alt="User 1" color="blue" radius="xl">
            AB
          </Avatar>
          <Avatar src={null} alt="User 2" color="cyan" radius="xl">
            CD
          </Avatar>
          <Avatar src={null} alt="User 3" color="teal" radius="xl">
            EF
          </Avatar>
          <Avatar radius="xl">+2</Avatar>
        </Avatar.Group>
      </Stack>
    </Card>
  );
};

export default SocialWidget;
