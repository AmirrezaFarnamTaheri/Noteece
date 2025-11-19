import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SyncManager from '../../components/SyncManager';
import { SyncClient } from '../../lib/sync/sync-client';

jest.mock('../../lib/sync/sync-client');

describe('SyncManager Component', () => {
  let mockSyncClient: jest.Mocked<SyncClient>;

  beforeEach(() => {
    mockSyncClient = new SyncClient() as jest.Mocked<SyncClient>;
    (SyncClient as jest.Mock).mockReturnValue(mockSyncClient);
  });

  it('renders sync button', () => {
    const { getByText } = render(<SyncManager />);
    expect(getByText(/Scan/i)).toBeTruthy();
  });

  it('triggers discovery on press', () => {
    const { getByText } = render(<SyncManager />);
    const button = getByText(/Scan/i);
    fireEvent.press(button);
    expect(mockSyncClient.discoverDevices).toHaveBeenCalled();
  });
});
