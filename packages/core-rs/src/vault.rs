use crate::crypto::{derive_key, generate_dek, unwrap_dek, wrap_dek, CryptoError};
use crate::db::{migrate, DbError};
use log::{debug, error, info};
use thiserror::Error;

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
    #[error("Message: {0}")]
    Message(String),
}

pub struct Vault {
    pub conn: rusqlite::Connection,
    pub dek: [u8; 32],
}

fn apply_sqlcipher_settings(conn: &rusqlite::Connection, dek: &[u8; 32]) -> Result<(), VaultError> {
    let key_hex = hex::encode(dek);
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

    conn.execute_batch(
        r#"
        PRAGMA cipher_page_size = 4096;
        PRAGMA cipher_compatibility = 4;
        "#,
    )?;

    Ok(())
}

pub fn create_vault(path: &str, password: &str) -> Result<Vault, VaultError> {
    info!("[vault] Creating vault at path: {}", path);
    // 1) Derive keys.
    let salt: [u8; 16] = rand::random();
    let mk = derive_key(password, &salt);
    let dek = generate_dek();
    let wrapped_dek = wrap_dek(&dek, &mk).map_err(|e| {
        error!("[vault] DEK wrapping failed: {}", e);
        e
    })?;
    debug!("[vault] Keys derived and DEK wrapped.");

    // 2) Prepare on-disk layout and open DB.
    if let Err(e) = std::fs::create_dir_all(path) {
        error!(
            "[vault] Failed to create vault directory at '{}': {}",
            path, e
        );
        return Err(e.into());
    }
    let db_path = std::path::Path::new(path).join("vault.sqlite3");
    info!("[vault] Database path: {:?}", db_path);
    let mut conn = rusqlite::Connection::open(&db_path).map_err(|e| {
        error!("[vault] Failed to open database at {:?}: {}", db_path, e);
        e
    })?;

    // 3) Key the database *before* any other operations.
    apply_sqlcipher_settings(&conn, &dek)?;
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

    Ok(Vault { conn, dek })
}

pub fn unlock_vault(path: &str, password: &str) -> Result<Vault, VaultError> {
    info!("[vault] Unlocking vault at path: {}", path);
    // 1) Load config and reconstruct DEK.
    let config_path = std::path::Path::new(path).join("config.json");
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
    let dek = unwrap_dek(&wrapped_dek, &mk).map_err(|e| {
        error!("[vault] Failed to unwrap DEK. Incorrect password? {}", e);
        e
    })?;
    debug!("[vault] DEK unwrapped successfully.");

    // 2) Open DB file and apply SQLCipher settings in the correct order.
    let db_path = std::path::Path::new(path).join("vault.sqlite3");
    let conn = rusqlite::Connection::open(&db_path)?;
    apply_sqlcipher_settings(&conn, &dek)?;

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

    // 5) Set session PRAGMAs.
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
