import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { QuickStatsWidget } from '../QuickStatsWidget';
import '@testing-library/jest-dom';

// Mock hooks
jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({
    data: [
      { id: '1', title: 'Note 1', content_md: 'test', is_trashed: false },
      { id: '2', title: 'Note 2', content_md: 'test #tag1', is_trashed: false },
      { id: '3', title: 'Note 3', content_md: 'test #tag2', is_trashed: false },
    ],
    isLoading: false,
  })),
  useTasks: jest.fn(() => ({
    data: [
      { id: '1', title: 'Task 1', status: 'in_progress', priority: 'high' },
      { id: '2', title: 'Task 2', status: 'done', priority: 'low' },
      { id: '3', title: 'Task 3', status: 'next', priority: 'medium' },
    ],
    isLoading: false,
  })),
  useProjects: jest.fn(() => ({
    data: [
      { id: '1', title: 'Project 1', status: 'active' },
      { id: '2', title: 'Project 2', status: 'done' },
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

describe('QuickStatsWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
  });

  it('displays notes count', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows active tasks count', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // in_progress and next
  });

  it('displays completed tasks count', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows projects count', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Only active project
  });

  it('displays tags count', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // #tag1 and #tag2
  });
});
