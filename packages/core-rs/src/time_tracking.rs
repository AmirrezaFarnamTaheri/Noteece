use crate::db::DbError;
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeEntry {
    pub id: Ulid,
    pub space_id: Ulid,
    pub task_id: Option<Ulid>,
    pub project_id: Option<Ulid>,
    pub note_id: Option<Ulid>,
    pub description: Option<String>,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub duration_seconds: Option<i64>,
    pub is_running: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeStats {
    pub total_seconds: i64,
    pub entry_count: i64,
    pub average_seconds: i64,
}

/// Start a new time entry
pub fn start_time_entry(
    conn: &Connection,
    space_id: Ulid,
    task_id: Option<Ulid>,
    project_id: Option<Ulid>,
    note_id: Option<Ulid>,
    description: Option<String>,
) -> Result<TimeEntry, DbError> {
    log::info!("[time_tracking] Starting time entry");

    // Stop any currently running entries in this space
    stop_all_running_entries(conn, space_id)?;

    let now = chrono::Utc::now().timestamp();
    let entry = TimeEntry {
        id: Ulid::new(),
        space_id,
        task_id,
        project_id,
        note_id,
        description,
        started_at: now,
        ended_at: None,
        duration_seconds: None,
        is_running: true,
    };

    conn.execute(
        "INSERT INTO time_entry (id, space_id, task_id, project_id, note_id, description, started_at, is_running)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            &entry.id.to_string(),
            &entry.space_id.to_string(),
            &entry.task_id.map(|id| id.to_string()),
            &entry.project_id.map(|id| id.to_string()),
            &entry.note_id.map(|id| id.to_string()),
            &entry.description,
            &entry.started_at,
            1, // is_running = true
        ],
    )?;

    Ok(entry)
}

/// Stop a running time entry
pub fn stop_time_entry(conn: &Connection, entry_id: Ulid) -> Result<TimeEntry, DbError> {
    log::info!("[time_tracking] Stopping time entry: {}", entry_id);

    let now = chrono::Utc::now().timestamp();

    // Get the entry to calculate duration
    let entry = get_time_entry(conn, entry_id)?
        .ok_or_else(|| DbError::Message("Time entry not found".to_string()))?;

    if !entry.is_running {
        return Err(DbError::Message("Time entry is not running".to_string()));
    }

    let duration = now - entry.started_at;

    conn.execute(
        "UPDATE time_entry SET ended_at = ?1, duration_seconds = ?2, is_running = 0 WHERE id = ?3",
        rusqlite::params![now, duration, entry_id.to_string()],
    )?;

    // Return updated entry
    get_time_entry(conn, entry_id)?
        .ok_or_else(|| DbError::Message("Entry not found after update".to_string()))
}

/// Stop all running entries in a space
pub fn stop_all_running_entries(conn: &Connection, space_id: Ulid) -> Result<(), DbError> {
    log::info!(
        "[time_tracking] Stopping all running entries in space: {}",
        space_id
    );

    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE time_entry
         SET ended_at = ?1,
             duration_seconds = ?1 - started_at,
             is_running = 0
         WHERE space_id = ?2 AND is_running = 1",
        rusqlite::params![now, space_id.to_string()],
    )?;

    Ok(())
}

/// Get a single time entry by ID
pub fn get_time_entry(conn: &Connection, id: Ulid) -> Result<Option<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE id = ?1"
    )?;

    let entry = stmt
        .query_row([id.to_string()], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })
        .optional()?;

    Ok(entry)
}

pub fn get_time_entries(conn: &Connection, space_id: &str) -> Result<Vec<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE space_id = ?1 ORDER BY started_at DESC"
    )?;

    let entries = stmt
        .query_map([space_id], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

/// Get all time entries for a task
pub fn get_task_time_entries(conn: &Connection, task_id: Ulid) -> Result<Vec<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE task_id = ?1 ORDER BY started_at DESC"
    )?;

    let entries = stmt
        .query_map([task_id.to_string()], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

/// Get all time entries for a project
pub fn get_project_time_entries(
    conn: &Connection,
    project_id: Ulid,
) -> Result<Vec<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE project_id = ?1 ORDER BY started_at DESC"
    )?;

    let entries = stmt
        .query_map([project_id.to_string()], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

/// Get all running time entries in a space
pub fn get_running_entries(conn: &Connection, space_id: Ulid) -> Result<Vec<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE space_id = ?1 AND is_running = 1"
    )?;

    let entries = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

/// Get recent time entries for a space
pub fn get_recent_time_entries(
    conn: &Connection,
    space_id: Ulid,
    limit: i64,
) -> Result<Vec<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE space_id = ?1 ORDER BY started_at DESC LIMIT ?2"
    )?;

    let entries = stmt
        .query_map(rusqlite::params![space_id.to_string(), limit], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

pub fn get_time_entries_since(
    conn: &Connection,
    space_id: &str,
    since_timestamp: i64,
) -> Result<Vec<TimeEntry>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running
         FROM time_entry WHERE space_id = ?1 AND started_at >= ?2
         ORDER BY started_at DESC"
    )?;

    let entries = stmt
        .query_map(rusqlite::params![space_id, since_timestamp], |row| {
            Ok(TimeEntry {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                task_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s)).transpose().map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                description: row.get(5)?,
                started_at: row.get(6)?,
                ended_at: row.get(7)?,
                duration_seconds: row.get(8)?,
                is_running: row.get::<_, i64>(9)? == 1,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(entries)
}

/// Get time statistics for a task
pub fn get_task_time_stats(conn: &Connection, task_id: Ulid) -> Result<TimeStats, DbError> {
    let mut stmt = conn.prepare(
        "SELECT
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(*) as entry_count,
            COALESCE(AVG(duration_seconds), 0) as average_seconds
         FROM time_entry
         WHERE task_id = ?1 AND is_running = 0",
    )?;

    let stats = stmt.query_row([task_id.to_string()], |row| {
        Ok(TimeStats {
            total_seconds: row.get(0)?,
            entry_count: row.get(1)?,
            average_seconds: row.get(2)?,
        })
    })?;

    Ok(stats)
}

/// Get time statistics for a project
pub fn get_project_time_stats(conn: &Connection, project_id: Ulid) -> Result<TimeStats, DbError> {
    let mut stmt = conn.prepare(
        "SELECT
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COUNT(*) as entry_count,
            COALESCE(AVG(duration_seconds), 0) as average_seconds
         FROM time_entry
         WHERE project_id = ?1 AND is_running = 0",
    )?;

    let stats = stmt.query_row([project_id.to_string()], |row| {
        Ok(TimeStats {
            total_seconds: row.get(0)?,
            entry_count: row.get(1)?,
            average_seconds: row.get(2)?,
        })
    })?;

    Ok(stats)
}

/// Delete a time entry
pub fn delete_time_entry(conn: &Connection, entry_id: Ulid) -> Result<(), DbError> {
    log::info!("[time_tracking] Deleting time entry: {}", entry_id);

    conn.execute(
        "DELETE FROM time_entry WHERE id = ?1",
        [entry_id.to_string()],
    )?;

    Ok(())
}

/// Manually create a completed time entry
pub fn create_manual_time_entry(
    conn: &Connection,
    space_id: Ulid,
    task_id: Option<Ulid>,
    project_id: Option<Ulid>,
    note_id: Option<Ulid>,
    description: Option<String>,
    started_at: i64,
    duration_seconds: i64,
) -> Result<TimeEntry, DbError> {
    log::info!("[time_tracking] Creating manual time entry");

    let ended_at = started_at + duration_seconds;
    let entry = TimeEntry {
        id: Ulid::new(),
        space_id,
        task_id,
        project_id,
        note_id,
        description,
        started_at,
        ended_at: Some(ended_at),
        duration_seconds: Some(duration_seconds),
        is_running: false,
    };

    conn.execute(
        "INSERT INTO time_entry (id, space_id, task_id, project_id, note_id, description, started_at, ended_at, duration_seconds, is_running)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            &entry.id.to_string(),
            &entry.space_id.to_string(),
            &entry.task_id.map(|id| id.to_string()),
            &entry.project_id.map(|id| id.to_string()),
            &entry.note_id.map(|id| id.to_string()),
            &entry.description,
            &entry.started_at,
            &entry.ended_at,
            &entry.duration_seconds,
            0, // is_running = false
        ],
    )?;

    Ok(entry)
}
