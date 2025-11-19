import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusTimer } from '../FocusTimer';
import { AllTheProviders } from '../../../utils/test-utils';

jest.useFakeTimers();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(ui, { wrapper: AllTheProviders });
};

describe('FocusTimer Widget', () => {
  it('renders initial state correctly', () => {
    renderWithProviders(<FocusTimer />);
    expect(screen.getByText(/25:00/)).toBeInTheDocument();
    expect(screen.getByText(/focus/i)).toBeInTheDocument();
  });

  it('starts timer when start button clicked', () => {
    renderWithProviders(<FocusTimer />);
    const startButton = screen.getByRole('button', { name: /start/i });

    fireEvent.click(startButton);

    // Fast-forward 1 minute
    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/24:00/)).toBeInTheDocument();
  });

  it('resets timer correctly', () => {
    renderWithProviders(<FocusTimer />);
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    expect(screen.getByText(/25:00/)).toBeInTheDocument();
  });
});
