import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { GoalsTrackerWidget } from '../GoalsTrackerWidget';
import '@testing-library/jest-dom';
import { invoke } from '@tauri-apps/api/tauri';

// Mock invoke
const mockInvoke = invoke as jest.Mock;

// Mock store to provide activeSpaceId
jest.mock('../../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

const mockGoals = [
  { id: '1', title: 'Write 50 blog posts', target: 50, current: 23, category: 'Writing', is_completed: false },
  { id: '2', title: 'Read 24 books', target: 24, current: 18, category: 'Reading', is_completed: false },
  { id: '3', title: 'Exercise 100 times', target: 100, current: 67, category: 'Health', is_completed: false },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('GoalsTrackerWidget', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    // Default successful response
    mockInvoke.mockResolvedValue(mockGoals);
  });

  it('renders widget title', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByText('Goals Tracker')).toBeInTheDocument();
  });

  it('displays add goal button', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByRole('button', { name: /add goal/i })).toBeInTheDocument();
  });

  it('shows initial mock goals', async () => {
    renderWithProviders(<GoalsTrackerWidget />);
    // Wait for the async useEffect to load data
    await waitFor(() => {
      expect(screen.getByText('Write 50 blog posts')).toBeInTheDocument();
    });
    expect(screen.getByText('Read 24 books')).toBeInTheDocument();
    expect(screen.getByText('Exercise 100 times')).toBeInTheDocument();
  });

  it('displays progress bars for goals', async () => {
    renderWithProviders(<GoalsTrackerWidget />);
    await waitFor(() => {
      expect(screen.getByText(/23 \/ 50/)).toBeInTheDocument();
    });
    expect(screen.getByText(/18 \/ 24/)).toBeInTheDocument();
    expect(screen.getByText(/67 \/ 100/)).toBeInTheDocument();
  });

  it('shows category badges', async () => {
    renderWithProviders(<GoalsTrackerWidget />);
    await waitFor(() => {
      expect(screen.getByText('Writing')).toBeInTheDocument();
    });
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
  });

  it('opens modal when add goal clicked', async () => {
    renderWithProviders(<GoalsTrackerWidget />);
    const addButton = screen.getByRole('button', { name: /add goal/i });

    fireEvent.click(addButton);

    expect(await screen.findByText('Add New Goal')).toBeInTheDocument();
  });

  it('displays completed badge for finished goals', async () => {
    const completedGoals = [
        ...mockGoals,
        { id: '4', title: 'Finished Goal', target: 10, current: 10, category: 'Test', is_completed: true }
    ];
    mockInvoke.mockResolvedValue(completedGoals);

    renderWithProviders(<GoalsTrackerWidget />);

    await waitFor(() => {
        expect(screen.getByText('Finished Goal')).toBeInTheDocument();
    });
    // Check for badge or indicator
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
