/**
 * SocialHub Component
 *
 * Main interface for the Social Media Suite
 */

import { Container, Tabs, Title, Text, Stack, Card, Group, Badge, Center, Loader } from '@mantine/core';
import { IconUsers, IconTimeline, IconTags, IconChartBar, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { SocialAccountList } from './SocialAccountList';
import { SyncStatusPanel } from './SyncStatusPanel';
import { SocialTimeline } from './SocialTimeline';
import { CategoryManager } from './CategoryManager';
import { SocialAnalytics } from './SocialAnalytics';
import { SocialSearch } from './SocialSearch';
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
            <Tabs.Tab value="search" leftSection={<IconSearch size={16} />}>
              Search
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

          <Tabs.Panel value="search" pt="xl">
            <SocialSearch spaceId={spaceId} />
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="xl">
            <SocialAnalytics spaceId={spaceId} />
          </Tabs.Panel>
        </Tabs>

        {/* Status Badge */}
        <Card shadow="sm" padding="md" radius="md" withBorder bg="violet.0">
          <Group>
            <Badge size="lg" variant="filled" color="violet">
              Phase 3 - Week 12 Complete! 🎉
            </Badge>
            <Text size="sm">
              Social Media Suite - 18 platform extractors with analytics & search! Now supporting Twitter, YouTube, Instagram, TikTok, Pinterest, LinkedIn, Discord, Reddit, Spotify, Castbox, FotMob, SofaScore, Telegram, Gmail, Tinder, Bumble, and Hinge. Features: Category system, Analytics dashboard, FTS search, and privacy-first dating app integration!
            </Text>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
