/**
 * SocialWidget Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import SocialWidget from '../SocialWidget';

// Mock WidgetSkeleton
jest.mock('../../ui/skeletons/WidgetSkeleton', () => ({
  WidgetSkeleton: () => <div data-testid="widget-skeleton">Loading...</div>,
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('SocialWidget', () => {
  it('shows skeleton while loading', () => {
    renderWithProviders(<SocialWidget />);
    // Initial state is loading
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
  });

  it('renders social accounts when loaded', async () => {
    jest.useFakeTimers();
    renderWithProviders(<SocialWidget />);

    // Fast-forward timer
    jest.runAllTimers();

    await waitFor(() => {
      expect(screen.getByText('Social')).toBeInTheDocument();
    });

    expect(screen.getByText('@noteece_app')).toBeInTheDocument();
    expect(screen.getByText('Noteece Inc.')).toBeInTheDocument();
    expect(screen.getByText('1.2k')).toBeInTheDocument();
    expect(screen.getByText('850')).toBeInTheDocument();

    jest.useRealTimers();
  });
});
