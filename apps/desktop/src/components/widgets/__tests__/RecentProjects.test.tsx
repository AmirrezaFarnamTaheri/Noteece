import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { RecentProjects } from '../RecentProjects';
import '@testing-library/jest-dom';

// Mock API
const mockGetAllProjectsInSpace = jest.fn();
jest.mock('../../../services/api', () => ({
  getAllProjectsInSpace: (id: string) => mockGetAllProjectsInSpace(id),
}));

// Mock hook
jest.mock('../../../hooks/useActiveSpace', () => ({
  useActiveSpace: jest.fn(() => ({ activeSpaceId: 'test-space-id' })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('RecentProjects', () => {
  beforeEach(() => {
    mockGetAllProjectsInSpace.mockReset();
  });

  it('renders widget title', () => {
    renderWithProviders(<RecentProjects />);
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
  });

  it('shows empty state when no active projects', async () => {
    mockGetAllProjectsInSpace.mockResolvedValue([]);
    renderWithProviders(<RecentProjects />);

    await waitFor(() => {
        expect(screen.getByText('No active projects. Create one to get started!')).toBeInTheDocument();
    });
  });

  it('filters and displays active projects', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetAllProjectsInSpace.mockResolvedValue([
        { id: '1', title: 'Active Project A', status: 'active', start_at: now },
        { id: '2', title: 'Done Project', status: 'done', start_at: now },
        { id: '3', title: 'Active Project B', status: 'active', start_at: now - 1000 },
    ]);

    renderWithProviders(<RecentProjects />);

    await waitFor(() => {
        expect(screen.getByText('Active Project A')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Project B')).toBeInTheDocument();
    expect(screen.queryByText('Done Project')).not.toBeInTheDocument();
  });

  it('sorts projects by start date descending', async () => {
    const now = Math.floor(Date.now() / 1000);
    mockGetAllProjectsInSpace.mockResolvedValue([
        { id: '1', title: 'Old Project', status: 'active', start_at: now - 10000 },
        { id: '2', title: 'New Project', status: 'active', start_at: now },
    ]);

    renderWithProviders(<RecentProjects />);

    await waitFor(() => {
        // Use regex to match text more flexibly
        const newProject = screen.getByText('New Project');
        const oldProject = screen.getByText('Old Project');
        expect(newProject).toBeInTheDocument();
        expect(oldProject).toBeInTheDocument();

        // Verify sorting by checking order in DOM
        const container = newProject.closest('.mantine-Stack-root');
        expect(container).toBeInTheDocument();
        if (container) {
             // We expect New Project (recent) to appear before Old Project (older)
             // Use compareDocumentPosition for robust DOM ordering check
             const position = newProject.compareDocumentPosition(oldProject);
             // 4 = Node.DOCUMENT_POSITION_FOLLOWING (oldProject follows newProject)
             expect(position & 4).toBeTruthy();
        }
    });
  });
});
