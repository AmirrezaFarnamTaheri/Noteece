/**
 * ChatWithVault Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatWithVault } from '../ChatWithVault';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: (cmd: string, ...args: unknown[]) => mockInvoke(cmd, ...args),
}));

const mockRagResponse = {
  answer: 'Based on your notes, the key project goals are:\n1. Launch the new feature\n2. Improve performance by 50%',
  sources: [
    {
      chunk: {
        note_id: 'note-1',
        content: 'Project goals: Launch new feature, improve performance...',
        metadata: { title: 'Project Planning Notes' },
      },
      score: 0.85,
    },
    {
      chunk: {
        note_id: 'note-2',
        content: 'Q1 objectives include performance improvements...',
        metadata: { title: 'Quarterly Goals' },
      },
      score: 0.72,
    },
  ],
  tokens_used: 450,
  model: 'gpt-4',
  confidence: 0.78,
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );
};

describe('ChatWithVault', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'get_rag_stats_cmd') {
        return Promise.resolve({ total_notes: 25, total_chunks: 150 });
      }
      if (cmd === 'rag_query_cmd') {
        return Promise.resolve(mockRagResponse);
      }
      return Promise.reject(new Error('Unknown command'));
    });
  });

  it('renders the component title', async () => {
    renderWithProviders(<ChatWithVault />);

    expect(await screen.findByText('Chat with your Vault')).toBeInTheDocument();
  });

  it('displays indexing stats', async () => {
    renderWithProviders(<ChatWithVault />);

    expect(await screen.findByText('25 notes indexed')).toBeInTheDocument();
  });

  it('shows empty state initially', async () => {
    renderWithProviders(<ChatWithVault />);

    expect(await screen.findByText('Ask anything about your notes and documents.')).toBeInTheDocument();
  });

  it('renders input field', async () => {
    renderWithProviders(<ChatWithVault />);

    expect(screen.getByPlaceholderText('Ask a question about your notes...')).toBeInTheDocument();
  });

  it('sends a message when clicking send button', async () => {
    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'What are my project goals?' } });

    const sendButton = screen.getByRole('button');
    fireEvent.click(sendButton);

    // Should show user message
    await waitFor(() => {
      expect(screen.getByText('What are my project goals?')).toBeInTheDocument();
    });

    // Should call RAG query
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('rag_query_cmd', expect.any(Object));
    });
  });

  it('sends a message on Enter key press', async () => {
    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });
  });

  it('displays assistant response with sources', async () => {
    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'What are my project goals?' } });
    fireEvent.click(screen.getByRole('button'));

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(/Based on your notes, the key project goals are/)).toBeInTheDocument();
    });

    // Should show sources accordion
    expect(screen.getByText('Sources')).toBeInTheDocument();
  });

  it('displays token usage and confidence', async () => {
    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'What are my project goals?' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('450 tokens')).toBeInTheDocument();
    });

    expect(screen.getByText('78% confidence')).toBeInTheDocument();
  });

  it('handles query errors gracefully', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'get_rag_stats_cmd') {
        return Promise.resolve({ total_notes: 25, total_chunks: 150 });
      }
      if (cmd === 'rag_query_cmd') {
        return Promise.reject(new Error('No relevant context found'));
      }
      return Promise.reject(new Error('Unknown command'));
    });

    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'Random query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I couldn't find relevant information/)).toBeInTheDocument();
    });
  });

  it('disables send button when input is empty', () => {
    renderWithProviders(<ChatWithVault />);

    const sendButton = screen.getByRole('button');
    expect(sendButton).toBeDisabled();
  });

  it('clears input after sending', async () => {
    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('calls onSourceClick when clicking a source', async () => {
    const onSourceClick = jest.fn();
    renderWithProviders(<ChatWithVault onSourceClick={onSourceClick} />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(screen.getByRole('button'));

    // Wait for response and click on source accordion
    await waitFor(() => {
      expect(screen.getByText('Sources')).toBeInTheDocument();
    });

    // Expand sources accordion
    fireEvent.click(screen.getByText('Sources'));

    // Click on a source
    await waitFor(() => {
      const sourceElement = screen.getByText('Project Planning Notes');
      fireEvent.click(sourceElement);
    });

    expect(onSourceClick).toHaveBeenCalledWith('note-1');
  });

  it('shows loading state while querying', async () => {
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'get_rag_stats_cmd') {
        return Promise.resolve({ total_notes: 25, total_chunks: 150 });
      }
      if (cmd === 'rag_query_cmd') {
        // Delay response
        return new Promise((resolve) => setTimeout(() => resolve(mockRagResponse), 100));
      }
      return Promise.reject(new Error('Unknown command'));
    });

    renderWithProviders(<ChatWithVault />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Searching your vault...')).toBeInTheDocument();
  });

  it('passes spaceId to query', async () => {
    renderWithProviders(<ChatWithVault spaceId="work-space" />);

    const input = screen.getByPlaceholderText('Ask a question about your notes...');
    fireEvent.change(input, { target: { value: 'Test query' } });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('rag_query_cmd', {
        query: expect.objectContaining({
          space_id: 'work-space',
        }),
      });
    });
  });
});
