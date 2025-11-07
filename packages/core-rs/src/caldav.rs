use chrono::{DateTime, Utc};
use reqwest::blocking::Client;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum CalDavError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Network error: {0}")]
    Network(String),
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Authentication error")]
    Authentication,
    #[error("Parse error: {0}")]
    Parse(String),
    #[error("Sync conflict: {0}")]
    Conflict(String),
    #[error("Account not found")]
    AccountNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalDavAccount {
    pub id: String,
    pub url: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub encrypted_password: String,
    pub calendar_path: String,
    pub sync_token: Option<String>,
    pub last_sync: Option<i64>,
    pub enabled: bool,
    pub auto_sync: bool,
    pub sync_frequency_minutes: i32,
    pub sync_direction: SyncDirection,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SyncDirection {
    Pull,
    Push,
    Bidirectional,
}

impl SyncDirection {
    pub fn as_str(&self) -> &'static str {
        match self {
            SyncDirection::Pull => "pull",
            SyncDirection::Push => "push",
            SyncDirection::Bidirectional => "bidirectional",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalDavEvent {
    pub uid: String,
    pub summary: String,
    pub description: Option<String>,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub location: Option<String>,
    pub status: String,
    pub last_modified: i64,
    pub etag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    pub account_id: String,
    pub sync_time: i64,
    pub direction: SyncDirection,
    pub events_pulled: u32,
    pub events_pushed: u32,
    pub conflicts: u32,
    pub errors: Vec<String>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    pub id: String,
    pub account_id: String,
    pub event_uid: String,
    pub local_version: String,
    pub remote_version: String,
    pub detected_at: i64,
    pub resolved: bool,
    pub resolution: Option<ConflictResolution>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConflictResolution {
    AcceptLocal,
    AcceptRemote,
    Merge,
}

/// Initialize CalDAV tables
pub fn init_caldav_tables(conn: &Connection) -> Result<(), CalDavError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_account (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            username TEXT NOT NULL,
            encrypted_password TEXT NOT NULL,
            calendar_path TEXT NOT NULL,
            sync_token TEXT,
            last_sync INTEGER,
            enabled INTEGER NOT NULL DEFAULT 1,
            auto_sync INTEGER NOT NULL DEFAULT 1,
            sync_frequency_minutes INTEGER NOT NULL DEFAULT 15,
            sync_direction TEXT NOT NULL DEFAULT 'bidirectional',
            created_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_event_mapping (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            caldav_uid TEXT NOT NULL,
            local_task_id TEXT,
            local_note_id TEXT,
            etag TEXT,
            last_synced INTEGER NOT NULL,
            FOREIGN KEY (account_id) REFERENCES caldav_account(id) ON DELETE CASCADE,
            UNIQUE(account_id, caldav_uid)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_sync_history (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            sync_time INTEGER NOT NULL,
            direction TEXT NOT NULL,
            events_pulled INTEGER NOT NULL DEFAULT 0,
            events_pushed INTEGER NOT NULL DEFAULT 0,
            conflicts INTEGER NOT NULL DEFAULT 0,
            success INTEGER NOT NULL DEFAULT 1,
            error_message TEXT,
            FOREIGN KEY (account_id) REFERENCES caldav_account(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS caldav_conflict (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            event_uid TEXT NOT NULL,
            local_version_json TEXT NOT NULL,
            remote_version_json TEXT NOT NULL,
            detected_at INTEGER NOT NULL,
            resolved INTEGER NOT NULL DEFAULT 0,
            resolution TEXT,
            resolved_at INTEGER,
            FOREIGN KEY (account_id) REFERENCES caldav_account(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_caldav_event_mapping_account ON caldav_event_mapping(account_id)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_caldav_sync_history_account ON caldav_sync_history(account_id, sync_time DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_caldav_conflict_resolved ON caldav_conflict(account_id, resolved)",
        [],
    )?;

    Ok(())
}

/// Add a CalDAV account
pub fn add_caldav_account(
    conn: &Connection,
    url: &str,
    username: &str,
    password: &str,
    calendar_path: &str,
    dek: &[u8], // Data Encryption Key for password encryption
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

    Ok(())
}

/// Delete CalDAV account
pub fn delete_caldav_account(conn: &Connection, account_id: &str) -> Result<(), CalDavError> {
    conn.execute("DELETE FROM caldav_account WHERE id = ?1", [account_id])?;
    Ok(())
}

/// Update sync token and last sync time
pub fn update_sync_status(
    conn: &Connection,
    account_id: &str,
    sync_token: Option<&str>,
) -> Result<(), CalDavError> {
    let now = Utc::now().timestamp();

    if let Some(token) = sync_token {
        conn.execute(
            "UPDATE caldav_account SET sync_token = ?1, last_sync = ?2 WHERE id = ?3",
            [token, &now.to_string(), account_id],
        )?;
    } else {
        conn.execute(
            "UPDATE caldav_account SET last_sync = ?1 WHERE id = ?2",
            [&now.to_string(), account_id],
        )?;
    }

    Ok(())
}

/// Record sync history
pub fn record_sync_history(
    conn: &Connection,
    account_id: &str,
    direction: SyncDirection,
    events_pulled: u32,
    events_pushed: u32,
    conflicts: u32,
    success: bool,
    error_message: Option<&str>,
) -> Result<String, CalDavError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO caldav_sync_history (
            id, account_id, sync_time, direction, events_pulled, events_pushed,
            conflicts, success, error_message
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        [
            &id,
            account_id,
            &now.to_string(),
            direction.as_str(),
            &events_pulled.to_string(),
            &events_pushed.to_string(),
            &conflicts.to_string(),
            &(if success { 1 } else { 0 }).to_string(),
            &error_message.unwrap_or("").to_string(),
        ],
    )?;

    Ok(id)
}

/// Get sync history for account
pub fn get_sync_history(
    conn: &Connection,
    account_id: &str,
    limit: u32,
) -> Result<Vec<SyncResult>, CalDavError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, sync_time, direction, events_pulled, events_pushed,
                conflicts, success, error_message
         FROM caldav_sync_history
         WHERE account_id = ?1
         ORDER BY sync_time DESC
         LIMIT ?2",
    )?;

    let results = stmt.query_map([account_id, &limit.to_string()], |row| {
        let direction_str: String = row.get(3)?;
        let direction = match direction_str.as_str() {
            "pull" => SyncDirection::Pull,
            "push" => SyncDirection::Push,
            _ => SyncDirection::Bidirectional,
        };

        let error_message: Option<String> = row.get(8)?;
        let errors = if let Some(msg) = error_message {
            if msg.is_empty() {
                Vec::new()
            } else {
                vec![msg]
            }
        } else {
            Vec::new()
        };

        Ok(SyncResult {
            account_id: row.get(1)?,
            sync_time: row.get(2)?,
            direction,
            events_pulled: row.get::<_, i32>(4)? as u32,
            events_pushed: row.get::<_, i32>(5)? as u32,
            conflicts: row.get::<_, i32>(6)? as u32,
            errors,
            success: row.get::<_, i32>(7)? == 1,
        })
    })?;

    let mut sync_results = Vec::new();
    for result in results {
        sync_results.push(result?);
    }

    Ok(sync_results)
}

/// Create sync conflict record
pub fn create_sync_conflict(
    conn: &Connection,
    account_id: &str,
    event_uid: &str,
    local_version: &str,
    remote_version: &str,
) -> Result<String, CalDavError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    conn.execute(
        "INSERT INTO caldav_conflict (
            id, account_id, event_uid, local_version_json, remote_version_json,
            detected_at, resolved
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        [
            &id,
            account_id,
            event_uid,
            local_version,
            remote_version,
            &now.to_string(),
        ],
    )?;

    Ok(id)
}

/// Get unresolved conflicts for account
pub fn get_unresolved_conflicts(
    conn: &Connection,
    account_id: &str,
) -> Result<Vec<SyncConflict>, CalDavError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_id, event_uid, local_version_json, remote_version_json,
                detected_at, resolved, resolution
         FROM caldav_conflict
         WHERE account_id = ?1 AND resolved = 0
         ORDER BY detected_at DESC",
    )?;

    let conflicts = stmt.query_map([account_id], |row| {
        let resolution_str: Option<String> = row.get(7)?;
        let resolution = resolution_str.and_then(|r| match r.as_str() {
            "accept_local" => Some(ConflictResolution::AcceptLocal),
            "accept_remote" => Some(ConflictResolution::AcceptRemote),
            "merge" => Some(ConflictResolution::Merge),
            _ => None,
        });

        Ok(SyncConflict {
            id: row.get(0)?,
            account_id: row.get(1)?,
            event_uid: row.get(2)?,
            local_version: row.get(3)?,
            remote_version: row.get(4)?,
            detected_at: row.get(5)?,
            resolved: row.get::<_, i32>(6)? == 1,
            resolution,
        })
    })?;

    let mut result = Vec::new();
    for conflict in conflicts {
        result.push(conflict?);
    }

    Ok(result)
}

/// Resolve sync conflict
pub fn resolve_conflict(
    conn: &Connection,
    conflict_id: &str,
    resolution: ConflictResolution,
) -> Result<(), CalDavError> {
    let now = Utc::now().timestamp();
    let resolution_str = match resolution {
        ConflictResolution::AcceptLocal => "accept_local",
        ConflictResolution::AcceptRemote => "accept_remote",
        ConflictResolution::Merge => "merge",
    };

    conn.execute(
        "UPDATE caldav_conflict SET resolved = 1, resolution = ?1, resolved_at = ?2 WHERE id = ?3",
        [resolution_str, &now.to_string(), conflict_id],
    )?;

    Ok(())
}

/// Map CalDAV event to local task/note
pub fn map_caldav_event(
    conn: &Connection,
    account_id: &str,
    caldav_uid: &str,
    local_task_id: Option<&str>,
    local_note_id: Option<&str>,
    etag: Option<&str>,
) -> Result<String, CalDavError> {
    // Try to fetch existing mapping to preserve stable `id`
    let mut stmt = conn
        .prepare("SELECT id FROM caldav_event_mapping WHERE account_id = ?1 AND caldav_uid = ?2")
        .map_err(CalDavError::Database)?;
    let existing_id: Option<String> = stmt
        .query_row(params![&account_id, &caldav_uid], |row| row.get(0))
        .optional()
        .map_err(CalDavError::Database)?;

    let now = Utc::now().timestamp();
    let id = existing_id.unwrap_or_else(|| Ulid::new().to_string());

    // Upsert by unique(account_id, caldav_uid)
    conn.execute(
        "INSERT INTO caldav_event_mapping (id, account_id, caldav_uid, local_task_id, local_note_id, etag, last_synced)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(account_id, caldav_uid) DO UPDATE SET
           local_task_id = excluded.local_task_id,
           local_note_id = excluded.local_note_id,
           etag = excluded.etag,
           last_synced = excluded.last_synced",
        params![
            &id,
            account_id,
            caldav_uid,
            local_task_id, // NULL when None
            local_note_id, // NULL when None
            etag,          // NULL when None
            now
        ],
    )?;

    Ok(id)
}

/// Fetch calendar events from CalDAV server using REPORT request
fn fetch_calendar_events(
    url: &str,
    username: &str,
    password: &str,
) -> Result<Vec<CalDavEvent>, CalDavError> {
    // SECURITY: Enforce HTTPS for credential transmission
    if !url.starts_with("https://")
        && !url.starts_with("http://localhost")
        && !url.starts_with("http://127.0.0.1")
    {
        return Err(CalDavError::Network(
            "CalDAV URL must use HTTPS (or localhost for testing). HTTP is insecure for credential transmission.".to_string()
        ));
    }

    // SECURITY: Disable automatic redirects to prevent credential leakage
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    // CalDAV calendar-query REPORT request
    let report_body = r#"<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT"/>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>"#;

    let response = client
        .request(reqwest::Method::from_bytes(b"REPORT")?, url)
        .basic_auth(username, Some(password))
        .header("Depth", "1")
        .header("Content-Type", "application/xml; charset=utf-8")
        .body(report_body)
        .send()?;

    // SECURITY: Detect and reject redirects to prevent credential leakage
    if response.status().is_redirection() {
        return Err(CalDavError::Network(format!(
            "Unexpected redirect ({}). Redirects are disabled for security.",
            response.status()
        )));
    }

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(CalDavError::Authentication);
    }

    if !response.status().is_success() {
        return Err(CalDavError::Network(format!(
            "CalDAV REPORT failed: {}",
            response.status()
        )));
    }

    // SECURITY: Validate content type to ensure we're parsing XML
    if let Some(content_type) = response.headers().get(reqwest::header::CONTENT_TYPE) {
        match content_type.to_str() {
            Ok(ct) => {
                if !ct.contains("xml") && !ct.contains("text/calendar") {
                    return Err(CalDavError::Parse(format!(
                        "Unexpected content type (expected XML): {}",
                        ct
                    )));
                }
            }
            Err(_) => {
                return Err(CalDavError::Parse(
                    "Invalid Content-Type header encoding".to_string(),
                ));
            }
        }
    }

    // SECURITY: Enforce maximum payload size to prevent memory exhaustion
    // CalDAV responses can be large for calendars with many events, but 10MB is reasonable
    const MAX_RESPONSE_SIZE: usize = 10 * 1024 * 1024; // 10 MB
    let bytes = response.bytes()?;
    if bytes.len() > MAX_RESPONSE_SIZE {
        return Err(CalDavError::Network(format!(
            "CalDAV REPORT response too large: {} bytes (limit: {} bytes)",
            bytes.len(),
            MAX_RESPONSE_SIZE
        )));
    }

    let response_text = String::from_utf8_lossy(&bytes).to_string();
    parse_calendar_response(&response_text)
}

/// Sanitize event UID to prevent path traversal attacks
///
/// SECURITY: UIDs are used to construct filesystem-like paths in CalDAV URLs.
/// Malicious UIDs containing path traversal sequences (../, //, etc.) could
/// potentially access or modify unintended calendar resources.
fn sanitize_event_uid(uid: &str) -> Result<String, CalDavError> {
    // Remove all forward and backward slashes
    let sanitized = uid.replace('/', "").replace('\\', "").trim().to_string();

    // Reject if empty after sanitization
    if sanitized.is_empty() {
        return Err(CalDavError::Parse(
            "Invalid event UID: empty after sanitization".to_string(),
        ));
    }

    // Reject if contains path traversal sequences
    if sanitized.contains("..") {
        return Err(CalDavError::Parse(
            "Invalid event UID: contains path traversal sequence (..)".to_string(),
        ));
    }

    // Reject control characters and other dangerous characters
    if sanitized.chars().any(|c| c.is_control() || c == '\0') {
        return Err(CalDavError::Parse(
            "Invalid event UID: contains control characters".to_string(),
        ));
    }

    // Limit UID length to prevent excessive URL lengths
    if sanitized.len() > 255 {
        return Err(CalDavError::Parse(
            "Invalid event UID: exceeds maximum length (255 characters)".to_string(),
        ));
    }

    Ok(sanitized)
}

/// Push calendar event to CalDAV server using PUT request
fn push_calendar_event(
    url: &str,
    username: &str,
    password: &str,
    event: &CalDavEvent,
) -> Result<String, CalDavError> {
    // SECURITY: Enforce HTTPS
    if !url.starts_with("https://")
        && !url.starts_with("http://localhost")
        && !url.starts_with("http://127.0.0.1")
    {
        return Err(CalDavError::Network(
            "CalDAV URL must use HTTPS (or localhost for testing). HTTP is insecure for credential transmission.".to_string()
        ));
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let ical_data = generate_icalendar(event)?;

    // SECURITY: Sanitize UID to prevent path traversal
    let safe_uid = sanitize_event_uid(&event.uid)?;
    let event_url = format!("{}/{}.ics", url.trim_end_matches('/'), safe_uid);

    let response = client
        .put(&event_url)
        .basic_auth(username, Some(password))
        .header("Content-Type", "text/calendar; charset=utf-8")
        .body(ical_data)
        .send()?;

    if response.status().is_redirection() {
        return Err(CalDavError::Network(format!(
            "Unexpected redirect ({}). Redirects are disabled for security.",
            response.status()
        )));
    }

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(CalDavError::Authentication);
    }

    if !response.status().is_success() {
        return Err(CalDavError::Network(format!(
            "CalDAV PUT failed: {}",
            response.status()
        )));
    }

    // Extract ETag from response headers
    let etag = response
        .headers()
        .get("etag")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();

    Ok(etag)
}

/// Delete calendar event from CalDAV server using DELETE request
fn delete_calendar_event(
    url: &str,
    username: &str,
    password: &str,
    event_uid: &str,
) -> Result<(), CalDavError> {
    // SECURITY: Enforce HTTPS
    if !url.starts_with("https://")
        && !url.starts_with("http://localhost")
        && !url.starts_with("http://127.0.0.1")
    {
        return Err(CalDavError::Network(
            "CalDAV URL must use HTTPS (or localhost for testing). HTTP is insecure for credential transmission.".to_string()
        ));
    }

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    // SECURITY: Sanitize UID to prevent path traversal
    let safe_uid = sanitize_event_uid(event_uid)?;
    let event_url = format!("{}/{}.ics", url.trim_end_matches('/'), safe_uid);

    let response = client
        .delete(&event_url)
        .basic_auth(username, Some(password))
        .send()?;

    if response.status().is_redirection() {
        return Err(CalDavError::Network(format!(
            "Unexpected redirect ({}). Redirects are disabled for security.",
            response.status()
        )));
    }

    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(CalDavError::Authentication);
    }

    if !response.status().is_success() && response.status() != reqwest::StatusCode::NOT_FOUND {
        return Err(CalDavError::Network(format!(
            "CalDAV DELETE failed: {}",
            response.status()
        )));
    }

    Ok(())
}

/// Parse CalDAV XML response and extract calendar events
///
/// This function uses tolerant XML parsing that handles various namespace prefixes
/// and case variations commonly seen in CalDAV responses from different servers.
///
/// SECURITY NOTE: This uses simple string matching for XML parsing which is fragile
/// but acceptable for CalDAV's limited, trusted CalDAV server responses. For production
/// deployments with untrusted or complex XML, migrate to a proper XML parser like quick-xml
/// to protect against entity expansion attacks, XML bombs, and other XML-specific vulnerabilities.
///
/// Mitigation: CalDAV servers are explicitly configured by users (not arbitrary internet sources),
/// and the format is standardized (RFC 4791), reducing attack surface.
fn parse_calendar_response(xml_data: &str) -> Result<Vec<CalDavEvent>, CalDavError> {
    let mut events = Vec::new();

    // Convert to lowercase for case-insensitive matching
    let lower_xml = xml_data.to_lowercase();

    // Find all calendar-data elements (namespace-agnostic, case-insensitive)
    // Matches: <c:calendar-data>, <cal:calendar-data>, <C:CALENDAR-DATA>, etc.
    let mut search_pos = 0;
    while let Some(start_idx) = lower_xml[search_pos..].find(":calendar-data>") {
        let tag_start_pos = search_pos + start_idx;
        if let Some(_open_bracket) = lower_xml[..tag_start_pos].rfind('<') {
            let content_start = tag_start_pos + ":calendar-data>".len();

            if let Some(close_idx) = lower_xml[content_start..].find("</") {
                let close_tag_start = content_start + close_idx;

                // Verify this is actually a calendar-data closing tag
                let is_calendar_close = lower_xml[close_tag_start..].starts_with("</")
                    && (lower_xml[close_tag_start + 2..].starts_with("c:calendar-data>")
                        || lower_xml[close_tag_start + 2..].starts_with("cal:calendar-data>")
                        || lower_xml[close_tag_start + 2..].starts_with("calendar-data>"));

                if is_calendar_close {
                    let ical_data = &xml_data[content_start..close_tag_start];

                    if let Ok(mut parsed_events) = parse_icalendar(ical_data) {
                        events.append(&mut parsed_events);
                    }

                    search_pos = close_tag_start + "calendar-data>".len();
                } else {
                    search_pos = content_start;
                }
            } else {
                break;
            }
        } else {
            search_pos = tag_start_pos + 1;
        }
    }

    Ok(events)
}

/// Parse iCalendar format to CalDavEvent
///
/// SECURITY: Skip events with missing or unparsable required fields (UID, DTSTART)
/// instead of defaulting to sentinel values like 0, which could cause data corruption.
fn parse_icalendar(ical_data: &str) -> Result<Vec<CalDavEvent>, CalDavError> {
    use ical::parser::Component;
    use std::io::BufReader;

    let buf = BufReader::new(ical_data.as_bytes());
    let reader = ical::IcalParser::new(buf);

    let mut events = Vec::new();

    for calendar in reader {
        let calendar = calendar.map_err(|e| CalDavError::Parse(e.to_string()))?;

        for event in calendar.events {
            let mut uid: Option<String> = None;
            let mut summary = String::new();
            let mut description = None;
            let mut start_time: Option<i64> = None;
            let mut end_time: Option<i64> = None;
            let mut location = None;
            let mut status = "CONFIRMED".to_string();
            let mut last_modified: Option<i64> = None;

            for property in event.properties {
                match property.name.as_str() {
                    "UID" => {
                        uid = Some(property.value.unwrap_or_default());
                    }
                    "SUMMARY" => {
                        summary = property.value.unwrap_or_default();
                    }
                    "DESCRIPTION" => {
                        description = property.value;
                    }
                    "DTSTART" => {
                        if let Some(val) = property.value {
                            // Skip event if DTSTART cannot be parsed
                            if let Ok(ts) = parse_ical_datetime(&val) {
                                start_time = Some(ts);
                            }
                        }
                    }
                    "DTEND" => {
                        if let Some(val) = property.value {
                            // DTEND is optional; only set if parsable
                            if let Ok(ts) = parse_ical_datetime(&val) {
                                end_time = Some(ts);
                            }
                        }
                    }
                    "LOCATION" => {
                        location = property.value;
                    }
                    "STATUS" => {
                        status = property.value.unwrap_or_else(|| "CONFIRMED".to_string());
                    }
                    "LAST-MODIFIED" => {
                        if let Some(val) = property.value {
                            if let Ok(ts) = parse_ical_datetime(&val) {
                                last_modified = Some(ts);
                            }
                        }
                    }
                    _ => {}
                }
            }

            // Validate required fields before adding event
            let uid = match uid {
                Some(u) if !u.is_empty() => u,
                _ => continue, // Skip events without valid UID
            };

            let start_time = match start_time {
                Some(ts) => ts,
                None => continue, // Skip events without valid DTSTART
            };

            // Use current timestamp if LAST-MODIFIED is missing
            let last_modified = last_modified.unwrap_or_else(|| Utc::now().timestamp());

            events.push(CalDavEvent {
                uid,
                summary,
                description,
                start_time,
                end_time,
                location,
                status,
                last_modified,
                etag: None,
            });
        }
    }

    Ok(events)
}

/// Parse iCalendar datetime format to Unix timestamp
///
/// Supports multiple iCalendar datetime formats:
/// - All-day events: YYYYMMDD (e.g., "20250107")
/// - DateTime: YYYYMMDDTHHMMSS (e.g., "20250107T143000")
/// - DateTime UTC: YYYYMMDDTHHMMSSZ (e.g., "20250107T143000Z")
/// - With separators: YYYY-MM-DDTHH:MM:SSZ
///
/// SECURITY NOTE: Manual string slicing is used here for performance and to avoid
/// external parser dependencies. Input is validated at each step with bounds checks
/// and parse error handling. This is acceptable because:
/// 1. Input comes from trusted CalDAV servers (user-configured, RFC 4791 compliant)
/// 2. All slicing operations use safe bounds checking
/// 3. chrono validates date/time values for correctness
///
/// For production with untrusted datetime sources, consider a formal datetime parser.
fn parse_ical_datetime(datetime_str: &str) -> Result<i64, CalDavError> {
    use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

    // Normalize and trim input
    let trimmed = datetime_str.trim();
    if trimmed.is_empty() {
        return Err(CalDavError::Parse("Empty datetime string".to_string()));
    }

    // Remove common separators (: and -)
    let clean_str = trimmed.replace([':', '-'], "");

    // Check for UTC 'Z' suffix and remove it
    let is_utc = clean_str.ends_with('Z') || clean_str.ends_with('z');
    let clean_str = if is_utc {
        &clean_str[..clean_str.len() - 1]
    } else {
        &clean_str
    };

    // All-day event format: YYYYMMDD (8 digits, no time component)
    if clean_str.len() == 8 && clean_str.chars().all(|c| c.is_ascii_digit()) {
        let year: i32 = clean_str
            .get(0..4)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CalDavError::Parse(format!("Invalid year in '{}'", datetime_str)))?;

        let month: u32 = clean_str
            .get(4..6)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CalDavError::Parse(format!("Invalid month in '{}'", datetime_str)))?;

        let day: u32 = clean_str
            .get(6..8)
            .and_then(|s| s.parse().ok())
            .ok_or_else(|| CalDavError::Parse(format!("Invalid day in '{}'", datetime_str)))?;

        let date = NaiveDate::from_ymd_opt(year, month, day).ok_or_else(|| {
            CalDavError::Parse(format!(
                "Invalid date values: year={}, month={}, day={}",
                year, month, day
            ))
        })?;

        // All-day events start at midnight UTC
        let datetime = NaiveDateTime::new(date, NaiveTime::from_hms_opt(0, 0, 0).unwrap());
        return Ok(datetime.and_utc().timestamp());
    }

    // DateTime format: Split on 'T' if present, otherwise assume contiguous date+time
    let (date_part, time_part) = if let Some(t_pos) = clean_str.find('T') {
        (&clean_str[0..t_pos], &clean_str[t_pos + 1..])
    } else if clean_str.len() >= 15 {
        // No 'T' separator, assume YYYYMMDDHHMMSS format
        (&clean_str[0..8], &clean_str[8..])
    } else {
        return Err(CalDavError::Parse(format!(
            "Invalid datetime format (expected YYYYMMDD or YYYYMMDDTHHMMSS): '{}'",
            datetime_str
        )));
    };

    // Validate date part is exactly 8 characters
    if date_part.len() != 8 {
        return Err(CalDavError::Parse(format!(
            "Invalid date part length (expected 8, got {}): '{}'",
            date_part.len(),
            datetime_str
        )));
    }

    // Validate time part is at least 6 characters (HHMMSS)
    if time_part.len() < 6 {
        return Err(CalDavError::Parse(format!(
            "Invalid time part length (expected at least 6, got {}): '{}'",
            time_part.len(),
            datetime_str
        )));
    }

    // Parse date components
    let year: i32 = date_part
        .get(0..4)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid year in '{}'", datetime_str)))?;

    let month: u32 = date_part
        .get(4..6)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid month in '{}'", datetime_str)))?;

    let day: u32 = date_part
        .get(6..8)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid day in '{}'", datetime_str)))?;

    // Parse time components
    let hour: u32 = time_part
        .get(0..2)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid hour in '{}'", datetime_str)))?;

    let minute: u32 = time_part
        .get(2..4)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid minute in '{}'", datetime_str)))?;

    let second: u32 = time_part
        .get(4..6)
        .and_then(|s| s.parse().ok())
        .ok_or_else(|| CalDavError::Parse(format!("Invalid second in '{}'", datetime_str)))?;

    // Validate date and time values with chrono
    let date = NaiveDate::from_ymd_opt(year, month, day).ok_or_else(|| {
        CalDavError::Parse(format!(
            "Invalid date values: year={}, month={}, day={}",
            year, month, day
        ))
    })?;

    let time = NaiveTime::from_hms_opt(hour, minute, second).ok_or_else(|| {
        CalDavError::Parse(format!(
            "Invalid time values: hour={}, minute={}, second={}",
            hour, minute, second
        ))
    })?;

    let datetime = NaiveDateTime::new(date, time);

    // Treat as UTC (iCalendar spec: dates without timezone info are floating,
    // but we normalize to UTC for consistency)
    Ok(datetime.and_utc().timestamp())
}

/// Generate iCalendar format from CalDavEvent
fn generate_icalendar(event: &CalDavEvent) -> Result<String, CalDavError> {
    use chrono::TimeZone;

    let start_dt = Utc
        .timestamp_opt(event.start_time, 0)
        .single()
        .ok_or_else(|| CalDavError::Parse("Invalid start time".to_string()))?;

    let start_str = start_dt.format("%Y%m%dT%H%M%SZ").to_string();

    let end_str = if let Some(end_time) = event.end_time {
        let end_dt = Utc
            .timestamp_opt(end_time, 0)
            .single()
            .ok_or_else(|| CalDavError::Parse("Invalid end time".to_string()))?;
        end_dt.format("%Y%m%dT%H%M%SZ").to_string()
    } else {
        // Default to 1 hour after start
        start_dt
            .checked_add_signed(chrono::Duration::hours(1))
            .unwrap_or(start_dt)
            .format("%Y%m%dT%H%M%SZ")
            .to_string()
    };

    let now_str = Utc::now().format("%Y%m%dT%H%M%SZ").to_string();

    let mut ical = format!(
        "BEGIN:VCALENDAR\r\n\
         VERSION:2.0\r\n\
         PRODID:-//Noteece//CalDAV Sync//EN\r\n\
         BEGIN:VEVENT\r\n\
         UID:{}\r\n\
         DTSTAMP:{}\r\n\
         DTSTART:{}\r\n\
         DTEND:{}\r\n\
         SUMMARY:{}\r\n",
        event.uid, now_str, start_str, end_str, event.summary
    );

    if let Some(desc) = &event.description {
        ical.push_str(&format!("DESCRIPTION:{}\r\n", desc.replace('\n', "\\n")));
    }

    if let Some(loc) = &event.location {
        ical.push_str(&format!("LOCATION:{}\r\n", loc));
    }

    ical.push_str(&format!("STATUS:{}\r\n", event.status));
    ical.push_str("END:VEVENT\r\nEND:VCALENDAR\r\n");

    Ok(ical)
}

/// Sync CalDAV account with real HTTP implementation
pub fn sync_caldav_account(
    conn: &Connection,
    account_id: &str,
    dek: &[u8],
) -> Result<SyncResult, CalDavError> {
    use crate::crypto::decrypt_string;

    let account = get_caldav_account(conn, account_id)?.ok_or(CalDavError::AccountNotFound)?;

    // Decrypt password
    let password = decrypt_string(&account.encrypted_password, dek)
        .map_err(|e| CalDavError::Parse(format!("Failed to decrypt password: {}", e)))?;

    let now = Utc::now().timestamp();
    let mut events_pulled = 0u32;
    let mut events_pushed = 0u32;
    let mut conflicts = 0u32;
    let mut errors = Vec::new();
    let mut success = true;

    // Build full calendar URL
    let calendar_url = if account.calendar_path.starts_with("http") {
        account.calendar_path.clone()
    } else {
        format!(
            "{}/{}",
            account.url.trim_end_matches('/'),
            account.calendar_path.trim_start_matches('/')
        )
    };

    // Pull events from server if direction is Pull or Bidirectional
    if account.sync_direction == SyncDirection::Pull
        || account.sync_direction == SyncDirection::Bidirectional
    {
        match fetch_calendar_events(&calendar_url, &account.username, &password) {
            Ok(remote_events) => {
                events_pulled = remote_events.len() as u32;

                // Process each remote event
                for remote_event in remote_events {
                    // Check if event already exists locally
                    let mut stmt = conn
                        .prepare(
                            "SELECT id, etag FROM caldav_event_mapping \
                             WHERE account_id = ?1 AND caldav_uid = ?2",
                        )
                        .map_err(CalDavError::Database)?;

                    let existing: Option<(String, Option<String>)> = stmt
                        .query_row(params![account_id, &remote_event.uid], |row| {
                            Ok((row.get(0)?, row.get(1)?))
                        })
                        .optional()
                        .map_err(CalDavError::Database)?;

                    match existing {
                        Some((_mapping_id, local_etag)) => {
                            // Event exists - check for conflicts
                            if let Some(remote_etag) = &remote_event.etag {
                                if let Some(local) = &local_etag {
                                    if local != remote_etag {
                                        // Conflict detected - ETags differ
                                        let local_json = serde_json::to_string(&remote_event)
                                            .unwrap_or_default();
                                        let remote_json = serde_json::to_string(&remote_event)
                                            .unwrap_or_default();

                                        if let Err(e) = create_sync_conflict(
                                            conn,
                                            account_id,
                                            &remote_event.uid,
                                            &local_json,
                                            &remote_json,
                                        ) {
                                            errors
                                                .push(format!("Failed to record conflict: {}", e));
                                        } else {
                                            conflicts += 1;
                                        }
                                    }
                                }
                            }
                        }
                        None => {
                            // New event - create mapping
                            if let Err(e) = map_caldav_event(
                                conn,
                                account_id,
                                &remote_event.uid,
                                None,
                                None,
                                remote_event.etag.as_deref(),
                            ) {
                                errors.push(format!(
                                    "Failed to map event {}: {}",
                                    remote_event.uid, e
                                ));
                            }
                        }
                    }
                }
            }
            Err(e) => {
                success = false;
                errors.push(format!("Failed to fetch events: {}", e));
            }
        }
    }

    // Push local events to server if direction is Push or Bidirectional
    if account.sync_direction == SyncDirection::Push
        || account.sync_direction == SyncDirection::Bidirectional
    {
        // Get local events that need to be pushed
        // For now, this is a simplified implementation
        // In production, you'd track which local events have been modified
        // and need to be synced to the server
    }

    let result = SyncResult {
        account_id: account_id.to_string(),
        sync_time: now,
        direction: account.sync_direction.clone(),
        events_pulled,
        events_pushed,
        conflicts,
        errors: errors.clone(),
        success,
    };

    // Record sync history
    let error_message = if errors.is_empty() {
        None
    } else {
        Some(errors.join("; "))
    };

    record_sync_history(
        conn,
        account_id,
        account.sync_direction,
        result.events_pulled,
        result.events_pushed,
        result.conflicts,
        result.success,
        error_message.as_deref(),
    )?;

    // Update sync status
    update_sync_status(conn, account_id, None)?;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_direction_serialization() {
        assert_eq!(SyncDirection::Pull.as_str(), "pull");
        assert_eq!(SyncDirection::Push.as_str(), "push");
        assert_eq!(SyncDirection::Bidirectional.as_str(), "bidirectional");
    }

    #[test]
    fn test_conflict_resolution() {
        // Test conflict resolution enum
        let resolution = ConflictResolution::AcceptLocal;
        assert_eq!(resolution, ConflictResolution::AcceptLocal);
    }
}
