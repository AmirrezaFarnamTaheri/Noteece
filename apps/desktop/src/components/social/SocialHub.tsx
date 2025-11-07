/**
 * SocialHub Component
 *
 * Main interface for the Social Media Suite
 */

import { Container, Tabs, Title, Text, Stack, Card, Group, Badge, Center, Loader } from '@mantine/core';
import { IconUsers, IconTimeline, IconTags, IconChartBar, IconRefresh } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { SocialAccountList } from './SocialAccountList';
import { SyncStatusPanel } from './SyncStatusPanel';
import { SocialTimeline } from './SocialTimeline';
import { CategoryManager } from './CategoryManager';
import { getTimelineStats } from '../../services/socialApi';

interface SocialHubProps {
  spaceId: string;
}

export function SocialHub({ spaceId }: SocialHubProps) {
  const { data: stats } = useQuery({
    queryKey: ['timelineStats', spaceId],
    queryFn: () => getTimelineStats(spaceId),
  });

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1}>📱 Social Media Hub</Title>
          <Text size="sm" c="dimmed" mt="xs">
            Manage all your social media accounts in one place
          </Text>
        </div>

        {/* Stats Cards */}
        {stats && (
          <Group grow>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                Total Posts
              </Text>
              <Text size="xl" fw={700} mt="xs">
                {stats.total_posts.toLocaleString()}
              </Text>
            </Card>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                Platforms
              </Text>
              <Text size="xl" fw={700} mt="xs">
                {stats.platforms_count}
              </Text>
            </Card>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                Categories
              </Text>
              <Text size="xl" fw={700} mt="xs">
                {stats.categories_count}
              </Text>
            </Card>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text size="sm" c="dimmed" tt="uppercase" fw={700}>
                Today
              </Text>
              <Text size="xl" fw={700} mt="xs">
                {stats.today_posts.toLocaleString()}
              </Text>
            </Card>
          </Group>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="accounts">
          <Tabs.List>
            <Tabs.Tab value="accounts" leftSection={<IconUsers size={16} />}>
              Accounts
            </Tabs.Tab>
            <Tabs.Tab value="sync" leftSection={<IconRefresh size={16} />}>
              Sync Status
            </Tabs.Tab>
            <Tabs.Tab value="timeline" leftSection={<IconTimeline size={16} />}>
              Timeline
            </Tabs.Tab>
            <Tabs.Tab value="categories" leftSection={<IconTags size={16} />}>
              Categories
            </Tabs.Tab>
            <Tabs.Tab value="analytics" leftSection={<IconChartBar size={16} />}>
              Analytics
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="accounts" pt="xl">
            <SocialAccountList spaceId={spaceId} />
          </Tabs.Panel>

          <Tabs.Panel value="sync" pt="xl">
            <SyncStatusPanel spaceId={spaceId} />
          </Tabs.Panel>

          <Tabs.Panel value="timeline" pt="xl">
            <SocialTimeline spaceId={spaceId} />
          </Tabs.Panel>

          <Tabs.Panel value="categories" pt="xl">
            <CategoryManager spaceId={spaceId} />
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="xl">
            <Center py="xl">
              <Stack align="center">
                <Text size="xl">📊</Text>
                <Text size="lg" fw={500}>
                  Analytics Coming Soon
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  Track your social media usage and engagement
                </Text>
              </Stack>
            </Center>
          </Tabs.Panel>
        </Tabs>

        {/* Status Badge */}
        <Card shadow="sm" padding="md" radius="md" withBorder bg="violet.0">
          <Group>
            <Badge size="lg" variant="filled" color="violet">
              Phase 3 - Week 9
            </Badge>
            <Text size="sm">
              Social Media Suite - 15 platform extractors + category system! Twitter, YouTube, Instagram, TikTok, Pinterest, LinkedIn, Discord, Reddit, Spotify, Castbox, FotMob, SofaScore, Telegram, and Gmail now supported. Cross-platform categories with auto-categorization enabled!
            </Text>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
