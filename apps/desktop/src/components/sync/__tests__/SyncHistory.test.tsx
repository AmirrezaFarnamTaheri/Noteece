import React from 'react';
import { render, screen } from '@testing-library/react';
import { SyncHistory } from '../SyncHistory';
import { SyncHistoryEntry } from '../types';
import { MantineProvider } from '@mantine/core';
import '@testing-library/jest-dom';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockHistory: SyncHistoryEntry[] = [
  {
    id: '1',
    device_id: 'd1',
    device_name: 'Desktop A',
    direction: 'push',
    entities_synced: 10,
    started_at: 1700000000,
    completed_at: 1700000005,
    status: 'success',
  },
  {
    id: '2',
    device_id: 'd2',
    device_name: 'Mobile B',
    direction: 'pull',
    entities_synced: 5,
    started_at: 1700000100,
    completed_at: 1700000102,
    status: 'partial',
  },
  {
    id: '3',
    device_id: 'd3',
    device_name: 'Tablet C',
    direction: 'push',
    entities_synced: 0,
    started_at: 1700000200,
    completed_at: 1700000265,
    status: 'failed',
    error: 'Connection timeout',
  },
];

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <MantineProvider>
      {ui}
    </MantineProvider>
  );
};

describe('SyncHistory', () => {
  it('renders empty state when history is empty', () => {
    renderWithProviders(<SyncHistory history={[]} />);
    expect(screen.getByText('No sync history yet')).toBeInTheDocument();
  });

  it('renders history entries correctly', () => {
    renderWithProviders(<SyncHistory history={mockHistory} />);

    // Check device names
    expect(screen.getByText('Desktop A')).toBeInTheDocument();
    expect(screen.getByText('Mobile B')).toBeInTheDocument();
    expect(screen.getByText('Tablet C')).toBeInTheDocument();

    // Check items count
    expect(screen.getByText('10 items')).toBeInTheDocument();
    expect(screen.getByText('5 items')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();

    // Check formatting
    // 5s duration
    expect(screen.getByText('5s')).toBeInTheDocument();
    // 2s duration
    expect(screen.getByText('2s')).toBeInTheDocument();
    // 65s duration -> 1m 5s
    expect(screen.getByText('1m 5s')).toBeInTheDocument();

    // Check statuses (Badge text)
    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('partial')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('respects the limit prop', () => {
    renderWithProviders(<SyncHistory history={mockHistory} limit={2} />);

    expect(screen.getByText('Desktop A')).toBeInTheDocument();
    expect(screen.getByText('Mobile B')).toBeInTheDocument();
    expect(screen.queryByText('Tablet C')).not.toBeInTheDocument();
  });
});
