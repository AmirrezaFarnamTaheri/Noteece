import React, { useState } from 'react';
import { Modal, TextInput, Paper, Group, Text, ThemeIcon, Stack, ScrollArea } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  IconHome2,
  IconNote,
  IconCheckbox,
  IconClipboardList,
  IconSearch,
  IconChevronRight,
} from '@tabler/icons-react';

const commands = [
  { label: 'Home', to: '/main', icon: IconHome2, description: 'Go to Dashboard' },
  { label: 'Editor', to: '/main/editor', icon: IconNote, description: 'Create or edit notes' },
  { label: 'Tasks', to: '/main/tasks', icon: IconCheckbox, description: 'Manage your tasks' },
  { label: 'Projects', to: '/main/projects', icon: IconClipboardList, description: 'View project hub' },
  { label: 'Search', to: '/main/search', icon: IconSearch, description: 'Advanced search' },
];

const CommandPalette: React.FC<{ opened: boolean; onClose: () => void }> = ({ opened, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredCommands = commands.filter(
    (c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (to: string) => {
    navigate(to);
    onClose();
    setQuery('');
    setSelectedIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onClose();
        setQuery('');
        setSelectedIndex(0);
      }
      return;
    }

    switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);

    break;
    }
    case 'ArrowUp': {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);

    break;
    }
    case 'Enter': {
      event.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex].to);
      }

    break;
    }
    // No default
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      size="lg"
      padding={0}
      radius="lg"
      overlayProps={{
        opacity: 0.55,
        blur: 3,
      }}
      styles={{
        content: {
          backgroundColor: 'rgba(26, 27, 30, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--mantine-color-dark-4)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        },
      }}
    >
      <TextInput
        placeholder="Type a command or search..."
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          setSelectedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        size="lg"
        leftSection={<IconSearch size={20} stroke={1.5} />}
        styles={{
          input: {
            border: 'none',
            borderBottom: '1px solid var(--mantine-color-dark-4)',
            borderRadius: 0,
            backgroundColor: 'transparent',
            padding: 'var(--mantine-spacing-md)',
            fontSize: 'var(--mantine-font-size-lg)',
            '&:focus': {
              boxShadow: 'none',
            },
          },
        }}
      />
      <ScrollArea.Autosize mah={400} type="scroll">
        <Stack gap={0} p={4}>
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command, index) => (
              <Paper
                key={command.label}
                onClick={() => handleSelect(command.to)}
                p="sm"
                radius="md"
                style={{
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? 'var(--mantine-color-dark-6)' : 'transparent',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Group wrap="nowrap">
                  <ThemeIcon
                    size="lg"
                    radius="md"
                    variant={index === selectedIndex ? 'gradient' : 'light'}
                    gradient={{ from: 'violet', to: 'indigo' }}
                    color={index === selectedIndex ? undefined : 'gray'}
                  >
                    <command.icon size={20} stroke={1.5} />
                  </ThemeIcon>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={600} c={index === selectedIndex ? 'white' : 'gray.3'}>
                      {command.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {command.description}
                    </Text>
                  </div>
                  {index === selectedIndex && <IconChevronRight size={16} stroke={1.5} style={{ opacity: 0.5 }} />}
                </Group>
              </Paper>
            ))
          ) : (
            <Text p="xl" c="dimmed" ta="center">
              No results found
            </Text>
          )}
        </Stack>
      </ScrollArea.Autosize>
      <Group justify="space-between" px="md" py="xs" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            <Text span fw={700} c="dark.2" style={{ border: '1px solid #333', padding: '0 4px', borderRadius: 4 }}>
              ↑↓
            </Text>{' '}
            to navigate
          </Text>
          <Text size="xs" c="dimmed">
            <Text span fw={700} c="dark.2" style={{ border: '1px solid #333', padding: '0 4px', borderRadius: 4 }}>
              ↵
            </Text>{' '}
            to select
          </Text>
        </Group>
      </Group>
    </Modal>
  );
};

export default CommandPalette;
