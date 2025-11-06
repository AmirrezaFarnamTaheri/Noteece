import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import Dashboard from '../Dashboard';
import '@testing-library/jest-dom';

// Mock Tauri API
jest.mock('@tauri-apps/api/core', () => ({
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

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{component}</MantineProvider>
    </QueryClientProvider>,
  );
};

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
    // Should show 2 total projects
    expect(screen.getByText('2')).toBeInTheDocument();
    // Should show 1 completed project
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders multiple widgets', () => {
    renderWithProviders(<Dashboard />);
    // Check for various widget titles
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
  });
});
