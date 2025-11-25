/**
 * FinanceSnapshotWidget Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinanceSnapshotWidget } from '../FinanceSnapshotWidget';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn().mockResolvedValue({
    total_income: 4500,
    total_expenses: 2850,
    net: 1650,
    by_category: {
      food: 650,
      transport: 320,
      entertainment: 180,
      utilities: 450,
      shopping: 580,
    },
    daily_data: [
      { date: 'Nov 1', income: 200, expenses: 120 },
      { date: 'Nov 2', income: 0, expenses: 85 },
      { date: 'Nov 3', income: 150, expenses: 200 },
    ],
    top_expenses: [
      { category: 'Food', amount: 650 },
      { category: 'Shopping', amount: 580 },
      { category: 'Utilities', amount: 450 },
    ],
  }),
}));

// Mock recharts
jest.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: ({ dataKey }: { dataKey: string }) => <div data-testid={`area-${dataKey}`} />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
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

describe('FinanceSnapshotWidget', () => {
  it('renders the widget title', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('Finance Snapshot')).toBeInTheDocument();
  });

  it('displays total income', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('$4,500')).toBeInTheDocument();
    expect(await screen.findByText('Income')).toBeInTheDocument();
  });

  it('displays total expenses', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('$2,850')).toBeInTheDocument();
    expect(await screen.findByText('Expenses')).toBeInTheDocument();
  });

  it('displays net savings', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('$1,650')).toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('renders time range selector', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('Week')).toBeInTheDocument();
    expect(await screen.findByText('Month')).toBeInTheDocument();
  });

  it('switches time range on click', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    // Wait for component to load
    await screen.findByText('Finance Snapshot');

    const weekButton = await screen.findByText('Week');
    fireEvent.click(weekButton);

    // Should still render without errors
    expect(await screen.findByText('Finance Snapshot')).toBeInTheDocument();
  });

  it('displays spending trend section', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('Spending Trend')).toBeInTheDocument();
  });

  it('displays top expenses section', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByText('Top Expenses')).toBeInTheDocument();
  });

  it('renders area chart for trends', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByTestId('area-chart')).toBeInTheDocument();
  });

  it('renders bar chart for top expenses', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    expect(await screen.findByTestId('bar-chart')).toBeInTheDocument();
  });

  it('shows trend percentage badge', async () => {
    renderWithProviders(<FinanceSnapshotWidget />);

    // Should show a percentage in the trend badge
    const badge = await screen.findByText(/% vs prev period/);
    expect(badge).toBeInTheDocument();
  });

  it('handles spaceId prop', async () => {
    renderWithProviders(<FinanceSnapshotWidget spaceId="test-space" />);

    expect(await screen.findByText('Finance Snapshot')).toBeInTheDocument();
  });
});
