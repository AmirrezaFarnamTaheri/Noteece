use crate::caldav::error::CalDavError;
use rusqlite::Connection;

/// Initialize CalDAV tables
pub fn init_caldav_tables(conn: &Connection) -> Result<(), CalDavError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_account (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            username TEXT NOT NULL,
            encrypted_password TEXT NOT NULL,
            calendar_path TEXT NOT NULL,
            sync_token TEXT,
            last_sync INTEGER,
            enabled INTEGER NOT NULL DEFAULT 1,
            auto_sync INTEGER NOT NULL DEFAULT 1,
            sync_frequency_minutes INTEGER NOT NULL DEFAULT 15,
            sync_direction TEXT NOT NULL DEFAULT 'bidirectional',
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_event_mapping (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            caldav_uid TEXT NOT NULL,
            local_task_id TEXT,
            local_note_id TEXT,
            etag TEXT,
            last_synced INTEGER NOT NULL,
            FOREIGN KEY (account_id) REFERENCES caldav_account(id) ON DELETE CASCADE,
            UNIQUE(account_id, caldav_uid)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_sync_history (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            sync_time INTEGER NOT NULL,
            direction TEXT NOT NULL,
            events_pulled INTEGER NOT NULL DEFAULT 0,
            events_pushed INTEGER NOT NULL DEFAULT 0,
            conflicts INTEGER NOT NULL DEFAULT 0,
            success INTEGER NOT NULL DEFAULT 1,
            error_message TEXT,
            FOREIGN KEY (account_id) REFERENCES caldav_account(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_conflict (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            event_uid TEXT NOT NULL,
            local_version_json TEXT NOT NULL,
            remote_version_json TEXT NOT NULL,
            detected_at INTEGER NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            resolution TEXT,
            resolved_at INTEGER,
            FOREIGN KEY (account_id) REFERENCES caldav_account(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_caldav_event_mapping_account ON caldav_event_mapping(account_id)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_caldav_sync_history_account ON caldav_sync_history(account_id, sync_time DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_caldav_conflict_resolved ON caldav_conflict(account_id, resolved)",
        [],
    )?;

    Ok(())
}
