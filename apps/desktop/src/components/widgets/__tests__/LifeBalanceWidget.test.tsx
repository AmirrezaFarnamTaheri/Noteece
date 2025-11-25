/**
 * LifeBalanceWidget Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LifeBalanceWidget } from '../LifeBalanceWidget';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn().mockResolvedValue({
    work: 35,
    personal: 15,
    health: 8,
    learning: 5,
    social: 10,
    creative: 3,
    rest: 45,
  }),
}));

// Mock recharts
jest.mock('recharts', () => ({
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  Radar: ({ name }: { name: string }) => <div data-testid={`radar-${name}`} />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="tooltip" />,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>,
  );
};

describe('LifeBalanceWidget', () => {
  it('renders the widget title', async () => {
    renderWithProviders(<LifeBalanceWidget />);

    expect(await screen.findByText('Life Balance')).toBeInTheDocument();
  });

  it('renders the radar chart', async () => {
    renderWithProviders(<LifeBalanceWidget />);

    expect(await screen.findByTestId('radar-chart')).toBeInTheDocument();
  });

  it('displays time range description', async () => {
    renderWithProviders(<LifeBalanceWidget timeRange="week" />);

    expect(await screen.findByText(/this week/i)).toBeInTheDocument();
  });

  it('displays balance score badge', async () => {
    renderWithProviders(<LifeBalanceWidget />);

    // Should show a balance status
    const badge = await screen.findByText(/%/);
    expect(badge).toBeInTheDocument();
  });

  it('shows legend for actual and target', async () => {
    renderWithProviders(<LifeBalanceWidget showTargets={true} />);

    expect(await screen.findByText('● Actual')).toBeInTheDocument();
    expect(await screen.findByText('○ Target')).toBeInTheDocument();
  });

  it('hides target legend when showTargets is false', async () => {
    renderWithProviders(<LifeBalanceWidget showTargets={false} />);

    await screen.findByText('● Actual');
    expect(screen.queryByText('○ Target')).not.toBeInTheDocument();
  });

  it('handles different time ranges', async () => {
    const { rerender } = renderWithProviders(<LifeBalanceWidget timeRange="week" />);

    expect(await screen.findByText(/this week/i)).toBeInTheDocument();

    const queryClient = createTestQueryClient();
    rerender(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <LifeBalanceWidget timeRange="month" />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/this month/i)).toBeInTheDocument();
  });

  it('renders responsive container', async () => {
    renderWithProviders(<LifeBalanceWidget />);

    expect(await screen.findByTestId('responsive-container')).toBeInTheDocument();
  });
});
