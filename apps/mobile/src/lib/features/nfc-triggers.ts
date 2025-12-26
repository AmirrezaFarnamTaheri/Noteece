/**
 * NFC Triggers
 * Handle NFC tag reading and action execution
 */

// @ts-ignore: expo-nfc missing types
import * as NFC from 'expo-nfc';
import { dbQuery, dbExecute } from '@/lib/database';
import { Logger } from '@/lib/logger';
import { safeJsonParse } from '@/lib/safe-json';
import { NFCTrigger } from '@/types';
import { nanoid } from 'nanoid';

// ===== Type Definitions =====

interface NFCTagEvent {
  id?: string;
  serialNumber?: string;
  ndefMessage?: unknown[];
}

interface NFCEventListener {
  remove: () => void;
}

interface StartTimeParams {
  spaceId: string;
  taskId?: string;
  description?: string;
}

interface LogHabitParams {
  spaceId: string;
  metricType: string;
  value: number | string;
  unit?: string;
}

interface OpenNoteParams {
  noteId: string;
}

interface QuickCaptureParams {
  content?: string;
}

type NFCActionParams = StartTimeParams | LogHabitParams | OpenNoteParams | QuickCaptureParams;

export class NFCTriggerManager {
  private isScanning = false;
  private tagListener: NFCEventListener | null = null;

  /**
   * Check if NFC is available on device
   */
  async isAvailable(): Promise<boolean> {
    try {
      const isSupported = await NFC.hasHardwareAsync();
      const isEnabled = await NFC.isEnabledAsync();
      return isSupported && isEnabled;
    } catch (error) {
      Logger.error('NFC check failed:', error);
      return false;
    }
  }

  /**
   * Start scanning for NFC tags
   */
  async startScanning(onTagDetected: (trigger: NFCTrigger | null) => void): Promise<void> {
    if (this.isScanning) {
      return;
    }

    // Clean up any existing listener first to prevent duplicates
    this.stopScanning();

    this.isScanning = true;

    try {
      await NFC.requestPermissionsAsync();

      // Listen for NFC tags - store reference to remove later
      this.tagListener = NFC.addListener('tag', async (event: NFCTagEvent) => {
        const tagId = event.id || event.serialNumber;

        if (tagId) {
          // Look up trigger by tag ID
          const trigger = await this.getTriggerByTagId(tagId);
          onTagDetected(trigger);
        }
      });
    } catch (error) {
      Logger.error('Failed to start NFC scanning:', error);
      this.isScanning = false;
      this.tagListener = null;
    }
  }

  /**
   * Stop scanning for NFC tags
   */
  stopScanning(): void {
    if (!this.isScanning && !this.tagListener) {
      return;
    }

    // Remove specific listener if we have a reference
    if (this.tagListener) {
      this.tagListener.remove();
      this.tagListener = null;
    } else {
      // Fallback to removing all listeners
      NFC.removeAllListeners('tag');
    }

    this.isScanning = false;
  }

  /**
   * Get trigger by NFC tag ID
   */
  private async getTriggerByTagId(tagId: string): Promise<NFCTrigger | null> {
    const results = await dbQuery<NFCTrigger>(`SELECT * FROM nfc_trigger WHERE tag_id = ? LIMIT 1`, [tagId]);

    if (results.length > 0) {
      const parameters = safeJsonParse<Record<string, unknown>>(
        typeof results[0].parameters === 'string' ? results[0].parameters : JSON.stringify(results[0].parameters),
        {},
        true,
      );
      // Allow empty parameters for quick_capture action type (content is optional)
      // Only reject if parse failed (safeJsonParse returns {} on malformed JSON)
      if (Object.keys(parameters).length === 0 && results[0].actionType !== 'quick_capture') {
        Logger.error('[NFC] Failed to parse trigger parameters', { tagId, triggerId: results[0].id });
        return null;
      }
      return {
        ...results[0],
        parameters,
      };
    }

    return null;
  }

  /**
   * Register a new NFC trigger
   */
  async registerTrigger(
    tagId: string,
    actionType: NFCTrigger['actionType'],
    parameters: NFCActionParams,
  ): Promise<string> {
    // Validate tag ID
    if (!tagId || typeof tagId !== 'string' || tagId.trim().length === 0) {
      throw new Error('Invalid tag ID: must be a non-empty string');
    }

    if (String(tagId).length > 256) {
      throw new Error('Invalid tag ID: exceeds maximum length of 256 characters');
    }

    // Validate action type
    const validActionTypes = ['start_time', 'log_habit', 'open_note', 'quick_capture'];
    if (!validActionTypes.includes(actionType)) {
      throw new Error(`Invalid action type: must be one of ${validActionTypes.join(', ')}`);
    }

    // Validate parameters
    if (!parameters || typeof parameters !== 'object') {
      throw new Error('Invalid parameters: must be an object');
    }

    // Validate parameters based on action type
    this.validateActionParameters(actionType, parameters);

    const id = nanoid();
    const now = Date.now();

    await dbExecute(
      `INSERT INTO nfc_trigger (id, tag_id, action_type, parameters, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, tagId, actionType, JSON.stringify(parameters), now],
    );

    return id;
  }

  /**
   * Validate parameters for specific action types
   */
  private validateActionParameters(actionType: string, params: NFCActionParams): void {
    switch (actionType) {
      case 'start_time': {
        const p = params as StartTimeParams;
        if (!p.spaceId || typeof p.spaceId !== 'string') {
          throw new Error('start_time requires valid spaceId');
        }
        if (p.taskId && typeof p.taskId !== 'string') {
          throw new Error('taskId must be a string if provided');
        }
        if (p.description && typeof p.description !== 'string') {
          throw new Error('description must be a string if provided');
        }
        if (p.description && p.description.length > 1000) {
          throw new Error('description exceeds maximum length of 1000 characters');
        }
        break;
      }

      case 'log_habit': {
        const p = params as LogHabitParams;
        if (!p.spaceId || typeof p.spaceId !== 'string') {
          throw new Error('log_habit requires valid spaceId');
        }
        if (!p.metricType || typeof p.metricType !== 'string') {
          throw new Error('log_habit requires valid metricType');
        }
        if (p.value === undefined || p.value === null) {
          throw new Error('log_habit requires value');
        }
        if (typeof p.value !== 'number' && typeof p.value !== 'string') {
          throw new Error('value must be a number or string');
        }
        if (p.unit && typeof p.unit !== 'string') {
          throw new Error('unit must be a string if provided');
        }
        break;
      }

      case 'open_note': {
        const p = params as OpenNoteParams;
        if (!p.noteId || typeof p.noteId !== 'string') {
          throw new Error('open_note requires valid noteId');
        }
        break;
      }

      case 'quick_capture': {
        const p = params as QuickCaptureParams;
        if (p.content && typeof p.content !== 'string') {
          throw new Error('content must be a string if provided');
        }
        if (p.content && p.content.length > 10000) {
          throw new Error('content exceeds maximum length of 10000 characters');
        }
        break;
      }
    }
  }

  /**
   * Delete an NFC trigger
   */
  async deleteTrigger(id: string): Promise<void> {
    await dbExecute(`DELETE FROM nfc_trigger WHERE id = ?`, [id]);
  }

  /**
   * Get all registered triggers
   */
  async getAllTriggers(): Promise<NFCTrigger[]> {
    const results = await dbQuery<NFCTrigger>(`SELECT * FROM nfc_trigger ORDER BY created_at DESC`);

    return results
      .map((row): NFCTrigger | null => {
        const parameters = safeJsonParse<Record<string, unknown>>(
          typeof row.parameters === 'string' ? row.parameters : JSON.stringify(row.parameters),
          {},
          true,
        );
        // Allow empty parameters for quick_capture action type (content is optional)
        // Only reject if parse failed (safeJsonParse returns {} on malformed JSON)
        if (!parameters || (Object.keys(parameters).length === 0 && row.actionType !== 'quick_capture')) {
          Logger.error('[NFC] Failed to parse trigger parameters, skipping', { triggerId: row.id });
          return null;
        }
        return {
          ...row,
          parameters,
        };
      })
      .filter((trigger): trigger is NFCTrigger => trigger !== null);
  }

  /**
   * Execute a trigger action
   */
  async executeTrigger(trigger: NFCTrigger): Promise<void> {
    switch (trigger.actionType) {
      case 'start_time':
        await this.executeStartTime(trigger.parameters as StartTimeParams);
        break;
      case 'log_habit':
        await this.executeLogHabit(trigger.parameters as LogHabitParams);
        break;
      case 'open_note':
        await this.executeOpenNote(trigger.parameters as OpenNoteParams);
        break;
      case 'quick_capture':
        await this.executeQuickCapture(trigger.parameters as QuickCaptureParams);
        break;
    }
  }

  private async executeStartTime(params: StartTimeParams): Promise<void> {
    // Validate required parameters
    if (!params.spaceId || typeof params.spaceId !== 'string') {
      throw new Error('Invalid spaceId for start_time action');
    }

    // Validate optional parameters
    const taskId = params.taskId && typeof params.taskId === 'string' ? params.taskId : null;
    const description =
      params.description && typeof params.description === 'string'
        ? params.description.substring(0, 1000).trim()
        : 'NFC triggered time entry';

    // Ensure description is not empty after trimming
    const finalDescription = description.length > 0 ? description : 'NFC triggered time entry';

    const now = Date.now();

    await dbExecute(
      `INSERT INTO time_entry (id, space_id, task_id, description, started_at, is_running)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nanoid(), params.spaceId, taskId, finalDescription, now],
    );
  }

  private async executeLogHabit(params: LogHabitParams): Promise<void> {
    // Validate required parameters
    if (!params.spaceId || typeof params.spaceId !== 'string') {
      throw new Error('Invalid spaceId for log_habit action');
    }

    if (!params.metricType || typeof params.metricType !== 'string') {
      throw new Error('Invalid metricType for log_habit action');
    }

    if (params.value === undefined || params.value === null) {
      throw new Error('Invalid value for log_habit action');
    }

    // Validate and sanitize value
    let value: number | string;
    if (typeof params.value === 'number') {
      if (!Number.isFinite(params.value)) {
        throw new Error('value must be a finite number');
      }
      value = params.value;
    } else if (typeof params.value === 'string') {
      const stringValue = params.value.substring(0, 100).trim();
      if (stringValue.length === 0) {
        throw new Error('value cannot be empty');
      }
      value = stringValue;
    } else {
      throw new Error('value must be a number or string');
    }

    // Validate and sanitize optional parameters
    const unit = params.unit && typeof params.unit === 'string' ? params.unit.substring(0, 50).trim() : '';

    const now = Date.now();

    await dbExecute(
      `INSERT INTO health_metric (id, space_id, metric_type, value, unit, notes, recorded_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nanoid(), params.spaceId, params.metricType, value, unit, 'NFC logged', now, now],
    );
  }

  private async executeOpenNote(params: OpenNoteParams): Promise<void> {
    // Validate note ID
    if (!params.noteId || typeof params.noteId !== 'string') {
      throw new Error('Invalid noteId for open_note action');
    }

    if (params.noteId.trim().length === 0) {
      throw new Error('noteId cannot be empty');
    }

    // Open a specific note (handled by navigation)
    Logger.info('Open note:', params.noteId);
  }

  private async executeQuickCapture(params: QuickCaptureParams): Promise<void> {
    // Validate and sanitize content if provided
    if (params.content !== undefined && params.content !== null) {
      if (typeof params.content !== 'string') {
        throw new Error('content must be a string if provided');
      }

      // Limit content length to prevent abuse
      params.content = params.content.substring(0, 10000).trim();
    }

    // Open quick capture with pre-filled data
    Logger.info('Quick capture:', params);
  }
}

// Export singleton instance
export const nfcTriggerManager = new NFCTriggerManager();
