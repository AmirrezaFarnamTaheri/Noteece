import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";

let db: SQLite.SQLiteDatabase | null = null;

// Database version for migrations
const CURRENT_DB_VERSION = 4;
const DB_VERSION_KEY = "database_version";

/**
 * Run database migrations from old version to current version
 */
async function runMigrations(currentVersion: number): Promise<void> {
  if (!db) throw new Error("Database not initialized");

  console.log(
    `Running migrations from version ${currentVersion} to ${CURRENT_DB_VERSION}`,
  );

  // Migration from v1 to v2: Add new columns to calendar_event table
  if (currentVersion < 2) {
    console.log("Running migration v1 -> v2: Adding columns to calendar_event");

    try {
      // Ensure table exists first (handling upgrade from v0/fresh installs via migration)
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS calendar_event (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          location TEXT,
          source TEXT NOT NULL,
          color TEXT NOT NULL,
          synced_at INTEGER NOT NULL
        );
      `);

      // Check if columns exist before adding them
      const tableInfo = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(calendar_event)",
      );
      const columnNames = tableInfo.map((col) => col.name);

      // Add space_id if it doesn't exist
      if (!columnNames.includes("space_id")) {
        await db.execAsync(
          "ALTER TABLE calendar_event ADD COLUMN space_id TEXT",
        );
        console.log("Added space_id column");
      }

      // Add all_day if it doesn't exist
      if (!columnNames.includes("all_day")) {
        await db.execAsync(
          "ALTER TABLE calendar_event ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0",
        );
        console.log("Added all_day column");
      }

      // Add recurrence_rule if it doesn't exist
      if (!columnNames.includes("recurrence_rule")) {
        await db.execAsync(
          "ALTER TABLE calendar_event ADD COLUMN recurrence_rule TEXT",
        );
        console.log("Added recurrence_rule column");
      }

      // Add created_at if it doesn't exist
      if (!columnNames.includes("created_at")) {
        await db.execAsync(
          "ALTER TABLE calendar_event ADD COLUMN created_at INTEGER",
        );
        console.log("Added created_at column");
      }

      // Add updated_at if it doesn't exist
      if (!columnNames.includes("updated_at")) {
        await db.execAsync(
          "ALTER TABLE calendar_event ADD COLUMN updated_at INTEGER",
        );
        console.log("Added updated_at column");
      }

      console.log("Migration v1 -> v2 completed successfully");
    } catch (error) {
      console.error("Migration v1 -> v2 failed:", error);
      throw error;
    }
  }

  // Migration from v2 to v3: Add social media suite tables
  if (currentVersion < 3) {
    console.log("Running migration v2 -> v3: Adding social media suite tables");

    try {
      await db.execAsync(`
        -- Social Accounts
        CREATE TABLE IF NOT EXISTS social_account (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT,
          credentials_encrypted BLOB NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          sync_frequency_minutes INTEGER NOT NULL DEFAULT 60,
          last_sync INTEGER,
          created_at INTEGER NOT NULL
        );

        -- Social Posts
        CREATE TABLE IF NOT EXISTS social_post (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          platform_post_id TEXT,
          author TEXT NOT NULL,
          author_avatar TEXT,
          content TEXT,
          content_html TEXT,
          url TEXT,
          media_urls TEXT,
          engagement_likes INTEGER,
          engagement_comments INTEGER,
          engagement_shares INTEGER,
          engagement_views INTEGER,
          created_at INTEGER NOT NULL,
          collected_at INTEGER NOT NULL,
          FOREIGN KEY (account_id) REFERENCES social_account(id) ON DELETE CASCADE
        );

        -- Social Categories
        CREATE TABLE IF NOT EXISTS social_category (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          name TEXT NOT NULL,
          color TEXT,
          icon TEXT,
          filters_json TEXT,
          created_at INTEGER NOT NULL
        );

        -- Post-Category Junction
        CREATE TABLE IF NOT EXISTS social_post_category (
          post_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          assigned_at INTEGER NOT NULL,
          assigned_by TEXT NOT NULL,
          PRIMARY KEY (post_id, category_id),
          FOREIGN KEY (post_id) REFERENCES social_post(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES social_category(id) ON DELETE CASCADE
        );

        -- Focus Modes
        CREATE TABLE IF NOT EXISTS social_focus_mode (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          is_active INTEGER NOT NULL DEFAULT 0,
          blocked_platforms TEXT NOT NULL,
          allowed_platforms TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );

        -- Automation Rules
        CREATE TABLE IF NOT EXISTS social_automation_rule (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          name TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          trigger_value TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_value TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL
        );

        -- Auto Categorization Rules
        CREATE TABLE IF NOT EXISTS social_auto_rule (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL,
          rule_type TEXT NOT NULL,
          pattern TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (category_id) REFERENCES social_category(id) ON DELETE CASCADE
        );

        -- Sync History (read-only from desktop)
        CREATE TABLE IF NOT EXISTS social_sync_history (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          sync_time INTEGER NOT NULL,
          posts_synced INTEGER NOT NULL DEFAULT 0,
          sync_duration_ms INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'completed',
          FOREIGN KEY (account_id) REFERENCES social_account(id) ON DELETE CASCADE
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_social_post_account ON social_post(account_id);
        CREATE INDEX IF NOT EXISTS idx_social_post_created ON social_post(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_social_post_platform ON social_post(platform);
        CREATE INDEX IF NOT EXISTS idx_social_post_author ON social_post(author);
        CREATE INDEX IF NOT EXISTS idx_social_post_account_created ON social_post(account_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_social_account_space ON social_account(space_id);
        CREATE INDEX IF NOT EXISTS idx_social_category_space ON social_category(space_id);
        CREATE INDEX IF NOT EXISTS idx_social_focus_active ON social_focus_mode(space_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_social_sync_history_account_time ON social_sync_history(account_id, sync_time DESC);

        -- Unique index for post deduplication (per platform/account)
        CREATE UNIQUE INDEX IF NOT EXISTS ux_social_post_platform_account_platform_post
          ON social_post(platform, account_id, platform_post_id)
          WHERE platform_post_id IS NOT NULL;
      `);

      console.log("Migration v2 -> v3 completed successfully");
    } catch (error) {
      console.error("Migration v2 -> v3 failed:", error);
      throw error;
    }
  }

  // Migration from v3 to v4: Add Music tables and ensure Health/Calendar tables
  if (currentVersion < 4) {
    console.log("Running migration v3 -> v4: Adding Music, Health, and Calendar tables");

    try {
      await db.execAsync(`
        -- Music Tracks
        CREATE TABLE IF NOT EXISTS track (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            title TEXT NOT NULL,
            artist TEXT,
            album TEXT,
            duration INTEGER,
            uri TEXT,
            artwork_url TEXT,
            genre TEXT,
            year INTEGER,
            track_number INTEGER,
            play_count INTEGER DEFAULT 0,
            last_played_at INTEGER,
            is_favorite INTEGER DEFAULT 0,
            added_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_track_artist ON track(artist);
        CREATE INDEX IF NOT EXISTS idx_track_album ON track(album);

        -- Music Playlists
        CREATE TABLE IF NOT EXISTS playlist (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            artwork_url TEXT,
            is_smart_playlist INTEGER DEFAULT 0,
            smart_criteria_json TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- Playlist Tracks (Junction)
        CREATE TABLE IF NOT EXISTS playlist_track (
            playlist_id TEXT NOT NULL,
            track_id TEXT NOT NULL,
            position INTEGER NOT NULL,
            added_at INTEGER NOT NULL,
            PRIMARY KEY(playlist_id, track_id),
            FOREIGN KEY (playlist_id) REFERENCES playlist(id) ON DELETE CASCADE,
            FOREIGN KEY (track_id) REFERENCES track(id) ON DELETE CASCADE
        );

        -- Ensure Health Metric table exists
        CREATE TABLE IF NOT EXISTS health_metric (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          metric_type TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT,
          notes TEXT,
          recorded_at INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        );

        -- Ensure Calendar Event table exists (if missed in v1->v2)
        CREATE TABLE IF NOT EXISTS calendar_event (
          id TEXT PRIMARY KEY,
          space_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          location TEXT,
          source TEXT NOT NULL,
          color TEXT NOT NULL,
          all_day INTEGER NOT NULL DEFAULT 0,
          recurrence_rule TEXT,
          created_at INTEGER,
          updated_at INTEGER,
          synced_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_calendar_event_time ON calendar_event(start_time);
      `);

      console.log("Migration v3 -> v4 completed successfully");
    } catch (error) {
      console.error("Migration v3 -> v4 failed:", error);
      throw error;
    }
  }

  // Update database version
  await AsyncStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION.toString());
  console.log(`Database migrated to version ${CURRENT_DB_VERSION}`);
}

export const initializeDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync("noteece.db");

    // Get current database version
    const versionStr = await AsyncStorage.getItem(DB_VERSION_KEY);
    const currentVersion = versionStr ? parseInt(versionStr, 10) : 1;

    // Create tables
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS task (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        project_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT,
        due_at INTEGER,
        completed_at INTEGER,
        progress INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS note (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS time_entry (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        task_id TEXT,
        project_id TEXT,
        description TEXT,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        duration_seconds INTEGER,
        is_running INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS health_metric (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        notes TEXT,
        recorded_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS insight (
        id TEXT PRIMARY KEY,
        insight_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        severity TEXT NOT NULL,
        context_json TEXT NOT NULL,
        suggested_actions_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        dismissed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS calendar_event (
        id TEXT PRIMARY KEY,
        space_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        location TEXT,
        source TEXT NOT NULL,
        color TEXT NOT NULL,
        all_day INTEGER NOT NULL DEFAULT 0,
        recurrence_rule TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        synced_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nfc_trigger (
        id TEXT PRIMARY KEY,
        tag_id TEXT NOT NULL UNIQUE,
        action_type TEXT NOT NULL,
        parameters TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS location_trigger (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        location_type TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters INTEGER NOT NULL DEFAULT 100,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_state (
        device_id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        last_sync_timestamp INTEGER NOT NULL,
        last_sync_direction TEXT NOT NULL,
        total_synced_entities INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_task_due_at ON task(due_at);
      CREATE INDEX IF NOT EXISTS idx_task_status ON task(status);
      CREATE INDEX IF NOT EXISTS idx_calendar_event_time ON calendar_event(start_time);
      CREATE INDEX IF NOT EXISTS idx_time_entry_running ON time_entry(is_running);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced);
    `);

    // Run migrations if needed
    if (currentVersion < CURRENT_DB_VERSION) {
      await runMigrations(currentVersion);
    } else {
      console.log(`Database already at version ${CURRENT_DB_VERSION}`);
    }

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first.",
    );
  }
  return db;
};

// Helper functions for common queries
export const dbQuery = async <T = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> => {
  const database = getDatabase();
  const result = await database.getAllAsync<T>(sql, params);
  return result;
};

export const dbExecute = async (
  sql: string,
  params: any[] = [],
): Promise<void> => {
  const database = getDatabase();
  await database.runAsync(sql, params);
};
