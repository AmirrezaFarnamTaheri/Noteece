import React, { useState } from 'react';
import { Button, TextInput, Paper, Title, Container } from '@mantine/core';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

const VaultManagement: React.FC = () => {
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleCreateVault = async () => {
    try {
      await invoke('create_vault', { path, password });
      navigate('/main');
    } catch (error) {
      logger.error('Failed to create vault:', error as Error);
    }
  };

  const handleUnlockVault = async () => {
    try {
      await invoke('unlock_vault', { path, password });
      navigate('/main');
    } catch (error) {
      logger.error('Failed to unlock vault:', error as Error);
    }
  };

  return (
    <Container size="xs" my={40}>
      <Title ta="center" fw={900}>
        Vault Management
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <TextInput
          label="Vault Path"
          placeholder="/path/to/vault"
          value={path}
          onChange={(event) => setPath(event.currentTarget.value)}
          required
        />
        <TextInput
          label="Password"
          placeholder="Your password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          mt="md"
        />
        <Button fullWidth mt="xl" onClick={handleCreateVault}>
          Create Vault
        </Button>
        <Button fullWidth mt="md" onClick={handleUnlockVault}>
          Unlock Vault
        </Button>
      </Paper>
    </Container>
  );
};

export default VaultManagement;
