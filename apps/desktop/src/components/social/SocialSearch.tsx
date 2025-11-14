/**
 * SocialSearch Component
 *
 * Advanced FTS-powered search across all social media posts
 */

import { Stack, TextInput, Card, Text, Group, Badge, Center, Loader, ActionIcon, Pill } from '@mantine/core';
import { IconSearch, IconFilter, IconX } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import { SUPPORTED_PLATFORMS } from '@noteece/types';
import { TimelinePost } from './TimelinePost';

interface SearchResult {
  id: string;
  platform: string;
  account_username: string;
  author: string;
  author_handle: string | null;
  content: string | null;
  timestamp: number;
  engagement: {
    likes: number | null;
    shares: number | null;
    comments: number | null;
    views: number | null;
  };
  media_urls: string[];
  post_type: string | null;
  categories: string[];
}

interface SocialSearchProperties {
  spaceId: string;
}

export function SocialSearch({ spaceId }: SocialSearchProperties) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['socialSearch', spaceId, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];

      return await invoke<SearchResult[]>('search_social_posts_cmd', {
        spaceId,
        query: debouncedQuery,
        limit: 50,
      });
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const handleClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  return (
    <Stack gap="md">
      {/* Search Bar */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <TextInput
          size="lg"
          placeholder="Search posts, authors, content..."
          leftSection={<IconSearch size={20} />}
          rightSection={
            searchQuery.length > 0 ? (
              <ActionIcon variant="subtle" onClick={handleClear}>
                <IconX size={16} />
              </ActionIcon>
            ) : null
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />
        <Text size="xs" c="dimmed" mt="xs">
          💡 Tip: Search by keywords, author names, or platform
        </Text>
      </Card>

      {/* Results */}
      {searchQuery.length > 0 && (
        <>
          {isLoading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : results && results.length > 0 ? (
            <>
              <Group>
                <Text size="sm" fw={500}>
                  Found {results.length} result{results.length === 1 ? '' : 's'}
                </Text>
                {debouncedQuery && <Pill size="sm">Searching for: "{debouncedQuery}"</Pill>}
              </Group>

              <Stack gap="md">
                {results.map((post) => (
                  <TimelinePost
                    key={post.id}
                    post={{
                      id: post.id,
                      author: post.author,
                      handle: post.author_handle || 'unknown',
                      platform: post.platform,
                      content: post.content || '',
                      timestamp: post.timestamp,
                      likes: post.engagement.likes,
                      comments: post.engagement.comments,
                      shares: post.engagement.shares,
                      views: post.engagement.views,
                      type: post.post_type,
                    }}
                  />
                ))}
              </Stack>
            </>
          ) : results && results.length === 0 ? (
            <Center py="xl">
              <Stack align="center">
                <Text size="xl">🔍</Text>
                <Text size="lg" fw={500}>
                  No results found
                </Text>
                <Text size="sm" c="dimmed">
                  Try different keywords or check your spelling
                </Text>
              </Stack>
            </Center>
          ) : null}
        </>
      )}

      {searchQuery.length === 0 && (
        <Center py="xl">
          <Stack align="center">
            <Text size="xl">🔎</Text>
            <Text size="lg" fw={500}>
              Search Your Social Media
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Find posts across all your connected platforms
            </Text>
            <Text size="xs" c="dimmed" ta="center" mt="md">
              Powered by full-text search (FTS5)
            </Text>
          </Stack>
        </Center>
      )}
    </Stack>
  );
}
