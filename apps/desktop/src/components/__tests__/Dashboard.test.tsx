import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import '@testing-library/jest-dom';

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

// Mock hooks
jest.mock('../../hooks/useQueries', () => ({
  useProjects: jest.fn(() => ({
    data: [
      { id: '1', title: 'Test Project', status: 'active' },
      { id: '2', title: 'Done Project', status: 'done' },
    ],
    isLoading: false,
  })),
  useNotes: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useTasks: jest.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useUpdateTask: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
  })),
}));

// Mock store
jest.mock('../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MantineProvider>{component}</MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Dashboard', () => {
  it('renders dashboard title', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders project statistics section', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Project Statistics')).toBeInTheDocument();
  });

  it('displays correct project counts', () => {
    renderWithProviders(<Dashboard />);
    const [allProjectsLabel] = screen.getAllByText('All Projects');
    const allProjectsCard = allProjectsLabel.closest('div')?.parentElement?.parentElement;
    expect(allProjectsCard).not.toBeNull();
    expect(allProjectsCard?.textContent).toContain('2');

    const [completedLabel] = screen.getAllByText('Completed');
    const completedCard = completedLabel.closest('div')?.parentElement?.parentElement;
    expect(completedCard).not.toBeNull();
    expect(completedCard?.textContent).toContain('1');
  });

  it('renders multiple widgets', () => {
    renderWithProviders(<Dashboard />);
    // Check for various widget titles
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
  });
});
