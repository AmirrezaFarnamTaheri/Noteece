import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/tauri';
import SyncStatus from '../SyncStatus';
import '@testing-library/jest-dom';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

import { useStore } from '../../store';

beforeEach(() => {
  // Reset the Zustand store and localStorage before each test
  const { clearStorage, setActiveSpaceId } = useStore.getState();
  clearStorage();
  localStorage.clear();
  setActiveSpaceId('space-123'); // Set a default for the tests
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{component}</MantineProvider>
    </QueryClientProvider>,
  );
};

const sampleDevices = [
  {
    device_id: '1',
    device_name: 'MacBook Pro',
    device_type: 'Desktop',
    last_seen: Math.floor(Date.now() / 1000),
    sync_address: '192.168.1.10',
    sync_port: 8080,
    protocol_version: '1.0',
  },
  {
    device_id: '2',
    device_name: 'Windows Desktop',
    device_type: 'Desktop',
    last_seen: Math.floor(Date.now() / 1000) - 600,
    sync_address: '192.168.1.11',
    sync_port: 8080,
    protocol_version: '1.0',
  },
  {
    device_id: '3',
    device_name: 'iPad',
    device_type: 'Mobile',
    last_seen: Math.floor(Date.now() / 1000) - 1200,
    sync_address: '10.0.0.12',
    sync_port: 8080,
    protocol_version: '1.0',
  },
];

const sampleConflicts = [
  {
    entity_type: 'Note',
    entity_id: 'note-1',
    local_version: [1, 2],
    remote_version: [2, 3],
    conflict_type: 'UpdateUpdate',
  },
];

const sampleHistory = [
  {
    id: 'history-1',
    device_id: '1',
    space_id: 'space-123',
    sync_time: Date.now(),
    direction: 'bidirectional',
    entities_pushed: 10,
    entities_pulled: 5,
    conflicts_detected: 1,
    success: true,
    error_message: null,
  },
];

describe('SyncStatus', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_sync_devices_cmd') {
        return Promise.resolve(sampleDevices);
      }
      if (cmd === 'get_sync_conflicts_cmd') {
        return Promise.resolve(sampleConflicts);
      }
      if (cmd === 'get_sync_history_for_space_cmd') {
        return Promise.resolve(sampleHistory);
      }
      if (cmd === 'record_sync_cmd') {
        return Promise.resolve({});
      }
      if (cmd === 'resolve_sync_conflict_cmd') {
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });
  });

  it('renders sync status page', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByText('Sync Status')).toBeInTheDocument();
  });

  it('displays sync button', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByRole('button', { name: /sync now/i })).toBeInTheDocument();
  });

  it('shows devices tab', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByRole('tab', { name: /devices/i })).toBeInTheDocument();
  });

  it('shows conflicts tab with count', async () => {
    renderWithProviders(<SyncStatus />);
    const conflictsTab = await screen.findByRole('tab', { name: /conflicts/i });
    expect(conflictsTab).toHaveTextContent('1');
  });

  it('shows history tab', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByRole('tab', { name: /history/i })).toBeInTheDocument();
  });

  it('displays sync settings button', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByLabelText('Sync settings')).toBeInTheDocument();
  });

  it('handles manual sync trigger', async () => {
    renderWithProviders(<SyncStatus />);
    const syncButton = await screen.findByRole('button', { name: /sync now/i });

    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('record_sync_cmd', expect.objectContaining({ space_id: 'space-123' }));
    });
  });

  it('opens settings modal when settings button clicked', async () => {
    renderWithProviders(<SyncStatus />);
    const settingsButton = await screen.findByLabelText('Sync settings');

    fireEvent.click(settingsButton);

    const settingsModal = await screen.findByRole('dialog', { name: /sync settings/i });
    expect(settingsModal).toBeInTheDocument();
  });

  it('displays device list', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByText('MacBook Pro')).toBeInTheDocument();
    expect(screen.getByText('Windows Desktop')).toBeInTheDocument();
    expect(screen.getByText('iPad')).toBeInTheDocument();
  });

  it('displays unresolved conflicts alert', async () => {
    renderWithProviders(<SyncStatus />);
    expect(await screen.findByText(/sync conflicts detected/i)).toBeInTheDocument();
    expect(screen.getByText(/1 unresolved sync conflict/i)).toBeInTheDocument();
  });
});
