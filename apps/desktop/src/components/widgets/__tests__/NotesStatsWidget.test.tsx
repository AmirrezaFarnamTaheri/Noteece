import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { NotesStatsWidget } from '../NotesStatsWidget';
import '@testing-library/jest-dom';

// Mock hooks
jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({
    data: [
      {
        id: '1',
        title: 'Test Note 1',
        content_md: 'This is a test note with some words in it',
        created_at: Date.now() - 2 * 24 * 60 * 60 * 1000,
        is_trashed: false,
      },
      {
        id: '2',
        title: 'Test Note 2',
        content_md: 'Another test note with more content words here',
        created_at: Date.now() - 1 * 24 * 60 * 60 * 1000,
        is_trashed: false,
      },
      {
        id: '3',
        title: 'Trashed Note',
        content_md: 'This should not be counted',
        created_at: Date.now(),
        is_trashed: true,
      },
    ],
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

describe('NotesStatsWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<NotesStatsWidget />);
    expect(screen.getByText('Notes Statistics')).toBeInTheDocument();
  });

  it('displays total notes count excluding trashed', () => {
    renderWithProviders(<NotesStatsWidget />);
    const totalNotesLabel = screen.getByText('Total Notes');
    expect(totalNotesLabel).toBeInTheDocument();
    const totalNotesCard = totalNotesLabel.closest('div');
    expect(totalNotesCard).not.toBeNull();
    const countMatches = within(totalNotesCard as HTMLElement).getAllByText('2');
    expect(countMatches.length).toBeGreaterThan(0);
  });

  it('shows total words label', () => {
    renderWithProviders(<NotesStatsWidget />);
    expect(screen.getByText('Total Words')).toBeInTheDocument();
  });

  it('shows this week label', () => {
    renderWithProviders(<NotesStatsWidget />);
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('shows average words per note label', () => {
    renderWithProviders(<NotesStatsWidget />);
    expect(screen.getByText('Avg Words/Note')).toBeInTheDocument();
  });

  it('displays writing streak section', () => {
    renderWithProviders(<NotesStatsWidget />);
    expect(screen.getByText('Writing Streak')).toBeInTheDocument();
    expect(screen.getByText(/consecutive days/)).toBeInTheDocument();
  });
});
