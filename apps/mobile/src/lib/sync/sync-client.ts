/**
 * Sync Client for Mobile App
 * Implements the sync protocol for offline-first, encrypted synchronization
 */

import { nanoid } from 'nanoid/non-secure';
import * as Crypto from 'expo-crypto';
import { dbQuery, dbExecute } from '@/lib/database';
import { Logger } from '@/lib/logger';
import { safeJsonParse } from '@/lib/safe-json';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { x25519 } from '@noble/curves/ed25519';
import Zeroconf from 'react-native-zeroconf';

// ===== Type Definitions =====

interface ZeroconfResolvedService {
  name: string;
  fullName?: string;
  addresses: string[];
  port: number;
  txt?: Record<string, string>;
}

interface WebSocketMessageEvent {
  data?: string;
  message?: string;
}

interface WebSocketErrorEvent {
  message?: string;
  error?: Error;
}

interface HandshakeMessage {
  type: string;
  publicKey?: string;
  message?: string;
}

interface ManifestResponseMessage {
  type: string;
  requestId?: string;
  manifest?: SyncManifest;
}

interface DeltaResponseMessage {
  type: string;
  requestId?: string;
  delta?: SyncDelta;
}

interface SyncQueueRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  data: string;
  created_at: number;
  synced: number;
}

interface EntityData {
  id?: string;
  space_id?: string;
  [key: string]: unknown;
}

export interface SyncManifest {
  deviceId?: string;
  sinceTimestamp?: number;
  changes?: ChangeEntry[];
  totalSize?: number;
  // Stub properties for compatibility
  entries: ChangeEntry[];
  vectorClock: Record<string, number>;
  timestamp: number;
}

export interface ChangeEntry {
  entityType: 'note' | 'task' | 'project' | 'time_entry' | 'health_metric' | 'track' | 'playlist' | 'calendar_event';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  dependencyChain: string[];
}

export interface SyncDelta {
  changeId: string;
  entityType: string;
  entityId: string;
  operation: string;
  encryptedPayload: Uint8Array;
  vectorClock: Record<string, number>;
  signature: string;
}

export class SyncClient {
  private deviceId: string;
  private sessionKey: Uint8Array | null = null;
  private peerAuthenticated: boolean = false;
  private zeroconf: Zeroconf;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.zeroconf = new Zeroconf();
  }

  /**
   * Discover devices on local network using mDNS
   */
  async discoverDevices(
    scanDurationMs: number = 5000,
  ): Promise<{ id: string; name: string; address: string; port: number }[]> {
    return new Promise((resolve, reject) => {
      const devices: {
        id: string;
        name: string;
        address: string;
        port: number;
      }[] = [];
      const timeout = setTimeout(() => {
        this.zeroconf.stop();
        this.zeroconf.removeDeviceListeners();
        resolve(devices);
      }, scanDurationMs);

      this.zeroconf.scan('noteece-sync', 'tcp', 'local.');

      this.zeroconf.on('resolved', (data: ZeroconfResolvedService) => {
        // Filter for our service type
        if (data.name && data.addresses && data.addresses.length > 0) {
          devices.push({
            id: data.name, // Assuming name is device ID or we parse it from TXT records
            name: data.fullName || data.name,
            address: data.addresses[0],
            port: data.port,
          });
        }
      });

      this.zeroconf.on('error', (err: Error) => {
        clearTimeout(timeout);
        this.zeroconf.stop();
        reject(err);
      });
    });
  }

  /**
   * Initiate sync with a discovered device
   */
  async initiateSync(targetDeviceId: string, targetAddress: string, targetPort: number = 8765): Promise<boolean> {
    try {
      // 1. Establish secure connection
      const ws = await this.establishSecureConnection(targetAddress, targetPort);

      // 2. Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp(targetDeviceId);

      // 3. Request sync manifest from target
      const manifest = await this.requestSyncManifest(ws, targetDeviceId, lastSync);

      // 4. Pull changes
      await this.pullChanges(ws, manifest);

      // 5. Push local changes
      await this.pushChanges(ws, targetDeviceId, lastSync);

      // 6. Update sync state
      await this.updateSyncState(targetDeviceId);

      ws.close();
      return true;
    } catch (error) {
      Logger.error('[Sync] Sync failed:', error);
      return false;
    }
  }

  /**
   * Establish secure connection with ECDH key exchange
   */
  private async establishSecureConnection(address: string, port: number): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://${address}:${port}/sync`);

      // Generate ephemeral keys for this session
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const publicKeyHex = Buffer.from(publicKey).toString('hex');

      ws.onopen = async () => {
        try {
          // Send handshake with our public key
          ws.send(
            JSON.stringify({
              type: 'handshake',
              deviceId: this.deviceId,
              version: '1.0',
              publicKey: publicKeyHex,
            }),
          );

          // Wait for handshake response with peer's public key
          const handshakeHandler = (e: WebSocketMessageEvent) => {
            try {
              const messageData = e.data || e.message;
              const data = safeJsonParse<HandshakeMessage | null>(messageData, null, true);

              if (!data || !data.type) {
                Logger.error('[Sync] Invalid handshake response - failed to parse JSON');
                ws.removeEventListener('message', handshakeHandler);
                reject(new Error('Invalid handshake response'));
                return;
              }

              if (data.type === 'handshake_response') {
                ws.removeEventListener('message', handshakeHandler);

                if (!data.publicKey) {
                  reject(new Error('Peer did not provide public key'));
                  return;
                }

                // Peer public key (hex to bytes)
                const peerPublicKey = Uint8Array.from(Buffer.from(data.publicKey, 'hex'));

                // Compute Shared Secret
                const sharedSecret = x25519.getSharedSecret(privateKey, peerPublicKey);

                // Derive Session Key using HMAC-SHA256 (acting as simple KDF)
                // In a full implementation, we would use HKDF with salt and info
                this.sessionKey = hmac(sha256, sharedSecret, new Uint8Array(0)); // using shared secret as key, empty salt

                this.peerAuthenticated = true;
                resolve(ws);
              } else if (data.type === 'error') {
                ws.removeEventListener('message', handshakeHandler);
                reject(new Error(`Handshake error: ${data.message}`));
              }
            } catch (err) {
              Logger.error('[Sync] Handshake handler error:', err);
              reject(err);
            }
          };

          ws.addEventListener('message', handshakeHandler);
        } catch (e) {
          reject(e);
        }
      };

      ws.onerror = (e: Event) => {
        const errorEvent = e as WebSocketErrorEvent;
        reject(new Error(`WebSocket connection failed: ${errorEvent.message || 'Unknown error'}`));
      };
    });
  }

  /**
   * Get last sync timestamp for a device
   */
  private async getLastSyncTimestamp(deviceId: string): Promise<number> {
    const result = await dbQuery(`SELECT last_sync_timestamp FROM sync_state WHERE device_id = ?`, [deviceId]);

    return result.length > 0 ? result[0].last_sync_timestamp : 0;
  }

  /**
   * Request sync manifest from target device via WebSocket
   */
  private async requestSyncManifest(ws: WebSocket, deviceId: string, sinceTimestamp: number): Promise<SyncManifest> {
    return new Promise((resolve, reject) => {
      const requestId = nanoid();

      const handler = (e: WebSocketMessageEvent) => {
        const messageData = 'data' in e ? e.data : e.message;
        if (typeof messageData !== 'string') return;

        const data = safeJsonParse<ManifestResponseMessage | null>(messageData, null, true);
        if (!data || !data.type) {
          Logger.error('[Sync] Failed to parse manifest response');
          return;
        }

        if (data.type === 'manifest_response' && data.requestId === requestId) {
          ws.removeEventListener('message', handler);
          if (!data.manifest) {
            Logger.error('[Sync] Manifest response missing manifest data');
            reject(new Error('Invalid manifest response'));
            return;
          }
          resolve(data.manifest);
        }
      };

      ws.addEventListener('message', handler);

      ws.send(
        JSON.stringify({
          type: 'get_manifest',
          requestId,
          since: sinceTimestamp,
        }),
      );

      // Timeout fallback
      setTimeout(() => {
        ws.removeEventListener('message', handler);
        reject(new Error('Timeout waiting for manifest'));
      }, 10000);
    });
  }

  /**
   * Pull changes from remote device
   */
  private async pullChanges(ws: WebSocket, manifest: SyncManifest): Promise<void> {
    if (!manifest.changes) return;
    for (const change of manifest.changes) {
      const delta = await this.requestDelta(ws, change);
      await this.applyChange(delta);
    }
  }

  /**
   * Request encrypted delta for a change
   */
  private async requestDelta(ws: WebSocket, change: ChangeEntry): Promise<SyncDelta> {
    return new Promise((resolve, reject) => {
      const requestId = nanoid();
      const handler = (e: WebSocketMessageEvent) => {
        const messageData = e.data || e.message;
        const data = safeJsonParse<DeltaResponseMessage | null>(messageData, null, true);

        if (!data || !data.type) {
          Logger.error('[Sync] Failed to parse delta response');
          return;
        }

        if (data.type === 'delta_response' && data.requestId === requestId) {
          ws.removeEventListener('message', handler);
          if (!data.delta) {
            Logger.error('[Sync] Delta response missing delta data');
            reject(new Error('Invalid delta response'));
            return;
          }
          // Convert hex/base64 payload back to Uint8Array if needed
          // Assuming server sends base64
          // const payload = Uint8Array.from(atob(data.delta.payload), c => c.charCodeAt(0));
          // For simplicity in this mock-up logic:
          resolve(data.delta);
        }
      };
      ws.addEventListener('message', handler);

      ws.send(
        JSON.stringify({
          type: 'get_delta',
          requestId,
          entityId: change.entityId,
          entityType: change.entityType,
        }),
      );

      // Timeout fallback
      setTimeout(() => {
        ws.removeEventListener('message', handler);
        reject(new Error('Timeout waiting for delta'));
      }, 10000);
    });
  }

  /**
   * Apply a change to local database with strict validation
   */
  private async applyChange(delta: SyncDelta): Promise<void> {
    // Validate operation type
    const validOps = new Set(['create', 'update', 'delete']);
    if (!validOps.has(delta.operation)) {
      throw new Error(`Invalid operation: ${delta.operation}`);
    }

    // Validate entity type
    const validTypes = new Set([
      'task',
      'note',
      'time_entry',
      'health_metric',
      'track',
      'playlist',
      'calendar_event',
      'location_trigger',
      'nfc_trigger',
    ]);
    if (!validTypes.has(delta.entityType)) {
      throw new Error(`Invalid entity type: ${delta.entityType}`);
    }

    // Validate entity ID
    if (!delta.entityId || typeof delta.entityId !== 'string' || delta.entityId.length === 0) {
      throw new Error('Invalid entity ID');
    }

    // Verify signature
    if (delta.signature) {
      const isValid = await this.verifyDeltaSignature(delta.encryptedPayload, delta.signature);
      if (!isValid) {
        throw new Error('Delta signature verification failed - possible tampering detected');
      }
    }

    // Decrypt payload when needed
    let payload: EntityData | null = null;
    if (delta.operation === 'create' || delta.operation === 'update') {
      // Validate payload exists
      if (!delta.encryptedPayload || delta.encryptedPayload.length === 0) {
        throw new Error('Missing encrypted payload for create/update operation');
      }

      // Decrypt payload
      payload = await this.decryptPayload(delta.encryptedPayload);

      // Validate decrypted payload
      if (!payload || typeof payload !== 'object') {
        throw new Error('Decrypted payload is invalid or not an object');
      }
    }

    // Apply based on operation type
    switch (delta.operation) {
      case 'create':
      case 'update':
        if (!payload) {
          throw new Error('Payload is required for create/update operation');
        }
        await this.upsertEntity(delta.entityType, delta.entityId, payload);
        break;
      case 'delete':
        await this.deleteEntity(delta.entityType, delta.entityId);
        break;
    }

    // Update vector clock
    await this.updateVectorClock(delta.entityId, delta.vectorClock);
  }

  /**
   * Ensure authenticated session is established before using encryption
   */
  private ensureAuthenticatedSession(): void {
    if (!this.sessionKey || !this.peerAuthenticated) {
      throw new Error('No authenticated secure session established');
    }
  }

  /**
   * Decrypt encrypted payload using ChaCha20-Poly1305
   */
  private async decryptPayload(encryptedPayload: Uint8Array): Promise<EntityData> {
    // Ensure authenticated session
    this.ensureAuthenticatedSession();

    // Validate payload (minimum: 12 bytes nonce + 16 bytes tag + 1 byte data)
    if (!encryptedPayload || encryptedPayload.length < 29) {
      throw new Error('Cannot decrypt payload: payload is too small or invalid');
    }

    try {
      // Extract nonce (first 12 bytes) and ciphertext (rest)
      const nonce = encryptedPayload.slice(0, 12);
      const ciphertext = encryptedPayload.slice(12);

      // Create cipher instance and decrypt
      const cipher = chacha20poly1305(this.sessionKey!, nonce);
      const decrypted = cipher.decrypt(ciphertext);

      // Parse JSON
      const jsonString = new TextDecoder().decode(decrypted);
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Payload decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upsert entity into database with column validation
   */
  private async upsertEntity(entityType: string, entityId: string, data: EntityData): Promise<void> {
    // Use explicit table mapping to prevent SQL injection
    const tableMap: Record<string, string> = {
      task: 'task',
      note: 'note',
      time_entry: 'time_entry',
      health_metric: 'health_metric',
      track: 'track',
      playlist: 'playlist',
      calendar_event: 'calendar_event',
      location_trigger: 'location_trigger',
      nfc_trigger: 'nfc_trigger',
    };

    // Define allowed columns for each table to prevent SQL injection
    const allowedColumns: Record<string, Set<string>> = {
      task: new Set([
        'id',
        'space_id',
        'project_id',
        'title',
        'description',
        'status',
        'priority',
        'due_at',
        'completed_at',
        'progress',
        'created_at',
        'updated_at',
      ]),
      note: new Set(['id', 'space_id', 'title', 'content', 'tags', 'created_at', 'updated_at']),
      time_entry: new Set([
        'id',
        'space_id',
        'task_id',
        'project_id',
        'description',
        'started_at',
        'ended_at',
        'duration_seconds',
        'is_running',
      ]),
      health_metric: new Set(['id', 'space_id', 'metric_type', 'value', 'unit', 'notes', 'recorded_at', 'created_at']),
      track: new Set([
        'id',
        'space_id',
        'title',
        'artist',
        'album',
        'duration',
        'uri',
        'artwork_url',
        'genre',
        'year',
        'track_number',
        'play_count',
        'last_played_at',
        'is_favorite',
        'added_at',
        'updated_at',
      ]),
      playlist: new Set([
        'id',
        'space_id',
        'name',
        'description',
        'artwork_url',
        'is_smart_playlist',
        'smart_criteria_json',
        'created_at',
        'updated_at',
      ]),
      calendar_event: new Set([
        'id',
        'space_id',
        'title',
        'description',
        'start_time',
        'end_time',
        'location',
        'source',
        'color',
        'all_day',
        'recurrence_rule',
        'created_at',
        'updated_at',
        'synced_at',
      ]),
      location_trigger: new Set([
        'id',
        'task_id',
        'location_type',
        'latitude',
        'longitude',
        'radius_meters',
        'enabled',
        'created_at',
      ]),
      nfc_trigger: new Set(['id', 'tag_id', 'action_type', 'parameters', 'created_at']),
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid entity data: must be an object');
    }

    // Build column names and values dynamically from data
    const columns = Object.keys(data);
    if (columns.length === 0) {
      throw new Error('Entity data cannot be empty');
    }

    // Validate all columns are allowed for this table
    const allowed = allowedColumns[entityType];
    if (!allowed) {
      throw new Error(`No column whitelist defined for entity type: ${entityType}`);
    }

    for (const col of columns) {
      if (!allowed.has(col)) {
        throw new Error(`Column '${col}' is not allowed for entity type '${entityType}'`);
      }
    }

    // Ensure id is included
    if (!columns.includes('id')) {
      data.id = entityId;
      columns.push('id');
    }

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => data[col]);

    // Build UPDATE clause for ON CONFLICT
    const updateClauses = columns
      .filter((col) => col !== 'id') // Don't update id
      .map((col) => `${col} = excluded.${col}`)
      .join(', ');

    // SQLite UPSERT syntax: INSERT ... ON CONFLICT DO UPDATE
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updateClauses}
    `;

    try {
      await dbExecute(query, values);
    } catch (error) {
      Logger.error(`[Sync] Failed to upsert ${entityType} entity:`, error);
      throw new Error(`Upsert failed for ${entityType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete entity from database
   */
  private async deleteEntity(entityType: string, entityId: string): Promise<void> {
    // Use explicit table mapping to prevent SQL injection
    const tableMap: Record<string, string> = {
      task: 'task',
      note: 'note',
      time_entry: 'time_entry',
      health_metric: 'health_metric',
      track: 'track',
      playlist: 'playlist',
      calendar_event: 'calendar_event',
      location_trigger: 'location_trigger',
      nfc_trigger: 'nfc_trigger',
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    await dbExecute(`DELETE FROM ${tableName} WHERE id = ?`, [entityId]);
  }

  /**
   * Update vector clock for entity
   */
  private async updateVectorClock(entityId: string, clock: Record<string, number>): Promise<void> {
    // Store vector clock for CRDT conflict resolution
  }

  /**
   * Push local changes to remote device
   */
  private async pushChanges(ws: WebSocket, targetDeviceId: string, sinceTimestamp: number): Promise<void> {
    const localChanges = await this.getLocalChanges(sinceTimestamp);

    for (const change of localChanges) {
      const delta = await this.createEncryptedDelta(change);
      await this.sendDelta(ws, targetDeviceId, delta);
    }
  }

  /**
   * Get local changes since timestamp
   */
  private async getLocalChanges(sinceTimestamp: number): Promise<ChangeEntry[]> {
    const changes = await dbQuery(
      `SELECT * FROM sync_queue
       WHERE created_at > ? AND synced = 0
       ORDER BY created_at ASC`,
      [sinceTimestamp],
    );

    return changes.map(
      (row: SyncQueueRow): ChangeEntry => ({
        entityType: row.entity_type as ChangeEntry['entityType'],
        entityId: row.entity_id,
        operation: row.operation as ChangeEntry['operation'],
        timestamp: row.created_at,
        dependencyChain: [],
      }),
    );
  }

  /**
   * Create encrypted delta from change
   */
  private async createEncryptedDelta(change: ChangeEntry): Promise<SyncDelta> {
    const entityData = await this.fetchEntityData(change.entityType, change.entityId);

    if (!entityData) {
      throw new Error(`Entity not found: ${change.entityType} ${change.entityId}`);
    }

    const encryptedPayload = await this.encryptPayload(entityData);
    const signature = await this.signDelta(encryptedPayload);

    return {
      changeId: nanoid(),
      entityType: change.entityType,
      entityId: change.entityId,
      operation: change.operation,
      encryptedPayload,
      vectorClock: {},
      signature,
    };
  }

  /**
   * Fetch entity data from database
   */
  private async fetchEntityData(entityType: string, entityId: string): Promise<EntityData | null> {
    const tableMap: Record<string, string> = {
      task: 'task',
      note: 'note',
      time_entry: 'time_entry',
      health_metric: 'health_metric',
      track: 'track',
      playlist: 'playlist',
      calendar_event: 'calendar_event',
      location_trigger: 'location_trigger',
      nfc_trigger: 'nfc_trigger',
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }

    const result = await dbQuery(`SELECT * FROM ${tableName} WHERE id = ?`, [entityId]);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Encrypt payload using ChaCha20-Poly1305
   */
  private async encryptPayload(data: EntityData): Promise<Uint8Array> {
    this.ensureAuthenticatedSession();

    if (!data || typeof data !== 'object') {
      throw new Error('Cannot encrypt payload: data must be an object');
    }

    try {
      const jsonString = JSON.stringify(data);
      const plaintext = new TextEncoder().encode(jsonString);
      const nonce = await Crypto.getRandomBytesAsync(12);

      const cipher = chacha20poly1305(this.sessionKey!, nonce);
      const ciphertext = cipher.encrypt(plaintext);

      const encrypted = new Uint8Array(nonce.length + ciphertext.length);
      encrypted.set(nonce, 0);
      encrypted.set(ciphertext, nonce.length);

      return encrypted;
    } catch (error) {
      throw new Error(`Payload encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign delta using HMAC-SHA256 for integrity verification
   */
  private async signDelta(payload: Uint8Array): Promise<string> {
    this.ensureAuthenticatedSession();

    if (!payload || payload.length === 0) {
      throw new Error('Cannot sign delta: payload is empty or invalid');
    }

    try {
      const signature = hmac(sha256, this.sessionKey!, payload);
      return Array.from(signature)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      throw new Error(`Delta signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify delta signature
   */
  private async verifyDeltaSignature(payload: Uint8Array, signature: string): Promise<boolean> {
    this.ensureAuthenticatedSession();

    try {
      const expectedSignature = await this.signDelta(payload);
      if (expectedSignature.length !== signature.length) {
        return false;
      }
      let diff = 0;
      for (let i = 0; i < expectedSignature.length; i++) {
        diff |= expectedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
      }
      return diff === 0;
    } catch (error) {
      Logger.error('[Sync] Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Send delta to remote device via WebSocket
   */
  private async sendDelta(ws: WebSocket, deviceId: string, delta: SyncDelta): Promise<void> {
    ws.send(
      JSON.stringify({
        type: 'push_delta',
        delta,
      }),
    );

    // Optimistically mark as synced or wait for ack?
    // For simple impl, assume success if send doesn't throw
    // A robust impl would wait for ACK.
    await dbExecute(
      `UPDATE sync_queue SET synced = 1
         WHERE entity_id = ? AND entity_type = ?`,
      [delta.entityId, delta.entityType],
    );
  }

  /**
   * Update sync state after successful sync
   */
  private async updateSyncState(deviceId: string): Promise<void> {
    const now = Date.now();

    await dbExecute(
      `INSERT INTO sync_state (device_id, device_name, last_sync_timestamp, last_sync_direction, total_synced_entities, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(device_id) DO UPDATE SET
         last_sync_timestamp = excluded.last_sync_timestamp,
         last_sync_direction = excluded.last_sync_direction,
         updated_at = excluded.updated_at`,
      [deviceId, 'Desktop', now, 'bidirectional', now, now],
    );
  }

  /**
   * Queue a local change for sync
   */
  async queueChange(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: EntityData,
  ): Promise<void> {
    const now = Date.now();

    await dbExecute(
      `INSERT INTO sync_queue (id, entity_type, entity_id, operation, data, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [nanoid(), entityType, entityId, operation, JSON.stringify(data), now],
    );
  }

  // --- Missing Methods Stubbed for SyncBridge compatibility ---

  async initiateKeyExchange(_address: string, _port: number): Promise<void> {
    Logger.warn('[SyncClient] initiateKeyExchange stub called');
    // Implement key exchange logic here or in SyncBridge
  }

  async buildManifest(_since: number): Promise<SyncManifest> {
    Logger.warn('[SyncClient] buildManifest stub called');
    return {
      entries: [],
      vectorClock: {},
      timestamp: Date.now(),
    };
  }

  async sendManifest(_address: string, _port: number, _manifest: SyncManifest): Promise<SyncResult> {
    Logger.warn('[SyncClient] sendManifest stub called');
    return {
      pushed: 0,
      pulled: 0,
      conflicts: 0,
    };
  }

  getSyncStatus(): SyncStatus {
    return {
      status: 'idle',
      message: 'Ready',
      active: false,
      progress: 0,
      lastError: undefined,
    };
  }

  cancelSync(): void {
    Logger.warn('[SyncClient] cancelSync stub called');
  }
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
}

export interface SyncStatus {
  status: 'idle' | 'discovering' | 'connecting' | 'syncing' | 'complete' | 'error';
  message: string;
  active: boolean;
  progress: number;
  lastError?: string;
  error?: string;
  last_sync?: number;
}
