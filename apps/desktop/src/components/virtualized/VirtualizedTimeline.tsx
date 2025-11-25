/**
 * VirtualizedTimeline Component
 *
 * Optimized timeline for social posts using virtualization.
 * Handles infinite scroll with variable height items.
 */

import React, { CSSProperties, useCallback, useMemo } from 'react';
import { Stack, Center, Text, Loader, Paper, Box } from '@mantine/core';
import { VariableSizeList } from './VariableSizeList';

export interface TimelineItem {
  id: string;
  author: string;
  handle?: string;
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
}

export interface VirtualizedTimelineProps {
  /** Timeline items */
  items: TimelineItem[];
  /** Container height */
  height: number;
  /** Loading state */
  isLoading?: boolean;
  /** Loading more state */
  isLoadingMore?: boolean;
  /** Has more items to load */
  hasMore?: boolean;
  /** Callback when end is reached */
  onEndReached?: () => void;
  /** Custom item renderer */
  renderItem?: (item: TimelineItem, style: CSSProperties) => React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
}

// Default item renderer
function DefaultTimelineItem({ item, style }: { item: TimelineItem; style: CSSProperties }) {
  const platformColors: Record<string, string> = {
    twitter: 'blue',
    facebook: 'indigo',
    instagram: 'pink',
    linkedin: 'cyan',
    reddit: 'orange',
    youtube: 'red',
    tiktok: 'dark',
    mastodon: 'violet',
  };

  const color = platformColors[item.platform.toLowerCase()] || 'gray';

  return (
    <div style={{ ...style, padding: '4px 0' }}>
      <Paper
        shadow="xs"
        p="md"
        radius="md"
        withBorder
        style={{
          borderLeft: `3px solid var(--mantine-color-${color}-5)`,
          height: 'calc(100% - 8px)',
        }}
      >
        <Stack gap="xs">
          <Box>
            <Text size="sm" fw={600}>
              {item.author}
            </Text>
            {item.handle && (
              <Text size="xs" c="dimmed">
                @{item.handle}
              </Text>
            )}
          </Box>
          <Text size="sm" lineClamp={3}>
            {item.content}
          </Text>
          <Text size="xs" c="dimmed">
            {new Date(item.timestamp).toLocaleString()} • {item.platform}
          </Text>
        </Stack>
      </Paper>
    </div>
  );
}

export function VirtualizedTimeline({
  items,
  height,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onEndReached,
  renderItem,
  emptyMessage = 'No posts yet',
}: VirtualizedTimelineProps) {
  // Estimate item height based on content length
  const estimateItemHeight = useCallback((item: TimelineItem) => {
    const baseHeight = 100; // Header + padding
    const contentLines = Math.ceil(item.content.length / 60);
    const mediaHeight = item.media?.length ? 200 : 0;
    return baseHeight + contentLines * 20 + mediaHeight;
  }, []);

  // Get item key
  const getItemKey = useCallback((item: TimelineItem) => item.id, []);

  // Default render function
  const defaultRenderItem = useCallback(
    (item: TimelineItem, _index: number, style: CSSProperties) => {
      if (renderItem) {
        return renderItem(item, style);
      }
      return <DefaultTimelineItem item={item} style={style} />;
    },
    [renderItem],
  );

  // Memoized items with loading indicator
  const displayItems = useMemo(() => {
    return items;
  }, [items]);

  if (isLoading) {
    return (
      <Center h={height}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap={0} h={height}>
      <VariableSizeList
        items={displayItems}
        estimateItemHeight={estimateItemHeight}
        height={height - (isLoadingMore ? 40 : 0)}
        renderItem={defaultRenderItem}
        getItemKey={getItemKey}
        emptyMessage={emptyMessage}
        emptyIcon="📭"
        onEndReached={hasMore ? onEndReached : undefined}
        endReachedThreshold={300}
        overscanCount={3}
      />

      {isLoadingMore && (
        <Center py="xs">
          <Loader size="sm" />
        </Center>
      )}

      {!hasMore && items.length > 0 && (
        <Center py="xs">
          <Text size="xs" c="dimmed">
            End of timeline
          </Text>
        </Center>
      )}
    </Stack>
  );
}

export default VirtualizedTimeline;
