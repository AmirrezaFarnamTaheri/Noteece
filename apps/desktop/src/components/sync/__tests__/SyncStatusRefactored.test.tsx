import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SyncStatus from '../SyncStatusRefactored';
import { AllTheProviders } from '../../../utils/test-utils';
import { invoke } from '@tauri-apps/api/tauri';
import { useStore } from '../../../store';
import '@testing-library/jest-dom';

// Mock invoke
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

// Mock useStore
jest.mock('../../../store', () => ({
  useStore: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockDevices = [
  {
    device_id: 'd1',
    device_name: 'Desktop A',
    device_type: 'Desktop',
    last_seen: 1_700_000_000,
    sync_address: '192.168.1.2',
    sync_port: 8080,
    protocol_version: '1.0.0',
  },
];

const mockHistory = [
  {
    id: '1',
    device_id: 'd1',
    direction: 'push',
    entities_pushed: 5,
    entities_pulled: 0,
    sync_time: 1_700_000_000,
    success: true,
    error_message: null,
  },
];

const mockConflicts = [
  {
    entity_type: 'note',
    entity_id: 'n1',
    local_version: [1, 0],
    remote_version: [0, 1],
    conflict_type: 'UpdateUpdate',
  },
];

describe('SyncStatusRefactored', () => {
  beforeEach(() => {
    (useStore as unknown as jest.Mock).mockReturnValue({
      activeSpaceId: 'space-1',
    });
    (invoke as jest.Mock).mockImplementation((cmd, _args) => {
      switch (cmd) {
        case 'get_devices_cmd': {
          return Promise.resolve(mockDevices);
        }
        case 'get_sync_conflicts_cmd': {
          return Promise.resolve(mockConflicts);
        }
        case 'get_sync_history_for_space_cmd': {
          return Promise.resolve(mockHistory);
        }
        default: {
          return Promise.resolve([]);
        }
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state if no active space', () => {
    (useStore as unknown as jest.Mock).mockReturnValue({
      activeSpaceId: null,
    });

    render(
      <AllTheProviders>
        <SyncStatus />
      </AllTheProviders>
    );

    expect(screen.getByText('No Space Selected')).toBeInTheDocument();
  });

  it('displays devices tab content', async () => {
    render(
      <AllTheProviders>
        <SyncStatus />
      </AllTheProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Devices (1)')).toBeInTheDocument();
    });
    // Tabs panel content might need interaction to show if tabs are lazy loaded?
    // Mantine Tabs usually renders active panel. Default is 'devices'.
    // Need to wait for query to resolve.
    await waitFor(() => {
        expect(screen.getAllByText('Desktop A').length).toBeGreaterThan(0);
    });
  });

  it('displays conflicts alert when conflicts exist', async () => {
    render(
      <AllTheProviders>
        <SyncStatus />
      </AllTheProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Sync Conflicts Detected')).toBeInTheDocument();
      expect(screen.getByText(/1 conflict.*attention/)).toBeInTheDocument();
    });
  });
});
