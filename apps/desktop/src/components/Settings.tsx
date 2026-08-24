import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/tauri';
import { Mode } from './types';
import { useStore } from '../store';
import { logger } from '@/utils/logger';
import { Container, Title, Stack, TextInput, Button, Text, Checkbox, Tabs, Group, Badge } from '@mantine/core';
import { IconSettings, IconBrain, IconPalette, IconShield } from '@tabler/icons-react';

const availableModes: Mode[] = [
  { id: 'meeting-notes', name: 'Meeting Notes', category: 'productivity' },
  { id: 'project-hub', name: 'Project Hub', category: 'productivity' },
  { id: 'srs', name: 'Spaced Repetition', category: 'learning' },
];

const Settings: React.FC = () => {
  const { t } = useTranslation();
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
        <Title order={2}>{t('settings.title')}</Title>

        <Tabs defaultValue="vault" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="vault" leftSection={<IconSettings size={16} />}>
              Vault
            </Tabs.Tab>
            <Tabs.Tab value="modes" leftSection={<IconPalette size={16} />}>
              Modes
            </Tabs.Tab>
            <Tabs.Tab value="ai" leftSection={<IconBrain size={16} />}>
              AI
              <Badge size="xs" color="violet" ml={6}>New</Badge>
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconShield size={16} />}>
              Security
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="vault" pt="md">
            <Stack gap="md">
              <Title order={3}>{t('settings.vaultManagement')}</Title>
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
          </Tabs.Panel>

          <Tabs.Panel value="modes" pt="md">
            <Stack gap="md">
              <Title order={3}>{t('settings.modeManagement')}</Title>
              <Text size="sm" c="dimmed">
                Enable or disable workspace modes to customize your experience.
              </Text>
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
          </Tabs.Panel>

          <Tabs.Panel value="ai" pt="md">
            <Stack gap="md">
              <Title order={3}>AI Settings</Title>
              <Text size="sm" c="dimmed">
                Configure AI providers and RAG settings for Chat with Vault.
              </Text>
              <Group>
                <Badge variant="light" color="green">Ollama</Badge>
                <Badge variant="light" color="blue">OpenAI</Badge>
                <Badge variant="light" color="violet">Claude</Badge>
                <Badge variant="light" color="orange">Gemini</Badge>
              </Group>
              <Text size="xs" c="dimmed">
                AI providers are configured per-vault. Navigate to the AI Chat page to test your configuration.
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="security" pt="md">
            <Stack gap="md">
              <Title order={3}>Security</Title>
              <Text size="sm" c="dimmed">
                Security settings are managed through the vault encryption layer.
                All data is encrypted at rest with XChaCha20-Poly1305.
              </Text>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default Settings;
