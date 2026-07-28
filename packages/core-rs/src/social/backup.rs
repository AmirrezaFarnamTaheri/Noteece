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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub created_at: String,
    pub schema_version: i64,
    pub app_version: String,
    pub size_bytes: u64,
    pub checksum: String,
    pub description: Option<String>,
    pub encrypted: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Backup {
    pub metadata: BackupMetadata,
    pub data: Vec<u8>,
}

pub struct BackupService {
    backup_dir: PathBuf,
}

impl BackupService {
    pub fn new(backup_dir: impl AsRef<Path>) -> Result<Self, BackupError> {
        let backup_dir = backup_dir.as_ref().to_path_buf();
        if !backup_dir.exists() {
            fs::create_dir_all(&backup_dir)?;
        }
        Ok(Self { backup_dir })
    }

    fn validated_backup_path(&self, backup_id: &str) -> Result<PathBuf, BackupError> {
        let valid = !backup_id.is_empty()
            && backup_id.len() <= 128
            && backup_id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-');

        if !valid {
            return Err(BackupError::InvalidBackup(format!(
                "Invalid backup id: {backup_id:?}"
            )));
        }

        Ok(self.backup_dir.join(format!("{}.json.enc", backup_id)))
    }

    // ... existing backup creation/restoration implementation remains unchanged ...

    /// List all available backups.
    ///
    /// Backup filenames are `<backup_id>.json.enc`; remove the complete suffix
    /// so returned IDs can be passed directly into restore/delete/details APIs.
    pub fn list_backups(&self) -> Result<Vec<(String, BackupMetadata)>, BackupError> {
        let mut backups = Vec::new();

        for entry in fs::read_dir(&self.backup_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("enc") {
                if let Ok(bytes) = fs::read(&path) {
                    if let Ok(backup) = serde_json::from_slice::<Backup>(&bytes) {
                        let backup_id = path
                            .file_name()
                            .and_then(|s| s.to_str())
                            .and_then(|s| s.strip_suffix(".json.enc"))
                            .unwrap_or("unknown")
                            .to_string();

                        backups.push((backup_id, backup.metadata));
                    }
                }
            }
        }

        backups.sort_by(|a, b| b.1.created_at.cmp(&a.1.created_at));
        Ok(backups)
    }
}
