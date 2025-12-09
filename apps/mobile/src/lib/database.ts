import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { syncBridge } from './jsi/sync-bridge';

let db: SQLite.SQLiteDatabase | null = null;

// Database version for migrations
const CURRENT_DB_VERSION = 5;
const DB_VERSION_KEY = 'database_version';

/**
 * Run database migrations from old version to current version
 */
async function runMigrations(currentVersion: number): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  console.log(`Running migrations from version ${currentVersion} to ${CURRENT_DB_VERSION}`);

  // Migration from v1 to v2: Add new columns to calendar_event table
  if (currentVersion < 2) {
    console.log('Running migration v1 -> v2: Adding columns to calendar_event');

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
      const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(calendar_event)');
      const columnNames = tableInfo.map((col) => col.name);

      // Add space_id if it doesn't exist
      if (!columnNames.includes('space_id')) {
        await db.execAsync('ALTER TABLE calendar_event ADD COLUMN space_id TEXT');
        console.log('Added space_id column');
      }

      // Add all_day if it doesn't exist
      if (!columnNames.includes('all_day')) {
        await db.execAsync('ALTER TABLE calendar_event ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0');
        console.log('Added all_day column');
      }

      // Add recurrence_rule if it doesn't exist
      if (!columnNames.includes('recurrence_rule')) {
        await db.execAsync('ALTER TABLE calendar_event ADD COLUMN recurrence_rule TEXT');
        console.log('Added recurrence_rule column');
      }

      // Add created_at if it doesn't exist
      if (!columnNames.includes('created_at')) {
        await db.execAsync('ALTER TABLE calendar_event ADD COLUMN created_at INTEGER');
        console.log('Added created_at column');
      }

      // Add updated_at if it doesn't exist
      if (!columnNames.includes('updated_at')) {
        await db.execAsync('ALTER TABLE calendar_event ADD COLUMN updated_at INTEGER');
        console.log('Added updated_at column');
      }

      console.log('Migration v1 -> v2 completed successfully');
    } catch (error) {
      console.error('Migration v1 -> v2 failed:', error);
      throw error;
    }
  }

  // Migration from v2 to v3: Add social media suite tables
  if (currentVersion < 3) {
    console.log('Running migration v2 -> v3: Adding social media suite tables');

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

      console.log('Migration v2 -> v3 completed successfully');
    } catch (error) {
      console.error('Migration v2 -> v3 failed:', error);
      throw error;
    }
  }

  // Migration from v3 to v4: Add Music tables and ensure Health/Calendar tables
  if (currentVersion < 4) {
    console.log('Running migration v3 -> v4: Adding Music, Health, and Calendar tables');

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

      console.log('Migration v3 -> v4 completed successfully');
    } catch (error) {
      console.error('Migration v3 -> v4 failed:', error);
      throw error;
    }
  }

  // Migration from v4 to v5: Consolidate with core-rs schema
  if (currentVersion < 5) {
    console.log('Running migration v4 -> v5: Consolidate with core-rs schema');

    await db.execAsync('BEGIN TRANSACTION');

    // Check for tags column in old note table before it gets dropped/altered
    let oldTags: { id: string; space_id: string; tags: string }[] = [];
    try {
      // We need to check if table exists first (it should)
      const noteTableExists = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='note'",
      );
      if (noteTableExists.length > 0) {
        const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(note)');
        if (tableInfo.some((c) => c.name === 'tags')) {
          // Check if space_id exists
          const hasSpaceId = tableInfo.some((c) => c.name === 'space_id');
          // We default to 'default' if space_id is missing, as we backfill space 'default' later anyway if needed
          const query = hasSpaceId
            ? 'SELECT id, space_id, tags FROM note WHERE tags IS NOT NULL AND tags != ""'
            : 'SELECT id, "default" as space_id, tags FROM note WHERE tags IS NOT NULL AND tags != ""';

          oldTags = await db.getAllAsync(query);
          console.log(`[Migration] Found ${oldTags.length} notes with tags to migrate`);
        }
      }
    } catch (e) {
      console.warn('[Migration] Failed to read old tags for migration', e);
    }

    try {
      await db.execAsync(`
        -- Create Space table
        CREATE TABLE IF NOT EXISTS space(
          id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT,
          enabled_modes_json TEXT NOT NULL DEFAULT '[]',
          created_at INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0
        );

        -- Create Project table
        CREATE TABLE IF NOT EXISTS project(
          id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
          title TEXT NOT NULL, goal_outcome TEXT,
          status TEXT NOT NULL CHECK(status IN('proposed','active','blocked','done','archived')),
          confidence INTEGER, start_at INTEGER, target_end_at INTEGER
        );

        -- Create Tag table
        CREATE TABLE IF NOT EXISTS tag(
          id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
          name TEXT NOT NULL, color TEXT, UNIQUE(space_id, name)
        );

        -- Create Note Tags table
        CREATE TABLE IF NOT EXISTS note_tags(
          note_id TEXT REFERENCES note(id),
          tag_id TEXT REFERENCES tag(id),
          PRIMARY KEY(note_id, tag_id)
        );

        -- Create Task Tags table
        CREATE TABLE IF NOT EXISTS task_tags(
          task_id TEXT REFERENCES task(id),
          tag_id TEXT REFERENCES tag(id),
          PRIMARY KEY(task_id, tag_id)
        );

        -- Update Task table schema (recreate to add missing columns)
        CREATE TABLE IF NOT EXISTS task_new (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL REFERENCES space(id),
          note_id TEXT REFERENCES note(id),
          project_id TEXT REFERENCES project(id),
          parent_task_id TEXT REFERENCES task(id),
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL CHECK(status IN('inbox','next','in_progress','waiting','done','cancelled')),
          due_at INTEGER,
          start_at INTEGER,
          completed_at INTEGER DEFAULT NULL,
          priority INTEGER CHECK(priority BETWEEN 1 AND 4),
          estimate_minutes INTEGER,
          recur_rule TEXT,
          context TEXT,
          area TEXT
        );

        -- Backfill Spaces (to prevent FK violations)
        -- Old data might have space_ids that don't exist in the new space table
        INSERT OR IGNORE INTO space (id, name, created_at, updated_at)
        SELECT DISTINCT space_id, 'Migrated Space ' || space_id, strftime('%s','now'), strftime('%s','now')
        FROM task WHERE space_id IS NOT NULL;

        INSERT OR IGNORE INTO space (id, name, created_at, updated_at)
        SELECT DISTINCT space_id, 'Migrated Space ' || space_id, strftime('%s','now'), strftime('%s','now')
        FROM note WHERE space_id IS NOT NULL;

        -- Backfill Projects (to prevent FK violations)
        INSERT OR IGNORE INTO project (id, space_id, title, status)
        SELECT DISTINCT project_id, space_id, 'Migrated Project', 'active'
        FROM task WHERE project_id IS NOT NULL;

        -- Migrate data from old task table
        INSERT INTO task_new (id, space_id, project_id, title, description, status, due_at, completed_at, priority)
        SELECT id, space_id, project_id, title, description,
               CASE WHEN status = 'todo' THEN 'next' ELSE status END,
               due_at, completed_at, priority
        FROM task;

        DROP TABLE task;
        ALTER TABLE task_new RENAME TO task;

        CREATE INDEX idx_task_due ON task(due_at) WHERE status IN('inbox','next','in_progress','waiting');
        CREATE INDEX idx_task_start ON task(start_at);

        -- Update Note table schema
        CREATE TABLE IF NOT EXISTS note_new (
          id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
          title TEXT NOT NULL DEFAULT '', content_md TEXT NOT NULL,
          created_at INTEGER NOT NULL, modified_at INTEGER NOT NULL,
          is_trashed INTEGER NOT NULL DEFAULT 0
        );

        -- Migrate note data
        INSERT INTO note_new (id, space_id, title, content_md, created_at, modified_at)
        SELECT id, space_id, title, content, created_at, updated_at
        FROM note;

        -- Migrate tags (rudimentary support for comma-separated tags in old schema)
        -- Note: SQLite doesn't have a built-in split function, so we do a best-effort migration
        -- assuming tags were stored as simple strings or we rely on the app to re-sync tags later.
        -- For this migration, we will assume 'tags' column in old note table was just a string.
        -- We have captured the tags in memory above and will re-insert them after schema update.

        DROP TABLE note;
        ALTER TABLE note_new RENAME TO note;

        CREATE INDEX idx_note_mod ON note(modified_at DESC);
      `);
      console.log('Migration v4 -> v5 schema update completed');

      // Now migrate the tags we captured
      if (oldTags.length > 0) {
        console.log('Migrating tags into new schema...');
        const tagMap = new Map<string, string>(); // spaceId:tagName -> tagId

        for (const item of oldTags) {
          const spaceId = item.space_id || 'default';
          // Simple comma split, assuming no complex CSV escaping was used
          const tagNames = item.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

          for (const tagName of tagNames) {
            const key = `${spaceId}:${tagName}`;
            let tagId = tagMap.get(key);

            if (!tagId) {
              // Check if tag exists in DB (could have been created by another note's migration loop)
              const existing = await db.getAllAsync<{ id: string }>(
                'SELECT id FROM tag WHERE space_id = ? AND name = ?',
                [spaceId, tagName],
              );
              if (existing && existing.length > 0) {
                tagId = existing[0].id;
              } else {
                // Generate a new ID. Since we don't have nanoid here easily without import issues in some envs,
                // we use a simple random string generator or UUID if available.
                // We can use a simple JS random string for this one-off migration.
                tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await db.runAsync('INSERT INTO tag (id, space_id, name) VALUES (?, ?, ?)', [tagId, spaceId, tagName]);
              }
              tagMap.set(key, tagId);
            }

            // Link note to tag
            await db.runAsync('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [item.id, tagId]);
          }
        }
        console.log('Tags migration completed');
      }
    } catch (error) {
      console.error('Migration v4 -> v5 failed:', error);
      await db.runAsync('ROLLBACK').catch(e => console.error('Rollback failed', e));
      throw error;
    }
    await db.execAsync('COMMIT');
  }

  // Migration from v5 to v6: Add FTS Triggers
  if (currentVersion < 6) {
    console.log('Running migration v5 -> v6: Adding FTS for Notes');
    try {
      await db.execAsync('BEGIN TRANSACTION');
      await db.execAsync(`
        CREATE VIRTUAL TABLE IF NOT EXISTS fts_note USING fts5(
          title, content_md, note_id UNINDEXED,
          tokenize='porter unicode61 remove_diacritics 2'
        );

        -- Rebuild from base table
        INSERT INTO fts_note(rowid, title, content_md, note_id)
        SELECT rowid, title, content_md, id FROM note;

        -- Triggers
        CREATE TRIGGER IF NOT EXISTS note_ai AFTER INSERT ON note BEGIN
          INSERT INTO fts_note(rowid, title, content_md, note_id)
          VALUES (new.rowid, new.title, new.content_md, new.id);
        END;

        CREATE TRIGGER IF NOT EXISTS note_ad AFTER DELETE ON note BEGIN
          DELETE FROM fts_note WHERE rowid = old.rowid;
        END;

        CREATE TRIGGER IF NOT EXISTS note_au AFTER UPDATE ON note BEGIN
          DELETE FROM fts_note WHERE rowid = old.rowid;
          INSERT INTO fts_note(rowid, title, content_md, note_id)
          VALUES (new.rowid, new.title, new.content_md, new.id);
        END;
      `);
      await db.execAsync('COMMIT');
      console.log('Migration v5 -> v6 completed successfully');
    } catch (error) {
      console.error('Migration v5 -> v6 failed:', error);
      await db.runAsync('ROLLBACK').catch(e => console.error('Rollback failed', e));
      throw error;
    }
  }

  // Update database version
  await AsyncStorage.setItem(DB_VERSION_KEY, CURRENT_DB_VERSION.toString());
  console.log(`Database migrated to version ${CURRENT_DB_VERSION}`);
}

export const initializeDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('noteece.db');

    // Initialize Rust JSI Bridge with the correct database path
    if (syncBridge.isJSIAvailable()) {
      try {
        // Construct the correct path for Rusqlite
        // FileSystem.documentDirectory includes 'file://' schema which we need to strip
        const docDirUri = FileSystem.documentDirectory;
        const docDir = docDirUri?.replace('file://', '') || '';

        // Platform specific path logic
        let dbPath = '';
        if (Platform.OS === 'ios') {
          // Expo SQLite on iOS puts files in 'SQLite' subdirectory of documents
          dbPath = `${docDir}SQLite/noteece.db`;
        } else {
          // On Android, we align with the memory that suggests /files/noteece.db
          // FileSystem.documentDirectory points to /files/
          dbPath = `${docDir}noteece.db`;
        }

        console.log(`[Database] Initializing SyncBridge with path: ${dbPath}`);
        await syncBridge.init(dbPath);
      } catch (e) {
        console.error('[Database] Failed to initialize SyncBridge:', e);
      }
    }

    // Get current database version
    const versionStr = await AsyncStorage.getItem(DB_VERSION_KEY);
    const currentVersion = versionStr ? parseInt(versionStr, 10) : 1;

    // Create tables (Base schema for fresh install - should match latest migration state)
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS space(
        id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT,
        enabled_modes_json TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS project(
        id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
        title TEXT NOT NULL, goal_outcome TEXT,
        status TEXT NOT NULL CHECK(status IN('proposed','active','blocked','done','archived')),
        confidence INTEGER, start_at INTEGER, target_end_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS note(
        id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
        title TEXT NOT NULL DEFAULT '', content_md TEXT NOT NULL,
        created_at INTEGER NOT NULL, modified_at INTEGER NOT NULL,
        is_trashed INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS task(
        id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
        note_id TEXT REFERENCES note(id), project_id TEXT REFERENCES project(id),
        parent_task_id TEXT REFERENCES task(id),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL CHECK(status IN('inbox','next','in_progress','waiting','done','cancelled')),
        due_at INTEGER, start_at INTEGER, completed_at INTEGER DEFAULT NULL,
        priority INTEGER CHECK(priority BETWEEN 1 AND 4),
        estimate_minutes INTEGER, recur_rule TEXT,
        context TEXT, area TEXT
      );

      CREATE TABLE IF NOT EXISTS tag(
        id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
        name TEXT NOT NULL, color TEXT, UNIQUE(space_id, name)
      );

      CREATE TABLE IF NOT EXISTS note_tags(note_id TEXT REFERENCES note(id), tag_id TEXT REFERENCES tag(id), PRIMARY KEY(note_id, tag_id));
      CREATE TABLE IF NOT EXISTS task_tags(task_id TEXT REFERENCES task(id), tag_id TEXT REFERENCES tag(id), PRIMARY KEY(task_id, tag_id));

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

      CREATE INDEX IF NOT EXISTS idx_task_due ON task(due_at) WHERE status IN('inbox','next','in_progress','waiting');
      CREATE INDEX IF NOT EXISTS idx_task_start ON task(start_at);
      CREATE INDEX IF NOT EXISTS idx_note_mod ON note(modified_at DESC);
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

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

// Helper functions for common queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dbQuery = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
  const database = getDatabase();
  const result = await database.getAllAsync<T>(sql, params);
  return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dbExecute = async (sql: string, params: any[] = []): Promise<void> => {
  const database = getDatabase();
  await database.runAsync(sql, params);
};
