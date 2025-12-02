//! Vault Backup Module
//!
//! Provides redundant storage of critical vault configuration (salt, wrapped DEK)
//! to prevent data loss if config.json is corrupted or deleted.

use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

/// Reserved table name for vault configuration backup
const VAULT_CONFIG_TABLE: &str = "_noteece_vault_config";

/// Configuration backup stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultConfigBackup {
    pub salt: Vec<u8>,
    pub wrapped_dek: Vec<u8>,
    pub version: u32,
    pub created_at: i64,
    pub last_verified: i64,
}

/// Initialize the vault config backup table
pub fn init_vault_backup_table(conn: &Connection) -> Result<()> {
    conn.execute(
        &format!(
            "CREATE TABLE IF NOT EXISTS {} (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                salt BLOB NOT NULL,
                wrapped_dek BLOB NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                last_verified INTEGER NOT NULL
            )",
            VAULT_CONFIG_TABLE
        ),
        [],
    )?;

    log::info!("[vault_backup] Backup table initialized");
    Ok(())
}

/// Store vault configuration backup in SQLite
/// This provides redundancy in case config.json is lost
pub fn store_vault_backup(conn: &Connection, salt: &[u8], wrapped_dek: &[u8]) -> Result<()> {
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        &format!(
            "INSERT OR REPLACE INTO {} (id, salt, wrapped_dek, version, created_at, last_verified)
             VALUES (1, ?1, ?2, 1, ?3, ?3)",
            VAULT_CONFIG_TABLE
        ),
        params![salt, wrapped_dek, now],
    )?;

    log::info!("[vault_backup] Vault configuration backed up to database");
    Ok(())
}

/// Retrieve vault configuration backup from SQLite
pub fn get_vault_backup(conn: &Connection) -> Result<Option<VaultConfigBackup>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT salt, wrapped_dek, version, created_at, last_verified 
         FROM {} WHERE id = 1",
        VAULT_CONFIG_TABLE
    ))?;

    let result = stmt.query_row([], |row| {
        Ok(VaultConfigBackup {
            salt: row.get(0)?,
            wrapped_dek: row.get(1)?,
            version: row.get(2)?,
            created_at: row.get(3)?,
            last_verified: row.get(4)?,
        })
    });

    match result {
        Ok(backup) => Ok(Some(backup)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Verify that the backup matches the provided configuration
pub fn verify_vault_backup(conn: &Connection, salt: &[u8], wrapped_dek: &[u8]) -> Result<bool> {
    let backup = get_vault_backup(conn)?;

    match backup {
        Some(b) => {
            let matches = b.salt == salt && b.wrapped_dek == wrapped_dek;

            if matches {
                // Update last_verified timestamp
                let now = chrono::Utc::now().timestamp();
                conn.execute(
                    &format!(
                        "UPDATE {} SET last_verified = ?1 WHERE id = 1",
                        VAULT_CONFIG_TABLE
                    ),
                    params![now],
                )?;
            } else {
                log::warn!("[vault_backup] Backup mismatch detected!");
            }

            Ok(matches)
        }
        None => {
            log::warn!("[vault_backup] No backup found");
            Ok(false)
        }
    }
}

/// Recover vault configuration from backup
/// Returns (salt, wrapped_dek) if backup exists
pub fn recover_from_backup(conn: &Connection) -> Result<Option<(Vec<u8>, Vec<u8>)>> {
    let backup = get_vault_backup(conn)?;

    match backup {
        Some(b) => {
            log::info!(
                "[vault_backup] Recovered configuration from backup (created: {})",
                b.created_at
            );
            Ok(Some((b.salt, b.wrapped_dek)))
        }
        None => {
            log::error!("[vault_backup] No backup available for recovery");
            Ok(None)
        }
    }
}

/// Check if vault backup exists and is valid
pub fn has_valid_backup(conn: &Connection) -> Result<bool> {
    let backup = get_vault_backup(conn)?;
    Ok(backup.is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        init_vault_backup_table(&conn).unwrap();
        conn
    }

    #[test]
    fn test_store_and_retrieve_backup() {
        let conn = setup_test_db();

        let salt = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        let wrapped_dek = vec![100, 101, 102, 103];

        store_vault_backup(&conn, &salt, &wrapped_dek).expect("Store failed");

        let backup = get_vault_backup(&conn).expect("Get backup failed").unwrap();
        assert_eq!(backup.salt, salt);
        assert_eq!(backup.wrapped_dek, wrapped_dek);
        assert_eq!(backup.version, 1);
    }

    #[test]
    fn test_verify_backup() {
        let conn = setup_test_db();

        let salt = vec![1, 2, 3, 4];
        let wrapped_dek = vec![5, 6, 7, 8];

        store_vault_backup(&conn, &salt, &wrapped_dek).expect("Store failed");

        // Correct verification
        assert!(verify_vault_backup(&conn, &salt, &wrapped_dek).expect("Verify failed"));

        // Wrong salt
        let wrong_salt = vec![9, 10, 11, 12];
        assert!(!verify_vault_backup(&conn, &wrong_salt, &wrapped_dek).expect("Verify failed"));
    }

    #[test]
    fn test_recover_from_backup() {
        let conn = setup_test_db();

        // No backup yet
        assert!(recover_from_backup(&conn)
            .expect("Recover failed")
            .is_none());

        // Store backup
        let salt = vec![1, 2, 3, 4];
        let wrapped_dek = vec![5, 6, 7, 8];
        store_vault_backup(&conn, &salt, &wrapped_dek).expect("Store failed");

        // Recover
        let (recovered_salt, recovered_dek) =
            recover_from_backup(&conn).expect("Recover failed").unwrap();
        assert_eq!(recovered_salt, salt);
        assert_eq!(recovered_dek, wrapped_dek);
    }
}
