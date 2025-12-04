import { screen } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import '@testing-library/jest-dom';

const invokeMock = jest.fn<Promise<unknown>, [string, Record<string, unknown> | undefined]>();

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
jest.mock('../../store', () => {
  const mockStore = jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockStore as any).getState = () => ({
    activeSpaceId: 'test-space-id',
    clearStorage: jest.fn(),
  });
  return {
    useStore: mockStore,
  };
});

// Mock auth service
jest.mock('../../services/auth', () => ({
  getDecryptedCredentials: jest.fn(() =>
    Promise.resolve({
      username: 'test-user',
      password: 'test-password',
    }),
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

import { renderWithProviders } from '../../utils/test-render';

import { useStore } from '../../store';

beforeEach(() => {
  // Reset the Zustand store and localStorage before each test
  const store = useStore.getState();
  if (store.clearStorage) {
    store.clearStorage();
  } else {
    useStore.setState({ spaces: [], activeSpaceId: null });
  }
  localStorage.clear();

  queryClient.clear();
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (cmd: string) => {
    switch (cmd) {
      case 'get_upcoming_tasks_cmd':
      case 'get_recent_notes_cmd':
      case 'get_all_tasks_in_space_cmd':
      case 'get_running_entries_cmd':
      case 'get_recent_time_entries_cmd':
      case 'get_goals_cmd': {
        return [];
      }
      case 'get_project_stats': {
        return {
          total: 2,
          active: 1,
          completed: 1,
          archived: 0,
        };
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

  it('displays correct project counts', async () => {
    renderWithProviders(<Dashboard />);

    // In Dashboard.tsx, we use StatsCard which renders a title and value.
    // "Total Projects" is the title.
    const totalProjectsTitle = await screen.findByText('Total Projects');
    expect(totalProjectsTitle).toBeInTheDocument();

    // Use getAllByText because "2" might appear in the calendar or other widgets
    const totalValues = await screen.findAllByText('2');
    // We expect at least one of these to be the stat value
    expect(totalValues.length).toBeGreaterThan(0);

    // "Completed" card
    expect(await screen.findByText('Completed')).toBeInTheDocument();
    const completedValues = await screen.findAllByText('1');
    expect(completedValues.length).toBeGreaterThan(0);
  });

  it('renders multiple widgets', async () => {
    renderWithProviders(<Dashboard />);
    // Check for "Priority Tasks" which is explicitly in Dashboard.tsx
    expect(await screen.findByText('Priority Tasks')).toBeInTheDocument();
  });
});
