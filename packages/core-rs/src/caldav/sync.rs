use crate::caldav::client::get_caldav_account;
use crate::caldav::error::CalDavError;
use crate::caldav::models::{
    CalDavEvent, ConflictResolution, SyncConflict, SyncDirection, SyncResult,
};
use crate::caldav::parser::parse_calendar_response;
use chrono::Utc;
use reqwest::blocking::Client;
use rusqlite::{params, Connection, OptionalExtension};
use ulid::Ulid;

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
        .request(
            reqwest::Method::from_bytes(b"REPORT")
                .map_err(|e| CalDavError::Parse(e.to_string()))?,
            url,
        )
        .basic_auth(username, Some(password))
        .header("Depth", "1")
        .header("Content-Type", "application/xml; charset=utf-8")
        .body(report_body)
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
            "CalDAV REPORT failed: {}",
            response.status()
        )));
    }

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

    const MAX_RESPONSE_SIZE: usize = 10 * 1024 * 1024;
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

/// Sync CalDAV account with real HTTP implementation
pub fn sync_caldav_account(
    conn: &Connection,
    account_id: &str,
    dek: &[u8],
) -> Result<SyncResult, CalDavError> {
    use crate::crypto::decrypt_string;

    let account = get_caldav_account(conn, account_id)?.ok_or(CalDavError::AccountNotFound)?;

    let password = decrypt_string(&account.encrypted_password, dek)
        .map_err(|e| CalDavError::Parse(format!("Failed to decrypt password: {}", e)))?;

    let now = Utc::now().timestamp();
    let mut events_pulled = 0u32;
    let events_pushed = 0u32;
    let mut conflicts = 0u32;
    let mut errors = Vec::new();
    let mut success = true;

    let calendar_url = if account.calendar_path.starts_with("http") {
        account.calendar_path.clone()
    } else {
        format!(
            "{}/{}",
            account.url.trim_end_matches('/'),
            account.calendar_path.trim_start_matches('/')
        )
    };

    if account.sync_direction == SyncDirection::Pull
        || account.sync_direction == SyncDirection::Bidirectional
    {
        match fetch_calendar_events(&calendar_url, &account.username, &password) {
            Ok(remote_events) => {
                events_pulled = remote_events.len() as u32;

                for remote_event in remote_events {
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
                            if let Some(remote_etag) = &remote_event.etag {
                                if let Some(local) = &local_etag {
                                    if local != remote_etag {
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

    if account.sync_direction == SyncDirection::Push
        || account.sync_direction == SyncDirection::Bidirectional
    {
        // PUSH logic placeholder
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

    update_sync_status(conn, account_id, None)?;

    Ok(result)
}
