import React from 'react';
import { Paper, Title, Text, Group, Avatar, Stack, Button, Badge, ScrollArea } from '@mantine/core';
import { IconBrandTwitter, IconBrandMastodon, IconMessageDots } from '@tabler/icons-react';

interface SocialPost {
  id: string;
  platform: 'twitter' | 'mastodon';
  author: string;
  content: string;
  time: string;
}

export const SocialWidget: React.FC = () => {
  const posts: SocialPost[] = [
    {
      id: '1',
      platform: 'twitter',
      author: '@rustlang',
      content: 'Rust 1.75 is out now! Check out the release notes.',
      time: '2h ago',
    },
    {
      id: '2',
      platform: 'mastodon',
      author: '@tauri@fosstodon.org',
      content: 'Tauri v2 Beta is making great progress.',
      time: '4h ago',
    },
    {
      id: '3',
      platform: 'twitter',
      author: '@reactjs',
      content: 'Thinking about React Server Components? Here is a guide.',
      time: '5h ago',
    },
  ];

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder h="100%">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Title order={4}>Social Feed</Title>
          <Badge color="blue" variant="light">
            3 New
          </Badge>
        </Group>
        <Button variant="subtle" size="xs" compact>
          View All
        </Button>
      </Group>

      <ScrollArea h={200} scrollbarSize={6}>
        <Stack gap="md">
          {posts.map((post) => (
            <Paper key={post.id} withBorder p="xs" radius="md" bg="var(--mantine-color-gray-0)">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <Avatar size="sm" radius="xl" color={post.platform === 'twitter' ? 'blue' : 'grape'}>
                    {post.author[1].toUpperCase()}
                  </Avatar>
                  <div>
                    <Group gap={4}>
                      <Text size="xs" fw={700}>
                        {post.author}
                      </Text>
                      {post.platform === 'twitter' ? (
                        <IconBrandTwitter size={12} color="#1DA1F2" />
                      ) : (
                        <IconBrandMastodon size={12} color="#6364FF" />
                      )}
                    </Group>
                    <Text size="xs" lineClamp={2}>
                      {post.content}
                    </Text>
                  </div>
                </Group>
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {post.time}
                </Text>
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>

      <Button fullWidth mt="md" variant="light" leftSection={<IconMessageDots size={16} />}>
        Compose Post
      </Button>
    </Paper>
  );
};
