/**
 * GamificationWidget Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GamificationWidget } from '../GamificationWidget';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/tauri', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  invoke: (cmd: string, ...args: unknown[]) => mockInvoke(cmd, ...args),
}));

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
  },
}));

const mockGamificationData = {
  xp: 2450,
  level: 8,
  xp_to_next_level: 550,
  streak_days: 14,
  streak_freezes: 3,
  max_streak: 45,
  total_tasks_completed: 234,
  total_habits_completed: 156,
  achievements_unlocked: 12,
  total_achievements: 30,
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

describe('GamificationWidget', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'get_gamification_data_cmd') {
        return Promise.resolve(mockGamificationData);
      }
      if (cmd === 'use_streak_freeze_cmd') {
        return Promise.resolve(true);
      }
      return Promise.reject(new Error('Unknown command'));
    });
  });

  it('renders the widget title', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText('Progress & Achievements')).toBeInTheDocument();
  });

  it('displays current level', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText('Level 8')).toBeInTheDocument();
  });

  it('displays XP progress', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText(/2,450.*XP/)).toBeInTheDocument();
  });

  it('displays streak information', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText('14 Day Streak')).toBeInTheDocument();
    expect(await screen.findByText('Best: 45 days')).toBeInTheDocument();
  });

  it('displays streak freeze count', async () => {
    renderWithProviders(<GamificationWidget />);

    // Should find the badge with streak freezes
    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('displays tasks completed stat', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText('234')).toBeInTheDocument();
    expect(await screen.findByText('Tasks Done')).toBeInTheDocument();
  });

  it('displays habits completed stat', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText('156')).toBeInTheDocument();
    expect(await screen.findByText('Habits Done')).toBeInTheDocument();
  });

  it('displays achievements progress', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText('12/30')).toBeInTheDocument();
    expect(await screen.findByText('Achievements')).toBeInTheDocument();
  });

  it('renders compact version correctly', async () => {
    renderWithProviders(<GamificationWidget compact={true} />);

    // Compact version should show level but not full stats
    expect(await screen.findByText('8')).toBeInTheDocument();
    expect(screen.queryByText('Progress & Achievements')).not.toBeInTheDocument();
  });

  it('displays XP to next level', async () => {
    renderWithProviders(<GamificationWidget />);

    expect(await screen.findByText(/550.*xp to level 9/i)).toBeInTheDocument();
  });

  it('handles use streak freeze action', async () => {
    renderWithProviders(<GamificationWidget />);

    // Wait for data to load
    await screen.findByText('Progress & Achievements');

    // The freeze button should be enabled (3 freezes available)
    const freezeButtons = screen.getAllByRole('button');
    const freezeButton = freezeButtons.find((btn) => btn.querySelector('svg[class*="tabler-icon-snowflake"]'));

    expect(freezeButton).toBeInTheDocument();
  });

  it('shows level title based on level', async () => {
    renderWithProviders(<GamificationWidget />);

    // Level 8 should be "Apprentice" (between 5 and 10)
    expect(await screen.findByText('Apprentice')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    // eslint-disable-next-line promise/avoid-new
    mockInvoke.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<GamificationWidget />);

    // Should show loader while loading
    expect(document.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });
});
