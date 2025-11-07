use rusqlite::{Connection, Result};
use thiserror::Error;

use serde_json;

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Message: {0}")]
    Message(String),
    #[error("Serde JSON error: {0}")]
    SerdeJson(#[from] serde_json::Error),
}

pub fn migrate(conn: &mut Connection) -> Result<(), DbError> {
    log::info!("[db] Starting migration");
    let tx = conn.transaction()?;

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

    if current_version < 1 {
        log::info!("[db] Migrating to version 1");
        tx.execute_batch(
            "
            CREATE TABLE space(
              id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT,
              enabled_modes_json TEXT NOT NULL DEFAULT '[]'
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
              due_at INTEGER, start_at INTEGER, completed_at INTEGER,
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
    tx.commit()?;
    log::info!("[db] Migration finished");
    Ok(())
}
