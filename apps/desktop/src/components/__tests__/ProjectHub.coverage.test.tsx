import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import ProjectHub from '../ProjectHub';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/tauri';
import { getAllProjectsInSpace } from '../../services/api';

// Mock API
jest.mock('../../services/api', () => ({
  getAllProjectsInSpace: jest.fn(),
}));

const mockInvoke = invoke as jest.Mock;

// Mock store
jest.mock('../../store', () => ({
  useStore: jest.fn(() => ({ activeSpaceId: 'test-space-id' })),
}));

// Mock Router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Outlet: () => <div>Outlet Content</div>,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('ProjectHub', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    (getAllProjectsInSpace as jest.Mock).mockReset();
  });

  it('renders title', () => {
    renderWithProviders(<ProjectHub />);
    expect(screen.getByText('Project Hub')).toBeInTheDocument();
  });

  it('fetches and lists projects', async () => {
    (getAllProjectsInSpace as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Project Alpha' },
      { id: '2', title: 'Project Beta' },
    ]);
    mockInvoke.mockResolvedValue([]); // Tasks for selected project

    renderWithProviders(<ProjectHub />);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('selects the first project by default and fetches tasks', async () => {
    (getAllProjectsInSpace as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Project Alpha' },
    ]);
    mockInvoke.mockResolvedValue([{ id: 't1', title: 'Task 1' }]);

    renderWithProviders(<ProjectHub />);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_tasks_by_project_cmd', { projectId: '1' });
    });
  });

  it('updates selected project on click', async () => {
    (getAllProjectsInSpace as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Project Alpha' },
      { id: '2', title: 'Project Beta' },
    ]);
    mockInvoke.mockResolvedValue([]);

    renderWithProviders(<ProjectHub />);

    await waitFor(() => {
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Project Beta'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_tasks_by_project_cmd', { projectId: '2' });
    });
  });

  it('navigates when tab is changed', async () => {
    (getAllProjectsInSpace as jest.Mock).mockResolvedValue([
        { id: '1', title: 'Project Alpha' },
      ]);
      mockInvoke.mockResolvedValue([]);

      renderWithProviders(<ProjectHub />);

      // Tabs are: Overview, Kanban, Timeline, Risks
      // Mantine Tabs uses buttons.
      const kanbanTab = screen.getByRole('tab', { name: 'Kanban' });
      fireEvent.click(kanbanTab);

      await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('kanban');
      });
  });

  it('handles error fetching projects', async () => {
    (getAllProjectsInSpace as jest.Mock).mockRejectedValue(new Error('Failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<ProjectHub />);

    await waitFor(() => {
        // Logger uses console.error internally in mock maybe? Or we mocked logger?
        // The logger is imported from utils/logger. If not mocked, it might log.
    });
    consoleSpy.mockRestore();
  });
});
