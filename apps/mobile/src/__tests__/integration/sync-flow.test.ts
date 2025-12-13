/**
 * Integration tests for sync flow
 * Tests the complete sync cycle from discovery to data exchange
 */

import { SyncClient } from '../../lib/sync/sync-client';
import { UnifiedSyncBridge } from '../../lib/sync/sync-bridge';

// Correctly mock react-native-zeroconf default export class
jest.mock('react-native-zeroconf', () => {
  return class MockZeroconf {
    on = jest.fn();
    scan = jest.fn();
    stop = jest.fn();
    removeDeviceListeners = jest.fn();
    addDeviceListeners = jest.fn();
    publishService = jest.fn();
    unpublishService = jest.fn();
  };
});

describe('Sync Flow Integration', () => {
  let syncClient: SyncClient;

  beforeEach(() => {
    syncClient = new SyncClient('test-device-id');
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Device Discovery', () => {
    it('discovers devices on local network', async () => {
      const devices = await syncClient.discoverDevices();
      expect(Array.isArray(devices)).toBe(true);
    });

    it('handles no devices found gracefully', async () => {
      const devices = await syncClient.discoverDevices();
      expect(devices).toEqual([]);
    });
  });

  describe('Sync Status', () => {
    it('returns idle status initially', () => {
      const status = syncClient.getSyncStatus();
      expect(status.status).toBe('idle');
      expect(status.active).toBe(false);
    });
  });

  describe('UnifiedSyncBridge', () => {
    it('reports correct engine info', () => {
      const bridge = new UnifiedSyncBridge('test-id', '/path/to/db');
      const info = bridge.getEngineInfo();

      expect(info.engine).toBeDefined();
      expect(info.version).toBeDefined();
      expect(info.features).toContain('chacha20poly1305');
    });
  });
});
