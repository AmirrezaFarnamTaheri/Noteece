import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, Button, Modal, TextInput, Select, List, ThemeIcon, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';

interface SavedSearch {
  id: string;
  space_id: string;
  title: string;
  query_string: string;
  scope: string;
}

interface SavedSearchesProperties {
  spaceId: string;
}

const SavedSearches: React.FC<SavedSearchesProperties> = ({ spaceId }) => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [title, setTitle] = useState('');
  const [queryString, setQueryString] = useState('');
  const [scope, setScope] = useState('note');
  const [opened, { open, close }] = useDisclosure(false);

  const fetchSearches = async () => {
    try {
      const searchesData: SavedSearch[] = await invoke('get_saved_searches_cmd', { spaceId });
      setSearches(searchesData);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  };

  useEffect(() => {
    if (spaceId) {
      void fetchSearches();
    }
  }, [spaceId]);

  const handleCreateSearch = async () => {
    try {
      await invoke('create_saved_search_cmd', {
        spaceId,
        title,
        queryString,
        scope,
      });
      void fetchSearches();
      setTitle('');
      setQueryString('');
      close();
    } catch (error) {
      console.error('Error creating saved search:', error);
    }
  };

  return (
    <div>
      <h2>Saved Searches</h2>
      <Button onClick={open}>Create New Search</Button>
      <Modal opened={opened} onClose={close} title="Create New Saved Search">
        <TextInput
          label="Title"
          placeholder="Enter search title"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
        <TextInput
          label="Query"
          placeholder="Enter your search query"
          value={queryString}
          onChange={(event) => setQueryString(event.currentTarget.value)}
          mt="md"
        />
        <Select
          label="Scope"
          value={scope}
          onChange={(value) => setScope(value || 'note')}
          data={[
            { value: 'note', label: 'Note' },
            { value: 'project', label: 'Project' },
            { value: 'space', label: 'Space' },
            { value: 'vault_all', label: 'Vault' },
          ]}
          mt="md"
        />
        <Button fullWidth mt="md" onClick={handleCreateSearch}>
          Create
        </Button>
      </Modal>

      <Card shadow="sm" p="lg" radius="md" withBorder mt="md">
        <Text fw={500}>Existing Searches</Text>
        <List
          spacing="xs"
          size="sm"
          center
          icon={
            <ThemeIcon color="blue" size={24} radius="xl">
              <IconSearch size="1rem" />
            </ThemeIcon>
          }
        >
          {searches.map((search) => (
            <List.Item key={search.id}>{search.title}</List.Item>
          ))}
        </List>
      </Card>
    </div>
  );
};

export default SavedSearches;
