import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Mode } from './types';
import { useStore } from '../store';
import { logger } from '@/utils/logger';
import { Container, Title, Stack, TextInput, Button, Text, Checkbox } from '@mantine/core';

const availableModes: Mode[] = [
  { id: 'meeting-notes', name: 'Meeting Notes', category: 'productivity' },
  { id: 'project-hub', name: 'Project Hub', category: 'productivity' },
  { id: 'srs', name: 'Spaced Repetition', category: 'learning' },
];

const Settings: React.FC = () => {
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const [modes, setModes] = useState<Mode[]>([]);
  const [message, setMessage] = useState('');
  const { activeSpaceId } = useStore();

  useEffect(() => {
    const fetchModes = async () => {
      if (!activeSpaceId) return;
      try {
        const spaceModes: Mode[] = await invoke('get_space_modes_cmd', { spaceId: activeSpaceId });
        setModes(spaceModes);
      } catch (error) {
        logger.error('Error fetching modes:', error as Error);
      }
    };

    void fetchModes();
  }, [activeSpaceId]);

  const handleCreateVault = async () => {
    try {
      await invoke('create_vault_cmd', { path, password });
      setMessage('Vault created successfully');
    } catch (error) {
      setMessage(`Error creating vault: ${String(error)}`);
    }
  };

  const handleUnlockVault = async () => {
    try {
      await invoke('unlock_vault_cmd', { path, password });
      setMessage('Vault unlocked successfully');
    } catch (error) {
      setMessage(`Error unlocking vault: ${String(error)}`);
    }
  };

  const isModeEnabled = (mode: Mode) => {
    return modes.some((enabledMode) => enabledMode.id === mode.id);
  };

  const handleToggleMode = async (mode: Mode) => {
    if (!activeSpaceId) return;
    try {
      await (isModeEnabled(mode)
        ? invoke('disable_mode_cmd', { spaceId: activeSpaceId, mode })
        : invoke('enable_mode_cmd', { spaceId: activeSpaceId, mode }));
      // Refetch modes after toggling
      const spaceModes: Mode[] = await invoke('get_space_modes_cmd', { spaceId: activeSpaceId });
      setModes(spaceModes);
    } catch (error) {
      logger.error(`Error toggling mode ${mode.name}:`, error as Error);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={2}>Settings</Title>

        <Stack gap="md">
          <Title order={3}>Vault Management</Title>
          <TextInput
            placeholder="Vault Path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            label="Vault Path"
          />
          <TextInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="Password"
          />
          <Stack gap="xs">
            <Button onClick={handleCreateVault}>Create Vault</Button>
            <Button onClick={handleUnlockVault} variant="light">
              Unlock Vault
            </Button>
          </Stack>
          {message && <Text c="blue">{message}</Text>}
        </Stack>

        <Stack gap="md">
          <Title order={3}>Mode Management</Title>
          <Stack gap="sm">
            {availableModes.map((mode) => (
              <Checkbox
                key={mode.id}
                id={mode.id}
                label={mode.name}
                checked={isModeEnabled(mode)}
                onChange={() => handleToggleMode(mode)}
              />
            ))}
          </Stack>
        </Stack>
      </Stack>
    </Container>
  );
};

export default Settings;
