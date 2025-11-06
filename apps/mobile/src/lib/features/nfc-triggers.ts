/**
 * NFC Triggers
 * Handle NFC tag reading and action execution
 */

import * as NFC from "expo-nfc";
import { dbQuery, dbExecute } from "@/lib/database";
import { NFCTrigger } from "@/types";
import { nanoid } from "nanoid";

export class NFCTriggerManager {
  private isScanning = false;
  private tagListener: any = null;

  /**
   * Check if NFC is available on device
   */
  async isAvailable(): Promise<boolean> {
    try {
      const isSupported = await NFC.hasHardwareAsync();
      const isEnabled = await NFC.isEnabledAsync();
      return isSupported && isEnabled;
    } catch (error) {
      console.error("NFC check failed:", error);
      return false;
    }
  }

  /**
   * Start scanning for NFC tags
   */
  async startScanning(
    onTagDetected: (trigger: NFCTrigger | null) => void,
  ): Promise<void> {
    if (this.isScanning) {
      return;
    }

    // Clean up any existing listener first to prevent duplicates
    this.stopScanning();

    this.isScanning = true;

    try {
      await NFC.requestPermissionsAsync();

      // Listen for NFC tags - store reference to remove later
      this.tagListener = NFC.addListener("tag", async (event) => {
        const tagId = event.id || event.serialNumber;

        if (tagId) {
          // Look up trigger by tag ID
          const trigger = await this.getTriggerByTagId(tagId);
          onTagDetected(trigger);
        }
      });
    } catch (error) {
      console.error("Failed to start NFC scanning:", error);
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
      NFC.removeAllListeners("tag");
    }

    this.isScanning = false;
  }

  /**
   * Get trigger by NFC tag ID
   */
  private async getTriggerByTagId(tagId: string): Promise<NFCTrigger | null> {
    const results = await dbQuery<NFCTrigger>(
      `SELECT * FROM nfc_trigger WHERE tag_id = ? LIMIT 1`,
      [tagId],
    );

    if (results.length > 0) {
      return {
        ...results[0],
        parameters: JSON.parse(results[0].parameters as any),
      };
    }

    return null;
  }

  /**
   * Register a new NFC trigger
   */
  async registerTrigger(
    tagId: string,
    actionType: NFCTrigger["actionType"],
    parameters: Record<string, any>,
  ): Promise<string> {
    // Validate tag ID
    if (!tagId || typeof tagId !== "string" || tagId.trim().length === 0) {
      throw new Error("Invalid tag ID: must be a non-empty string");
    }

    if (tagId.length > 256) {
      throw new Error(
        "Invalid tag ID: exceeds maximum length of 256 characters",
      );
    }

    // Validate action type
    const validActionTypes = [
      "start_time",
      "log_habit",
      "open_note",
      "quick_capture",
    ];
    if (!validActionTypes.includes(actionType)) {
      throw new Error(
        `Invalid action type: must be one of ${validActionTypes.join(", ")}`,
      );
    }

    // Validate parameters
    if (!parameters || typeof parameters !== "object") {
      throw new Error("Invalid parameters: must be an object");
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
  private validateActionParameters(
    actionType: string,
    params: Record<string, any>,
  ): void {
    switch (actionType) {
      case "start_time":
        if (!params.spaceId || typeof params.spaceId !== "string") {
          throw new Error("start_time requires valid spaceId");
        }
        if (params.taskId && typeof params.taskId !== "string") {
          throw new Error("taskId must be a string if provided");
        }
        if (params.description && typeof params.description !== "string") {
          throw new Error("description must be a string if provided");
        }
        if (params.description && params.description.length > 1000) {
          throw new Error(
            "description exceeds maximum length of 1000 characters",
          );
        }
        break;

      case "log_habit":
        if (!params.spaceId || typeof params.spaceId !== "string") {
          throw new Error("log_habit requires valid spaceId");
        }
        if (!params.metricType || typeof params.metricType !== "string") {
          throw new Error("log_habit requires valid metricType");
        }
        if (params.value === undefined || params.value === null) {
          throw new Error("log_habit requires value");
        }
        if (
          typeof params.value !== "number" &&
          typeof params.value !== "string"
        ) {
          throw new Error("value must be a number or string");
        }
        if (params.unit && typeof params.unit !== "string") {
          throw new Error("unit must be a string if provided");
        }
        break;

      case "open_note":
        if (!params.noteId || typeof params.noteId !== "string") {
          throw new Error("open_note requires valid noteId");
        }
        break;

      case "quick_capture":
        if (params.content && typeof params.content !== "string") {
          throw new Error("content must be a string if provided");
        }
        if (params.content && params.content.length > 10000) {
          throw new Error("content exceeds maximum length of 10000 characters");
        }
        break;
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
    const results = await dbQuery<NFCTrigger>(
      `SELECT * FROM nfc_trigger ORDER BY created_at DESC`,
    );

    return results.map((row) => ({
      ...row,
      parameters: JSON.parse(row.parameters as any),
    }));
  }

  /**
   * Execute a trigger action
   */
  async executeTrigger(trigger: NFCTrigger): Promise<void> {
    switch (trigger.actionType) {
      case "start_time":
        await this.executeStartTime(trigger.parameters);
        break;
      case "log_habit":
        await this.executeLogHabit(trigger.parameters);
        break;
      case "open_note":
        await this.executeOpenNote(trigger.parameters);
        break;
      case "quick_capture":
        await this.executeQuickCapture(trigger.parameters);
        break;
    }
  }

  private async executeStartTime(params: any): Promise<void> {
    // Validate required parameters
    if (!params.spaceId || typeof params.spaceId !== "string") {
      throw new Error("Invalid spaceId for start_time action");
    }

    // Validate optional parameters
    const taskId =
      params.taskId && typeof params.taskId === "string" ? params.taskId : null;
    const description =
      params.description && typeof params.description === "string"
        ? params.description.substring(0, 1000).trim()
        : "NFC triggered time entry";

    // Ensure description is not empty after trimming
    const finalDescription =
      description.length > 0 ? description : "NFC triggered time entry";

    const now = Date.now();

    await dbExecute(
      `INSERT INTO time_entry (id, space_id, task_id, description, started_at, is_running)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nanoid(), params.spaceId, taskId, finalDescription, now],
    );
  }

  private async executeLogHabit(params: any): Promise<void> {
    // Validate required parameters
    if (!params.spaceId || typeof params.spaceId !== "string") {
      throw new Error("Invalid spaceId for log_habit action");
    }

    if (!params.metricType || typeof params.metricType !== "string") {
      throw new Error("Invalid metricType for log_habit action");
    }

    if (params.value === undefined || params.value === null) {
      throw new Error("Invalid value for log_habit action");
    }

    // Validate and sanitize value
    let value: number | string;
    if (typeof params.value === "number") {
      if (!Number.isFinite(params.value)) {
        throw new Error("value must be a finite number");
      }
      value = params.value;
    } else if (typeof params.value === "string") {
      value = params.value.substring(0, 100).trim();
      if (value.length === 0) {
        throw new Error("value cannot be empty");
      }
    } else {
      throw new Error("value must be a number or string");
    }

    // Validate and sanitize optional parameters
    const unit =
      params.unit && typeof params.unit === "string"
        ? params.unit.substring(0, 50).trim()
        : "";

    const now = Date.now();

    await dbExecute(
      `INSERT INTO health_metric (id, space_id, metric_type, value, unit, notes, recorded_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nanoid(),
        params.spaceId,
        params.metricType,
        value,
        unit,
        "NFC logged",
        now,
        now,
      ],
    );
  }

  private async executeOpenNote(params: any): Promise<void> {
    // Validate note ID
    if (!params.noteId || typeof params.noteId !== "string") {
      throw new Error("Invalid noteId for open_note action");
    }

    if (params.noteId.trim().length === 0) {
      throw new Error("noteId cannot be empty");
    }

    // Open a specific note (handled by navigation)
    console.log("Open note:", params.noteId);
  }

  private async executeQuickCapture(params: any): Promise<void> {
    // Validate and sanitize content if provided
    if (params.content !== undefined && params.content !== null) {
      if (typeof params.content !== "string") {
        throw new Error("content must be a string if provided");
      }

      // Limit content length to prevent abuse
      params.content = params.content.substring(0, 10000).trim();
    }

    // Open quick capture with pre-filled data
    console.log("Quick capture:", params);
  }
}

// Export singleton instance
export const nfcTriggerManager = new NFCTriggerManager();
