//! Encrypted backup and restore support for SocialHub data.

use base64::Engine as _;
use rusqlite::{types::ValueRef, Connection, Transaction};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::Write;
#[cfg(windows)]
use std::os::windows::fs::OpenOptionsExt;
use std::path::{Path, PathBuf};
use thiserror::Error;

const BACKUP_FORMAT_VERSION: u64 = 2;
const BACKUP_SUFFIX: &str = ".json.enc";

// This is an allowlist, not a promise that every historical database contains
// every table. Export includes only tables present in the current schema.
const BACKUP_TABLES: &[&str] = &[
    "social_account",
    "social_post",
    "social_category",
    "social_post_category",
    "social_sync_history",
    "social_webview_session",
    "social_auto_rule",
    "social_focus_mode",
    "social_automation_rule",
    "social_post_archive",
];

// Children first for destructive clearing.
const DELETE_ORDER: &[&str] = &[
    "social_post_category",
    "social_post_archive",
    "social_webview_session",
    "social_auto_rule",
    "social_automation_rule",
    "social_post",
    "social_category",
    "social_focus_mode",
    "social_sync_history",
    "social_account",
];

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
        fs::create_dir_all(&backup_dir)?;
        Ok(Self { backup_dir })
    }

    fn validated_backup_path(&self, backup_id: &str) -> Result<PathBuf, BackupError> {
        let valid = !backup_id.is_empty()
            && backup_id.len() <= 128
            && backup_id.chars().all(|character| {
                character.is_ascii_alphanumeric() || matches!(character, '_' | '-')
            });
        if !valid {
            return Err(BackupError::InvalidBackup(format!(
                "Invalid backup id: {backup_id:?}"
            )));
        }
        Ok(self.backup_dir.join(format!("{backup_id}{BACKUP_SUFFIX}")))
    }

    pub fn create_backup(
        &self,
        conn: &Connection,
        dek: &[u8],
        description: Option<&str>,
    ) -> Result<String, BackupError> {
        if dek.len() != 32 {
            return Err(BackupError::Encryption(
                "A 32-byte data-encryption key is required".into(),
            ));
        }

        let schema_version = current_schema_version(conn);
        let payload = self.export_database(conn)?;
        let encrypted_data = crate::crypto::encrypt_bytes(&payload, dek)
            .map_err(|error| BackupError::Encryption(error.to_string()))?;
        let backup_id = format!("backup_{}", ulid::Ulid::new());
        let backup_path = self.validated_backup_path(&backup_id)?;
        let temporary_path = self.backup_dir.join(format!(".{backup_id}.tmp"));

        let backup = Backup {
            metadata: BackupMetadata {
                created_at: chrono::Utc::now().to_rfc3339(),
                schema_version,
                app_version: env!("CARGO_PKG_VERSION").to_string(),
                size_bytes: encrypted_data.len() as u64,
                checksum: checksum(&encrypted_data),
                description: description.map(str::to_string),
                encrypted: true,
            },
            data: encrypted_data,
        };
        let encoded = serde_json::to_vec(&backup)?;

        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary_path)?;
        if let Err(error) = (|| -> Result<(), std::io::Error> {
            file.write_all(&encoded)?;
            file.sync_all()?;
            drop(file);
            fs::rename(&temporary_path, &backup_path)?;
            sync_directory(&self.backup_dir)?;
            Ok(())
        })() {
            let _ = fs::remove_file(&temporary_path);
            return Err(BackupError::Io(error));
        }

        Ok(backup_id)
    }

    pub fn restore_backup(
        &self,
        backup_id: &str,
        conn: &mut Connection,
        dek: &[u8],
    ) -> Result<(), BackupError> {
        if dek.len() != 32 {
            return Err(BackupError::Encryption(
                "A 32-byte data-encryption key is required".into(),
            ));
        }

        let backup = self.read_backup(backup_id)?;
        if !backup.metadata.encrypted || backup.metadata.size_bytes != backup.data.len() as u64 {
            return Err(BackupError::BackupCorrupted);
        }
        if checksum(&backup.data) != backup.metadata.checksum {
            return Err(BackupError::BackupCorrupted);
        }

        let current_version = current_schema_version(conn);
        if backup.metadata.schema_version > current_version {
            return Err(BackupError::InvalidBackup(format!(
                "Backup schema {} is newer than database schema {}",
                backup.metadata.schema_version, current_version
            )));
        }

        let plaintext = crate::crypto::decrypt_bytes(&backup.data, dek)
            .map_err(|error| BackupError::Encryption(error.to_string()))?;
        let payload: Value = serde_json::from_slice(&plaintext)?;
        self.validate_payload(conn, &payload)?;

        // A unique, verified safety snapshot is created before mutation.
        let _safety_backup = self.create_backup(conn, dek, Some("pre_restore_backup"))?;

        let tx = conn
            .transaction()
            .map_err(|error| BackupError::RestoreFailed(error.to_string()))?;
        tx.execute_batch("PRAGMA defer_foreign_keys = ON;")?;
        self.clear_database_tx(&tx, &payload)?;
        self.import_database_tx(&tx, &payload)?;

        let has_fk_violation = {
            let mut statement = tx.prepare("PRAGMA foreign_key_check")?;
            let mut rows = statement.query([])?;
            rows.next()?.is_some()
        };
        if has_fk_violation {
            return Err(BackupError::RestoreFailed(
                "Restored data violates foreign-key constraints".into(),
            ));
        }

        tx.commit()
            .map_err(|error| BackupError::RestoreFailed(error.to_string()))
    }

    pub fn list_backups(&self) -> Result<Vec<(String, BackupMetadata)>, BackupError> {
        let mut backups = Vec::new();
        for entry in fs::read_dir(&self.backup_dir)? {
            let entry = entry?;
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let Some(backup_id) = path
                .file_name()
                .and_then(|name| name.to_str())
                .and_then(|name| name.strip_suffix(BACKUP_SUFFIX))
            else {
                continue;
            };
            if self.validated_backup_path(backup_id).is_err() {
                continue;
            }

            let bytes = fs::read(&path)?;
            let backup: Backup =
                serde_json::from_slice(&bytes).map_err(|_| BackupError::BackupCorrupted)?;
            backups.push((backup_id.to_string(), backup.metadata));
        }
        backups.sort_by(|left, right| right.1.created_at.cmp(&left.1.created_at));
        Ok(backups)
    }

    pub fn delete_backup(&self, backup_id: &str) -> Result<(), BackupError> {
        let path = self.validated_backup_path(backup_id)?;
        if !path.is_file() {
            return Err(BackupError::BackupNotFound);
        }
        fs::remove_file(path)?;
        sync_directory(&self.backup_dir)?;
        Ok(())
    }

    pub fn get_backup_details(&self, backup_id: &str) -> Result<BackupMetadata, BackupError> {
        Ok(self.read_backup(backup_id)?.metadata)
    }

    fn read_backup(&self, backup_id: &str) -> Result<Backup, BackupError> {
        let path = self.validated_backup_path(backup_id)?;
        if !path.is_file() {
            return Err(BackupError::BackupNotFound);
        }
        let bytes = fs::read(path)?;
        serde_json::from_slice(&bytes).map_err(|_| BackupError::BackupCorrupted)
    }

    fn export_database(&self, conn: &Connection) -> Result<Vec<u8>, BackupError> {
        let mut tables = Map::new();
        for table in BACKUP_TABLES {
            if !table_exists(conn, table)? {
                continue;
            }
            let columns = table_columns(conn, table)?;
            let sql = format!("SELECT * FROM {}", quote_identifier(table));
            let mut statement = conn.prepare(&sql)?;
            let mut rows = statement.query([])?;
            let mut exported_rows = Vec::new();

            while let Some(row) = rows.next()? {
                let mut exported = Map::new();
                for (index, column) in columns.iter().enumerate() {
                    exported.insert(column.clone(), encode_value(row.get_ref(index)?)?);
                }
                exported_rows.push(Value::Object(exported));
            }
            tables.insert((*table).to_string(), Value::Array(exported_rows));
        }

        serde_json::to_vec(&json!({
            "format_version": BACKUP_FORMAT_VERSION,
            "tables": tables,
        }))
        .map_err(BackupError::from)
    }

    fn validate_payload(&self, conn: &Connection, payload: &Value) -> Result<(), BackupError> {
        let version = payload
            .get("format_version")
            .or_else(|| payload.get("version"))
            .and_then(Value::as_u64)
            .ok_or_else(|| BackupError::InvalidBackup("Missing backup format version".into()))?;
        if version == 0 || version > BACKUP_FORMAT_VERSION {
            return Err(BackupError::InvalidBackup(format!(
                "Unsupported backup format version: {version}"
            )));
        }

        let tables = payload
            .get("tables")
            .and_then(Value::as_object)
            .ok_or_else(|| BackupError::InvalidBackup("Missing tables object".into()))?;
        if tables.is_empty() {
            return Err(BackupError::InvalidBackup(
                "Backup contains no tables".into(),
            ));
        }

        for (table, rows) in tables {
            if !BACKUP_TABLES.contains(&table.as_str()) || !table_exists(conn, table)? {
                return Err(BackupError::InvalidBackup(format!(
                    "Unknown or unavailable table: {table}"
                )));
            }
            let allowed_columns: HashSet<String> =
                table_columns(conn, table)?.into_iter().collect();
            let rows = rows
                .as_array()
                .ok_or_else(|| BackupError::InvalidBackup(format!("Invalid rows for {table}")))?;
            for row in rows {
                let row = row.as_object().ok_or_else(|| {
                    BackupError::InvalidBackup(format!("Invalid row for {table}"))
                })?;
                if row.is_empty() || row.keys().any(|column| !allowed_columns.contains(column)) {
                    return Err(BackupError::InvalidBackup(format!(
                        "Invalid columns for {table}"
                    )));
                }
                for value in row.values() {
                    decode_value(value)?;
                }
            }
        }
        Ok(())
    }

    fn clear_database_tx(&self, tx: &Transaction<'_>, payload: &Value) -> Result<(), BackupError> {
        let tables = payload
            .get("tables")
            .and_then(Value::as_object)
            .ok_or_else(|| BackupError::InvalidBackup("Missing tables object".into()))?;
        for table in DELETE_ORDER {
            if tables.contains_key(*table) {
                tx.execute(&format!("DELETE FROM {}", quote_identifier(table)), [])?;
            }
        }
        Ok(())
    }

    fn import_database_tx(&self, tx: &Transaction<'_>, payload: &Value) -> Result<(), BackupError> {
        let tables = payload
            .get("tables")
            .and_then(Value::as_object)
            .ok_or_else(|| BackupError::InvalidBackup("Missing tables object".into()))?;

        for table in BACKUP_TABLES {
            let Some(rows) = tables.get(*table).and_then(Value::as_array) else {
                continue;
            };
            for row in rows {
                let row = row.as_object().ok_or_else(|| {
                    BackupError::InvalidBackup(format!("Invalid row for {table}"))
                })?;
                let columns: Vec<&String> = row.keys().collect();
                let column_sql = columns
                    .iter()
                    .map(|column| quote_identifier(column))
                    .collect::<Vec<_>>()
                    .join(",");
                let placeholders = (1..=columns.len())
                    .map(|index| format!("?{index}"))
                    .collect::<Vec<_>>()
                    .join(",");
                let sql = format!(
                    "INSERT INTO {} ({column_sql}) VALUES ({placeholders})",
                    quote_identifier(table)
                );
                let values = columns
                    .iter()
                    .map(|column| decode_value(&row[*column]))
                    .collect::<Result<Vec<_>, _>>()?;
                let mut statement = tx
                    .prepare_cached(&sql)
                    .map_err(|error| BackupError::RestoreFailed(format!("{table}: {error}")))?;
                statement
                    .execute(rusqlite::params_from_iter(values.iter()))
                    .map_err(|error| BackupError::RestoreFailed(format!("{table}: {error}")))?;
            }
        }
        Ok(())
    }
}

fn current_schema_version(conn: &Connection) -> i64 {
    conn.query_row("SELECT MAX(version) FROM schema_version", [], |row| {
        row.get::<_, Option<i64>>(0)
    })
    .ok()
    .flatten()
    .unwrap_or(0)
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool, BackupError> {
    Ok(conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
        [table],
        |row| row.get::<_, i64>(0),
    )? != 0)
}

fn table_columns(conn: &Connection, table: &str) -> Result<Vec<String>, BackupError> {
    let mut statement = conn.prepare(&format!("PRAGMA table_info({})", quote_identifier(table)))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(BackupError::from)
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn encode_value(value: ValueRef<'_>) -> Result<Value, BackupError> {
    Ok(match value {
        ValueRef::Null => json!({ "type": "null" }),
        ValueRef::Integer(value) => json!({ "type": "integer", "value": value }),
        ValueRef::Real(value) => json!({ "type": "real", "value": value }),
        ValueRef::Text(value) => json!({
            "type": "text",
            "value": std::str::from_utf8(value).map_err(|_| {
                BackupError::InvalidBackup("Database contains invalid UTF-8 text".into())
            })?,
        }),
        ValueRef::Blob(value) => json!({
            "type": "blob",
            "value": base64::engine::general_purpose::STANDARD.encode(value),
        }),
    })
}

fn decode_value(value: &Value) -> Result<rusqlite::types::Value, BackupError> {
    use rusqlite::types::Value as SqlValue;

    if let Some(kind) = value.get("type").and_then(Value::as_str) {
        return match kind {
            "null" => Ok(SqlValue::Null),
            "integer" => value
                .get("value")
                .and_then(Value::as_i64)
                .map(SqlValue::Integer)
                .ok_or_else(|| BackupError::InvalidBackup("Invalid integer value".into())),
            "real" => value
                .get("value")
                .and_then(Value::as_f64)
                .map(SqlValue::Real)
                .ok_or_else(|| BackupError::InvalidBackup("Invalid real value".into())),
            "text" => value
                .get("value")
                .and_then(Value::as_str)
                .map(|value| SqlValue::Text(value.to_string()))
                .ok_or_else(|| BackupError::InvalidBackup("Invalid text value".into())),
            "blob" => {
                let encoded = value
                    .get("value")
                    .and_then(Value::as_str)
                    .ok_or_else(|| BackupError::InvalidBackup("Invalid blob value".into()))?;
                let decoded = base64::engine::general_purpose::STANDARD
                    .decode(encoded)
                    .map_err(|_| BackupError::InvalidBackup("Invalid base64 blob".into()))?;
                Ok(SqlValue::Blob(decoded))
            }
            _ => Err(BackupError::InvalidBackup(format!(
                "Unknown value type: {kind}"
            ))),
        };
    }

    // Backward-compatible decoding for version-1 primitive JSON backups.
    Ok(match value {
        Value::Null => SqlValue::Null,
        Value::Bool(value) => SqlValue::Integer(if *value { 1 } else { 0 }),
        Value::String(value) => SqlValue::Text(value.clone()),
        Value::Number(value) => {
            if let Some(integer) = value.as_i64() {
                SqlValue::Integer(integer)
            } else if let Some(real) = value.as_f64() {
                SqlValue::Real(real)
            } else {
                return Err(BackupError::InvalidBackup("Unsupported number".into()));
            }
        }
        other => SqlValue::Text(other.to_string()),
    })
}

fn checksum(data: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    hex::encode(Sha256::digest(data))
}

#[cfg(unix)]
fn sync_directory(path: &Path) -> std::io::Result<()> {
    fs::File::open(path)?.sync_all()
}

#[cfg(windows)]
fn sync_directory(path: &Path) -> std::io::Result<()> {
    // Opening a directory on Windows requires backup semantics. Attempt the
    // metadata flush so rename/delete durability is preserved where supported,
    // while treating documented unsupported-directory cases as best effort.
    const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
    let directory = match OpenOptions::new()
        .read(true)
        .custom_flags(FILE_FLAG_BACKUP_SEMANTICS)
        .open(path)
    {
        Ok(directory) => directory,
        Err(error) if is_unsupported_directory_sync_error(&error) => return Ok(()),
        Err(error) => return Err(error),
    };

    match directory.sync_all() {
        Ok(()) => Ok(()),
        Err(error) if is_unsupported_directory_sync_error(&error) => Ok(()),
        Err(error) => Err(error),
    }
}

#[cfg(windows)]
fn is_unsupported_directory_sync_error(error: &std::io::Error) -> bool {
    matches!(
        error.kind(),
        std::io::ErrorKind::PermissionDenied | std::io::ErrorKind::Unsupported
    ) || matches!(
        error.raw_os_error(),
        Some(1) | Some(5) | Some(6) | Some(50) | Some(87)
    )
}

#[cfg(not(any(unix, windows)))]
fn sync_directory(_path: &Path) -> std::io::Result<()> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn service() -> (BackupService, TempDir) {
        let directory = TempDir::new().unwrap();
        let service = BackupService::new(directory.path()).unwrap();
        (service, directory)
    }

    fn metadata() -> BackupMetadata {
        BackupMetadata {
            created_at: "2026-07-28T00:00:00Z".into(),
            schema_version: 1,
            app_version: "1.1.0".into(),
            size_bytes: 3,
            checksum: checksum(&[1, 2, 3]),
            description: Some("test".into()),
            encrypted: true,
        }
    }

    fn sample_connection() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE schema_version (version INTEGER NOT NULL);
            INSERT INTO schema_version(version) VALUES (1);
            CREATE TABLE social_account (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                avatar BLOB NOT NULL,
                score INTEGER NOT NULL,
                ratio REAL NOT NULL,
                note TEXT
            );
            ",
        )
        .unwrap();
        conn.execute(
            "INSERT INTO social_account(id, display_name, avatar, score, ratio, note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                "account-1",
                "Original",
                vec![0_u8, 1, 2, 255],
                42_i64,
                1.5_f64,
                Option::<String>::None
            ],
        )
        .unwrap();
        conn
    }

    #[test]
    fn rejects_traversal_and_separator_ids() {
        let (service, _directory) = service();
        for invalid in ["", "../escape", "a/b", "a\\b", "backup.json"] {
            assert!(matches!(
                service.validated_backup_path(invalid),
                Err(BackupError::InvalidBackup(_))
            ));
        }
    }

    #[test]
    fn list_details_and_delete_round_trip_exact_id() {
        let (service, _directory) = service();
        let id = "backup_01JTESTROUNDTRIP";
        let backup = Backup {
            metadata: metadata(),
            data: vec![1, 2, 3],
        };
        fs::write(
            service.validated_backup_path(id).unwrap(),
            serde_json::to_vec(&backup).unwrap(),
        )
        .unwrap();

        let listed = service.list_backups().unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].0, id);
        assert_eq!(service.get_backup_details(id).unwrap().app_version, "1.1.0");
        service.delete_backup(id).unwrap();
        assert!(matches!(
            service.get_backup_details(id),
            Err(BackupError::BackupNotFound)
        ));
    }

    #[test]
    fn invalid_foreign_filename_is_skipped() {
        let (service, directory) = service();
        fs::write(directory.path().join("legacy.backup.json.enc"), b"not-json").unwrap();

        let id = "backup_valid";
        let backup = Backup {
            metadata: metadata(),
            data: vec![1, 2, 3],
        };
        fs::write(
            service.validated_backup_path(id).unwrap(),
            serde_json::to_vec(&backup).unwrap(),
        )
        .unwrap();

        let listed = service.list_backups().unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].0, id);
    }

    #[test]
    fn corrupted_matching_file_is_reported_not_hidden() {
        let (service, _directory) = service();
        fs::write(
            service.validated_backup_path("backup_corrupt").unwrap(),
            b"not-json",
        )
        .unwrap();
        assert!(matches!(
            service.list_backups(),
            Err(BackupError::BackupCorrupted)
        ));
    }

    #[test]
    fn encrypted_create_mutate_restore_round_trip_preserves_typed_values() {
        let (service, _directory) = service();
        let mut conn = sample_connection();
        let dek = [7_u8; 32];
        let backup_id = service
            .create_backup(&conn, &dek, Some("round-trip"))
            .unwrap();

        conn.execute(
            "UPDATE social_account
             SET display_name = 'Mutated', avatar = X'AA', score = -1, ratio = 9.0, note = 'changed'
             WHERE id = 'account-1'",
            [],
        )
        .unwrap();
        service.restore_backup(&backup_id, &mut conn, &dek).unwrap();

        let restored = conn
            .query_row(
                "SELECT display_name, avatar, score, ratio, note
                 FROM social_account WHERE id = 'account-1'",
                [],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Vec<u8>>(1)?,
                        row.get::<_, i64>(2)?,
                        row.get::<_, f64>(3)?,
                        row.get::<_, Option<String>>(4)?,
                    ))
                },
            )
            .unwrap();
        assert_eq!(restored.0, "Original");
        assert_eq!(restored.1, vec![0_u8, 1, 2, 255]);
        assert_eq!(restored.2, 42);
        assert_eq!(restored.3, 1.5);
        assert_eq!(restored.4, None);
    }

    #[test]
    fn tampered_ciphertext_checksum_is_rejected() {
        let (service, _directory) = service();
        let mut conn = sample_connection();
        let dek = [8_u8; 32];
        let backup_id = service.create_backup(&conn, &dek, None).unwrap();
        let path = service.validated_backup_path(&backup_id).unwrap();
        let mut backup: Backup = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        backup.data[0] ^= 1;
        fs::write(path, serde_json::to_vec(&backup).unwrap()).unwrap();

        assert!(matches!(
            service.restore_backup(&backup_id, &mut conn, &dek),
            Err(BackupError::BackupCorrupted)
        ));
    }

    #[test]
    fn newer_database_schema_is_rejected_before_mutation() {
        let (service, _directory) = service();
        let mut conn = sample_connection();
        let dek = [9_u8; 32];
        let backup_id = service.create_backup(&conn, &dek, None).unwrap();
        let path = service.validated_backup_path(&backup_id).unwrap();
        let mut backup: Backup = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        backup.metadata.schema_version = 2;
        fs::write(path, serde_json::to_vec(&backup).unwrap()).unwrap();

        assert!(matches!(
            service.restore_backup(&backup_id, &mut conn, &dek),
            Err(BackupError::InvalidBackup(_))
        ));
    }

    #[test]
    fn future_backup_format_is_rejected() {
        let (service, _directory) = service();
        let conn = sample_connection();
        let payload = json!({
            "format_version": BACKUP_FORMAT_VERSION + 1,
            "tables": { "social_account": [] },
        });
        assert!(matches!(
            service.validate_payload(&conn, &payload),
            Err(BackupError::InvalidBackup(_))
        ));
    }
}
