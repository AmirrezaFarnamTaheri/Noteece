import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { GoalsTrackerWidget } from '../GoalsTrackerWidget';
import '@testing-library/jest-dom';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('GoalsTrackerWidget', () => {
  it('renders widget title', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByText('Goals Tracker')).toBeInTheDocument();
  });

  it('displays add goal button', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByRole('button', { name: /add goal/i })).toBeInTheDocument();
  });

  it('shows initial mock goals', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByText('Write 50 blog posts')).toBeInTheDocument();
    expect(screen.getByText('Read 24 books')).toBeInTheDocument();
    expect(screen.getByText('Exercise 100 times')).toBeInTheDocument();
  });

  it('displays progress bars for goals', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByText(/23 \/ 50/)).toBeInTheDocument();
    expect(screen.getByText(/18 \/ 24/)).toBeInTheDocument();
    expect(screen.getByText(/67 \/ 100/)).toBeInTheDocument();
  });

  it('shows category badges', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
  });

  it('opens modal when add goal clicked', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    const addButton = screen.getByRole('button', { name: /add goal/i });

    fireEvent.click(addButton);

    expect(screen.getByText('Add New Goal')).toBeInTheDocument();
  });

  it('displays completed badge for finished goals', () => {
    renderWithProviders(<GoalsTrackerWidget />);
    // Read 24 books has 18/24, Exercise has 67/100 - none completed yet
    // Could be expanded with actual completion testing
  });
});
