use rusqlite::Connection;
use crate::sync::error::SyncError;

/// Initialize sync database tables
pub fn init_sync_tables(conn: &Connection) -> Result<(), SyncError> {
    // Device tracking table (device registry for discovery)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_state (
            device_id TEXT PRIMARY KEY,
            device_name TEXT NOT NULL,
            device_type TEXT NOT NULL,
            last_seen INTEGER NOT NULL,
            sync_address TEXT NOT NULL,
            sync_port INTEGER NOT NULL,
            protocol_version TEXT NOT NULL,
            trusted INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    // Sync history table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_history (
            id TEXT PRIMARY KEY,
            device_id TEXT NOT NULL,
            space_id TEXT NOT NULL,
            sync_time INTEGER NOT NULL,
            direction TEXT NOT NULL,
            entities_pushed INTEGER NOT NULL DEFAULT 0,
            entities_pulled INTEGER NOT NULL DEFAULT 0,
            conflicts_detected INTEGER NOT NULL DEFAULT 0,
            success INTEGER NOT NULL DEFAULT 1,
            error_message TEXT,
            FOREIGN KEY (device_id) REFERENCES sync_state(device_id)
        )",
        [],
    )?;

    // Sync conflicts table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_conflict (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            local_version BLOB,
            remote_version BLOB,
            conflict_type TEXT NOT NULL,
            detected_at INTEGER NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            resolved_at INTEGER,
            resolution TEXT,
            device_id TEXT NOT NULL,
            space_id TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES sync_state(device_id)
        )",
        [],
    )?;

    // Vector clock table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_vector_clock (
            space_id TEXT NOT NULL,
            device_id TEXT NOT NULL,
            clock_value INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (space_id, device_id)
        )",
        [],
    )?;

    // Entity sync log table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS entity_sync_log (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            synced_at INTEGER NOT NULL,
            device_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    Ok(())
}
