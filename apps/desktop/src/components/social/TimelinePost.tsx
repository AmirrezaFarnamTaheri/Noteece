/**
 * TimelinePost Component
 *
 * Displays a single post in the unified timeline
 */

import { Card, Group, Text, Badge, Stack, Image, AspectRatio } from '@mantine/core';
import { IconHeart, IconMessageCircle, IconShare, IconEye } from '@tabler/icons-react';
import { SUPPORTED_PLATFORMS } from '@noteece/types';

interface TimelinePostProperties {
  post: {
    id: string;
    author: string;
    handle: string;
    platform: string;
    content: string;
    contentHtml?: string;
    media?: Array<{
      type: string;
      url: string;
      alt?: string;
    }>;
    timestamp: number;
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    type?: string;
  };
}

export function TimelinePost({ post }: TimelinePostProperties) {
  const platform = SUPPORTED_PLATFORMS[post.platform as keyof typeof SUPPORTED_PLATFORMS];



  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      {/* Header */}
      <Group justify="space-between" mb="md">
        <Group>
          <Text size="lg" c={platform?.color || 'gray'}>
            {platform?.icon || '📱'}
          </Text>
          <div>
            <Text size="sm" fw={500}>
              {post.author}
            </Text>
            <Text size="xs" c="dimmed">
              @{post.handle} · {formatTimestamp(post.timestamp)}
            </Text>
          </div>
        </Group>
        <Badge color={platform?.color || 'gray'} variant="light">
          {platform?.name || post.platform}
        </Badge>
      </Group>

      {/* Content */}
      <Stack gap="sm">
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {post.content}
        </Text>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <Stack gap="xs">
            {post.media.slice(0, 4).map((media, index) => (
              <div key={index}>
                {media.type === 'image' || media.type === 'thumbnail' ? (
                  <AspectRatio ratio={16 / 9}>
                    <Image src={media.url} alt={media.alt || 'Post media'} fit="cover" radius="md" />
                  </AspectRatio>
                ) : (media.type === 'video' ? (
                  <AspectRatio ratio={16 / 9}>
                    <video src={media.url} controls style={{ width: '100%', borderRadius: '8px' }}>
                      <track kind="captions" srcLang="en" label="English" />
                    </video>
                  </AspectRatio>
                ) : null)}
              </div>
            ))}
            {post.media.length > 4 && (
              <Text size="xs" c="dimmed">
                +{post.media.length - 4} more
              </Text>
            )}
          </Stack>
        )}

        {/* Engagement */}
        <Group gap="xl" mt="sm">
          {post.likes !== undefined && post.likes > 0 && (
            <Group gap="xs">
              <IconHeart size={16} color="gray" />
              <Text size="sm" c="dimmed">
                {formatNumber(post.likes)}
              </Text>
            </Group>
          )}
          {post.comments !== undefined && post.comments > 0 && (
            <Group gap="xs">
              <IconMessageCircle size={16} color="gray" />
              <Text size="sm" c="dimmed">
                {formatNumber(post.comments)}
              </Text>
            </Group>
          )}
          {post.shares !== undefined && post.shares > 0 && (
            <Group gap="xs">
              <IconShare size={16} color="gray" />
              <Text size="sm" c="dimmed">
                {formatNumber(post.shares)}
              </Text>
            </Group>
          )}
          {post.views !== undefined && post.views > 0 && (
            <Group gap="xs">
              <IconEye size={16} color="gray" />
              <Text size="sm" c="dimmed">
                {formatNumber(post.views)}
              </Text>
            </Group>
          )}
        </Group>

        {/* Post Type Badge */}
        {post.type && post.type !== 'post' && (
          <Group gap="xs" mt="xs">
            <Badge size="sm" variant="dot">
              {post.type.replaceAll('_', ' ')}
            </Badge>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
