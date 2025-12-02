import React, { useState, useEffect } from 'react';
import {
  TextInput,
  Button,
  Group,
  Select,
  MultiSelect,
  Paper,
  Text,
  Stack,
  Card,
  Badge,
  ThemeIcon,
  Title,
  Divider,
} from '@mantine/core';
import { invoke } from '@tauri-apps/api/tauri';
import { Note, Tag } from '@noteece/types';
import { useStore } from '../store';
import { getAllTagsInSpace } from '@/services/api';
import { logger } from '@/utils/logger';
import { IconSearch, IconFilter, IconFileText } from '@tabler/icons-react';

const EnhancedSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const { activeSpaceId } = useStore();
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const latestRequestRef = React.useRef(0);

  useEffect(() => {
    const fetchTags = async () => {
      if (activeSpaceId) {
        try {
          const tags = await getAllTagsInSpace(activeSpaceId);
          setAllTags(tags);
        } catch (error) {
          logger.error('Failed to fetch tags:', error as Error);
        }
      }
    };
    void fetchTags();
  }, [activeSpaceId]);

  const handleSearch = async () => {
    if (activeSpaceId) {
      const requestId = Date.now();
      latestRequestRef.current = requestId;
      setLoading(true);
      try {
        let searchQuery = query;
        if (selectedTags.length > 0) {
          searchQuery += selectedTags.map((tag) => ` tag:${tag}`).join('');
        }
        if (status) {
          searchQuery += ` status:${status}`;
        }

        const fetched: Note[] = await invoke('search_notes_cmd', { query: searchQuery, scope: activeSpaceId });
        if (latestRequestRef.current === requestId) {
          setResults(fetched);
        }
      } catch (error) {
        logger.error('Failed to search notes:', error as Error);
      } finally {
        if (latestRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <Paper p="lg" radius="lg" withBorder className="glass">
        <Group align="flex-end">
          <TextInput
            label="Search Query"
            placeholder="Search notes, tasks, projects..."
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
            leftSection={<IconSearch size={16} />}
            size="md"
          />
          <MultiSelect
            label="Tags"
            data={allTags.map((tag) => tag.name)}
            placeholder="Filter by tags"
            value={selectedTags}
            onChange={setSelectedTags}
            searchable
            clearable
            leftSection={<IconFilter size={16} />}
            w={200}
            size="md"
          />
          <Select
            label="Status"
            data={['inbox', 'next', 'in_progress', 'waiting', 'done', 'cancelled']}
            placeholder="Any status"
            value={status}
            onChange={setStatus}
            clearable
            w={150}
            size="md"
          />
          <Button
            onClick={handleSearch}
            loading={loading}
            size="md"
            variant="gradient"
            gradient={{ from: 'violet', to: 'indigo' }}
          >
            Search
          </Button>
        </Group>
      </Paper>

      <Stack gap="sm">
        <Title order={4} px="xs">
          Results ({results.length})
        </Title>
        <Divider color="dark.6" />
        {results.length > 0 ? (
          results.map((note) => (
            <Card
              key={note.id.toString()}
              padding="md"
              radius="md"
              withBorder
              className="hover:bg-dark-6 transition-colors cursor-pointer"
            >
              <Group wrap="nowrap" align="flex-start">
                <ThemeIcon variant="light" color="blue" radius="md" size="lg">
                  <IconFileText size={20} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="lg" mb={4}>
                    {note.title}
                  </Text>
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {note.content_md}
                  </Text>
                  <Group mt="xs" gap="xs">
                    <Badge size="xs" variant="outline" color="gray">
                      Note
                    </Badge>
                    {/* Placeholder for matched tags if we had them in the result */}
                  </Group>
                </div>
              </Group>
            </Card>
          ))
        ) : (
          <Paper p="xl" ta="center" c="dimmed" radius="lg" withBorder style={{ borderStyle: 'dashed' }}>
            <Text>No results found matching your criteria.</Text>
          </Paper>
        )}
      </Stack>
    </Stack>
  );
};

export default EnhancedSearch;
