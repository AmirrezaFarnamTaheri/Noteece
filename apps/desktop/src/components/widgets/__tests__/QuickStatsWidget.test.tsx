import { render, screen, within } from '@testing-library/react';
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
    const notesLabel = screen.getByText('Notes');
    expect(notesLabel).toBeInTheDocument();
    const notesCard = notesLabel.closest('div');
    expect(notesCard).not.toBeNull();
    expect(within(notesCard as HTMLElement).getAllByText('3').length).toBeGreaterThan(0);
  });

  it('shows active tasks count', () => {
    renderWithProviders(<QuickStatsWidget />);
    const activeTasksLabel = screen.getByText('Active Tasks');
    expect(activeTasksLabel).toBeInTheDocument();
    const activeTasksCard = activeTasksLabel.closest('div');
    expect(activeTasksCard).not.toBeNull();
    const activeCounts = within(activeTasksCard as HTMLElement).getAllByText('2');
    expect(activeCounts.length).toBeGreaterThan(0); // in_progress and next
  });

  it('displays completed tasks count', () => {
    renderWithProviders(<QuickStatsWidget />);
    const completedLabel = screen.getByText('Completed');
    expect(completedLabel).toBeInTheDocument();
    const completedCard = completedLabel.closest('div');
    expect(completedCard).not.toBeNull();
    const completedCounts = within(completedCard as HTMLElement).getAllByText('1');
    expect(completedCounts.length).toBeGreaterThan(0);
  });

  it('shows projects count', () => {
    renderWithProviders(<QuickStatsWidget />);
    const projectsLabel = screen.getByText('Projects');
    expect(projectsLabel).toBeInTheDocument();
    const projectsCard = projectsLabel.closest('div');
    expect(projectsCard).not.toBeNull();
    const projectCounts = within(projectsCard as HTMLElement).getAllByText('1');
    expect(projectCounts.length).toBeGreaterThan(0); // Only active project
  });

  it('displays tags count', () => {
    renderWithProviders(<QuickStatsWidget />);
    const tagsLabel = screen.getByText('Tags');
    expect(tagsLabel).toBeInTheDocument();
    const tagsCard = tagsLabel.closest('div');
    expect(tagsCard).not.toBeNull();
    const tagCounts = within(tagsCard as HTMLElement).getAllByText('2');
    expect(tagCounts.length).toBeGreaterThan(0); // #tag1 and #tag2
  });
});
