/**
 * AI Settings Component - Configure local and cloud AI providers
 */

import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Switch,
  TextInput,
  PasswordInput,
  Button,
  Badge,
  Alert,
  NumberInput,
  Select,
} from '@mantine/core';
import { IconBrain, IconCloud, IconServer, IconCheck, IconAlertCircle, IconTestPipe } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { logger } from '@/utils/logger';

interface AIConfig {
  localEnabled: boolean;
  ollamaUrl: string;
  defaultLocalModel: string;

  cloudEnabled: boolean;
  provider: 'openai' | 'claude' | 'gemini';
  apiKey: string;
  defaultCloudModel: string;

  maxTokens: number;
  temperature: number;
  cacheEnabled: boolean;
  costTracking: boolean;
}

const DEFAULT_CONFIG: AIConfig = {
  localEnabled: true,
  ollamaUrl: 'http://localhost:11434',
  defaultLocalModel: 'llama3.2',

  cloudEnabled: false,
  provider: 'openai',
  apiKey: '',
  defaultCloudModel: 'gpt-4o-mini',

  maxTokens: 2048,
  temperature: 0.7,
  cacheEnabled: true,
  costTracking: true,
};

/**
 * AI Settings Component
 */
export const AISettings: React.FC = () => {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [isTestingLocal, setIsTestingLocal] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [localStatus, setLocalStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [cloudStatus, setCloudStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    void loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig: Partial<AIConfig> = await invoke('get_ai_config_cmd');
      setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
    } catch {
      logger.warn('Failed to load AI config, using defaults');
    }
  };

  const saveConfig = async () => {
    try {
      await invoke('save_ai_config_cmd', { config });
      setIsDirty(false);
      notifications.show({
        title: 'Saved',
        message: 'AI settings saved successfully',
        color: 'green',
        icon: <IconCheck />,
      });
    } catch (error) {
      logger.error('Failed to save AI config', error as Error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings',
        color: 'red',
      });
    }
  };

  const testLocalConnection = async () => {
    setIsTestingLocal(true);
    try {
      const result: boolean = await invoke('check_ollama_connection_cmd', {
        url: config.ollamaUrl,
      });
      setLocalStatus(result ? 'connected' : 'error');
      notifications.show({
        title: result ? 'Connected' : 'Failed',
        message: result ? 'Ollama is running' : 'Could not connect to Ollama',
        color: result ? 'green' : 'red',
      });
    } catch {
      setLocalStatus('error');
    } finally {
      setIsTestingLocal(false);
    }
  };

  const testCloudConnection = async () => {
    if (!config.apiKey) {
      notifications.show({
        title: 'Missing API Key',
        message: 'Please enter an API key first',
        color: 'yellow',
      });
      return;
    }

    setIsTestingCloud(true);
    try {
      const result: boolean = await invoke('test_cloud_provider_cmd', {
        provider: config.provider,
        apiKey: config.apiKey,
      });
      setCloudStatus(result ? 'connected' : 'error');
      notifications.show({
        title: result ? 'Connected' : 'Failed',
        message: result ? 'API key is valid' : 'Invalid API key or connection error',
        color: result ? 'green' : 'red',
      });
    } catch {
      setCloudStatus('error');
    } finally {
      setIsTestingCloud(false);
    }
  };

  const updateConfig = (updates: Partial<AIConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={3}>AI Settings</Title>
        <Text c="dimmed" size="sm">
          Configure local and cloud AI providers for your workspace
        </Text>
      </div>

      {/* Local AI Section */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconServer size={20} />
            <Title order={5}>Local AI (Ollama)</Title>
            {localStatus !== 'unknown' && (
              <Badge color={localStatus === 'connected' ? 'green' : 'red'} size="sm">
                {localStatus}
              </Badge>
            )}
          </Group>
          <Switch
            checked={config.localEnabled}
            onChange={(e) => updateConfig({ localEnabled: e.currentTarget.checked })}
            label="Enable"
          />
        </Group>

        <Alert icon={<IconBrain size={16} />} color="blue" mb="md">
          Local AI keeps all your data on your device. Install Ollama from ollama.ai
        </Alert>

        <Stack gap="sm">
          <TextInput
            label="Ollama URL"
            placeholder="http://localhost:11434"
            value={config.ollamaUrl}
            onChange={(e) => updateConfig({ ollamaUrl: e.currentTarget.value })}
            disabled={!config.localEnabled}
          />

          <TextInput
            label="Default Model"
            placeholder="llama3.2"
            value={config.defaultLocalModel}
            onChange={(e) => updateConfig({ defaultLocalModel: e.currentTarget.value })}
            disabled={!config.localEnabled}
          />

          <Button
            variant="light"
            leftSection={<IconTestPipe size={16} />}
            onClick={() => void testLocalConnection()}
            loading={isTestingLocal}
            disabled={!config.localEnabled}
          >
            Test Connection
          </Button>
        </Stack>
      </Card>

      {/* Cloud AI Section */}
      <Card withBorder>
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconCloud size={20} />
            <Title order={5}>Cloud AI</Title>
            {cloudStatus !== 'unknown' && (
              <Badge color={cloudStatus === 'connected' ? 'green' : 'red'} size="sm">
                {cloudStatus}
              </Badge>
            )}
          </Group>
          <Switch
            checked={config.cloudEnabled}
            onChange={(e) => updateConfig({ cloudEnabled: e.currentTarget.checked })}
            label="Enable"
          />
        </Group>

        <Alert icon={<IconAlertCircle size={16} />} color="yellow" mb="md">
          Cloud AI sends prompts to external servers. Check each provider&apos;s privacy policy.
        </Alert>

        <Stack gap="sm">
          <Select
            label="Provider"
            value={config.provider}
            onChange={(v) => updateConfig({ provider: (v as AIConfig['provider']) || 'openai' })}
            data={[
              { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5)' },
              { value: 'claude', label: 'Anthropic (Claude 3)' },
              { value: 'gemini', label: 'Google (Gemini 1.5)' },
            ]}
            disabled={!config.cloudEnabled}
          />

          <PasswordInput
            label="API Key"
            placeholder="Enter your API key"
            value={config.apiKey}
            onChange={(e) => updateConfig({ apiKey: e.currentTarget.value })}
            disabled={!config.cloudEnabled}
          />

          <TextInput
            label="Default Model"
            placeholder="gpt-4o-mini"
            value={config.defaultCloudModel}
            onChange={(e) => updateConfig({ defaultCloudModel: e.currentTarget.value })}
            disabled={!config.cloudEnabled}
          />

          <Button
            variant="light"
            leftSection={<IconTestPipe size={16} />}
            onClick={() => void testCloudConnection()}
            loading={isTestingCloud}
            disabled={!config.cloudEnabled}
          >
            Test Connection
          </Button>
        </Stack>
      </Card>

      {/* General Settings */}
      <Card withBorder>
        <Title order={5} mb="md">
          General Settings
        </Title>
        <Stack gap="sm">
          <NumberInput
            label="Max Tokens"
            value={config.maxTokens}
            onChange={(v) => updateConfig({ maxTokens: typeof v === 'number' ? v : 2048 })}
            min={256}
            max={8192}
            step={256}
          />

          <NumberInput
            label="Temperature"
            value={config.temperature}
            onChange={(v) => updateConfig({ temperature: typeof v === 'number' ? v : 0.7 })}
            min={0}
            max={2}
            step={0.1}
            decimalScale={1}
          />

          <Switch
            label="Enable Response Caching"
            description="Cache AI responses to reduce costs and improve speed"
            checked={config.cacheEnabled}
            onChange={(e) => updateConfig({ cacheEnabled: e.currentTarget.checked })}
          />

          <Switch
            label="Enable Cost Tracking"
            description="Track API usage and costs for cloud providers"
            checked={config.costTracking}
            onChange={(e) => updateConfig({ costTracking: e.currentTarget.checked })}
          />
        </Stack>
      </Card>

      <Group justify="flex-end">
        <Button onClick={() => void saveConfig()} disabled={!isDirty}>
          Save Settings
        </Button>
      </Group>
    </Stack>
  );
};

export default AISettings;
