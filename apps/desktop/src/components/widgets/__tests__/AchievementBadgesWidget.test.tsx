import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { AchievementBadgesWidget } from '../AchievementBadgesWidget';
import '@testing-library/jest-dom';

// Mock hooks with data that unlocks some achievements
jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({
    data: Array.from({ length: 15 }, (_, index) => ({
      id: `${index + 1}`,
      title: `Note ${index + 1}`,
      content_md: 'test content',
      created_at: Date.now() - index * 24 * 60 * 60 * 1000,
      is_trashed: false,
    })),
    isLoading: false,
  })),
  useTasks: jest.fn(() => ({
    data: Array.from({ length: 30 }, (_, index) => ({
      id: `${index + 1}`,
      title: `Task ${index + 1}`,
      status: index < 26 ? 'done' : 'in_progress',
      priority: 'medium',
    })),
    isLoading: false,
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{component}</MantineProvider>
    </QueryClientProvider>,
  );
};

describe('AchievementBadgesWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  it('displays achievement progress badge', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    // Should show X / 8 achievements
    expect(screen.getByText(/\/ 8/)).toBeInTheDocument();
  });

  it('shows first steps achievement', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('shows getting started achievement', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('shows task completer achievement', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    expect(screen.getByText('Task Completer')).toBeInTheDocument();
  });

  it('displays unlocked badge for completed achievements', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    // With 15 notes and 26 completed tasks, some achievements should be unlocked
    const unlockedBadges = screen.getAllByText('Unlocked!');
    expect(unlockedBadges.length).toBeGreaterThan(0);
  });

  it('shows progress bars for locked achievements', () => {
    renderWithProviders(<AchievementBadgesWidget />);
    // Progress should be shown for achievements not yet unlocked
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(0);
  });
});
