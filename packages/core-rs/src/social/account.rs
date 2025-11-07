use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum SocialError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Crypto error: {0}")]
    Crypto(#[from] crate::crypto::CryptoError),
    #[error("Account not found")]
    AccountNotFound,
    #[error("Platform error: {0}")]
    Platform(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialAccount {
    pub id: String,
    pub space_id: String,
    pub platform: String,
    pub username: String,
    pub display_name: Option<String>,
    #[serde(skip_serializing)]
    pub encrypted_credentials: String,
    pub enabled: bool,
    pub last_sync: Option<i64>,
    pub sync_frequency_minutes: i32,
    pub created_at: i64,
}

/// Add a new social media account
///
/// Credentials (OAuth tokens, cookies, session data) are encrypted using the
/// Data Encryption Key (DEK) before storage, following the same pattern as CalDAV accounts.
pub fn add_social_account(
    conn: &Connection,
    space_id: &str,
    platform: &str,
    username: &str,
    display_name: Option<&str>,
    credentials: &str,
    dek: &[u8],
) -> Result<SocialAccount, SocialError> {
    use crate::crypto::encrypt_string;

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp_millis();

    // Encrypt credentials (OAuth tokens, cookies, etc.)
    let encrypted_creds = encrypt_string(credentials, dek)?;

    conn.execute(
        "INSERT INTO social_account (
            id, space_id, platform, username, display_name,
            encrypted_credentials, enabled, last_sync,
            sync_frequency_minutes, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, NULL, 60, ?7)",
        params![
            &id,
            space_id,
            platform,
            username,
            display_name,
            &encrypted_creds,
            now
        ],
    )?;

    Ok(SocialAccount {
        id: id.clone(),
        space_id: space_id.to_string(),
        platform: platform.to_string(),
        username: username.to_string(),
        display_name: display_name.map(String::from),
        encrypted_credentials: encrypted_creds,
        enabled: true,
        last_sync: None,
        sync_frequency_minutes: 60,
        created_at: now,
    })
}

/// Get all social accounts for a space
pub fn get_social_accounts(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SocialAccount>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, platform, username, display_name,
                encrypted_credentials, enabled, last_sync,
                sync_frequency_minutes, created_at
         FROM social_account
         WHERE space_id = ?1
         ORDER BY platform, username",
    )?;

    let accounts = stmt.query_map([space_id], |row| {
        Ok(SocialAccount {
            id: row.get(0)?,
            space_id: row.get(1)?,
            platform: row.get(2)?,
            username: row.get(3)?,
            display_name: row.get(4)?,
            encrypted_credentials: row.get(5)?,
            enabled: row.get::<_, i32>(6)? == 1,
            last_sync: row.get(7)?,
            sync_frequency_minutes: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for account in accounts {
        result.push(account?);
    }

    Ok(result)
}

/// Get a single social account by ID
pub fn get_social_account(
    conn: &Connection,
    account_id: &str,
) -> Result<Option<SocialAccount>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, platform, username, display_name,
                encrypted_credentials, enabled, last_sync,
                sync_frequency_minutes, created_at
         FROM social_account
         WHERE id = ?1",
    )?;

    let result = stmt.query_row([account_id], |row| {
        Ok(SocialAccount {
            id: row.get(0)?,
            space_id: row.get(1)?,
            platform: row.get(2)?,
            username: row.get(3)?,
            display_name: row.get(4)?,
            encrypted_credentials: row.get(5)?,
            enabled: row.get::<_, i32>(6)? == 1,
            last_sync: row.get(7)?,
            sync_frequency_minutes: row.get(8)?,
            created_at: row.get(9)?,
        })
    });

    match result {
        Ok(account) => Ok(Some(account)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Update social account settings
pub fn update_social_account(
    conn: &Connection,
    account_id: &str,
    enabled: Option<bool>,
    sync_frequency_minutes: Option<i32>,
    display_name: Option<&str>,
) -> Result<(), SocialError> {
    if let Some(enabled) = enabled {
        conn.execute(
            "UPDATE social_account SET enabled = ?1 WHERE id = ?2",
            params![if enabled { 1 } else { 0 }, account_id],
        )?;
    }

    if let Some(frequency) = sync_frequency_minutes {
        conn.execute(
            "UPDATE social_account SET sync_frequency_minutes = ?1 WHERE id = ?2",
            params![frequency, account_id],
        )?;
    }

    if let Some(name) = display_name {
        conn.execute(
            "UPDATE social_account SET display_name = ?1 WHERE id = ?2",
            params![name, account_id],
        )?;
    }

    Ok(())
}

/// Delete a social account and all associated data (cascades to posts, sessions)
pub fn delete_social_account(conn: &Connection, account_id: &str) -> Result<(), SocialError> {
    conn.execute("DELETE FROM social_account WHERE id = ?1", [account_id])?;
    Ok(())
}

/// Get decrypted credentials for an account
///
/// SECURITY NOTE: Only call this when actually needed for authentication.
/// Credentials should not be kept in memory longer than necessary.
pub fn get_decrypted_credentials(
    conn: &Connection,
    account_id: &str,
    dek: &[u8],
) -> Result<String, SocialError> {
    use crate::crypto::decrypt_string;

    let account = get_social_account(conn, account_id)?
        .ok_or(SocialError::AccountNotFound)?;

    let credentials = decrypt_string(&account.encrypted_credentials, dek)?;
    Ok(credentials)
}

/// Update last sync timestamp
pub fn update_last_sync(
    conn: &Connection,
    account_id: &str,
) -> Result<(), SocialError> {
    let now = Utc::now().timestamp_millis();
    conn.execute(
        "UPDATE social_account SET last_sync = ?1 WHERE id = ?2",
        params![now, account_id],
    )?;
    Ok(())
}

/// Get accounts that need syncing based on their sync frequency
pub fn get_accounts_needing_sync(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SocialAccount>, SocialError> {
    let now = Utc::now().timestamp_millis();

    let mut stmt = conn.prepare(
        "SELECT id, space_id, platform, username, display_name,
                encrypted_credentials, enabled, last_sync,
                sync_frequency_minutes, created_at
         FROM social_account
         WHERE space_id = ?1
           AND enabled = 1
           AND (last_sync IS NULL
                OR last_sync < ?2 - (sync_frequency_minutes * 60 * 1000))",
    )?;

    let accounts = stmt.query_map(params![space_id, now], |row| {
        Ok(SocialAccount {
            id: row.get(0)?,
            space_id: row.get(1)?,
            platform: row.get(2)?,
            username: row.get(3)?,
            display_name: row.get(4)?,
            encrypted_credentials: row.get(5)?,
            enabled: row.get::<_, i32>(6)? == 1,
            last_sync: row.get(7)?,
            sync_frequency_minutes: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;

    let mut result = Vec::new();
    for account in accounts {
        result.push(account?);
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_add_and_get_account() {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrate(&mut conn).unwrap();

        // Create a test space
        conn.execute(
            "INSERT INTO space (id, name, icon, enabled_modes_json) VALUES ('test_space', 'Test', '📱', '[]')",
            [],
        ).unwrap();

        let dek = [0u8; 32]; // Test DEK

        let account = add_social_account(
            &conn,
            "test_space",
            "twitter",
            "testuser",
            Some("Test User"),
            "oauth_token_here",
            &dek,
        ).unwrap();

        assert_eq!(account.platform, "twitter");
        assert_eq!(account.username, "testuser");
        assert_eq!(account.enabled, true);

        // Retrieve account
        let retrieved = get_social_account(&conn, &account.id).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().username, "testuser");

        // Get all accounts
        let accounts = get_social_accounts(&conn, "test_space").unwrap();
        assert_eq!(accounts.len(), 1);
    }
}
