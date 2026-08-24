import React, { useState } from 'react';
import { Button, TextInput, Paper, Title, Container, Text } from '@mantine/core';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { showError } from '@/utils/notifications';

const VaultManagement: React.FC = () => {
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const [pathError, setPathError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const validate = (): boolean => {
    let valid = true;
    if (path.trim()) {
      setPathError('');
    } else {
      setPathError('Vault path is required');
      valid = false;
    }
    if (password.trim()) {
      setPasswordError('');
    } else {
      setPasswordError('Password is required');
      valid = false;
    }
    return valid;
  };

  const handleCreateVault = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    try {
      await invoke('create_vault', { path, password });
      navigate('/main');
    } catch (error) {
      logger.error('Failed to create vault:', error as Error);
      showError({ title: 'Vault Creation Failed', message: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  const handleUnlockVault = async () => {
    if (!validate()) return;
    try {
      await invoke('unlock_vault', { path, password });
      navigate('/main');
    } catch (error) {
      logger.error('Failed to unlock vault:', error as Error);
      showError({ title: 'Vault Unlock Failed', message: error instanceof Error ? error.message : 'An unexpected error occurred' });
    }
  };

  return (
    <Container size="xs" my={40}>
      <Title ta="center" fw={900}>
        Vault Management
      </Title>
      <Text ta="center" c="dimmed" size="sm" mt="xs">
        Welcome to Noteece! Create or unlock your encrypted knowledge vault to get started.
        Your data is protected with end-to-end encryption.
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleCreateVault} noValidate>
          <TextInput
            label="Vault Path"
            placeholder="/path/to/vault"
            value={path}
            onChange={(event) => { setPath(event.currentTarget.value); setPathError(''); }}
            required
            aria-required="true"
            aria-invalid={!!pathError}
            error={pathError}
          />
          <TextInput
            label="Password"
            placeholder="Your password"
            type="password"
            value={password}
            onChange={(event) => { setPassword(event.currentTarget.value); setPasswordError(''); }}
            required
            aria-required="true"
            aria-invalid={!!passwordError}
            error={passwordError}
            mt="md"
          />
          <Button fullWidth mt="xl" type="submit">
            Create Vault
          </Button>
          <Button fullWidth mt="md" onClick={handleUnlockVault} type="button">
            Unlock Vault
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default VaultManagement;
