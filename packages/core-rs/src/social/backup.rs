use chrono;
/// Backup and Restore Module for SocialHub
/// Provides encrypted backup and restore functionality to prevent data loss
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum BackupError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Encryption error: {0}")]
    Encryption(String),

    #[error("Invalid backup: {0}")]
    InvalidBackup(String),

    #[error("Restore failed: {0}")]
    RestoreFailed(String),

    #[error("Backup not found")]
    BackupNotFound,

    #[error("Backup corrupted")]
    BackupCorrupted,
}

/// Metadata for a backup
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    /// Backup creation timestamp (ISO 8601)
    pub created_at: String,

    /// Database version at backup time
    pub schema_version: i64,

    /// Noteece application version
    pub app_version: String,

    /// Size of backup in bytes
    pub size_bytes: u64,

    /// Hash of backup for integrity check
    pub checksum: String,

    /// Description provided by user
    pub description: Option<String>,

    /// Whether backup is encrypted
    pub encrypted: bool,
}

/// Complete backup containing all data
#[derive(Debug, Serialize, Deserialize)]
pub struct Backup {
    pub metadata: BackupMetadata,
    pub data: Vec<u8>, // Encrypted backup data
}

/// Backup service for managing database snapshots
pub struct BackupService {
    backup_dir: PathBuf,
}

impl BackupService {
    /// Create a new backup service with specified directory
    pub fn new(backup_dir: impl AsRef<Path>) -> Result<Self, BackupError> {
        let backup_dir = backup_dir.as_ref().to_path_buf();

        // Create backup directory if it doesn't exist
        if !backup_dir.exists() {
            fs::create_dir_all(&backup_dir)?;
        }

        Ok(BackupService { backup_dir })
    }

    /// Create an encrypted backup of the database
    pub fn create_backup(
        &self,
        conn: &Connection,
        dek: &[u8],
        description: Option<&str>,
    ) -> Result<String, BackupError> {
        // Get database version
        let schema_version: i64 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
                row.get(0)
            })
            .unwrap_or(0);

        // Create timestamp for backup filename
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let backup_id = format!("backup_{}", timestamp);

        // Backup filename: backup_20251108_143022.json.enc
        let backup_path = self.backup_dir.join(format!("{}.json.enc", backup_id));

        // Serialize all tables to JSON
        let backup_data = self.export_database(conn)?;

        // Encrypt the backup data
        let encrypted_data = crate::crypto::encrypt_bytes(&backup_data, dek)
            .map_err(|e| BackupError::Encryption(e.to_string()))?;

        // Create checksum for integrity verification
        let checksum = self.calculate_checksum(&encrypted_data);

        // Create metadata
        let metadata = BackupMetadata {
            created_at: chrono::Utc::now().to_rfc3339(),
            schema_version,
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            size_bytes: encrypted_data.len() as u64,
            checksum: checksum.clone(),
            description: description.map(|s| s.to_string()),
            encrypted: true,
        };

        // Create backup object
        let backup = Backup {
            metadata,
            data: encrypted_data,
        };

        // Write to disk
        fs::write(&backup_path, serde_json::to_vec(&backup)?)?;

        log::info!(
            "[backup] Created backup: {} ({} bytes)",
            backup_id,
            backup.metadata.size_bytes
        );

        Ok(backup_id)
    }

    /// Restore database from encrypted backup
    pub fn restore_backup(
        &self,
        backup_id: &str,
        conn: &mut Connection,
        dek: &[u8],
    ) -> Result<(), BackupError> {
        let backup_path = self.backup_dir.join(format!("{}.json.enc", backup_id));

        // Check if backup exists
        if !backup_path.exists() {
            return Err(BackupError::BackupNotFound);
        }

        // Read backup file
        let backup_bytes = fs::read(&backup_path)?;
        let backup: Backup =
            serde_json::from_slice(&backup_bytes).map_err(|_| BackupError::BackupCorrupted)?;

        // Verify checksum
        let calculated_checksum = self.calculate_checksum(&backup.data);
        if calculated_checksum != backup.metadata.checksum {
            return Err(BackupError::BackupCorrupted);
        }

        // Decrypt backup data
        let decrypted_data = crate::crypto::decrypt_bytes(&backup.data, dek)
            .map_err(|e| BackupError::Encryption(e.to_string()))?;

        // Parse JSON
        let backup_json: serde_json::Value = serde_json::from_slice(&decrypted_data)?;

        // Create backup of current database before restore
        let _pre_restore_backup = self.create_backup(conn, dek, Some("pre_restore_backup"))?;

        // Perform clear and restore in a single atomic transaction to prevent data loss
        let tx = conn.transaction().map_err(|e| {
            BackupError::RestoreFailed(format!("Failed to start transaction: {}", e))
        })?;

        // Clear current database (inside transaction)
        self.clear_database_tx(&tx)?;

        // Restore data from backup (inside transaction, without creating a nested tx)
        self.import_database_tx(&tx, &backup_json)?;

        // Commit the transaction atomically
        tx.commit().map_err(|e| {
            BackupError::RestoreFailed(format!("Failed to commit restore transaction: {}", e))
        })?;

        log::info!("[backup] Restored backup: {}", backup_id);

        Ok(())
    }

    /// List all available backups
    pub fn list_backups(&self) -> Result<Vec<(String, BackupMetadata)>, BackupError> {
        let mut backups = Vec::new();

        // Read backup directory
        for entry in fs::read_dir(&self.backup_dir)? {
            let entry = entry?;
            let path = entry.path();

            // Only process .enc files
            if path.extension().and_then(|s| s.to_str()) == Some("enc") {
                if let Ok(bytes) = fs::read(&path) {
                    if let Ok(backup) = serde_json::from_slice::<Backup>(&bytes) {
                        let backup_id = path
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("unknown")
                            .to_string();

                        backups.push((backup_id, backup.metadata));
                    }
                }
            }
        }

        // Sort by creation date (newest first)
        backups.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));

        Ok(backups)
    }

    /// Delete a backup file
    pub fn delete_backup(&self, backup_id: &str) -> Result<(), BackupError> {
        let backup_path = self.backup_dir.join(format!("{}.json.enc", backup_id));

        if backup_path.exists() {
            fs::remove_file(&backup_path)?;
            log::info!("[backup] Deleted backup: {}", backup_id);
        }

        Ok(())
    }

    /// Get backup details
    pub fn get_backup_details(&self, backup_id: &str) -> Result<BackupMetadata, BackupError> {
        let backups = self.list_backups()?;

        backups
            .into_iter()
            .find(|(id, _)| id == backup_id)
            .map(|(_, metadata)| metadata)
            .ok_or(BackupError::BackupNotFound)
    }

    // Private helper methods

    /// Export database to JSON format
    fn export_database(&self, conn: &Connection) -> Result<Vec<u8>, BackupError> {
        let mut export = serde_json::json!({
            "version": 1,
            "tables": {}
        });

        // Tables to backup (all social-related tables)
        let tables = vec![
            "social_account",
            "social_post",
            "social_category",
            "social_post_category",
            "social_sync_history",
            "social_auto_rule",
            "social_auto_rule_action",
            "social_focus_mode",
        ];

        for table in tables {
            let mut stmt = conn.prepare(&format!("SELECT * FROM {}", table))?;
            let col_count = stmt.column_count();
            let col_names: Vec<String> = (0..col_count)
                .map(|i| stmt.column_name(i).unwrap_or("unknown").to_string())
                .collect();

            let rows = stmt.query_map([], |row| {
                let mut obj = serde_json::Map::new();
                for (i, col_name) in col_names.iter().enumerate() {
                    // Try to get value as different types
                    if let Ok(val) = row.get::<_, String>(i) {
                        obj.insert(col_name.clone(), serde_json::json!(val));
                    } else if let Ok(val) = row.get::<_, i64>(i) {
                        obj.insert(col_name.clone(), serde_json::json!(val));
                    } else if let Ok(val) = row.get::<_, f64>(i) {
                        obj.insert(col_name.clone(), serde_json::json!(val));
                    } else {
                        obj.insert(col_name.clone(), serde_json::Value::Null);
                    }
                }
                Ok(serde_json::Value::Object(obj))
            })?;

            let mut table_data = Vec::new();
            for data in rows.flatten() {
                table_data.push(data);
            }

            export["tables"][table] = serde_json::json!(table_data);
        }

        Ok(serde_json::to_vec(&export)?)
    }

    /// Clear all social-related tables within a transaction
    fn clear_database_tx(&self, tx: &rusqlite::Transaction) -> Result<(), BackupError> {
        let tables = vec![
            "social_post_category", // Must delete junction table first
            "social_auto_rule_action",
            "social_auto_rule",
            "social_post",
            "social_category",
            "social_focus_mode",
            "social_sync_history",
            "social_account",
        ];

        for table in tables {
            tx.execute(&format!("DELETE FROM {}", table), [])?;
        }

        Ok(())
    }

    /// Import database from JSON format within a transaction
    /// CRITICAL: Uses owned rusqlite::types::Value to avoid dangling references
    fn import_database_tx(
        &self,
        tx: &rusqlite::Transaction,
        data: &serde_json::Value,
    ) -> Result<(), BackupError> {
        use rusqlite::types::Value as SqlValue;

        let tables = data
            .get("tables")
            .ok_or(BackupError::InvalidBackup("No tables found".to_string()))?;

        let tables_obj = tables.as_object().ok_or(BackupError::InvalidBackup(
            "Invalid tables object".to_string(),
        ))?;

        // Import each table
        for (table_name, rows_val) in tables_obj {
            let rows = rows_val
                .as_array()
                .ok_or(BackupError::InvalidBackup("Invalid rows".to_string()))?;

            for row in rows {
                let obj = row
                    .as_object()
                    .ok_or(BackupError::InvalidBackup("Invalid row object".to_string()))?;

                let cols: Vec<&String> = obj.keys().collect();
                let col_names = cols
                    .iter()
                    .map(|s| s.as_str())
                    .collect::<Vec<_>>()
                    .join(",");
                let placeholders = (0..cols.len()).map(|_| "?").collect::<Vec<_>>().join(",");

                let query = format!(
                    "INSERT INTO {} ({}) VALUES ({})",
                    table_name, col_names, placeholders
                );

                let mut stmt = tx
                    .prepare(&query)
                    .map_err(|e| BackupError::RestoreFailed(e.to_string()))?;

                // Build owned SQLite values to ensure lifetimes are valid and no dangling references
                let mut values: Vec<SqlValue> = Vec::with_capacity(cols.len());
                for col in &cols {
                    let val = &obj[*col];
                    let sql_val = match val {
                        serde_json::Value::String(s) => SqlValue::from(s.clone()),
                        serde_json::Value::Number(n) => {
                            // Preserve numeric type precision
                            if let Some(i) = n.as_i64() {
                                SqlValue::from(i)
                            } else if let Some(f) = n.as_f64() {
                                SqlValue::from(f)
                            } else if let Some(u) = n.as_u64() {
                                // Coerce u64 to i64 if within range; otherwise, store as text
                                if u <= i64::MAX as u64 {
                                    SqlValue::from(u as i64)
                                } else {
                                    SqlValue::from(u.to_string())
                                }
                            } else {
                                SqlValue::Null
                            }
                        }
                        serde_json::Value::Bool(b) => SqlValue::from(if *b { 1i64 } else { 0i64 }),
                        serde_json::Value::Null => SqlValue::Null,
                        // For arrays/objects, store JSON string representation
                        other => SqlValue::from(other.to_string()),
                    };
                    values.push(sql_val);
                }

                stmt.execute(rusqlite::params_from_iter(values.iter()))
                    .map_err(|e| BackupError::RestoreFailed(e.to_string()))?;
            }
        }

        Ok(())
    }

    /// Calculate SHA256 checksum for integrity verification
    /// Uses cryptographic SHA-256 hash instead of non-cryptographic hasher
    /// to ensure backup integrity can be verified and tampering detected
    fn calculate_checksum(&self, data: &[u8]) -> String {
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update(data);
        format!("{:x}", hasher.finalize())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_backup_service() -> (BackupService, TempDir) {
        let dir = TempDir::new().expect("Failed to create temp dir");
        let service = BackupService::new(dir.path()).expect("Failed to create backup service");
        (service, dir)
    }

    #[test]
    fn test_backup_service_creation() {
        let (service, _dir) = setup_backup_service();
        assert!(service.backup_dir.exists());
    }

    #[test]
    fn test_list_backups_empty() {
        let (service, _dir) = setup_backup_service();
        let backups = service.list_backups().expect("Failed to list backups");
        assert_eq!(backups.len(), 0);
    }

    #[test]
    fn test_backup_metadata_structure() {
        let metadata = BackupMetadata {
            created_at: "2025-11-08T12:00:00Z".to_string(),
            schema_version: 8,
            app_version: "1.0.0".to_string(),
            size_bytes: 1024,
            checksum: "abc123".to_string(),
            description: Some("Test backup".to_string()),
            encrypted: true,
        };

        assert_eq!(metadata.schema_version, 8);
        assert!(metadata.encrypted);
    }
}
