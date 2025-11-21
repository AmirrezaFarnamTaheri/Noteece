import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import InsightsWidget from '../InsightsWidget';
import '@testing-library/jest-dom';

// Mock hooks with default empty values
let mockNotes = [] as any[];
let mockTasks = [] as any[];
let mockProjects = [] as any[];

jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({ data: mockNotes, isLoading: false })),
  useTasks: jest.fn(() => ({ data: mockTasks, isLoading: false })),
  useProjects: jest.fn(() => ({ data: mockProjects, isLoading: false })),
}));

// Mock store
jest.mock('../../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('InsightsWidget', () => {
  beforeEach(() => {
    mockNotes = [];
    mockTasks = [];
    mockProjects = [];
  });

  it('renders widget title', () => {
    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('shows "Keep working" message when no data', () => {
    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Keep working to unlock insights!')).toBeInTheDocument();
  });

  it('shows productivity achievement for >10 recent notes', () => {
    const now = Date.now();
    mockNotes = Array.from({ length: 11 })
      .fill(null)
      .map((_, i) => ({
        id: String(i),
        created_at: now,
        content_md: 'text',
      }));

    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Productive Week!')).toBeInTheDocument();
  });

  it('shows overdue tasks warning', () => {
    const yesterday = Math.floor(Date.now() / 1000) - 86_400;
    mockTasks = [
      {
        id: '1',
        due_at: yesterday,
        status: 'todo',
      },
    ];

    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
  });

  it('shows high priority items warning', () => {
    mockTasks = [
      { id: '1', priority: 1, status: 'todo' },
      { id: '2', priority: 1, status: 'todo' },
      { id: '3', priority: 2, status: 'todo' },
      { id: '4', priority: 1, status: 'todo' },
    ];

    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Urgent Items Pending')).toBeInTheDocument();
  });

  it('shows achievement for high task completion rate', () => {
    mockTasks = [
      { id: '1', status: 'done' },
      { id: '2', status: 'done' },
      { id: '3', status: 'done' },
      { id: '4', status: 'todo' }, // 75% completion
    ];
    // Need > 75%, so let's make it 100% or add more done
    mockTasks.push({ id: '5', status: 'done' }); // 80% done

    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('High Achiever!')).toBeInTheDocument();
  });

  it('shows suggestion for inactive projects', () => {
    mockProjects = [
      { id: '1', status: 'completed' },
      { id: '2', status: 'archived' },
    ];

    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Inactive Projects')).toBeInTheDocument();
  });

  it('shows prolific writer achievement', () => {
    // ~10 words
    const content = 'This is a test note with ten words in it.';
    // Need > 10k words
    mockNotes = Array.from({ length: 1001 })
      .fill(null)
      .map((_, i) => ({
        id: String(i),
        created_at: Date.now(),
        content_md: content,
      }));

    renderWithProviders(<InsightsWidget />);
    expect(screen.getByText('Growing Collection')).toBeInTheDocument();
  });
});
