import React, { useState, useEffect } from 'react';
import { TextInput, Button, Group, Select, MultiSelect, Paper, Text } from '@mantine/core';
import { invoke } from '@tauri-apps/api/core';
import { Note, Tag } from '@noteece/types';
import { useStore } from '../store';
import { getAllTagsInSpace } from '@/services/api';

const EnhancedSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const { activeSpaceId } = useStore();
  const [allTags, setAllTags] = useState<Tag[]>([]);

  useEffect(() => {
    const fetchTags = async () => {
      if (activeSpaceId) {
        try {
          const tags = await getAllTagsInSpace(activeSpaceId);
          setAllTags(tags);
        } catch (error) {
          console.error('Failed to fetch tags:', error);
        }
      }
    };
    void fetchTags();
  }, [activeSpaceId]);

  const handleSearch = async () => {
    if (activeSpaceId) {
      try {
        let searchQuery = query;
        if (selectedTags.length > 0) {
          searchQuery += selectedTags.map((tag) => ` tag:${tag}`).join('');
        }
        if (status) {
          searchQuery += ` status:${status}`;
        }

        const results: Note[] = await invoke('search_notes_cmd', { query: searchQuery, scope: activeSpaceId });
        setResults(results);
      } catch (error) {
        console.error('Failed to search notes:', error);
      }
    }
  };

  return (
    <div>
      <h2>Enhanced Search</h2>
      <Group>
        <TextInput
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button onClick={handleSearch}>Search</Button>
      </Group>

      <Group mt="md">
        <MultiSelect
          data={allTags.map((tag) => tag.name)}
          placeholder="Filter by tags"
          value={selectedTags}
          onChange={setSelectedTags}
        />
        <Select
          data={['inbox', 'next', 'in_progress', 'waiting', 'done', 'cancelled']}
          placeholder="Filter by status"
          value={status}
          onChange={setStatus}
          clearable
        />
      </Group>

      <Paper mt="md" p="md" shadow="xs" withBorder>
        {results.length > 0 ? (
          results.map((note) => (
            <div key={note.id.toString()}>
              <Text fw={500}>{note.title}</Text>
              <Text size="sm" c="dimmed">
                {note.content_md.slice(0, 100)}...
              </Text>
            </div>
          ))
        ) : (
          <Text>No results found.</Text>
        )}
      </Paper>
    </div>
  );
};

export default EnhancedSearch;
