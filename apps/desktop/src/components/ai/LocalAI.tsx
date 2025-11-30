/**
 * Local AI Component - On-device AI integration via Ollama
 */

import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Button,
  Textarea,
  Select,
  Badge,
  ScrollArea,
  Paper,
  Loader,
  ActionIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  IconBrain,
  IconSend,
  IconRefresh,
  IconSettings,
  IconCheck,
  IconX,
  IconCopy,
  IconTrash,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { logger } from '@/utils/logger';
import { useI18n } from '@/i18n';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ModelInfo {
  name: string;
  size: string;
  quantization?: string;
}

/**
 * Local AI Component
 */
export const LocalAI: React.FC = () => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check connection on mount
  useEffect(() => {
    void checkConnection();
    void loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const checkConnection = async () => {
    try {
      const result: boolean = await invoke('check_ollama_connection_cmd');
      setIsConnected(result);
    } catch (error) {
      logger.warn('Ollama not connected', { error });
      setIsConnected(false);
    }
  };

  const loadModels = async () => {
    try {
      const modelList: string[] = await invoke('list_ollama_models_cmd');
      setModels(
        modelList.map((name) => ({
          name,
          size: 'Unknown',
        })),
      );
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0]);
      }
    } catch (error) {
      logger.error('Failed to load models', error as Error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response: string = await invoke('chat_with_ollama_cmd', {
        model: selectedModel,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        prompt: userMessage.content,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('AI chat failed', error as Error);
      notifications.show({
        title: t('common.error'),
        message: 'Failed to get AI response. Is Ollama running?',
        color: 'red',
        icon: <IconX />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    notifications.show({
      title: 'Copied',
      message: 'Message copied to clipboard',
      color: 'green',
      icon: <IconCheck />,
    });
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <Card withBorder h="100%">
      <Stack h="100%" gap={0}>
        {/* Header */}
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <IconBrain size={24} />
            <Title order={4}>{t('ai.title')}</Title>
            <Badge color={isConnected ? 'green' : 'red'} variant="light" size="sm">
              {isConnected ? 'Connected' : 'Offline'}
            </Badge>
          </Group>
          <Group gap="xs">
            <Tooltip label="Refresh connection">
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  void checkConnection();
                  void loadModels();
                }}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Clear chat">
              <ActionIcon variant="subtle" color="red" onClick={clearChat}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Model Selection */}
        <Group mb="md" gap="sm">
          <Select
            style={{ flex: 1 }}
            placeholder="Select a model"
            value={selectedModel}
            onChange={(v) => setSelectedModel(v || '')}
            data={models.map((m) => ({ value: m.name, label: m.name }))}
            disabled={!isConnected || models.length === 0}
            searchable
          />
        </Group>

        <Divider />

        {/* Chat Messages */}
        <ScrollArea style={{ flex: 1 }} p="md" viewportRef={scrollRef}>
          {messages.length === 0 ? (
            <Stack align="center" justify="center" h={200}>
              <IconBrain size={48} opacity={0.3} />
              <Text c="dimmed" ta="center">
                Start a conversation with your local AI assistant.
                <br />
                Your data stays on your device.
              </Text>
            </Stack>
          ) : (
            <Stack gap="md">
              {messages.map((msg) => (
                <Paper
                  key={msg.id}
                  p="sm"
                  withBorder
                  style={{
                    backgroundColor: msg.role === 'user' ? 'var(--mantine-color-blue-light)' : undefined,
                    marginLeft: msg.role === 'user' ? 'auto' : 0,
                    marginRight: msg.role === 'assistant' ? 'auto' : 0,
                    maxWidth: '80%',
                  }}
                >
                  <Group justify="space-between" mb={4}>
                    <Text size="xs" c="dimmed" tt="capitalize">
                      {msg.role}
                    </Text>
                    <ActionIcon size="xs" variant="subtle" onClick={() => copyMessage(msg.content)}>
                      <IconCopy size={12} />
                    </ActionIcon>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Text>
                </Paper>
              ))}
              {isLoading && (
                <Group gap="xs">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">
                    {t('ai.processing')}
                  </Text>
                </Group>
              )}
            </Stack>
          )}
        </ScrollArea>

        <Divider />

        {/* Input Area */}
        <Group p="md" gap="sm" align="flex-end">
          <Textarea
            style={{ flex: 1 }}
            placeholder={isConnected ? 'Ask anything...' : 'Connect to Ollama first'}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected || !selectedModel}
            minRows={1}
            maxRows={4}
            autosize
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || !selectedModel || isLoading || !isConnected}
            loading={isLoading}
            leftSection={<IconSend size={16} />}
          >
            Send
          </Button>
        </Group>
      </Stack>
    </Card>
  );
};

export default LocalAI;
