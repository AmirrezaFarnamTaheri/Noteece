use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub user_id: Option<String>,
    pub event_type: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub details_json: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: i64,
}

#[allow(clippy::too_many_arguments)]
pub fn log_event(
    conn: &Connection,
    user_id: Option<&str>,
    event_type: &str,
    entity_type: &str,
    entity_id: Option<&str>,
    details_json: Option<&str>,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
) -> Result<String> {
    let id = Ulid::new().to_string();
    let created_at = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO audit_log (
            id, user_id, event_type, entity_type, entity_id,
            details_json, ip_address, user_agent, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id,
            user_id,
            event_type,
            entity_type,
            entity_id,
            details_json,
            ip_address,
            user_agent,
            created_at
        ],
    )?;

    Ok(id)
}

pub fn get_audit_logs(conn: &Connection, limit: usize, offset: usize) -> Result<Vec<AuditLog>> {
    let mut stmt = conn.prepare(
        "SELECT id, user_id, event_type, entity_type, entity_id,
                details_json, ip_address, user_agent, created_at
         FROM audit_log
         ORDER BY created_at DESC
         LIMIT ?1 OFFSET ?2",
    )?;

    let logs_iter = stmt.query_map([limit, offset], |row| {
        Ok(AuditLog {
            id: row.get(0)?,
            user_id: row.get(1)?,
            event_type: row.get(2)?,
            entity_type: row.get(3)?,
            entity_id: row.get(4)?,
            details_json: row.get(5)?,
            ip_address: row.get(6)?,
            user_agent: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;

    let mut logs = Vec::new();
    for log in logs_iter {
        logs.push(log?);
    }

    Ok(logs)
}
