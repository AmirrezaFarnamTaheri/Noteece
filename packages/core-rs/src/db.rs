use chrono;
use rusqlite::{Connection, OptionalExtension, Result};
use thiserror::Error;

use serde_json;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Message: {0}")]
    Message(String),
    #[error("Serde JSON error: {0}")]
    SerdeJson(#[from] serde_json::Error),
}

/// Get a settings value by key
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, DbError> {
    let result: Option<String> = conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
            row.get(0)
        })
        .optional()?;
    Ok(result)
}

/// Get a settings value as an integer
pub fn get_setting_int(conn: &Connection, key: &str, default: i64) -> Result<i64, DbError> {
    match get_setting(conn, key)? {
        Some(value) => value
            .parse::<i64>()
            .map_err(|_| DbError::Message(format!("Invalid integer value for {}", key))),
        None => Ok(default),
    }
}

/// Set a settings value
pub fn set_setting(
    conn: &Connection,
    key: &str,
    value: &str,
    description: Option<&str>,
) -> Result<(), DbError> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value, description, updated_at, created_at)
         VALUES (?1, ?2, ?3, ?4, COALESCE((SELECT created_at FROM settings WHERE key = ?1), ?4))",
        rusqlite::params![key, value, description, now],
    )?;
    Ok(())
}

/// Get sync port setting (defaults to 8765)
/// Validates port is within valid TCP range (1-65535)
pub fn get_sync_port(conn: &Connection) -> Result<u16, DbError> {
    let port = get_setting_int(conn, "sync_port", 8765)?;

    // Validate port is within valid TCP range
    if port < 1 || port > 65535 {
        return Err(DbError::Message(format!(
            "Invalid sync_port value: {} (must be between 1 and 65535)",
            port
        )));
    }

    Ok(port as u16)
}

/// Set sync port setting
pub fn set_sync_port(conn: &Connection, port: u16) -> Result<(), DbError> {
    set_setting(
        conn,
        "sync_port",
        &port.to_string(),
        Some("Port for device-to-device sync"),
    )
}

/// Run database migrations to update the schema to the latest version.
/// This function is idempotent and checks the current version before applying changes.
pub fn migrate(conn: &mut Connection) -> Result<(), DbError> {
    log::info!("[db] Starting migration");
    let tx = conn.transaction()?;

    // Create schema_version table if it doesn't exist
    tx.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );
        ",
    )?;

    let current_version: i64 = {
        let mut stmt = tx.prepare("SELECT MAX(version) FROM schema_version")?;
        let mut rows = stmt.query([])?;
        match rows.next()? {
            Some(row) => row.get(0).unwrap_or(0),
            None => 0,
        }
    };
    log::info!("[db] Current schema version: {}", current_version);

    // Version 1: Initial Schema
    if current_version < 1 {
        log::info!("[db] Applying migration v1: Initial Schema");
        tx.execute_batch(
            "
            CREATE TABLE space(
              id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT,
              enabled_modes_json TEXT NOT NULL DEFAULT '[]',
              created_at INTEGER NOT NULL DEFAULT 0,
              updated_at INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE note(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              title TEXT NOT NULL DEFAULT '', content_md TEXT NOT NULL,
              created_at INTEGER NOT NULL, modified_at INTEGER NOT NULL,
              is_trashed INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE task(
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

            CREATE TABLE task_recur_exdate(
              task_id TEXT REFERENCES task(id), exdate INTEGER NOT NULL,
              PRIMARY KEY(task_id, exdate)
            );

            CREATE TABLE project(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              title TEXT NOT NULL, goal_outcome TEXT,
              status TEXT NOT NULL CHECK(status IN('proposed','active','blocked','done','archived')),
              confidence INTEGER, start_at INTEGER, target_end_at INTEGER
            );

            CREATE TABLE tag(
              id TEXT PRIMARY KEY, space_id TEXT NOT NULL REFERENCES space(id),
              name TEXT NOT NULL, color TEXT, UNIQUE(space_id, name)
            );

            CREATE TABLE note_tags(note_id TEXT REFERENCES note(id), tag_id TEXT REFERENCES tag(id), PRIMARY KEY(note_id, tag_id));
            CREATE TABLE task_tags(task_id TEXT REFERENCES task(id), tag_id TEXT REFERENCES tag(id), PRIMARY KEY(task_id, tag_id));

            CREATE TABLE link(source_note_id TEXT, target_note_id TEXT,
              PRIMARY KEY(source_note_id, target_note_id));

            CREATE TABLE note_meta(note_id TEXT, key TEXT, value TEXT,
              PRIMARY KEY(note_id, key));

            CREATE TABLE person(
              id TEXT PRIMARY KEY, space_id TEXT,
              name TEXT, email TEXT, org TEXT
            );

            CREATE TABLE task_people(task_id TEXT, person_id TEXT,
              PRIMARY KEY(task_id, person_id));

            CREATE TABLE project_milestone(
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
              title TEXT, due_at INTEGER, status TEXT
            );

            CREATE TABLE project_dependency(
              project_id TEXT NOT NULL REFERENCES project(id),
              depends_on_project_id TEXT NOT NULL REFERENCES project(id),
              PRIMARY KEY(project_id, depends_on_project_id)
            );

            CREATE TABLE project_risk(
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
              description TEXT, impact TEXT, likelihood TEXT, mitigation TEXT,
              owner_person_id TEXT REFERENCES person(id)
            );

            CREATE TABLE project_update(
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
              when_at INTEGER, health TEXT, summary TEXT
            );

            CREATE TABLE saved_search(
              id TEXT PRIMARY KEY, space_id TEXT REFERENCES space(id),
              title TEXT NOT NULL, query_string TEXT NOT NULL,
              scope TEXT NOT NULL CHECK(scope IN('note','project','space','vault_all'))
            );

            CREATE INDEX task_due   ON task(due_at)   WHERE status IN('inbox','next','in_progress','waiting');
            CREATE INDEX task_start ON task(start_at);
            CREATE INDEX note_mod   ON note(modified_at DESC);
            CREATE INDEX meta_kv    ON note_meta(key, value);

            CREATE VIRTUAL TABLE fts_note USING fts5(
              title, content_md, note_id UNINDEXED,
              tokenize='porter unicode61 remove_diacritics 2'
            );

            INSERT INTO schema_version (version) VALUES (1);
            ",
        )?;
    }
    if current_version < 2 {
        log::info!("[db] Migrating to version 2");
        tx.execute_batch(
            "
            CREATE TABLE knowledge_card (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL REFERENCES note(id),
                deck_id TEXT,
                state TEXT NOT NULL CHECK(state IN('new', 'learning', 'review', 'relearning')),
                due_at INTEGER NOT NULL,
                stability REAL NOT NULL,
                difficulty REAL NOT NULL,
                lapses INTEGER NOT NULL,
                revision_history_json TEXT NOT NULL
            );

            CREATE TABLE review_log (
                id TEXT PRIMARY KEY,
                card_id TEXT NOT NULL REFERENCES knowledge_card(id),
                review_at INTEGER NOT NULL,
                rating INTEGER NOT NULL,
                state TEXT NOT NULL,
                due_at INTEGER NOT NULL,
                stability REAL NOT NULL,
                difficulty REAL NOT NULL,
                lapses INTEGER NOT NULL
            );

            INSERT INTO schema_version (version) VALUES (2);
            ",
        )?;
    }
    if current_version < 3 {
        log::info!("[db] Migrating to version 3");
        tx.execute_batch(
            "
            CREATE TABLE space_people (
                space_id TEXT NOT NULL REFERENCES space(id),
                person_id TEXT NOT NULL REFERENCES person(id),
                role TEXT NOT NULL CHECK(role IN('owner', 'admin', 'member', 'guest')),
                PRIMARY KEY(space_id, person_id)
            );

            INSERT INTO schema_version (version) VALUES (3);
            ",
        )?;
    }
    if current_version < 4 {
        log::info!("[db] Migrating to version 4");
        tx.execute_batch(
            "
            CREATE TABLE form_template (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                name TEXT NOT NULL,
                fields_json TEXT NOT NULL
            );

            INSERT INTO schema_version (version) VALUES (4);
            ",
        )?;
    }
    if current_version < 5 {
        log::info!("[db] Migrating to version 5");
        tx.execute_batch(
            "
            CREATE TABLE time_entry (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                task_id TEXT REFERENCES task(id),
                project_id TEXT REFERENCES project(id),
                note_id TEXT REFERENCES note(id),
                description TEXT,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER,
                is_running INTEGER NOT NULL DEFAULT 0,
                CHECK(
                    (task_id IS NOT NULL AND project_id IS NULL AND note_id IS NULL) OR
                    (task_id IS NULL AND project_id IS NOT NULL AND note_id IS NULL) OR
                    (task_id IS NULL AND project_id IS NULL AND note_id IS NOT NULL)
                )
            );

            CREATE INDEX time_entry_task ON time_entry(task_id) WHERE task_id IS NOT NULL;
            CREATE INDEX time_entry_project ON time_entry(project_id) WHERE project_id IS NOT NULL;
            CREATE INDEX time_entry_started ON time_entry(started_at DESC);
            CREATE INDEX time_entry_running ON time_entry(is_running) WHERE is_running = 1;

            INSERT INTO schema_version (version) VALUES (5);
            ",
        )?;
    }
    if current_version < 6 {
        log::info!("[db] Migrating to version 6 - Social Media Suite");
        tx.execute_batch(
            "
            -- Social Media Accounts
            CREATE TABLE social_account (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                platform TEXT NOT NULL,
                username TEXT NOT NULL,
                display_name TEXT,
                encrypted_credentials TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                last_sync INTEGER,
                sync_frequency_minutes INTEGER NOT NULL DEFAULT 60,
                created_at INTEGER NOT NULL,
                UNIQUE(space_id, platform, username)
            );

            -- Social Posts/Content
            CREATE TABLE social_post (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL REFERENCES social_account(id) ON DELETE CASCADE,
                platform TEXT NOT NULL,
                platform_post_id TEXT,
                author TEXT NOT NULL,
                author_handle TEXT,
                content TEXT,
                content_html TEXT,
                media_urls_json TEXT,
                timestamp INTEGER NOT NULL,
                fetched_at INTEGER NOT NULL,
                likes INTEGER,
                shares INTEGER,
                comments INTEGER,
                views INTEGER,
                post_type TEXT,
                reply_to TEXT,
                raw_json TEXT NOT NULL,
                UNIQUE(account_id, platform_post_id)
            );

            -- Categories (user-defined cross-platform)
            CREATE TABLE social_category (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                name TEXT NOT NULL,
                color TEXT,
                icon TEXT,
                filters_json TEXT,
                created_at INTEGER NOT NULL,
                UNIQUE(space_id, name)
            );

            -- Post-Category Mapping
            CREATE TABLE social_post_category (
                post_id TEXT REFERENCES social_post(id) ON DELETE CASCADE,
                category_id TEXT REFERENCES social_category(id) ON DELETE CASCADE,
                assigned_at INTEGER NOT NULL,
                assigned_by TEXT,
                PRIMARY KEY(post_id, category_id)
            );

            -- Full-text search for social content
            CREATE VIRTUAL TABLE social_post_fts USING fts5(
                content,
                author,
                post_id UNINDEXED,
                tokenize='porter unicode61 remove_diacritics 2'
            );

            -- Triggers to maintain FTS index automatically
            CREATE TRIGGER social_post_ai AFTER INSERT ON social_post BEGIN
                INSERT INTO social_post_fts(rowid, content, author, post_id)
                VALUES (new.rowid, COALESCE(new.content, ''), COALESCE(new.author, ''), new.id);
            END;

            CREATE TRIGGER social_post_ad AFTER DELETE ON social_post BEGIN
                DELETE FROM social_post_fts WHERE rowid = old.rowid;
            END;

            CREATE TRIGGER social_post_au AFTER UPDATE ON social_post BEGIN
                DELETE FROM social_post_fts WHERE rowid = old.rowid;
                INSERT INTO social_post_fts(rowid, content, author, post_id)
                VALUES (new.rowid, COALESCE(new.content, ''), COALESCE(new.author, ''), new.id);
            END;

            -- Sync history
            CREATE TABLE social_sync_history (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL REFERENCES social_account(id) ON DELETE CASCADE,
                sync_time INTEGER NOT NULL,
                posts_synced INTEGER NOT NULL DEFAULT 0,
                sync_duration_ms INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending', 'in_progress', 'completed', 'failed')),
                error_message TEXT
            );

            -- WebView Sessions (for multi-account management)
            CREATE TABLE social_webview_session (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL REFERENCES social_account(id) ON DELETE CASCADE,
                platform TEXT NOT NULL,
                cookies TEXT,
                session_data TEXT,
                created_at INTEGER NOT NULL,
                last_used INTEGER NOT NULL
            );

            -- Auto-categorization rules
            CREATE TABLE social_auto_rule (
                id TEXT PRIMARY KEY,
                category_id TEXT NOT NULL REFERENCES social_category(id) ON DELETE CASCADE,
                rule_type TEXT NOT NULL CHECK(rule_type IN('author_contains', 'content_contains', 'platform_equals', 'hashtag_contains', 'url_contains')),
                pattern TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL
            );

            -- Focus modes
            CREATE TABLE social_focus_mode (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                is_active INTEGER NOT NULL DEFAULT 0,
                blocked_platforms TEXT NOT NULL,
                allowed_platforms TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            -- Automation rules
            CREATE TABLE social_automation_rule (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                trigger_type TEXT NOT NULL CHECK(trigger_type IN('time_of_day', 'day_of_week', 'platform_open', 'category_post')),
                trigger_value TEXT NOT NULL,
                action_type TEXT NOT NULL CHECK(action_type IN('activate_focus_mode', 'disable_sync', 'send_notification', 'auto_categorize')),
                action_value TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            -- Indexes for performance
            CREATE INDEX idx_social_post_account ON social_post(account_id, timestamp DESC);
            CREATE INDEX idx_social_post_platform ON social_post(platform, timestamp DESC);
            CREATE INDEX idx_social_post_timestamp ON social_post(timestamp DESC);
            CREATE INDEX idx_social_sync_history ON social_sync_history(account_id, sync_time DESC);
            CREATE INDEX idx_social_account_space ON social_account(space_id, enabled);
            CREATE INDEX idx_social_category_space ON social_category(space_id);
            CREATE INDEX idx_social_auto_rule_category ON social_auto_rule(category_id, priority DESC);

            INSERT INTO schema_version (version) VALUES (6);
            ",
        )?;
    }

    if current_version < 7 {
        log::info!("[db] Migrating to version 7 - Authentication System");
        tx.execute_batch(
            "
            -- Users table for authentication
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER,
                last_login_at INTEGER
            );

            -- Create indexes for user lookup
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

            -- Sessions table for session management
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            -- Create indexes for session lookup
            CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

            INSERT INTO schema_version (version) VALUES (7);
            ",
        )?;
    }

    if current_version < 8 {
        log::info!("[db] Migrating to version 8 - Settings");
        tx.execute_batch(
            "
            -- Application Settings
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );

            -- Create index for lookup
            CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

            -- Insert default sync port setting
            INSERT OR IGNORE INTO settings (key, value, description, created_at, updated_at)
            VALUES ('sync_port', '8765', 'Port for device-to-device sync',
                    strftime('%s', 'now'), strftime('%s', 'now'));

            INSERT INTO schema_version (version) VALUES (8);
            ",
        )?;
    }

    if current_version < 9 {
        log::info!("[db] Migrating to version 9 - Update task.completed_at to use NULL");
        tx.execute_batch(
                "
                -- Step 1: Create a new table with the desired schema
                CREATE TABLE task_new (
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

                -- Step 2: Copy data from the old table to the new table, converting 0 to NULL
                INSERT INTO task_new (id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area)
                SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at,
                       CASE WHEN completed_at = 0 THEN NULL ELSE completed_at END,
                       priority, estimate_minutes, recur_rule, context, area
                FROM task;

                -- Step 3: Drop the old table
                DROP TABLE task;

                -- Step 4: Rename the new table to the original table name
                ALTER TABLE task_new RENAME TO task;

                -- Recreate indexes on the new table
                CREATE INDEX task_due   ON task(due_at)   WHERE status IN('inbox','next','in_progress','waiting');
                CREATE INDEX task_start ON task(start_at);

                INSERT INTO schema_version (version) VALUES (9);
                "
            )?;
    }

    if current_version < 10 {
        log::info!("[db] Migrating to version 10 - Sync Tables");
        tx.execute_batch(
            "
                CREATE TABLE sync_history (
                    id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    space_id TEXT NOT NULL REFERENCES space(id),
                    sync_time INTEGER NOT NULL,
                    direction TEXT NOT NULL,
                    entities_pushed INTEGER NOT NULL,
                    entities_pulled INTEGER NOT NULL,
                    conflicts_detected INTEGER NOT NULL,
                    success INTEGER NOT NULL,
                    error_message TEXT
                );

                CREATE TABLE sync_conflict (
                    id TEXT PRIMARY KEY,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    local_version BLOB NOT NULL,
                    remote_version BLOB NOT NULL,
                    conflict_type TEXT NOT NULL,
                    detected_at INTEGER NOT NULL,
                    resolved INTEGER NOT NULL,
                    resolved_at INTEGER,
                    device_id TEXT NOT NULL,
                    space_id TEXT NOT NULL REFERENCES space(id)
                );
                ",
        )?;
    }

    if current_version < 11 {
        log::info!("[db] Migrating to version 11 - Health, Music, and Calendar");
        tx.execute_batch(
            "
            -- Health Metrics
            CREATE TABLE IF NOT EXISTS health_metric (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                note_id TEXT REFERENCES note(id),
                metric_type TEXT NOT NULL,
                value REAL NOT NULL,
                unit TEXT,
                notes TEXT,
                recorded_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_health_metric_type ON health_metric(metric_type);
            CREATE INDEX IF NOT EXISTS idx_health_metric_recorded ON health_metric(recorded_at);

            -- Music Tracks
            CREATE TABLE IF NOT EXISTS track (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
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
                space_id TEXT NOT NULL REFERENCES space(id),
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
                playlist_id TEXT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
                track_id TEXT NOT NULL REFERENCES track(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                added_at INTEGER NOT NULL,
                PRIMARY KEY(playlist_id, track_id)
            );

            -- Calendar Events (Sync support)
            CREATE TABLE IF NOT EXISTS calendar_event (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                title TEXT NOT NULL,
                description TEXT,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                location TEXT,
                source TEXT NOT NULL,
                color TEXT,
                all_day INTEGER NOT NULL DEFAULT 0,
                recurrence_rule TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                synced_at INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_calendar_event_start ON calendar_event(start_time);

            INSERT INTO schema_version (version) VALUES (11);
            ",
        )?;
    }

    if current_version < 12 {
        log::info!("[db] Migrating to version 12 - Goals and Habits");
        tx.execute_batch(
            "
            -- Goals
            CREATE TABLE IF NOT EXISTS goal (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                title TEXT NOT NULL,
                description TEXT,
                target REAL NOT NULL,
                current REAL NOT NULL DEFAULT 0.0,
                unit TEXT,
                category TEXT,
                start_date INTEGER NOT NULL,
                target_date INTEGER,
                is_completed INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_goal_space ON goal(space_id);

            -- Habits
            CREATE TABLE IF NOT EXISTS habit (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                name TEXT NOT NULL,
                description TEXT,
                frequency TEXT NOT NULL,
                target_days_per_week INTEGER NOT NULL DEFAULT 7,
                streak INTEGER NOT NULL DEFAULT 0,
                longest_streak INTEGER NOT NULL DEFAULT 0,
                last_completed_at INTEGER,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_habit_space ON habit(space_id);

            -- Habit Logs (for history)
            CREATE TABLE IF NOT EXISTS habit_log (
                id TEXT PRIMARY KEY,
                habit_id TEXT NOT NULL REFERENCES habit(id) ON DELETE CASCADE,
                completed_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_habit_log_habit ON habit_log(habit_id, completed_at);

            INSERT INTO schema_version (version) VALUES (12);
            ",
        )?;
    }

    if current_version < 13 {
        log::info!("[db] Migrating to version 13 - LLM Cache (Official)");
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS llm_cache (
                cache_key TEXT PRIMARY KEY,
                request_json TEXT NOT NULL,
                response_json TEXT NOT NULL,
                model TEXT NOT NULL,
                tokens_used INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                last_accessed INTEGER NOT NULL,
                access_count INTEGER NOT NULL DEFAULT 1
            );
            CREATE INDEX IF NOT EXISTS idx_llm_cache_accessed ON llm_cache(last_accessed);

            INSERT INTO schema_version (version) VALUES (13);
            ",
        )?;
    }

    if current_version < 14 {
        log::info!("[db] Migrating to version 14 - Audit Logs");
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                event_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                details_json TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
            CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);

            INSERT INTO schema_version (version) VALUES (14);
            ",
        )?;
    }

    if current_version < 15 {
        log::info!("[db] Migrating to version 15 - Add updated_at to Task/Project");
        tx.execute_batch(
            "
            ALTER TABLE task ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE project ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

            -- Update existing records to set updated_at to now (approx) or 0
            UPDATE task SET updated_at = strftime('%s', 'now');
            UPDATE project SET updated_at = strftime('%s', 'now');

            INSERT INTO schema_version (version) VALUES (15);
            ",
        )?;
    }

    if current_version < 16 {
        log::info!("[db] Migrating to version 16 - Insights");
        tx.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS insight (
                id TEXT PRIMARY KEY,
                space_id TEXT NOT NULL REFERENCES space(id),
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                insight_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                context_json TEXT NOT NULL,
                suggested_actions_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                dismissed INTEGER NOT NULL DEFAULT 0,
                feedback_useful INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_insight_space ON insight(space_id, dismissed);

            INSERT INTO schema_version (version) VALUES (16);
            ",
        )?;
    }

    // Run Personal Modes Initialization (Idempotent)
    crate::personal_modes::init_personal_modes_tables(&tx)?;

    tx.commit()?;
    log::info!("[db] Migration finished");
    Ok(())
}

/// Get or create a unique user ID for this vault
pub fn get_or_create_user_id(conn: &Connection) -> Result<String, DbError> {
    let setting_key = "user_id";
    match get_setting(conn, setting_key)? {
        Some(user_id) => {
            log::info!("[db] Found user ID: {}", user_id);
            Ok(user_id)
        }
        None => {
            let new_user_id = Ulid::new().to_string();
            log::info!("[db] No user ID found, creating new one: {}", new_user_id);
            set_setting(
                conn,
                setting_key,
                &new_user_id,
                Some("Unique identifier for this vault's user."),
            )?;
            Ok(new_user_id)
        }
    }
}

pub fn init_llm_tables(_conn: &Connection) -> Result<(), DbError> {
    // Implemented via migration v13, keeping stub for backward compatibility if any
    Ok(())
}
