use crate::audit;
use crate::crypto::{derive_key, generate_dek, unwrap_dek, wrap_dek, CryptoError};
use crate::db::{migrate, DbError};
use log::{debug, error, info};
use thiserror::Error;
use zeroize::Zeroizing;

#[derive(Error, Debug)]
pub enum VaultError {
    #[error("Database error: {0}")]
    Db(#[from] DbError),
    #[error("Crypto error: {0}")]
    Crypto(#[from] CryptoError),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Hex error: {0}")]
    Hex(#[from] hex::FromHexError),
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Path traversal detected")]
    PathTraversal,
    #[error("Invalid vault path")]
    InvalidPath,
    #[error("Message: {0}")]
    Message(String),
}

pub struct Vault {
    pub conn: rusqlite::Connection,
    pub dek: Zeroizing<[u8; 32]>,
}

/// Validate a vault path: canonicalize and reject paths containing `..` components.
fn validate_vault_path(path: &str) -> Result<std::path::PathBuf, VaultError> {
    if path.contains("..") {
        return Err(VaultError::PathTraversal);
    }
    let canonical =
        std::fs::canonicalize(path).or_else(|_| -> Result<std::path::PathBuf, VaultError> {
            // If path doesn't exist yet, canonicalize the parent
            let parent = std::path::Path::new(path)
                .parent()
                .ok_or(VaultError::InvalidPath)?;
            let canonical_parent = parent.canonicalize().map_err(|_| VaultError::InvalidPath)?;
            Ok(canonical_parent.join(
                std::path::Path::new(path)
                    .file_name()
                    .ok_or(VaultError::InvalidPath)?,
            ))
        })?;
    Ok(canonical)
}

fn apply_sqlcipher_settings(conn: &rusqlite::Connection, dek: &[u8]) -> Result<(), VaultError> {
    let mut key_hex = hex::encode(dek);
    let keying_sql = format!(
        r#"
        PRAGMA kdf_iter = 256000;
        PRAGMA cipher_hmac_algorithm = HMAC_SHA512;
        PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512;
        PRAGMA key = "x'{}'";
        "#,
        key_hex
    );
    conn.execute_batch(&keying_sql).map_err(|e| {
        error!(
            "[vault] Failed to apply key to database. Is it encrypted? {}",
            e
        );
        VaultError::from(e)
    })?;
    // Zeroize the hex key string after use to limit exposure in memory
    use zeroize::Zeroize;
    key_hex.zeroize();

    conn.execute_batch(
        r#"
        PRAGMA cipher_page_size = 4096;
        PRAGMA cipher_compatibility = 4;
        "#,
    )?;

    Ok(())
}

pub fn create_vault(path: &str, password: &str) -> Result<Vault, VaultError> {
    // Validate path to prevent traversal attacks
    let canonical_path = validate_vault_path(path)?;
    let path_str = canonical_path.to_string_lossy().to_string();
    info!("[vault] Creating vault at path: {}", path_str);
    // 1) Derive keys.
    let salt: [u8; 16] = rand::random();
    let mk = derive_key(password, &salt);
    let dek = generate_dek();
    let wrapped_dek = wrap_dek(&dek, &mk[..]).map_err(|e| {
        error!("[vault] DEK wrapping failed: {}", e);
        e
    })?;
    debug!("[vault] Keys derived and DEK wrapped.");

    // 2) Prepare on-disk layout and open DB.
    if let Err(e) = std::fs::create_dir_all(&path_str) {
        error!(
            "[vault] Failed to create vault directory at '{}': {}",
            path_str, e
        );
        return Err(e.into());
    }
    let db_path = std::path::Path::new(&path_str).join("vault.sqlite3");
    info!("[vault] Database path: {:?}", db_path);
    let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| {
        error!("[vault] Failed to open database at {:?}: {}", db_path, e);
        e
    })?;

    // 3) Key the database *before* any other operations.
    apply_sqlcipher_settings(&conn, &dek[..])?;
    debug!("[vault] Database keyed successfully.");

    // 4) Set page size and compatibility, then run a test write to finalize encryption.
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS _sqlcipher_master (
            id INTEGER PRIMARY KEY,
            val TEXT
        );
        INSERT INTO _sqlcipher_master (val) VALUES ('Noteece');
        DROP TABLE _sqlcipher_master;
        "#,
    )
    .map_err(|e| {
        error!("[vault] Failed to set post-key PRAGMAs: {}", e);
        e
    })?;

    // 5) Run migrations.
    migrate(&mut conn).map_err(|e| {
        error!("[vault] Database migration failed: {}", e);
        e
    })?;
    info!("[vault] Migrations applied.");

    // 5b) Clean up old audit log entries.
    if let Ok(deleted) = audit::cleanup_old_entries(&conn, audit::DEFAULT_RETENTION_DAYS) {
        if deleted > 0 {
            info!("[vault] Cleaned up {} old audit log entries", deleted);
        }
    }

    // 6) Set final session PRAGMAs.
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        "#,
    )?;
    info!("[vault] Vault created and verified successfully.");

    // 7) Persist config.
    let vault_config = serde_json::json!({
        "salt": hex::encode(salt),
        "wrapped_dek": hex::encode(&wrapped_dek),
        "cipher": { "compat": 4, "page_size": 4096, "kdf_iter": 256000, "hmac": "HMAC_SHA512", "kdf": "PBKDF2_HMAC_SHA512" }
    });
    let config_path = std::path::Path::new(path).join("config.json");
    if let Err(e) = std::fs::write(&config_path, serde_json::to_string_pretty(&vault_config)?) {
        error!(
            "[vault] Failed to write config file to {:?}: {}",
            config_path, e
        );
        return Err(e.into());
    }
    debug!("[vault] Vault config file written.");

    Ok(Vault {
        conn,
        dek: Zeroizing::new(dek),
    })
}

pub fn unlock_vault(path: &str, password: &str) -> Result<Vault, VaultError> {
    // Validate path to prevent traversal attacks
    let canonical_path = validate_vault_path(path)?;
    let path_str = canonical_path.to_string_lossy().to_string();
    info!("[vault] Unlocking vault at path: {}", path_str);
    // 1) Load config and reconstruct DEK.
    let config_path = std::path::Path::new(&path_str).join("config.json");
    let cfg_str = std::fs::read_to_string(&config_path).map_err(|e| {
        error!(
            "[vault] Failed to read config file at {:?}: {}",
            config_path, e
        );
        e
    })?;
    let cfg: serde_json::Value = serde_json::from_str(&cfg_str)?;
    let salt = hex::decode(cfg["salt"].as_str().ok_or_else(|| {
        error!("[vault] 'salt' missing from config.json");
        VaultError::Message("missing salt".to_string())
    })?)?;
    let wrapped_dek = hex::decode(cfg["wrapped_dek"].as_str().ok_or_else(|| {
        error!("[vault] 'wrapped_dek' missing from config.json");
        VaultError::Message("missing wrapped_dek".to_string())
    })?)?;

    let mk = derive_key(password, &salt);
    let dek = unwrap_dek(&wrapped_dek, &mk[..]).map_err(|e| {
        error!("[vault] Failed to unwrap DEK. Incorrect password? {}", e);
        e
    })?;
    debug!("[vault] DEK unwrapped successfully.");

    // 2) Open DB file and apply SQLCipher settings in the correct order.
    let db_path = std::path::Path::new(path).join("vault.sqlite3");
    let conn = rusqlite::Connection::open(&db_path)?;
    apply_sqlcipher_settings(&conn, &dek[..])?;

    // 4) Verify we can read from the DB by checking the schema version.
    {
        let mut stmt =
            conn.prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")?;
        match stmt.query_row([], |row| row.get(0)) {
            Ok(version) => {
                let version: i64 = version;
                info!(
                    "[vault] Successfully read schema version {} from unlocked vault.",
                    version
                );
            }
            Err(e) => {
                error!(
                    "[vault] Failed to read from supposedly unlocked database: {}",
                    e
                );
                return Err(e.into());
            }
        }
    }

    // 5) Clean up old audit log entries.
    if let Ok(deleted) = audit::cleanup_old_entries(&conn, audit::DEFAULT_RETENTION_DAYS) {
        if deleted > 0 {
            info!("[vault] Cleaned up {} old audit log entries", deleted);
        }
    }

    // 6) Set session PRAGMAs.
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        "#,
    )?;
    info!("[vault] Vault unlocked successfully.");

    Ok(Vault { conn, dek })
}

/// Rotate the DEK: generate a new DEK, re-wrap it under the existing KEK,
/// and update config.json. Returns the new DEK wrapped in Zeroizing.
pub fn rotate_dek(path: &str, password: &str) -> Result<Zeroizing<[u8; 32]>, VaultError> {
    info!("[vault] Rotating DEK for vault at path: {}", path);
    let vault = unlock_vault(path, password)?;

    // Generate new DEK
    let new_dek = generate_dek();

    // Derive KEK from password + existing salt
    let config_path = std::path::Path::new(path).join("config.json");
    let cfg_str = std::fs::read_to_string(&config_path)?;
    let cfg: serde_json::Value = serde_json::from_str(&cfg_str)?;
    let salt = hex::decode(cfg["salt"].as_str().unwrap_or_default())
        .map_err(|_| VaultError::Message("missing salt".to_string()))?;
    let mk = derive_key(password, &salt);

    // Wrap new DEK under existing KEK
    let wrapped_dek = wrap_dek(&new_dek, &mk[..]).map_err(|e| {
        error!("[vault] New DEK wrapping failed: {}", e);
        e
    })?;

    // Re-key the SQLCipher database with the new DEK
    let new_key_hex = hex::encode(new_dek);
    vault
        .conn
        .execute_batch(&format!(r#"PRAGMA rekey = "x'{}'""#, new_key_hex))
        .map_err(|e| {
            error!("[vault] PRAGMA rekey failed: {}", e);
            VaultError::from(e)
        })?;
    // Zeroize hex key
    use zeroize::Zeroize;
    let mut key_hex_mut = new_key_hex;
    key_hex_mut.zeroize();

    // Update config.json with new wrapped DEK
    let mut cfg: serde_json::Value = serde_json::from_str(&cfg_str)?;
    cfg["wrapped_dek"] = serde_json::json!(hex::encode(&wrapped_dek));
    std::fs::write(&config_path, serde_json::to_string_pretty(&cfg)?)?;

    info!("[vault] DEK rotated successfully.");
    Ok(Zeroizing::new(new_dek))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_vault_path_rejects_dotdot() {
        let result = validate_vault_path("/some/path/../etc/passwd");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VaultError::PathTraversal));
    }

    #[test]
    fn test_validate_vault_path_rejects_dotdot_middle() {
        let result = validate_vault_path("vault/../../../etc");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VaultError::PathTraversal));
    }

    #[test]
    fn test_validate_vault_path_accepts_valid_path() {
        let dir = std::env::temp_dir().join("noteece_test_validate_path");
        std::fs::create_dir_all(&dir).unwrap();
        let result = validate_vault_path(dir.to_str().unwrap());
        assert!(result.is_ok());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn test_validate_vault_path_rejects_nonexistent_parent() {
        let result = validate_vault_path("/nonexistent_parent_dir_abc123/vault");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VaultError::InvalidPath));
    }

    #[test]
    fn test_rotate_dek_changes_key() {
        let dir = std::env::temp_dir().join("noteece_test_rotate_dek");
        let _ = std::fs::remove_dir_all(&dir);
        let path = dir.to_str().unwrap();
        let password = "test_password_123";

        // Create a vault
        let vault = create_vault(path, password).unwrap();
        let old_dek: [u8; 32] = *vault.dek;
        drop(vault);

        // Read old wrapped_dek from config
        let config_path = dir.join("config.json");
        let cfg_str = std::fs::read_to_string(&config_path).unwrap();
        let cfg: serde_json::Value = serde_json::from_str(&cfg_str).unwrap();
        let old_wrapped_dek = cfg["wrapped_dek"].as_str().unwrap().to_string();

        // Rotate the DEK
        let new_dek = rotate_dek(path, password).unwrap();

        // Verify the new DEK is different from the old one
        assert_ne!(&*new_dek as &[u8; 32], &old_dek);

        // Verify config.json was updated with a new wrapped_dek
        let cfg_str_new = std::fs::read_to_string(&config_path).unwrap();
        let cfg_new: serde_json::Value = serde_json::from_str(&cfg_str_new).unwrap();
        let new_wrapped_dek = cfg_new["wrapped_dek"].as_str().unwrap().to_string();
        assert_ne!(old_wrapped_dek, new_wrapped_dek);

        // Cleanup
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
