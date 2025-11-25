import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { DeviceList } from '../DeviceList';
import { SyncDevice } from '../types';

const mockDevices: SyncDevice[] = [
  {
    id: 'device1',
    name: 'My Desktop',
    device_type: 'desktop',
    last_seen: Date.now() / 1000 - 60,
    status: 'online',
  },
  {
    id: 'device2',
    name: 'My Phone',
    device_type: 'mobile',
    last_seen: Date.now() / 1000 - 3600,
    status: 'offline',
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('DeviceList', () => {
  const mockOnSync = jest.fn();
  const mockOnPair = jest.fn();
  const mockOnUnpair = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all devices', () => {
    renderWithProviders(
      <DeviceList
        devices={mockDevices}
        onSync={mockOnSync}
        onPair={mockOnPair}
        onUnpair={mockOnUnpair}
      />
    );
    expect(screen.getByText('My Desktop')).toBeInTheDocument();
    expect(screen.getByText('My Phone')).toBeInTheDocument();
  });

  it('shows online badge for online devices', () => {
    renderWithProviders(
      <DeviceList
        devices={mockDevices}
        onSync={mockOnSync}
        onPair={mockOnPair}
        onUnpair={mockOnUnpair}
      />
    );
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('offline')).toBeInTheDocument();
  });

  it('shows empty state when no devices', () => {
    renderWithProviders(
      <DeviceList
        devices={[]}
        onSync={mockOnSync}
        onPair={mockOnPair}
        onUnpair={mockOnUnpair}
      />
    );
    expect(screen.getByText('No devices paired')).toBeInTheDocument();
  });

  it('marks current device with badge', () => {
    renderWithProviders(
      <DeviceList
        devices={mockDevices}
        currentDeviceId="device1"
        onSync={mockOnSync}
        onPair={mockOnPair}
        onUnpair={mockOnUnpair}
      />
    );
    expect(screen.getByText('This device')).toBeInTheDocument();
  });

  it('formats last seen time correctly', () => {
    renderWithProviders(
      <DeviceList
        devices={mockDevices}
        onSync={mockOnSync}
        onPair={mockOnPair}
        onUnpair={mockOnUnpair}
      />
    );
    expect(screen.getByText(/Last seen:/)).toBeInTheDocument();
  });
});

