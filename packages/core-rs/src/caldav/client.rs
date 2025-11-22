use crate::caldav::error::CalDavError;
use crate::caldav::models::{CalDavAccount, SyncDirection};
use chrono::Utc;
use rusqlite::Connection;
use ulid::Ulid;

/// Add a CalDAV account
pub fn add_caldav_account(
    conn: &Connection,
    url: &str,
    username: &str,
    password: &str,
    calendar_path: &str,
    dek: &[u8],
) -> Result<CalDavAccount, CalDavError> {
    use crate::crypto::encrypt_string;

    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();
    let encrypted_password =
        encrypt_string(password, dek).map_err(|e| CalDavError::Parse(e.to_string()))?;

    conn.execute(
        "INSERT INTO caldav_account (
            id, url, username, encrypted_password, calendar_path,
            enabled, auto_sync, sync_frequency_minutes, sync_direction, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, 1, 1, 15, 'bidirectional', ?6)",
        [
            &id,
            url,
            username,
            &encrypted_password,
            calendar_path,
            &now.to_string(),
        ],
    )?;

    Ok(CalDavAccount {
        id: id.clone(),
        url: url.to_string(),
        username: username.to_string(),
        encrypted_password,
        calendar_path: calendar_path.to_string(),
        sync_token: None,
        last_sync: None,
        enabled: true,
        auto_sync: true,
        sync_frequency_minutes: 15,
        sync_direction: SyncDirection::Bidirectional,
        created_at: now,
    })
}

/// Get all CalDAV accounts
pub fn get_caldav_accounts(conn: &Connection) -> Result<Vec<CalDavAccount>, CalDavError> {
    let mut stmt = conn.prepare(
        "SELECT id, url, username, encrypted_password, calendar_path, sync_token, last_sync,
                enabled, auto_sync, sync_frequency_minutes, sync_direction, created_at
         FROM caldav_account
         ORDER BY created_at DESC",
    )?;

    let accounts = stmt.query_map([], |row| {
        let direction_str: String = row.get(10)?;
        let direction = match direction_str.as_str() {
            "pull" => SyncDirection::Pull,
            "push" => SyncDirection::Push,
            _ => SyncDirection::Bidirectional,
        };

        Ok(CalDavAccount {
            id: row.get(0)?,
            url: row.get(1)?,
            username: row.get(2)?,
            encrypted_password: row.get(3)?,
            calendar_path: row.get(4)?,
            sync_token: row.get(5)?,
            last_sync: row.get(6)?,
            enabled: row.get::<_, i32>(7)? == 1,
            auto_sync: row.get::<_, i32>(8)? == 1,
            sync_frequency_minutes: row.get(9)?,
            sync_direction: direction,
            created_at: row.get(11)?,
        })
    })?;

    let mut result = Vec::new();
    for account in accounts {
        result.push(account?);
    }

    Ok(result)
}

/// Get CalDAV account by ID
pub fn get_caldav_account(
    conn: &Connection,
    account_id: &str,
) -> Result<Option<CalDavAccount>, CalDavError> {
    let mut stmt = conn.prepare(
        "SELECT id, url, username, encrypted_password, calendar_path, sync_token, last_sync,
                enabled, auto_sync, sync_frequency_minutes, sync_direction, created_at
         FROM caldav_account WHERE id = ?1",
    )?;

    let result = stmt.query_row([account_id], |row| {
        let direction_str: String = row.get(10)?;
        let direction = match direction_str.as_str() {
            "pull" => SyncDirection::Pull,
            "push" => SyncDirection::Push,
            _ => SyncDirection::Bidirectional,
        };

        Ok(CalDavAccount {
            id: row.get(0)?,
            url: row.get(1)?,
            username: row.get(2)?,
            encrypted_password: row.get(3)?,
            calendar_path: row.get(4)?,
            sync_token: row.get(5)?,
            last_sync: row.get(6)?,
            enabled: row.get::<_, i32>(7)? == 1,
            auto_sync: row.get::<_, i32>(8)? == 1,
            sync_frequency_minutes: row.get(9)?,
            sync_direction: direction,
            created_at: row.get(11)?,
        })
    });

    match result {
        Ok(account) => Ok(Some(account)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Update CalDAV account settings
pub fn update_caldav_account(
    conn: &Connection,
    account_id: &str,
    enabled: Option<bool>,
    auto_sync: Option<bool>,
    sync_frequency: Option<i32>,
    sync_direction: Option<SyncDirection>,
    url: Option<&str>,
    username: Option<&str>,
    password: Option<&str>,
    calendar_path: Option<&str>,
    dek: Option<&[u8]>,
) -> Result<(), CalDavError> {
    if let Some(enabled) = enabled {
        conn.execute(
            "UPDATE caldav_account SET enabled = ?1 WHERE id = ?2",
            [&(if enabled { 1 } else { 0 }).to_string(), account_id],
        )?;
    }

    if let Some(auto_sync) = auto_sync {
        conn.execute(
            "UPDATE caldav_account SET auto_sync = ?1 WHERE id = ?2",
            [&(if auto_sync { 1 } else { 0 }).to_string(), account_id],
        )?;
    }

    if let Some(frequency) = sync_frequency {
        conn.execute(
            "UPDATE caldav_account SET sync_frequency_minutes = ?1 WHERE id = ?2",
            [&frequency.to_string(), account_id],
        )?;
    }

    if let Some(direction) = sync_direction {
        conn.execute(
            "UPDATE caldav_account SET sync_direction = ?1 WHERE id = ?2",
            [direction.as_str(), account_id],
        )?;
    }

    if let Some(u) = url {
        conn.execute("UPDATE caldav_account SET url = ?1 WHERE id = ?2", [u, account_id])?;
    }
    if let Some(u) = username {
        conn.execute("UPDATE caldav_account SET username = ?1 WHERE id = ?2", [u, account_id])?;
    }
    if let Some(c) = calendar_path {
        conn.execute("UPDATE caldav_account SET calendar_path = ?1 WHERE id = ?2", [c, account_id])?;
    }
    if let Some(p) = password {
        if let Some(k) = dek {
             use crate::crypto::encrypt_string;
             let enc = encrypt_string(p, k).map_err(|e| CalDavError::Parse(e.to_string()))?;
             conn.execute("UPDATE caldav_account SET encrypted_password = ?1 WHERE id = ?2", [&enc, account_id])?;
        } else {
            return Err(CalDavError::Authentication); // Missing DEK
        }
    }

    Ok(())
}

/// Delete CalDAV account
pub fn delete_caldav_account(conn: &Connection, account_id: &str) -> Result<(), CalDavError> {
    conn.execute("DELETE FROM caldav_account WHERE id = ?1", [account_id])?;
    Ok(())
}
