import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import ProjectTimeline from '../ProjectTimeline';
import '@testing-library/jest-dom';
import { Project } from '@noteece/types';

// Mock hooks
let mockProjects = [] as Project[];

jest.mock('../../../hooks/useQueries', () => ({
  useProjects: jest.fn(() => ({
    data: mockProjects,
    isLoading: false,
  })),
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

describe('ProjectTimeline', () => {
  beforeEach(() => {
    mockProjects = [];
  });

  it('renders widget title', () => {
    renderWithProviders(<ProjectTimeline />);
    expect(screen.getByText('Project Timeline')).toBeInTheDocument();
  });

  it('shows empty state when no active projects', () => {
    mockProjects = [{ id: '1', title: 'Done Project', status: 'done' } as Project];
    renderWithProviders(<ProjectTimeline />);
    expect(screen.getByText('No active projects')).toBeInTheDocument();
  });

  it('displays active projects sorted by due date', () => {
    const today = Math.floor(Date.now() / 1000);
    mockProjects = [
      { id: '1', title: 'Project B', status: 'active', target_end_at: today + 86_400 * 10 } as Project, // 10 days
      { id: '2', title: 'Project A', status: 'active', target_end_at: today + 86_400 } as Project, // 1 day
    ];

    renderWithProviders(<ProjectTimeline />);

    const items = screen.getAllByText(/Project [AB]/);
    expect(items[0]).toHaveTextContent('Project A');
    expect(items[1]).toHaveTextContent('Project B');
  });

  it('displays correct days remaining badge', () => {
    const today = Math.floor(Date.now() / 1000);
    mockProjects = [{ id: '1', title: 'Project A', status: 'active', target_end_at: today + 86_400 * 5 } as Project];

    renderWithProviders(<ProjectTimeline />);
    // Expect ~5d left (depending on time of day, might be 5 or 6)
    expect(screen.getByText(/5d left|6d left/)).toBeInTheDocument();
  });

  it('displays overdue badge', () => {
    const today = Math.floor(Date.now() / 1000);
    mockProjects = [
      { id: '1', title: 'Project Overdue', status: 'active', target_end_at: today - 86_400 * 2 } as Project,
    ];

    renderWithProviders(<ProjectTimeline />);
    expect(screen.getByText(/2d overdue|3d overdue/)).toBeInTheDocument();
  });

  it('shows progress and due date', () => {
    const today = Math.floor(Date.now() / 1000);
    mockProjects = [{ id: 'A', title: 'Project Progress', status: 'active', target_end_at: today } as Project];

    renderWithProviders(<ProjectTimeline />);
    // Progress is deterministic: ('A'.codePointAt(0) + 1) % 100 = (65 + 1) % 100 = 66
    expect(screen.getByText('66% complete')).toBeInTheDocument();
    expect(screen.getByText(/Due:/)).toBeInTheDocument();
  });
});
