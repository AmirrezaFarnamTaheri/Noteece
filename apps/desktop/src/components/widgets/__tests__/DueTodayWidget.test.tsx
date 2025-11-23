import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import DueTodayWidget from '../DueTodayWidget';
import '@testing-library/jest-dom';
import { Task } from '@noteece/types';

// Mock hooks
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Task 1 Due Today',
    status: 'inbox',
    priority: 1,
    due_at: Math.floor(Date.now() / 1000), // Today
    space_id: 'space-1',
    created_at: 0,
    updated_at: 0,
  },
  {
    id: '2',
    title: 'Task 2 Due Tomorrow',
    status: 'inbox',
    priority: 2,
    due_at: Math.floor(Date.now() / 1000) + 86_400, // Tomorrow
    space_id: 'space-1',
    created_at: 0,
    updated_at: 0,
  },
  {
    id: '3',
    title: 'Task 3 Done Today',
    status: 'done',
    priority: 3,
    due_at: Math.floor(Date.now() / 1000), // Today but done
    space_id: 'space-1',
    created_at: 0,
    updated_at: 0,
  },
];

const mockMutateAsync = jest.fn();

jest.mock('../../../hooks/useQueries', () => ({
  useTasks: jest.fn(() => ({
    data: mockTasks,
    isLoading: false,
  })),
  useUpdateTask: jest.fn(() => ({
    mutateAsync: mockMutateAsync,
  })),
}));

// Mock store
jest.mock('../../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('DueTodayWidget', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
  });

  it('renders widget title', () => {
    renderWithProviders(<DueTodayWidget />);
    expect(screen.getByText('Due Today')).toBeInTheDocument();
  });

  it('displays only tasks due today that are not done', () => {
    renderWithProviders(<DueTodayWidget />);
    expect(screen.getByText('Task 1 Due Today')).toBeInTheDocument();
    expect(screen.queryByText('Task 2 Due Tomorrow')).not.toBeInTheDocument();
    expect(screen.queryByText('Task 3 Done Today')).not.toBeInTheDocument();
  });

  it('displays priority badge', () => {
    renderWithProviders(<DueTodayWidget />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('handles task completion toggle', async () => {
    renderWithProviders(<DueTodayWidget />);
    const checkbox = screen.getByRole('checkbox');

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          status: 'done',
        }),
      );
    });
  });

  it('shows "All clear" message when no tasks due', () => {
    // Override useTasks mock for this test
    // eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
    const { useTasks } = require('../../../hooks/useQueries');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    (useTasks as any).mockReturnValue({ data: [], isLoading: false });

    renderWithProviders(<DueTodayWidget />);
    expect(screen.getByText('All clear for today!')).toBeInTheDocument();
  });
});
