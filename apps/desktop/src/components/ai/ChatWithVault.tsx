/**
 * ChatWithVault Component
 *
 * RAG-powered chat interface for querying the user's vault.
 * Retrieves relevant context from notes and generates AI answers.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Paper,
  Stack,
  Group,
  TextInput,
  ActionIcon,
  Text,
  ScrollArea,
  Badge,
  Accordion,
  Loader,
  Box,
  ThemeIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import {
  IconSend,
  IconMessageCircle,
  IconRobot,
  IconUser,
  IconFileText,
  IconSparkles,
} from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';

interface Source {
  note_id: string;
  title: string;
  content_preview: string;
  score: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  tokens_used?: number;
  confidence?: number;
  timestamp: number;
}

interface RagResponse {
  answer: string;
  sources: Array<{
    chunk: {
      note_id: string;
      content: string;
      metadata: Record<string, string>;
    };
    score: number;
  }>;
  tokens_used: number;
  model: string;
  confidence: number;
}

interface ChatWithVaultProps {
  spaceId?: string;
  onSourceClick?: (noteId: string) => void;
}

export function ChatWithVault({ spaceId, onSourceClick }: ChatWithVaultProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if RAG is available
  const { data: ragStats } = useQuery({
    queryKey: ['rag-stats'],
    queryFn: async () => {
      try {
        return await invoke<{ total_notes: number; total_chunks: number }>('get_rag_stats_cmd');
      } catch {
        return { total_notes: 0, total_chunks: 0 };
      }
    },
    staleTime: 60_000,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (question: string): Promise<RagResponse> => {
      return await invoke('rag_query_cmd', {
        query: {
          question,
          space_id: spaceId,
          max_context_chunks: 5,
          min_relevance_score: 0.3,
          include_metadata: true,
        },
      });
    },
    onSuccess: (response, _question) => {
      const sources: Source[] = response.sources.map((s) => ({
        note_id: s.chunk.note_id,
        title: s.chunk.metadata.title || 'Untitled',
        content_preview: s.chunk.content.slice(0, 150) + '...',
        score: s.score,
      }));

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources,
        tokens_used: response.tokens_used,
        confidence: response.confidence,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error) => {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't find relevant information in your vault. ${error instanceof Error ? error.message : 'Please try a different question.'}`,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Handle send
  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput || sendMutation.isPending) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    sendMutation.mutate(trimmedInput);
  }, [input, sendMutation]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder h="100%">
      <Stack h="100%" gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon color="violet" variant="light" size="lg">
              <IconSparkles size={20} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={600}>
                Chat with your Vault
              </Text>
              <Text size="xs" c="dimmed">
                Ask questions about your notes
              </Text>
            </Box>
          </Group>
          {ragStats && (
            <Tooltip label={`${ragStats.total_chunks} chunks from ${ragStats.total_notes} notes indexed`}>
              <Badge variant="light" color="gray" size="sm">
                {ragStats.total_notes} notes indexed
              </Badge>
            </Tooltip>
          )}
        </Group>

        <Divider />

        {/* Messages */}
        <ScrollArea h="100%" viewportRef={scrollRef} offsetScrollbars>
          <Stack gap="md" pr="xs">
            {messages.length === 0 ? (
              <Box ta="center" py="xl">
                <ThemeIcon color="gray" variant="light" size={60} radius="xl" mb="md">
                  <IconMessageCircle size={30} />
                </ThemeIcon>
                <Text c="dimmed" size="sm">
                  Ask anything about your notes and documents.
                </Text>
                <Text c="dimmed" size="xs" mt="xs">
                  Try: &quot;What are my main project goals?&quot; or &quot;Summarize my recent meeting notes&quot;
                </Text>
              </Box>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} onSourceClick={onSourceClick} />
              ))
            )}

            {sendMutation.isPending && (
              <Group gap="xs" p="sm">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  Searching your vault...
                </Text>
              </Group>
            )}
          </Stack>
        </ScrollArea>

        {/* Input */}
        <Group gap="xs">
          <TextInput
            ref={inputRef}
            placeholder="Ask a question about your notes..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMutation.isPending}
            style={{ flex: 1 }}
            rightSection={
              <ActionIcon
                color="violet"
                variant="filled"
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
              >
                <IconSend size={16} />
              </ActionIcon>
            }
          />
        </Group>
      </Stack>
    </Paper>
  );
}

// Message bubble component
function MessageBubble({ message, onSourceClick }: { message: ChatMessage; onSourceClick?: (noteId: string) => void }) {
  const isUser = message.role === 'user';

  return (
    <Box>
      <Group gap="xs" mb="xs" align="flex-start">
        <ThemeIcon color={isUser ? 'blue' : 'violet'} variant="light" size="sm" radius="xl">
          {isUser ? <IconUser size={14} /> : <IconRobot size={14} />}
        </ThemeIcon>
        <Box style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" mb={4}>
            {isUser ? 'You' : 'Assistant'}
          </Text>
          <Paper p="sm" radius="md" bg={isUser ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-gray-0)'}>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Text>
          </Paper>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <Accordion mt="xs" variant="contained" radius="md">
              <Accordion.Item value="sources">
                <Accordion.Control icon={<IconFileText size={16} />}>
                  <Group gap="xs">
                    <Text size="xs">Sources</Text>
                    <Badge size="xs" variant="light">
                      {message.sources.length}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {message.sources.map((source, idx) => (
                      <Paper
                        key={idx}
                        p="xs"
                        radius="sm"
                        withBorder
                        style={{ cursor: onSourceClick ? 'pointer' : 'default' }}
                        onClick={() => onSourceClick?.(source.note_id)}
                      >
                        <Group justify="space-between" mb={4}>
                          <Text size="xs" fw={500}>
                            {source.title}
                          </Text>
                          <Badge size="xs" variant="light" color="green">
                            {(source.score * 100).toFixed(0)}% match
                          </Badge>
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {source.content_preview}
                        </Text>
                      </Paper>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          )}

          {/* Metadata */}
          {message.tokens_used && (
            <Group gap="xs" mt="xs">
              <Tooltip label="Tokens used">
                <Badge size="xs" variant="dot" color="gray">
                  {message.tokens_used} tokens
                </Badge>
              </Tooltip>
              {message.confidence !== undefined && (
                <Tooltip label="Answer confidence based on source relevance">
                  <Badge
                    size="xs"
                    variant="dot"
                    color={message.confidence > 0.7 ? 'green' : (message.confidence > 0.4 ? 'yellow' : 'red')}
                  >
                    {(message.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </Tooltip>
              )}
            </Group>
          )}
        </Box>
      </Group>
    </Box>
  );
}

export default ChatWithVault;
