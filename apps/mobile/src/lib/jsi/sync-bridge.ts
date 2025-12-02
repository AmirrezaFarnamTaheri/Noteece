/**
 * JSI Bridge for Sync Operations
 *
 * Provides a high-performance bridge to Rust core sync functions.
 * Falls back to native module if JSI is not available.
 */

import { NativeModules } from 'react-native';

// JSI Module Types
export interface SyncDevice {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  ipAddress: string;
  syncPort: number;
  lastSeen: number;
  isActive: boolean;
}

export interface SyncProgress {
  deviceId: string;
  phase: 'connecting' | 'exchanging' | 'syncing' | 'complete' | 'error';
  progress: number;
  entitiesPushed: number;
  entitiesPulled: number;
  conflicts: number;
  errorMessage?: string;
}

export interface SyncConflict {
  id: string;
  entityType: 'note' | 'task' | 'project';
  entityId: string;
  localVersion: string;
  remoteVersion: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

export type ConflictResolution = 'keep_local' | 'keep_remote' | 'merge';

// JSI Interface
interface SyncJSI {
  // Initialization
  init(dbPath: string): Promise<void>;

  // Device Discovery
  discoverDevices(): Promise<SyncDevice[]>;
  registerDevice(device: SyncDevice): Promise<void>;

  // Key Exchange
  initiateKeyExchange(deviceId: string): Promise<string>;
  completeKeyExchange(deviceId: string, peerPublicKey: string): Promise<void>;

  // Sync Operations
  startSync(deviceId: string): Promise<void>;
  cancelSync(deviceId: string): Promise<void>;
  getSyncProgress(deviceId: string): Promise<SyncProgress>;

  // Conflict Resolution
  getConflicts(): Promise<SyncConflict[]>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;

  // History
  getSyncHistory(limit: number): Promise<SyncHistoryEntry[]>;
}

export interface SyncHistoryEntry {
  id: string;
  deviceId: string;
  deviceName: string;
  direction: 'push' | 'pull' | 'bidirectional';
  entitiesPushed: number;
  entitiesPulled: number;
  conflicts: number;
  success: boolean;
  errorMessage?: string;
  completedAt: number;
}

// Get the JSI module if available
const getJSISyncModule = (): SyncJSI | null => {
  try {
    // @ts-ignore - JSI modules are injected at runtime
    if (global.__SyncJSI) {
      // @ts-ignore
      return global.__SyncJSI as SyncJSI;
    }
    return null;
  } catch {
    return null;
  }
};

// Native module fallback
const NativeSyncModule = NativeModules.NoteeceSync;

/**
 * Sync Bridge - Unified interface for sync operations
 */
class SyncBridge implements SyncJSI {
  private jsi: SyncJSI | null;
  private useJSI: boolean;

  constructor() {
    this.jsi = getJSISyncModule();
    this.useJSI = this.jsi !== null;

    if (this.useJSI) {
      console.log('[SyncBridge] Using JSI for sync operations');
      // Initialization is handled by caller to provide the correct DB path
    } else {
      console.log('[SyncBridge] Falling back to Native Module');
    }
  }

  /**
   * Initialize the sync engine with database path
   */
  async init(dbPath: string): Promise<void> {
    if (this.jsi) {
      return this.jsi.init(dbPath);
    }
    // Native module likely initializes itself or via other means
    return Promise.resolve();
  }

  /**
   * Check if JSI is available
   */
  isJSIAvailable(): boolean {
    return this.useJSI;
  }

  /**
   * Discover nearby devices on the network
   */
  async discoverDevices(): Promise<SyncDevice[]> {
    if (this.jsi) {
      return this.jsi.discoverDevices();
    }

    // Fallback to native module
    if (NativeSyncModule?.discoverDevices) {
      return NativeSyncModule.discoverDevices();
    }

    throw new Error('Sync module not available');
  }

  /**
   * Register a new device for pairing
   */
  async registerDevice(device: SyncDevice): Promise<void> {
    if (this.jsi) {
      return this.jsi.registerDevice(device);
    }

    if (NativeSyncModule?.registerDevice) {
      return NativeSyncModule.registerDevice(device);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Initiate key exchange with a device
   */
  async initiateKeyExchange(deviceId: string): Promise<string> {
    if (this.jsi) {
      return this.jsi.initiateKeyExchange(deviceId);
    }

    if (NativeSyncModule?.initiateKeyExchange) {
      return NativeSyncModule.initiateKeyExchange(deviceId);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Complete key exchange with peer's public key
   */
  async completeKeyExchange(deviceId: string, peerPublicKey: string): Promise<void> {
    if (this.jsi) {
      return this.jsi.completeKeyExchange(deviceId, peerPublicKey);
    }

    if (NativeSyncModule?.completeKeyExchange) {
      return NativeSyncModule.completeKeyExchange(deviceId, peerPublicKey);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Start synchronization with a device
   */
  async startSync(deviceId: string): Promise<void> {
    if (this.jsi) {
      return this.jsi.startSync(deviceId);
    }

    if (NativeSyncModule?.startSync) {
      return NativeSyncModule.startSync(deviceId);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Cancel ongoing synchronization
   */
  async cancelSync(deviceId: string): Promise<void> {
    if (this.jsi) {
      return this.jsi.cancelSync(deviceId);
    }

    if (NativeSyncModule?.cancelSync) {
      return NativeSyncModule.cancelSync(deviceId);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Get current sync progress
   */
  async getSyncProgress(deviceId: string): Promise<SyncProgress> {
    if (this.jsi) {
      return this.jsi.getSyncProgress(deviceId);
    }

    if (NativeSyncModule?.getSyncProgress) {
      return NativeSyncModule.getSyncProgress(deviceId);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Get unresolved sync conflicts
   */
  async getConflicts(): Promise<SyncConflict[]> {
    if (this.jsi) {
      return this.jsi.getConflicts();
    }

    if (NativeSyncModule?.getConflicts) {
      return NativeSyncModule.getConflicts();
    }

    throw new Error('Sync module not available');
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    if (this.jsi) {
      return this.jsi.resolveConflict(conflictId, resolution);
    }

    if (NativeSyncModule?.resolveConflict) {
      return NativeSyncModule.resolveConflict(conflictId, resolution);
    }

    throw new Error('Sync module not available');
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 20): Promise<SyncHistoryEntry[]> {
    if (this.jsi) {
      return this.jsi.getSyncHistory(limit);
    }

    if (NativeSyncModule?.getSyncHistory) {
      return NativeSyncModule.getSyncHistory(limit);
    }

    throw new Error('Sync module not available');
  }
}

// Singleton instance
export const syncBridge = new SyncBridge();
