import React, { useState } from 'react';
import { Modal, TextInput, List } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

const commands = [
  { label: 'Home', to: '/main' },
  { label: 'Editor', to: '/main/editor' },
  { label: 'Tasks', to: '/main/tasks' },
  { label: 'Projects', to: '/main/projects' },
  { label: 'Search', to: '/main/search' },
  // ... add more commands
];

const CommandPalette: React.FC<{ opened: boolean; onClose: () => void }> = ({ opened, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filteredCommands = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Command Palette">
      <TextInput
        placeholder="Search commands..."
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <List mt="md">
        {filteredCommands.map((command) => (
          <List.Item key={command.label} onClick={() => handleSelect(command.to)} style={{ cursor: 'pointer' }}>
            {command.label}
          </List.Item>
        ))}
      </List>
    </Modal>
  );
};

export default CommandPalette;
