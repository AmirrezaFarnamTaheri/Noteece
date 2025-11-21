import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QuickStatsWidget } from '../QuickStatsWidget';
import '@testing-library/jest-dom';

// Mock hooks
const mockNotes = [
  { id: '1', content_md: 'Test #tag1 #tag2' },
  { id: '2', content_md: 'Another note' },
  { id: '3', is_trashed: true },
];
const mockTasks = [
  { id: '1', status: 'todo', due_at: Date.now() },
  { id: '2', status: 'done' },
  { id: '3', status: 'cancelled' },
];
const mockProjects = [
  { id: '1', status: 'active' },
  { id: '2', status: 'completed' },
];

jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({ data: mockNotes, isLoading: false })),
  useTasks: jest.fn(() => ({ data: mockTasks, isLoading: false })),
  useProjects: jest.fn(() => ({ data: mockProjects, isLoading: false })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('QuickStatsWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<QuickStatsWidget />);
    expect(screen.getByText('Workspace Overview')).toBeInTheDocument();
  });

  it('displays correct active notes count', () => {
    renderWithProviders(<QuickStatsWidget />);
    // 2 active notes (1 is trashed)
    const notesStat = screen.getByText('Notes').parentElement;
    expect(notesStat).toHaveTextContent('2');
  });

  it('displays correct active tasks count', () => {
    renderWithProviders(<QuickStatsWidget />);
    // 1 todo (active)
    const tasksStat = screen.getByText('Active Tasks').parentElement;
    expect(tasksStat).toHaveTextContent('1');
  });

  it('displays correct completed tasks count', () => {
    renderWithProviders(<QuickStatsWidget />);
    // 1 done
    const completedStat = screen.getByText('Completed').parentElement;
    expect(completedStat).toHaveTextContent('1');
  });

  it('displays correct active projects count', () => {
    renderWithProviders(<QuickStatsWidget />);
    // 1 active
    const projectsStat = screen.getByText('Projects').parentElement;
    expect(projectsStat).toHaveTextContent('1');
  });

  it('displays correct due today count', () => {
    renderWithProviders(<QuickStatsWidget />);
    // 1 due today
    const dueStat = screen.getByText('Due Today').parentElement;
    expect(dueStat).toHaveTextContent('1');
  });

  it('displays correct unique tags count', () => {
    renderWithProviders(<QuickStatsWidget />);
    // #tag1, #tag2
    const tagsStat = screen.getByText('Tags').parentElement;
    expect(tagsStat).toHaveTextContent('2');
  });
});
