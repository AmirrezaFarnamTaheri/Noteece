use r2d2::ManageConnection;
use rusqlite::Connection;
use std::fmt;
use std::path::PathBuf;

pub struct EncryptedConnectionManager {
    path: PathBuf,
    dek: [u8; 32],
}

impl EncryptedConnectionManager {
    pub fn new(path: PathBuf, dek: [u8; 32]) -> Self {
        Self { path, dek }
    }
}

impl ManageConnection for EncryptedConnectionManager {
    type Connection = Connection;
    type Error = rusqlite::Error;

    fn connect(&self) -> Result<Self::Connection, Self::Error> {
        let conn = Connection::open(&self.path)?;

        // 1) Apply Key (DEK)
        let key_hex = hex::encode(self.dek);
        let keying_sql = format!(
            r#"
            PRAGMA kdf_iter = 256000;
            PRAGMA cipher_hmac_algorithm = HMAC_SHA512;
            PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512;
            PRAGMA key = "x'{}'";
            "#,
            key_hex
        );
        conn.execute_batch(&keying_sql)?;

        // 2) Set WAL mode and other performance PRAGMAs
        // Note: `journal_mode=WAL` persists, but it's good practice to ensure it.
        // `busy_timeout` is CRITICAL for concurrency to avoid "database is locked" errors immediately.
        conn.execute_batch(
            r#"
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA busy_timeout = 5000;
            "#,
        )?;

        Ok(conn)
    }

    fn is_valid(&self, conn: &mut Self::Connection) -> Result<(), Self::Error> {
        conn.execute_batch("SELECT 1")
    }

    fn has_broken(&self, _conn: &mut Self::Connection) -> bool {
        false
    }
}

impl fmt::Debug for EncryptedConnectionManager {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("EncryptedConnectionManager")
            .field("path", &self.path)
            .finish()
    }
}
