import { SyncClient, type SyncManifest } from '@/lib/sync/sync-client';

jest.mock('@/lib/database', () => ({
  dbQuery: jest.fn(async () => []),
  dbExecute: jest.fn(async () => undefined),
}));

jest.mock('react-native-zeroconf', () => {
  return jest.fn().mockImplementation(() => ({
    scan: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
    removeDeviceListeners: jest.fn(),
  }));
});

describe('SyncClient', () => {
  let syncClient: SyncClient;

  beforeEach(() => {
    syncClient = new SyncClient('test-device-id');
  });

  describe('discoverDevices', () => {
    it('returns an array of devices after the scan window', async () => {
      const devices = await syncClient.discoverDevices(10);
      expect(devices).toEqual([]);
    });
  });

  describe('initiateSync', () => {
    it('orchestrates a complete successful sync and closes the socket', async () => {
      const socket = { close: jest.fn() };
      const manifest: SyncManifest = {
        changes: [],
        entries: [],
        vectorClock: {},
        timestamp: 0,
      };
      const internals = syncClient as unknown as {
        establishSecureConnection: jest.Mock;
        getLastSyncTimestamp: jest.Mock;
        requestSyncManifest: jest.Mock;
        pullChanges: jest.Mock;
        pushChanges: jest.Mock;
        updateSyncState: jest.Mock;
      };

      internals.establishSecureConnection = jest.fn().mockResolvedValue(socket);
      internals.getLastSyncTimestamp = jest.fn().mockResolvedValue(0);
      internals.requestSyncManifest = jest.fn().mockResolvedValue(manifest);
      internals.pullChanges = jest.fn().mockResolvedValue(undefined);
      internals.pushChanges = jest.fn().mockResolvedValue(undefined);
      internals.updateSyncState = jest.fn().mockResolvedValue(undefined);

      await expect(syncClient.initiateSync('remote-device', '192.168.1.100')).resolves.toBe(true);

      expect(internals.establishSecureConnection).toHaveBeenCalledWith('192.168.1.100', 8765);
      expect(internals.getLastSyncTimestamp).toHaveBeenCalledWith('remote-device');
      expect(internals.requestSyncManifest).toHaveBeenCalledWith(socket, 'remote-device', 0);
      expect(internals.pullChanges).toHaveBeenCalledWith(socket, manifest);
      expect(internals.pushChanges).toHaveBeenCalledWith(socket, 'remote-device', 0);
      expect(internals.updateSyncState).toHaveBeenCalledWith('remote-device');
      expect(socket.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('queueChange', () => {
    it('queues a change for sync', async () => {
      await expect(
        syncClient.queueChange('task', 'task-123', 'create', {
          title: 'Test Task',
        }),
      ).resolves.not.toThrow();
    });
  });
});
