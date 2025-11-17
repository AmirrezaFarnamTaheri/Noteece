import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import { BookmarksWidget } from '../BookmarksWidget';
import '@testing-library/jest-dom';

// Mock hooks
jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({
    data: [
      {
        id: '1',
        title: 'Recent Note 1',
        content_md: 'Content',
        modified_at: Date.now() - 1000,
        is_trashed: false,
      },
      {
        id: '2',
        title: 'Recent Note 2',
        content_md: 'Content',
        modified_at: Date.now() - 2000,
        is_trashed: false,
      },
    ],
    isLoading: false,
  })),
  useTasks: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useProjects: jest.fn(() => ({
    data: [],
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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MantineProvider>{component}</MantineProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('BookmarksWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<BookmarksWidget />);
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
  });

  it('shows bookmark count badge', () => {
    renderWithProviders(<BookmarksWidget />);
    expect(screen.getByText('0')).toBeInTheDocument(); // Initially no bookmarks
  });

  it('displays message when no bookmarks', () => {
    renderWithProviders(<BookmarksWidget />);
    expect(screen.getByText(/no bookmarks yet. star your favorite items for quick access!/i)).toBeInTheDocument();
  });

  it('shows recent notes section when no bookmarks', () => {
    renderWithProviders(<BookmarksWidget />);
    expect(screen.getByText('Recent Notes')).toBeInTheDocument();
    expect(screen.getByText('Recent Note 1')).toBeInTheDocument();
    expect(screen.getByText('Recent Note 2')).toBeInTheDocument();
  });
});
