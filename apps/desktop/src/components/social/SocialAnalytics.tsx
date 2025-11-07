/**
 * SocialAnalytics Component
 *
 * Comprehensive analytics dashboard for social media activity
 */

import { Stack, Group, Card, Text, Title, Select, SimpleGrid, Badge, Progress, Center, Loader } from '@mantine/core';
import { IconTrendingUp, IconUsers, IconHeart, IconMessageCircle, IconEye } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { useState } from 'react';
import { SUPPORTED_PLATFORMS } from '@noteece/types';

interface AnalyticsOverview {
  platform_stats: PlatformStat[];
  time_series: TimeSeriesPoint[];
  category_stats: CategoryStat[];
  engagement: EngagementStats;
  top_posts: TopPost[];
}

interface PlatformStat {
  platform: string;
  post_count: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
}

interface TimeSeriesPoint {
  date: string;
  count: number;
}

interface CategoryStat {
  category_name: string;
  post_count: number;
  avg_likes: number;
}

interface EngagementStats {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_views: number;
  avg_engagement_rate: number;
}

interface TopPost {
  id: string;
  platform: string;
  author: string;
  content: string;
  engagement_score: number;
  timestamp: number;
}

interface SocialAnalyticsProps {
  spaceId: string;
}

const TIME_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
];

export function SocialAnalytics({ spaceId }: SocialAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('30');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['socialAnalytics', spaceId, timeRange],
    queryFn: async () => {
      return await invoke<AnalyticsOverview>('get_analytics_overview_cmd', {
        spaceId,
        days: parseInt(timeRange),
      });
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!analytics) {
    return (
      <Center py="xl">
        <Text c="dimmed">No analytics data available</Text>
      </Center>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Stack gap="xl">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2}>📊 Analytics Dashboard</Title>
          <Text size="sm" c="dimmed" mt="xs">
            Insights from your social media activity
          </Text>
        </div>
        <Select
          data={TIME_RANGES}
          value={timeRange}
          onChange={(value) => setTimeRange(value || '30')}
          w={180}
        />
      </Group>

      {/* Engagement Overview */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Posts
              </Text>
              <Text size="xl" fw={700} mt="xs">
                {formatNumber(analytics.engagement.total_posts)}
              </Text>
            </div>
            <IconTrendingUp size={32} opacity={0.5} />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Likes
              </Text>
              <Text size="xl" fw={700} mt="xs" c="pink">
                {formatNumber(analytics.engagement.total_likes)}
              </Text>
            </div>
            <IconHeart size={32} opacity={0.5} />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Comments
              </Text>
              <Text size="xl" fw={700} mt="xs" c="blue">
                {formatNumber(analytics.engagement.total_comments)}
              </Text>
            </div>
            <IconMessageCircle size={32} opacity={0.5} />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Views
              </Text>
              <Text size="xl" fw={700} mt="xs" c="violet">
                {formatNumber(analytics.engagement.total_views)}
              </Text>
            </div>
            <IconEye size={32} opacity={0.5} />
          </Group>
        </Card>
      </SimpleGrid>

      {/* Platform Breakdown */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">Platform Breakdown</Title>
        <Stack gap="md">
          {analytics.platform_stats.map((stat) => {
            const platform = SUPPORTED_PLATFORMS[stat.platform as keyof typeof SUPPORTED_PLATFORMS];
            const totalPosts = analytics.engagement.total_posts;
            const percentage = totalPosts > 0 ? (stat.post_count / totalPosts) * 100 : 0;

            return (
              <div key={stat.platform}>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Text size="lg">{platform?.icon || '📱'}</Text>
                    <Text size="sm" fw={500}>{platform?.name || stat.platform}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {stat.post_count} posts ({percentage.toFixed(1)}%)
                  </Text>
                </Group>
                <Progress
                  value={percentage}
                  color={platform?.color || 'blue'}
                  size="sm"
                  radius="xl"
                />
                <Group gap="lg" mt="xs">
                  <Text size="xs" c="dimmed">
                    ❤️ {formatNumber(stat.total_likes)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    💬 {formatNumber(stat.total_comments)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    👁️ {formatNumber(stat.total_views)}
                  </Text>
                </Group>
              </div>
            );
          })}
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* Category Stats */}
        {analytics.category_stats.length > 0 && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={3} mb="md">Top Categories</Title>
            <Stack gap="sm">
              {analytics.category_stats.map((stat) => (
                <Group key={stat.category_name} justify="space-between">
                  <Text size="sm">{stat.category_name}</Text>
                  <Group gap="xs">
                    <Badge size="sm" variant="light">
                      {stat.post_count} posts
                    </Badge>
                    <Text size="xs" c="dimmed">
                      ~{stat.avg_likes.toFixed(0)} likes avg
                    </Text>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Card>
        )}

        {/* Engagement Rate */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Engagement Rate</Title>
          <Center h={150}>
            <div style={{ textAlign: 'center' }}>
              <Text size={48} fw={700} c="violet">
                {analytics.engagement.avg_engagement_rate.toFixed(2)}%
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Average engagement rate
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                (likes + comments + shares) / views
              </Text>
            </div>
          </Center>
        </Card>
      </SimpleGrid>

      {/* Top Posts */}
      {analytics.top_posts.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder">
          <Title order={3} mb="md">🔥 Top Performing Posts</Title>
          <Stack gap="md">
            {analytics.top_posts.map((post, index) => {
              const platform = SUPPORTED_PLATFORMS[post.platform as keyof typeof SUPPORTED_PLATFORMS];
              return (
                <Card key={post.id} padding="md" radius="md" withBorder>
                  <Group justify="space-between">
                    <Group>
                      <Badge size="lg" variant="filled" color="violet">
                        #{index + 1}
                      </Badge>
                      <Text size="lg">{platform?.icon || '📱'}</Text>
                      <div>
                        <Text size="sm" fw={500}>
                          {post.author}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {platform?.name || post.platform}
                        </Text>
                      </div>
                    </Group>
                    <Badge size="lg" color="green">
                      {formatNumber(post.engagement_score)} points
                    </Badge>
                  </Group>
                  <Text size="sm" mt="sm" lineClamp={2}>
                    {post.content}
                  </Text>
                </Card>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* Activity Timeline */}
      {analytics.time_series.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">📈 Activity Timeline</Title>
          <Stack gap="xs">
            {analytics.time_series.slice(-14).map((point) => {
              const maxCount = Math.max(...analytics.time_series.map(p => p.count));
              const width = (point.count / maxCount) * 100;

              return (
                <Group key={point.date} gap="xs">
                  <Text size="xs" c="dimmed" w={80}>
                    {new Date(point.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        background: 'linear-gradient(90deg, #845ef7 0%, #5c7cfa 100%)',
                        height: 20,
                        borderRadius: 4,
                        width: `${width}%`,
                        minWidth: 2,
                      }}
                    />
                  </div>
                  <Text size="xs" fw={500} w={40} ta="right">
                    {point.count}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
