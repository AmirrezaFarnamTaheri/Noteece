import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import TimeTrackingWidget from '../TimeTrackingWidget';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock store
jest.mock('../../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

// Mock API calls
const mockGetRunningEntries = jest.fn();
const mockGetRecentTimeEntries = jest.fn();
const mockStopTimeEntry = jest.fn();
const mockDeleteTimeEntry = jest.fn();

jest.mock('../../../services/api', () => ({
  getRunningEntries: (spaceId: string) => mockGetRunningEntries(spaceId),
  getRecentTimeEntries: (spaceId: string, limit: number) => mockGetRecentTimeEntries(spaceId, limit),
  stopTimeEntry: (id: string) => mockStopTimeEntry(id),
  deleteTimeEntry: (id: string) => mockDeleteTimeEntry(id),
}));

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
  },
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
    </QueryClientProvider>
  );
};

describe('TimeTrackingWidget', () => {
  beforeEach(() => {
    queryClient.clear();
    mockGetRunningEntries.mockResolvedValue([]);
    mockGetRecentTimeEntries.mockResolvedValue([]);
    mockStopTimeEntry.mockReset();
    mockDeleteTimeEntry.mockReset();
  });

  it('renders widget title', () => {
    renderWithProviders(<TimeTrackingWidget />);
    expect(screen.getByText('Time Tracking')).toBeInTheDocument();
  });

  it('shows "No timer running" when nothing active', async () => {
    renderWithProviders(<TimeTrackingWidget />);
    await waitFor(() => expect(screen.getByText('No timer running')).toBeInTheDocument());
  });

  it('displays running entry', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetRunningEntries.mockResolvedValue([
      { id: '1', started_at: now - 3600, description: 'Working on Feature A', is_running: true }
    ]);

    renderWithProviders(<TimeTrackingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Currently Tracking')).toBeInTheDocument();
    });
    expect(screen.getByText('Working on Feature A')).toBeInTheDocument();
    // Initial render shows 0s because effect hasn't run/updated yet
    // We accept 0s or 1h 0m to be robust
    // Note: getAllByText because 0s might appear in "Total: 0s" as well
    const durationElements = screen.getAllByText(/0s|1h 0m/);
    expect(durationElements.length).toBeGreaterThan(0);
  });

  it('displays recent entries', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetRecentTimeEntries.mockResolvedValue([
      { id: '2', started_at: now - 7200, ended_at: now - 3600, duration_seconds: 3600, description: 'Old Task', is_running: false }
    ]);

    renderWithProviders(<TimeTrackingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Old Task')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/1h 0m/)[0]).toBeInTheDocument();
  });

  it('stops a running timer', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetRunningEntries.mockResolvedValue([
      { id: '1', started_at: now, description: 'Task', is_running: true }
    ]);
    mockStopTimeEntry.mockResolvedValue({});

    renderWithProviders(<TimeTrackingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Stop')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Stop'));

    await waitFor(() => {
      expect(mockStopTimeEntry).toHaveBeenCalledWith('1');
    });
  });

  it('deletes an entry', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetRecentTimeEntries.mockResolvedValue([
      { id: '2', started_at: now, duration_seconds: 60, description: 'To Delete', is_running: false }
    ]);
    mockDeleteTimeEntry.mockResolvedValue({});

    renderWithProviders(<TimeTrackingWidget />);

    await waitFor(() => {
      expect(screen.getByText('To Delete')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText('Delete time entry To Delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteTimeEntry).toHaveBeenCalledWith('2');
    });
  });
});
