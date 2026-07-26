import React, { useState } from 'react';
import { Button, TextInput, Paper, Title, Container, Alert } from '@mantine/core';
import { invoke } from '@tauri-apps/api/tauri';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';

const VaultManagement: React.FC = () => {
  const [path, setPath] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const runVaultAction = async (command: 'create_vault_cmd' | 'unlock_vault_cmd') => {
    setError(null);
    setBusy(true);
    try {
      await invoke(command, { path, password });
      navigate('/main');
    } catch (err) {
      logger.error(`Vault action ${command} failed:`, err as Error);
      setError(typeof err === 'string' ? err : (err as Error)?.message ?? 'Vault operation failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVault = () => runVaultAction('create_vault_cmd');
  const handleUnlockVault = () => runVaultAction('unlock_vault_cmd');

  return (
    <Container size="xs" my={40}>
      <Title ta="center" fw={900}>
        Vault Management
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {error && (
          <Alert color="red" title="Vault error" mb="md" role="alert">
            {error}
          </Alert>
        )}
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
        <Button
          fullWidth
          mt="xl"
          onClick={handleCreateVault}
          loading={busy}
          disabled={busy || !path || !password}
        >
          Create Vault
        </Button>
        <Button
          fullWidth
          mt="md"
          onClick={handleUnlockVault}
          loading={busy}
          disabled={busy || !path || !password}
        >
          Unlock Vault
        </Button>
      </Paper>
    </Container>
  );
};

export default VaultManagement;
