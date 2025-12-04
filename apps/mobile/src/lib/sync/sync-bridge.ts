/**
 * Unified Sync Bridge
 *
 * Provides a unified interface for sync operations that:
 * 1. Uses the native JSI bridge (Rust core) when available (preferred)
 * 2. Falls back to TypeScript implementation when JSI is not available
 *
 * This architecture eliminates the "brain split" where sync logic
 * was implemented twice (Rust and TypeScript).
 */

import { NativeModules, Platform } from 'react-native';
import { SyncClient } from './sync-client';

// JSI Module interface
interface NoteeceCoreModule {
  nativeInit(dbPath: string): boolean;
  nativeShutdown(): void;
  nativeProcessSyncPacket(data: string): string;
  nativeGenerateHandshake(): string;
  nativeDiscoverDevices(): string;
  nativeInitiateKeyExchange(deviceId: string): string;
  nativeGetSyncProgress(deviceId: string): string;
  nativeGetAllNotes?(): string; // Optional new method
}

// Check if JSI module is available
const NoteeceCoreJSI: NoteeceCoreModule | null = (() => {
  if (Platform.OS === 'android') {
    try {
      // Try to load the JSI module
      const module = NativeModules.NoteeceCoreModule;
      if (module && typeof module.nativeInit === 'function') {
        console.log('[SyncBridge] JSI module available');
        return module as NoteeceCoreModule;
      }
    } catch {
      console.log('[SyncBridge] JSI module not available, using TypeScript fallback');
    }
  }
  return null;
})();

/**
 * Device info from discovery
 */
export interface DiscoveredDevice {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol?: string;
  // Stub properties for compatibility with UI components
  device_id?: string;
  device_name?: string;
  device_type?: string;
  ip_address?: string;
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  deviceId: string;
  phase: 'idle' | 'discovering' | 'handshake' | 'syncing' | 'complete' | 'error';
  progress: number; // 0-100
  entitiesPushed: number;
  entitiesPulled: number;
  conflicts: number;
  errorMessage?: string;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  entitiesPushed: number;
  entitiesPulled: number;
  conflicts: number;
  duration: number;
  error?: string;
}

/**
 * Unified Sync Bridge
 * Uses JSI (Rust core) when available, TypeScript fallback otherwise
 */
export class UnifiedSyncBridge {
  private deviceId: string;
  private dbPath: string;
  private useJSI: boolean;
  private tsFallback: SyncClient | null = null;
  private initialized: boolean = false;

  constructor(deviceId: string, dbPath: string) {
    this.deviceId = deviceId;
    this.dbPath = dbPath;
    this.useJSI = NoteeceCoreJSI !== null;

    console.log(`[SyncBridge] Initialized with ${this.useJSI ? 'JSI (Rust)' : 'TypeScript'} engine`);
  }

  /**
   * Initialize the sync engine
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.useJSI && NoteeceCoreJSI) {
      try {
        const result = NoteeceCoreJSI.nativeInit(this.dbPath);
        if (result) {
          this.initialized = true;
          console.log('[SyncBridge] JSI engine initialized');
          return true;
        }
      } catch (e) {
        console.warn('[SyncBridge] JSI init failed, falling back to TypeScript:', e);
        this.useJSI = false;
      }
    }

    // TypeScript fallback
    this.tsFallback = new SyncClient(this.deviceId);
    this.initialized = true;
    console.log('[SyncBridge] TypeScript engine initialized');
    return true;
  }

  /**
   * Shutdown the sync engine
   */
  shutdown(): void {
    if (this.useJSI && NoteeceCoreJSI) {
      try {
        NoteeceCoreJSI.nativeShutdown();
      } catch (e) {
        console.warn('[SyncBridge] JSI shutdown error:', e);
      }
    }
    this.tsFallback = null;
    this.initialized = false;
  }

  /**
   * Discover devices on local network
   */
  async discoverDevices(timeoutMs: number = 5000): Promise<DiscoveredDevice[]> {
    await this.ensureInitialized();

    if (this.useJSI && NoteeceCoreJSI) {
      try {
        const result = NoteeceCoreJSI.nativeDiscoverDevices();
        const devices = JSON.parse(result);
        return devices.map((d: any) => ({
          id: d.device_id || d.id,
          name: d.device_name || d.name,
          address: d.address || d.ip_address,
          port: d.port || d.sync_port,
          protocol: 'jsi',
        }));
      } catch (e) {
        console.warn('[SyncBridge] JSI discovery failed:', e);
        // Fall through to TypeScript
      }
    }

    if (this.tsFallback) {
      const devices = await this.tsFallback.discoverDevices(timeoutMs);
      return devices.map((d) => ({
        ...d,
        protocol: 'typescript',
      }));
    }

    return [];
  }

  /**
   * Initiate key exchange with a peer device
   */
  async initiateKeyExchange(deviceId: string): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    if (this.useJSI && NoteeceCoreJSI) {
      try {
        const result = NoteeceCoreJSI.nativeInitiateKeyExchange(deviceId);
        const parsed = JSON.parse(result);
        return {
          success: !parsed.error,
          error: parsed.error,
        };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }

    // TypeScript fallback uses inline key exchange during sync
    return { success: true };
  }

  /**
   * Generate handshake packet for key exchange
   */
  generateHandshake(): string {
    if (this.useJSI && NoteeceCoreJSI) {
      try {
        return NoteeceCoreJSI.nativeGenerateHandshake();
      } catch (e) {
        console.warn('[SyncBridge] JSI handshake failed:', e);
      }
    }

    // TypeScript fallback generates handshake in sync flow
    return '';
  }

  /**
   * Process an incoming sync packet
   */
  processSyncPacket(data: string): string {
    if (this.useJSI && NoteeceCoreJSI) {
      try {
        return NoteeceCoreJSI.nativeProcessSyncPacket(data);
      } catch (e) {
        console.warn('[SyncBridge] JSI packet processing failed:', e);
        return JSON.stringify({ error: String(e) });
      }
    }

    // TypeScript fallback would handle this in the full sync flow
    return JSON.stringify({
      error: 'TypeScript fallback requires full sync flow',
    });
  }

  /**
   * Get current sync progress with a device
   */
  getSyncProgress(deviceId: string): SyncProgress {
    if (this.useJSI && NoteeceCoreJSI) {
      try {
        const result = NoteeceCoreJSI.nativeGetSyncProgress(deviceId);
        const parsed = JSON.parse(result);
        return {
          deviceId,
          phase: parsed.phase || 'idle',
          progress: parsed.progress || 0,
          entitiesPushed: parsed.entities_pushed || 0,
          entitiesPulled: parsed.entities_pulled || 0,
          conflicts: parsed.conflicts || 0,
          errorMessage: parsed.error_message,
        };
      } catch {
        return this.defaultProgress(deviceId);
      }
    }

    return this.defaultProgress(deviceId);
  }

  /**
   * Start sync with a specific device
   */
  async startSync(
    device: DiscoveredDevice,
    options?: {
      fullSync?: boolean;
      entityTypes?: string[];
    },
  ): Promise<SyncResult> {
    await this.ensureInitialized();
    const startTime = Date.now();

    if (this.useJSI && NoteeceCoreJSI) {
      try {
        // JSI path - uses Rust core for all sync logic
        const keyExchange = await this.initiateKeyExchange(device.id);
        if (!keyExchange.success) {
          return {
            success: false,
            entitiesPushed: 0,
            entitiesPulled: 0,
            conflicts: 0,
            duration: Date.now() - startTime,
            error: keyExchange.error,
          };
        }

        // Sync via Rust core
        const syncRequest = JSON.stringify({
          device_id: device.id,
          address: device.address,
          port: device.port,
          full_sync: options?.fullSync ?? false,
          entity_types: options?.entityTypes,
        });

        const result = this.processSyncPacket(syncRequest);
        const parsed = JSON.parse(result);

        return {
          success: !parsed.error,
          entitiesPushed: parsed.entities_pushed || 0,
          entitiesPulled: parsed.entities_pulled || 0,
          conflicts: parsed.conflicts || 0,
          duration: Date.now() - startTime,
          error: parsed.error,
        };
      } catch (e) {
        console.warn('[SyncBridge] JSI sync failed, trying TypeScript:', e);
      }
    }

    // TypeScript fallback
    if (this.tsFallback) {
      try {
        await this.tsFallback.initiateKeyExchange(device.address, device.port);

        // Perform sync using TypeScript implementation
        const manifest = await this.tsFallback.buildManifest(0);
        const result = await this.tsFallback.sendManifest(device.address, device.port, manifest);

        return {
          success: true,
          entitiesPushed: result.pushed || 0,
          entitiesPulled: result.pulled || 0,
          conflicts: result.conflicts || 0,
          duration: Date.now() - startTime,
        };
      } catch (e) {
        return {
          success: false,
          entitiesPushed: 0,
          entitiesPulled: 0,
          conflicts: 0,
          duration: Date.now() - startTime,
          error: String(e),
        };
      }
    }

    return {
      success: false,
      entitiesPushed: 0,
      entitiesPulled: 0,
      conflicts: 0,
      duration: Date.now() - startTime,
      error: 'No sync engine available',
    };
  }

  /**
   * Check if using JSI (Rust core) or TypeScript fallback
   */
  isUsingJSI(): boolean {
    return this.useJSI;
  }

  /**
   * Get all notes (exposed for NotesScreen)
   */
  async getAllNotes(): Promise<import('../../types').Note[]> {
    await this.ensureInitialized();

    // Prefer JSI if method is available (optimization)
    if (this.useJSI && NoteeceCoreJSI && typeof NoteeceCoreJSI.nativeGetAllNotes === 'function') {
      try {
        const result = NoteeceCoreJSI.nativeGetAllNotes();
        return JSON.parse(result);
      } catch (e) {
        console.warn('[SyncBridge] JSI getAllNotes failed, falling back:', e);
      }
    }

    // Fallback: Use direct database access from TypeScript side
    // This requires importing the database instance which we can do dynamically
    try {
      // Dynamic import to avoid circular dependencies
      const { getDatabase } = await import('../database');
      const db = getDatabase();
      const notes = await db.getAllAsync<import('../../types').Note>(
        'SELECT * FROM note WHERE is_trashed = 0 ORDER BY modified_at DESC',
      );
      return notes;
    } catch (e) {
      console.error('[SyncBridge] getAllNotes failed:', e);
      return [];
    }
  }

  /**
   * Get engine information
   */
  getEngineInfo(): { engine: string; version: string; features: string[] } {
    if (this.useJSI) {
      return {
        engine: 'Rust (JSI)',
        version: '1.1.0',
        features: ['ecdh', 'chacha20poly1305', 'vector_clocks', 'set_union_merge'],
      };
    }

    return {
      engine: 'TypeScript (Fallback)',
      version: '1.1.0',
      features: ['ecdh', 'chacha20poly1305', 'vector_clocks'],
    };
  }

  // Private helpers

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private defaultProgress(deviceId: string): SyncProgress {
    return {
      deviceId,
      phase: 'idle',
      progress: 0,
      entitiesPushed: 0,
      entitiesPulled: 0,
      conflicts: 0,
    };
  }
}

/**
 * Singleton instance for easy access
 */
let bridgeInstance: UnifiedSyncBridge | null = null;

export function getSyncBridge(deviceId?: string, dbPath?: string): UnifiedSyncBridge {
  if (!bridgeInstance && deviceId && dbPath) {
    bridgeInstance = new UnifiedSyncBridge(deviceId, dbPath);
  }

  if (!bridgeInstance) {
    throw new Error('SyncBridge not initialized. Call with deviceId and dbPath first.');
  }

  return bridgeInstance;
}

export function resetSyncBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.shutdown();
    bridgeInstance = null;
  }
}
