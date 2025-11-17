import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import '@testing-library/jest-dom';

const invokeMock = jest.fn();

// Mock Tauri API
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => invokeMock(cmd, args),
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
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MantineProvider>{component}</MantineProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  queryClient.clear();
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (cmd: string) => {
    switch (cmd) {
      case 'get_upcoming_tasks_cmd':
      case 'get_recent_notes_cmd':
      case 'get_all_tasks_in_space_cmd':
      case 'get_running_entries_cmd':
      case 'get_recent_time_entries_cmd': {
        return [];
      }
      default: {
        return null;
      }
    }
  });
});

describe('Dashboard', () => {
  it('renders dashboard title', async () => {
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('renders project statistics section', async () => {
    renderWithProviders(<Dashboard />);
    expect(await screen.findByText('Project Statistics')).toBeInTheDocument();
  });

  it('displays correct project counts', async () => {
    renderWithProviders(<Dashboard />);
    const [allProjectsLabel] = await screen.findAllByText('All Projects');
    const allProjectsCard = allProjectsLabel.closest('div')?.parentElement?.parentElement;
    expect(allProjectsCard).not.toBeNull();
    expect(allProjectsCard?.textContent).toContain('2');

    const [completedLabel] = await screen.findAllByText('Completed');
    const completedCard = completedLabel.closest('div')?.parentElement?.parentElement;
    expect(completedCard).not.toBeNull();
    expect(completedCard?.textContent).toContain('1');
  });

  it('renders multiple widgets', async () => {
    renderWithProviders(<Dashboard />);
    // Check for various widget titles
    expect(await screen.findByText('Workspace Overview')).toBeInTheDocument();
  });
});
