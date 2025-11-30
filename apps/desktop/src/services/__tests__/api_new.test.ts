import { exchangeKeys, getSyncProgress, shutdownClearKeys, getBackupDetails } from '../api';
import { invoke } from '@tauri-apps/api/tauri';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

describe('API Service - New Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exchangeKeys calls exchange_keys_cmd', async () => {
    const deviceId = 'test-device-id';
    await exchangeKeys(deviceId);
    expect(invoke).toHaveBeenCalledWith('exchange_keys_cmd', { deviceId });
  });

  test('getSyncProgress calls get_sync_progress_cmd', async () => {
    const deviceId = 'test-device-id';
    (invoke as jest.Mock).mockResolvedValueOnce(0.5);
    const progress = await getSyncProgress(deviceId);
    expect(invoke).toHaveBeenCalledWith('get_sync_progress_cmd', { deviceId });
    expect(progress).toBe(0.5);
  });

  test('shutdownClearKeys calls shutdown_clear_keys_cmd', async () => {
    await shutdownClearKeys();
    expect(invoke).toHaveBeenCalledWith('shutdown_clear_keys_cmd', undefined);
  });

  test('getBackupDetails calls get_backup_details_cmd', async () => {
    const backupId = 'backup-123';
    const mockDetails = { id: 'backup-123', timestamp: 1_234_567_890 };
    (invoke as jest.Mock).mockResolvedValueOnce(mockDetails);
    const details = await getBackupDetails(backupId);
    expect(invoke).toHaveBeenCalledWith('get_backup_details_cmd', { backupId });
    expect(details).toEqual(mockDetails);
  });
});
