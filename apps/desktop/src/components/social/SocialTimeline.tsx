/**
 * SocialTimeline Component
 *
 * Unified timeline displaying posts from all social media accounts
 */

import { Stack, Center, Text, Loader, Button } from '@mantine/core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import { useState, useEffect, useRef } from 'react';
import { TimelinePost } from './TimelinePost';
import { TimelineFilters, TimelineFilterValues } from './TimelineFilters';

interface SocialTimelineProps {
  spaceId: string;
}

interface TimelineResponse {
  posts: any[];
  has_more: boolean;
  total_count: number;
}

export function SocialTimeline({ spaceId }: SocialTimelineProps) {
  const [filters, setFilters] = useState<TimelineFilterValues>({
    platforms: [],
    searchQuery: '',
    sortBy: 'newest',
    timeRange: 'all',
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['timeline', spaceId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      // Convert filters to timeline filters format
      const timelineFilters = {
        platforms: filters.platforms.length > 0 ? filters.platforms : null,
        search_query: filters.searchQuery || null,
        start_time: getStartTime(filters.timeRange),
        end_time: null,
        limit: 20,
        offset: pageParam,
      };

      const result = await invoke<any[]>('get_unified_timeline_cmd', {
        spaceId,
        filters: timelineFilters,
      });

      return {
        posts: result,
        has_more: result.length === 20,
        total_count: result.length,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      // Only fetch next page if the last page was full (indicating more data may exist)
      if (lastPage.has_more && lastPage.posts.length > 0) {
        // Calculate offset as total number of posts fetched so far
        const currentOffset = allPages.reduce((sum, page) => sum + page.posts.length, 0);
        return currentOffset;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Helper function to get start time based on time range (in milliseconds)
  function getStartTime(timeRange: string): number | null {
    const now = Date.now(); // Already in milliseconds
    switch (timeRange) {
      case 'today':
        return now - 86400000; // 24 hours
      case 'week':
        return now - 604800000; // 7 days
      case 'month':
        return now - 2592000000; // 30 days
      case 'year':
        return now - 31536000000; // 365 days
      default:
        return null;
    }
  }

  // Sort posts based on sort filter
  const sortPosts = (posts: any[]) => {
    const sorted = [...posts];
    switch (filters.sortBy) {
      case 'oldest':
        return sorted.sort((a, b) => a.timestamp - b.timestamp);
      case 'most_liked':
        return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'most_commented':
        return sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0));
      case 'newest':
      default:
        return sorted.sort((a, b) => b.timestamp - a.timestamp);
    }
  };

  const allPosts = data?.pages.flatMap((page) => page.posts) || [];
  const sortedPosts = sortPosts(allPosts);

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Center py="xl">
        <Stack align="center">
          <Text c="red">Failed to load timeline</Text>
          <Button onClick={() => refetch()}>Retry</Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <TimelineFilters onFilterChange={setFilters} />

      {sortedPosts.length === 0 ? (
        <Center py="xl">
          <Stack align="center">
            <Text size="xl">📭</Text>
            <Text size="lg" fw={500}>
              No posts yet
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {filters.platforms.length > 0 || filters.searchQuery || filters.timeRange !== 'all'
                ? 'No posts match your filters. Try adjusting them.'
                : 'Add social media accounts and open them in WebView to start collecting posts.'}
            </Text>
          </Stack>
        </Center>
      ) : (
        <>
          <Stack gap="md">
            {sortedPosts.map((post) => (
              <TimelinePost key={post.id} post={post} />
            ))}
          </Stack>

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} style={{ height: '20px' }} />

          {isFetchingNextPage && (
            <Center py="md">
              <Loader size="sm" />
            </Center>
          )}

          {!hasNextPage && sortedPosts.length > 0 && (
            <Center py="md">
              <Text size="sm" c="dimmed">
                You've reached the end of your timeline
              </Text>
            </Center>
          )}
        </>
      )}
    </Stack>
  );
}
