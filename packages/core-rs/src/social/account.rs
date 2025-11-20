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
    #[error("Sync already in progress for account: {0}")]
    SyncInProgress(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Not found: {0}")]
    NotFound(String),
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

    log::debug!(
        "[Social::Account] Adding account - space_id={}, platform={}, username={}",
        space_id,
        platform,
        username
    );

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp_millis();

    // Encrypt credentials (OAuth tokens, cookies, etc.)
    log::debug!(
        "[Social::Account] Encrypting credentials for account {}",
        id
    );
    let encrypted_creds = encrypt_string(credentials, dek).map_err(|e| {
        log::error!("[Social::Account] Failed to encrypt credentials: {}", e);
        e
    })?;

    log::debug!("[Social::Account] Inserting account {} into database", id);
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
    )
    .map_err(|e| {
        log::error!("[Social::Account] Database insert failed: {}", e);
        e
    })?;

    log::info!(
        "[Social::Account] Successfully added account {} - platform={}, username={}",
        id,
        platform,
        username
    );

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
    log::debug!(
        "[Social::Account] Fetching all accounts for space_id={}",
        space_id
    );

    let mut stmt = conn
        .prepare(
            "SELECT id, space_id, platform, username, display_name,
                encrypted_credentials, enabled, last_sync,
                sync_frequency_minutes, created_at
         FROM social_account
         WHERE space_id = ?1
         ORDER BY platform, username",
        )
        .map_err(|e| {
            log::error!("[Social::Account] Failed to prepare query: {}", e);
            e
        })?;

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

    log::info!(
        "[Social::Account] Retrieved {} accounts for space {}",
        result.len(),
        space_id
    );

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
    log::debug!(
        "[Social::Account] Updating account {} - enabled={:?}, sync_freq={:?}, display_name={:?}",
        account_id,
        enabled,
        sync_frequency_minutes,
        display_name
    );

    if let Some(enabled) = enabled {
        log::debug!(
            "[Social::Account] Setting enabled={} for account {}",
            enabled,
            account_id
        );
        conn.execute(
            "UPDATE social_account SET enabled = ?1 WHERE id = ?2",
            params![if enabled { 1 } else { 0 }, account_id],
        )
        .map_err(|e| {
            log::error!("[Social::Account] Failed to update enabled status: {}", e);
            e
        })?;
    }

    if let Some(frequency) = sync_frequency_minutes {
        log::debug!(
            "[Social::Account] Setting sync_frequency={} for account {}",
            frequency,
            account_id
        );
        conn.execute(
            "UPDATE social_account SET sync_frequency_minutes = ?1 WHERE id = ?2",
            params![frequency, account_id],
        )
        .map_err(|e| {
            log::error!("[Social::Account] Failed to update sync frequency: {}", e);
            e
        })?;
    }

    if let Some(name) = display_name {
        log::debug!(
            "[Social::Account] Setting display_name for account {}",
            account_id
        );
        conn.execute(
            "UPDATE social_account SET display_name = ?1 WHERE id = ?2",
            params![name, account_id],
        )
        .map_err(|e| {
            log::error!("[Social::Account] Failed to update display name: {}", e);
            e
        })?;
    }

    log::info!(
        "[Social::Account] Successfully updated account {}",
        account_id
    );

    Ok(())
}

/// Delete a social account and all associated data (cascades to posts, sessions)
pub fn delete_social_account(conn: &Connection, account_id: &str) -> Result<(), SocialError> {
    log::warn!(
        "[Social::Account] Deleting account {} and all associated data",
        account_id
    );

    conn.execute("DELETE FROM social_account WHERE id = ?1", [account_id])
        .map_err(|e| {
            log::error!("[Social::Account] Failed to delete account: {}", e);
            e
        })?;

    log::info!(
        "[Social::Account] Successfully deleted account {}",
        account_id
    );
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

    log::debug!(
        "[Social::Account] Decrypting credentials for account {}",
        account_id
    );

    let account = get_social_account(conn, account_id)?.ok_or_else(|| {
        log::error!(
            "[Social::Account] Account {} not found for credential decryption",
            account_id
        );
        SocialError::AccountNotFound
    })?;

    let credentials = decrypt_string(&account.encrypted_credentials, dek).map_err(|e| {
        log::error!(
            "[Social::Account] Failed to decrypt credentials for account {}: {}",
            account_id,
            e
        );
        e
    })?;

    log::debug!(
        "[Social::Account] Successfully decrypted credentials for account {}",
        account_id
    );
    Ok(credentials)
}

/// Update last sync timestamp
pub fn update_last_sync(conn: &Connection, account_id: &str) -> Result<(), SocialError> {
    let now = Utc::now().timestamp_millis();

    log::debug!(
        "[Social::Account] Updating last_sync for account {} to {}",
        account_id,
        now
    );

    conn.execute(
        "UPDATE social_account SET last_sync = ?1 WHERE id = ?2",
        params![now, account_id],
    )
    .map_err(|e| {
        log::error!("[Social::Account] Failed to update last_sync: {}", e);
        e
    })?;

    log::debug!(
        "[Social::Account] Successfully updated last_sync for account {}",
        account_id
    );
    Ok(())
}

/// Get accounts that need syncing based on their sync frequency
pub fn get_accounts_needing_sync(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SocialAccount>, SocialError> {
    log::debug!(
        "[Social::Account] Checking for accounts needing sync in space {}",
        space_id
    );

    let now = Utc::now().timestamp_millis();

    let mut stmt = conn
        .prepare(
            "SELECT id, space_id, platform, username, display_name,
                encrypted_credentials, enabled, last_sync,
                sync_frequency_minutes, created_at
         FROM social_account
         WHERE space_id = ?1
           AND enabled = 1
           AND (last_sync IS NULL
                OR last_sync < ?2 - (sync_frequency_minutes * 60 * 1000))",
        )
        .map_err(|e| {
            log::error!("[Social::Account] Failed to prepare sync query: {}", e);
            e
        })?;

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

    log::info!(
        "[Social::Account] Found {} accounts needing sync in space {}",
        result.len(),
        space_id
    );

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_add_and_get_account() {
        let mut conn = Connection::open_in_memory().expect("Failed to open in-memory DB");
        crate::db::migrate(&mut conn).expect("Migration failed");

        // Create a test space
        conn.execute(
            "INSERT INTO space (id, name, icon, enabled_modes_json) VALUES ('test_space', 'Test', '📱', '[]')",
            [],
        ).expect("Failed to insert test space");

        let dek = [0u8; 32]; // Test DEK

        let account = add_social_account(
            &conn,
            "test_space",
            "twitter",
            "testuser",
            Some("Test User"),
            "oauth_token_here",
            &dek,
        )
        .expect("Failed to add social account");

        assert_eq!(account.platform, "twitter");
        assert_eq!(account.username, "testuser");
        assert_eq!(account.enabled, true);

        // Retrieve account
        let retrieved = get_social_account(&conn, &account.id).expect("Failed to get social account");
        assert!(retrieved.is_some());
        assert_eq!(retrieved.expect("Account should exist").username, "testuser");

        // Get all accounts
        let accounts = get_social_accounts(&conn, "test_space").expect("Failed to get accounts");
        assert_eq!(accounts.len(), 1);
    }
}
