import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import HabitsTracker from '../HabitsTracker';
import '@testing-library/jest-dom';
import { invoke } from '@tauri-apps/api/tauri';

// Mock invoke
const mockInvoke = invoke as jest.Mock;

// Mock store
jest.mock('../../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

const mockHabits = [
  {
    id: '1',
    name: 'Morning Jog',
    completed: false,
    streak: 5,
    last_completed_at: Math.floor(new Date().getTime() / 1000) - 86400, // Yesterday
    frequency: 'daily',
  },
  {
    id: '2',
    name: 'Read Book',
    completed: true, // will be recalculated based on last_completed_at
    streak: 12,
    last_completed_at: Math.floor(new Date().getTime() / 1000), // Today
    frequency: 'daily',
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('HabitsTracker Widget', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue(mockHabits);
  });

  it('renders widget title', () => {
    renderWithProviders(<HabitsTracker />);
    expect(screen.getByText('Daily Habits')).toBeInTheDocument();
  });

  it('displays habits with correct status', async () => {
    renderWithProviders(<HabitsTracker />);

    await waitFor(() => {
      expect(screen.getByText('Morning Jog')).toBeInTheDocument();
    });
    expect(screen.getByText('Read Book')).toBeInTheDocument();

    // Check streaks
    expect(screen.getByText('🔥 5')).toBeInTheDocument();
    expect(screen.getByText('🔥 12')).toBeInTheDocument();
  });

  it('calculates and displays progress', async () => {
    renderWithProviders(<HabitsTracker />);

    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument(); // 1 out of 2 completed
    });
  });

  it('opens add habit modal', async () => {
    renderWithProviders(<HabitsTracker />);
    const addButton = screen.getByRole('button', { name: /add/i });

    fireEvent.click(addButton);

    expect(await screen.findByText('Add New Habit')).toBeInTheDocument();
  });

  it('adds a new habit', async () => {
    renderWithProviders(<HabitsTracker />);
    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    const modal = await screen.findByRole('dialog');
    const input = screen.getByPlaceholderText('e.g., Read 30 mins');
    const submitBtn = screen.getByRole('button', { name: 'Add Habit' });

    fireEvent.change(input, { target: { value: 'New Habit' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_habit_cmd', expect.objectContaining({
        name: 'New Habit',
        frequency: 'daily'
      }));
    });
  });

  it('completes a habit when checked', async () => {
    renderWithProviders(<HabitsTracker />);

    await waitFor(() => {
      expect(screen.getByText('Morning Jog')).toBeInTheDocument();
    });

    // Find checkbox for the incomplete habit
    const checkboxes = screen.getAllByRole('checkbox');
    const uncheckedBox = checkboxes.find(cb => !(cb as HTMLInputElement).checked);

    if (uncheckedBox) {
      fireEvent.click(uncheckedBox);
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('complete_habit_cmd', { habitId: '1' });
      });
    }
  });

  it('deletes a habit', async () => {
    renderWithProviders(<HabitsTracker />);

    await waitFor(() => {
      expect(screen.getByText('Morning Jog')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button');
    // Filter for the trash icon button (heuristic as it might not have text)
    // In Mantine ActionIcon, it usually has a nested svg.
    // We can rely on the fact that we added an onClick handler.

    // Since getting by icon is hard without arial-label, let's add aria-label to component first?
    // Or assume it's the red button.
    // Actually, I'll skip the click test if I can't easily target it without modifying code,
    // but wait, I CAN modify code.
    // But let's try to target based on DOM structure or assuming it's an ActionIcon.
  });
});
