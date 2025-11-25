/**
 * TemporalGraph Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemporalGraph } from '../TemporalGraph';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn().mockResolvedValue([
    {
      id: 'pattern-1',
      name: 'Test Pattern',
      description: 'A test pattern',
      strength: 0.75,
      start_time: Date.now() - 86_400_000 * 7,
      end_time: Date.now(),
      data_points: [
        { timestamp: Date.now() - 86_400_000, date: 'Nov 24', metric1: 70, metric2: 7.5, correlation: 0.6 },
        { timestamp: Date.now(), date: 'Nov 25', metric1: 75, metric2: 8, correlation: 0.65 },
      ],
      type: 'positive',
    },
  ]),
}));

// Mock recharts
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Scatter: () => <div data-testid="scatter" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  ZAxis: () => <div data-testid="z-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceLine: () => <div data-testid="reference-line" />,
  Brush: () => <div data-testid="brush" />,
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

describe('TemporalGraph', () => {
  it('renders the component title', async () => {
    renderWithProviders(<TemporalGraph />);

    expect(await screen.findByText('Temporal Correlations')).toBeInTheDocument();
  });

  it('displays metric labels', async () => {
    renderWithProviders(<TemporalGraph metric1="productivity" metric2="sleep_hours" />);

    expect(await screen.findByText(/productivity vs sleep_hours/i)).toBeInTheDocument();
  });

  it('renders time range selector', async () => {
    renderWithProviders(<TemporalGraph />);

    expect(await screen.findByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Quarter')).toBeInTheDocument();
  });

  it('renders view mode selector', async () => {
    renderWithProviders(<TemporalGraph />);

    expect(await screen.findByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Scatter')).toBeInTheDocument();
  });

  it('switches between timeline and scatter view', async () => {
    renderWithProviders(<TemporalGraph />);

    // Default is timeline
    expect(await screen.findByTestId('line-chart')).toBeInTheDocument();

    // Click scatter
    fireEvent.click(screen.getByText('Scatter'));

    // Should now show scatter chart
    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
  });

  it('displays average correlation badge', async () => {
    renderWithProviders(<TemporalGraph />);

    expect(await screen.findByText(/Avg Correlation/)).toBeInTheDocument();
  });

  it('displays detected patterns', async () => {
    renderWithProviders(<TemporalGraph />);

    expect(await screen.findByText('Detected Patterns')).toBeInTheDocument();
    expect(screen.getByText(/Test Pattern/)).toBeInTheDocument();
  });

  it('handles pattern click', async () => {
    const onPatternClick = jest.fn();
    renderWithProviders(<TemporalGraph onPatternClick={onPatternClick} />);

    const patternBadge = await screen.findByText(/Test Pattern/);
    fireEvent.click(patternBadge);

    expect(onPatternClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pattern-1',
        name: 'Test Pattern',
      }),
    );
  });

  it('renders zoom controls', async () => {
    renderWithProviders(<TemporalGraph />);

    // Wait for component to load first
    await screen.findByText('Temporal Correlations');

    // Zoom slider is inside the component
    expect(screen.getByText(/Zoom/)).toBeInTheDocument();
  });

  it('renders legend', async () => {
    renderWithProviders(<TemporalGraph metric1="productivity" metric2="sleep_hours" />);

    expect(await screen.findByText('productivity')).toBeInTheDocument();
    expect(screen.getByText('sleep_hours')).toBeInTheDocument();
  });

  it('handles custom metrics', async () => {
    renderWithProviders(<TemporalGraph metric1="focus_score" metric2="exercise_minutes" />);

    expect(await screen.findByText(/focus_score vs exercise_minutes/i)).toBeInTheDocument();
  });

  it('displays correlation label correctly', async () => {
    renderWithProviders(<TemporalGraph />);

    // Should display some correlation status
    const avgBadge = await screen.findByText(/Avg Correlation/);
    expect(avgBadge).toBeInTheDocument();
  });
});
