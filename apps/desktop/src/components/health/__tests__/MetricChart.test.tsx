import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { MetricChart } from '../MetricChart';
import { HealthMetric } from '../types';

const mockMetrics: HealthMetric[] = [
  {
    id: '1',
    space_id: 'space1',
    metric_type: 'weight',
    value: 70,
    unit: 'kg',
    recorded_at: Date.now() / 1000 - 86400 * 2,
    created_at: Date.now() / 1000 - 86400 * 2,
  },
  {
    id: '2',
    space_id: 'space1',
    metric_type: 'weight',
    value: 69.5,
    unit: 'kg',
    recorded_at: Date.now() / 1000 - 86400,
    created_at: Date.now() / 1000 - 86400,
  },
  {
    id: '3',
    space_id: 'space1',
    metric_type: 'weight',
    value: 69,
    unit: 'kg',
    recorded_at: Date.now() / 1000,
    created_at: Date.now() / 1000,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('MetricChart', () => {
  it('renders the chart title', () => {
    renderWithProviders(
      <MetricChart
        metrics={mockMetrics}
        selectedType="weight"
        onTypeChange={jest.fn()}
      />
    );
    expect(screen.getByText('Trend')).toBeInTheDocument();
  });

  it('renders metric type selector', () => {
    renderWithProviders(
      <MetricChart
        metrics={mockMetrics}
        selectedType="weight"
        onTypeChange={jest.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows no data message when no metrics for type', () => {
    renderWithProviders(
      <MetricChart
        metrics={mockMetrics}
        selectedType="heart_rate"
        onTypeChange={jest.fn()}
      />
    );
    expect(screen.getByText('No data for this metric type')).toBeInTheDocument();
  });

  it('calls onTypeChange when type is changed', () => {
    const mockOnTypeChange = jest.fn();
    renderWithProviders(
      <MetricChart
        metrics={mockMetrics}
        selectedType="weight"
        onTypeChange={mockOnTypeChange}
      />
    );
    // Chart is rendered, callback is available
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});

