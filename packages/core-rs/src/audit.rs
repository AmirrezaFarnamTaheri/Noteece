use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

pub const DEFAULT_RETENTION_DAYS: i64 = 90;

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

pub fn cleanup_old_entries(conn: &Connection, retention_days: i64) -> Result<usize> {
    let cutoff = chrono::Utc::now().timestamp() - (retention_days * 86400);
    let deleted = conn.execute(
        "DELETE FROM audit_log WHERE created_at < ?1",
        rusqlite::params![cutoff],
    )?;
    Ok(deleted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_audit_db(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE audit_log (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                event_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                details_json TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at INTEGER NOT NULL
            );",
        )
        .unwrap();
    }

    #[test]
    fn test_cleanup_old_entries() {
        let conn = Connection::open_in_memory().unwrap();
        setup_audit_db(&conn);

        let now = chrono::Utc::now().timestamp();

        // Insert an old entry (100 days ago)
        conn.execute(
            "INSERT INTO audit_log (id, event_type, entity_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["old1", "test", "note", now - (100 * 86400)],
        )
        .unwrap();

        // Insert another old entry (200 days ago)
        conn.execute(
            "INSERT INTO audit_log (id, event_type, entity_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["old2", "test", "note", now - (200 * 86400)],
        )
        .unwrap();

        // Insert a recent entry (10 days ago)
        conn.execute(
            "INSERT INTO audit_log (id, event_type, entity_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["recent1", "test", "note", now - (10 * 86400)],
        )
        .unwrap();

        // Insert a current entry
        conn.execute(
            "INSERT INTO audit_log (id, event_type, entity_type, created_at) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["current1", "test", "note", now],
        )
        .unwrap();

        // Cleanup entries older than 90 days
        let deleted = cleanup_old_entries(&conn, 90).unwrap();
        assert_eq!(deleted, 2);

        // Verify only recent entries remain
        let remaining: i64 = conn
            .query_row("SELECT COUNT(*) FROM audit_log", [], |row| row.get(0))
            .unwrap();
        assert_eq!(remaining, 2);

        let remaining_ids: Vec<String> = conn
            .prepare("SELECT id FROM audit_log ORDER BY created_at")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<String>, _>>()
            .unwrap();
        assert_eq!(remaining_ids, vec!["recent1", "current1"]);
    }
}
