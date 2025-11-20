import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BookmarksWidget } from '../BookmarksWidget';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
const mockNotes = [
  { id: '1', title: 'Note 1', is_trashed: false, modified_at: 1000 },
  { id: '2', title: 'Note 2', is_trashed: false, modified_at: 2000 },
];
const mockTasks = [
  { id: 't1', title: 'Task 1' },
];
const mockProjects = [
  { id: 'p1', title: 'Project 1' },
];

jest.mock('../../../hooks/useQueries', () => ({
  useNotes: jest.fn(() => ({ data: mockNotes, isLoading: false })),
  useTasks: jest.fn(() => ({ data: mockTasks, isLoading: false })),
  useProjects: jest.fn(() => ({ data: mockProjects, isLoading: false })),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </MantineProvider>
  );
};

describe('BookmarksWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<BookmarksWidget />);
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
  });

  it('shows recent notes when no bookmarks exist', () => {
    renderWithProviders(<BookmarksWidget />);
    expect(screen.getByText('Recent Notes')).toBeInTheDocument();
    expect(screen.getByText('Note 1')).toBeInTheDocument();
    expect(screen.getByText('Note 2')).toBeInTheDocument();
  });

  it('allows bookmarking a recent note', async () => {
    renderWithProviders(<BookmarksWidget />);

    // Find star icon for Note 1
    const starButton = screen.getByLabelText('Bookmark Note 1');
    fireEvent.click(starButton);

    // Should now appear in Bookmarks section (implied by logic switching view)
    // Since we don't have persistence mocked fully, the component re-renders with state
    await waitFor(() => {
        expect(screen.queryByText('Recent Notes')).not.toBeInTheDocument();
        expect(screen.getByText('Notes')).toBeInTheDocument(); // The category header in bookmarks view
    });
  });

  it('allows unbookmarking a note', async () => {
    renderWithProviders(<BookmarksWidget />);

    // Bookmark first
    const starButton = screen.getByLabelText('Bookmark Note 1');
    fireEvent.click(starButton);

    await waitFor(() => {
         expect(screen.getByLabelText('Unbookmark Note 1')).toBeInTheDocument();
    });

    // Unbookmark
    const unstarButton = screen.getByLabelText('Unbookmark Note 1');
    fireEvent.click(unstarButton);

    await waitFor(() => {
        expect(screen.getByText('Recent Notes')).toBeInTheDocument();
    });
  });
});
