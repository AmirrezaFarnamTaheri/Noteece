import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { CalendarWidget } from '../CalendarWidget';
import '@testing-library/jest-dom';

// Mock hooks
jest.mock('../../../hooks/useQueries', () => ({
  useTasks: jest.fn(() => ({
    data: [
      {
        id: '1',
        title: 'Test Task',
        due_at: Date.now(),
        priority: 'high',
        status: 'in_progress',
      },
    ],
    isLoading: false,
  })),
  useNotes: jest.fn(() => ({
    data: [
      {
        id: '1',
        title: 'Test Note',
        created_at: Date.now(),
        is_trashed: false,
      },
    ],
    isLoading: false,
  })),
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
    </QueryClientProvider>,
  );
};

describe('CalendarWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<CalendarWidget />);
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });

  it('displays calendar component', () => {
    renderWithProviders(<CalendarWidget />);
    // Mantine Calendar should render with dates
    const today = new Date();
    const currentMonth = today.toLocaleDateString('en-US', { month: 'long' });
    // eslint-disable-next-line security/detect-non-literal-regexp -- currentMonth is from Date.toLocaleDateString which returns a safe string
    expect(screen.getByText(new RegExp(currentMonth, 'i'))).toBeInTheDocument();
  });

  it('shows legend badges', () => {
    renderWithProviders(<CalendarWidget />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });
});
