/**
 * HealthWidget Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { HealthWidget } from '../HealthWidget';
import { invoke } from '@tauri-apps/api/tauri';

// Mock invoke
const mockInvoke = invoke as jest.Mock;

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

// Mock store
jest.mock('../../../store', () => ({
  useStore: jest.fn(() => ({
    activeSpaceId: 'test-space-id',
  })),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock WidgetSkeleton
jest.mock('../../ui/skeletons/WidgetSkeleton', () => ({
  WidgetSkeleton: () => <div data-testid="widget-skeleton">Loading...</div>,
}));

const mockMetrics = [
  {
    metric_type: 'steps',
    value: 8500,
    unit: 'steps',
    recorded_at: 1000,
  },
  {
    metric_type: 'water',
    value: 1500,
    unit: 'ml',
    recorded_at: 1000,
  },
  {
    metric_type: 'sleep',
    value: 7.5,
    unit: 'hours',
    recorded_at: 1000,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('HealthWidget', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('shows skeleton while loading', () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // Never resolve
    renderWithProviders(<HealthWidget />);
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
  });

  it('renders health metrics when loaded', async () => {
    mockInvoke.mockResolvedValue(mockMetrics);

    renderWithProviders(<HealthWidget />);

    await waitFor(() => {
      expect(screen.getByText('Health')).toBeInTheDocument();
    });

    expect(screen.getByText('steps')).toBeInTheDocument();
    expect(screen.getByText('8500 / 10000 steps')).toBeInTheDocument();

    expect(screen.getByText('water')).toBeInTheDocument();
    expect(screen.getByText('1500 / 2500 ml')).toBeInTheDocument();

    expect(screen.getByText('sleep')).toBeInTheDocument();
    expect(screen.getByText('7.5 / 8 hours')).toBeInTheDocument();
  });

  it('shows empty state when no metrics', async () => {
    mockInvoke.mockResolvedValue([]);

    renderWithProviders(<HealthWidget />);

    await waitFor(() => {
      expect(screen.getByText('No data recorded today')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Failed to fetch'));

    renderWithProviders(<HealthWidget />);

    // Should stop loading and show empty/error state (current implementation shows empty state on error)
    await waitFor(() => {
      expect(screen.queryByTestId('widget-skeleton')).not.toBeInTheDocument();
    });
  });
});
