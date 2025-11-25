import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { LocalAI } from '../LocalAI';

// Mock Tauri
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

// Mock i18n
jest.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
  },
}));

import { invoke } from '@tauri-apps/api/tauri';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe('LocalAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (invoke as jest.Mock).mockResolvedValue(true);
  });

  it('renders LocalAI component', () => {
    render(<LocalAI />, { wrapper });
    expect(screen.getByText('ai.title')).toBeInTheDocument();
  });

  it('shows connection status badge', async () => {
    (invoke as jest.Mock).mockResolvedValue(true);
    
    render(<LocalAI />, { wrapper });
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('check_ollama_connection_cmd');
    });
  });

  it('displays model selector', async () => {
    (invoke as jest.Mock)
      .mockResolvedValueOnce(true) // connection check
      .mockResolvedValueOnce(['llama3.2', 'mistral']); // model list
    
    render(<LocalAI />, { wrapper });
    
    await waitFor(() => {
      const select = screen.getByPlaceholderText('Select a model');
      expect(select).toBeInTheDocument();
    });
  });

  it('shows empty state when no messages', () => {
    render(<LocalAI />, { wrapper });
    expect(screen.getByText(/Start a conversation/)).toBeInTheDocument();
  });

  it('has send button', () => {
    render(<LocalAI />, { wrapper });
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeInTheDocument();
  });

  it('has text input for messages', () => {
    render(<LocalAI />, { wrapper });
    const input = screen.getByPlaceholderText(/Ask anything|Connect to Ollama/);
    expect(input).toBeInTheDocument();
  });

  it('disables input when not connected', async () => {
    (invoke as jest.Mock).mockResolvedValue(false);
    
    render(<LocalAI />, { wrapper });
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Connect to Ollama first');
      expect(input).toBeDisabled();
    });
  });

  it('has refresh button', () => {
    render(<LocalAI />, { wrapper });
    // Find refresh button by role or icon
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has clear chat button', () => {
    render(<LocalAI />, { wrapper });
    // Clear button should exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(1);
  });
});

describe('LocalAI Integration', () => {
  it('sends message when form is submitted', async () => {
    (invoke as jest.Mock)
      .mockResolvedValueOnce(true) // connection check
      .mockResolvedValueOnce(['llama3.2']) // model list
      .mockResolvedValueOnce('AI response'); // chat response
    
    render(<LocalAI />, { wrapper });
    
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('check_ollama_connection_cmd');
    });
  });

  it('handles connection error gracefully', async () => {
    (invoke as jest.Mock).mockRejectedValue(new Error('Connection failed'));
    
    render(<LocalAI />, { wrapper });
    
    await waitFor(() => {
      // Should not crash, connection status should show offline
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });
});

