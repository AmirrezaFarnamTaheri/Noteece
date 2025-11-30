pub mod materialized_views;
pub mod migrations;
pub mod pragma_tuning;
pub mod vault_backup;

use chrono;
use rusqlite::{Connection, OptionalExtension, Result};
use serde_json;
use thiserror::Error;
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
    if !(1..=65535).contains(&port) {
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
    migrations::migrate(conn)
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

// Re-export vault backup functions
pub use vault_backup::{
    get_vault_backup, has_valid_backup, init_vault_backup_table, recover_from_backup,
    store_vault_backup, verify_vault_backup, VaultConfigBackup,
};

// Re-export pragma tuning
pub use pragma_tuning::{DatabaseStats, DeviceProfile, PragmaConfig, PragmaTuner};

// Re-export materialized views
pub use materialized_views::{
    get_dashboard_stats, init_materialized_views, refresh_all_dashboard_stats,
    refresh_dashboard_stats, DashboardStats,
};

/// Type alias for r2d2 connection pool with Sqlite
pub type DbPool = r2d2::Pool<r2d2_sqlite::SqliteConnectionManager>;
