use rusqlite::{Connection, OptionalExtension, Result};

use crate::sync::error::SyncError;
use crate::sync::models::{SyncDelta, SyncOperation};

pub struct DeltaApplier;

impl DeltaApplier {
    pub fn apply_single_delta(
        conn: &Connection,
        delta: &SyncDelta,
        _dek: &[u8],
    ) -> Result<(), SyncError> {
        match delta.entity_type.as_str() {
            "note" => Self::apply_note_delta(conn, delta),
            "task" => Self::apply_task_delta(conn, delta),
            "project" => Self::apply_project_delta(conn, delta),
            "health_metric" => Self::apply_health_metric_delta(conn, delta),
            "track" => Self::apply_track_delta(conn, delta),
            "playlist" => Self::apply_playlist_delta(conn, delta),
            "calendar_event" => Self::apply_calendar_event_delta(conn, delta),
            _ => Err(SyncError::InvalidData(format!(
                "Unknown entity type: {}",
                delta.entity_type
            ))),
        }
    }

    fn apply_note_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let content = String::from_utf8(data.clone())
                        .map_err(|e| SyncError::InvalidData(e.to_string()))?;
                    let space_id = if let Some(sid) = &delta.space_id {
                        Some(sid.clone())
                    } else {
                        conn.query_row(
                            "SELECT space_id FROM note WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0),
                        )
                        .optional()?
                    };

                    if let Some(sid) = space_id {
                        conn.execute(
                            "INSERT OR REPLACE INTO note (id, space_id, content_md, modified_at, created_at)
                             VALUES (?1, ?2, ?3, ?4, COALESCE((SELECT created_at FROM note WHERE id = ?1), ?4))",
                            rusqlite::params![&delta.entity_id, sid, content, delta.timestamp],
                        )?;
                    }
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM note WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_task_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let task_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = if let Some(sid) = &delta.space_id {
                        Some(sid.clone())
                    } else {
                        conn.query_row(
                            "SELECT space_id FROM task WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0),
                        )
                        .optional()?
                    };

                    if let Some(sid) = space_id {
                        conn.execute(
                            "INSERT OR REPLACE INTO task (id, space_id, title, status, updated_at, created_at)
                             VALUES (?1, ?2, ?3, ?4, ?5, COALESCE((SELECT created_at FROM task WHERE id = ?1), ?5))",
                            rusqlite::params![
                                &delta.entity_id,
                                sid,
                                task_data["title"].as_str().unwrap_or(""),
                                task_data["status"].as_str().unwrap_or("inbox"),
                                delta.timestamp
                            ],
                        )?;
                    }
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM task WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_project_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let project_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = if let Some(sid) = &delta.space_id {
                        Some(sid.clone())
                    } else {
                        conn.query_row(
                            "SELECT space_id FROM project WHERE id = ?1",
                            [&delta.entity_id],
                            |row| row.get(0),
                        )
                        .optional()?
                    };

                    if let Some(sid) = space_id {
                        let updated = conn.execute(
                            "UPDATE project SET title = ?1, updated_at = ?2 WHERE id = ?3",
                            rusqlite::params![
                                project_data["name"].as_str().unwrap_or(""),
                                delta.timestamp,
                                &delta.entity_id
                            ],
                        )?;
                        if updated == 0 {
                            conn.execute(
                                "INSERT INTO project (id, space_id, title, status, updated_at) VALUES (?1, ?2, ?3, 'proposed', ?4)",
                                rusqlite::params![
                                    &delta.entity_id,
                                    sid,
                                    project_data["name"].as_str().unwrap_or(""),
                                    delta.timestamp
                                ]
                            )?;
                        }
                    }
                }
                SyncOperation::Delete => {
                    conn.execute("DELETE FROM project WHERE id = ?1", [&delta.entity_id])?;
                }
            }
        }
        Ok(())
    }

    fn apply_health_metric_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let metric_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;

            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta
                        .space_id
                        .clone()
                        .ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO health_metric (id, metric_type, value, unit, notes, recorded_at, created_at, updated_at, space_id)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                        rusqlite::params![
                            &delta.entity_id,
                            metric_data["metric_type"].as_str().unwrap_or(""),
                            metric_data["value"].as_f64().unwrap_or(0.0),
                            metric_data["unit"].as_str(),
                            metric_data["notes"].as_str(),
                            metric_data["recorded_at"].as_i64().unwrap_or(0),
                            metric_data["created_at"].as_i64().unwrap_or(0),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => {
                    conn.execute(
                        "DELETE FROM health_metric WHERE id = ?1",
                        [&delta.entity_id],
                    )?;
                }
            }
        }
        Ok(())
    }

    fn apply_track_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let track_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta
                        .space_id
                        .clone()
                        .ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO track (id, title, artist, album, updated_at, space_id, added_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?5)",
                        rusqlite::params![
                            &delta.entity_id,
                            track_data["title"].as_str().unwrap_or(""),
                            track_data["artist"].as_str(),
                            track_data["album"].as_str(),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => conn
                    .execute("DELETE FROM track WHERE id = ?1", [&delta.entity_id])
                    .map(|_| ())?,
            }
        }
        Ok(())
    }

    fn apply_playlist_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let playlist_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta
                        .space_id
                        .clone()
                        .ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO playlist (id, name, description, updated_at, space_id, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?4)",
                        rusqlite::params![
                            &delta.entity_id,
                            playlist_data["name"].as_str().unwrap_or(""),
                            playlist_data["description"].as_str(),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => conn
                    .execute("DELETE FROM playlist WHERE id = ?1", [&delta.entity_id])
                    .map(|_| ())?,
            }
        }
        Ok(())
    }

    fn apply_calendar_event_delta(conn: &Connection, delta: &SyncDelta) -> Result<(), SyncError> {
        if let Some(data) = &delta.data {
            let event_data: serde_json::Value =
                serde_json::from_slice(data).map_err(|e| SyncError::InvalidData(e.to_string()))?;
            match delta.operation {
                SyncOperation::Create | SyncOperation::Update => {
                    let space_id = delta
                        .space_id
                        .clone()
                        .ok_or(SyncError::InvalidData("Missing space_id".to_string()))?;
                    conn.execute(
                        "INSERT OR REPLACE INTO calendar_event (id, title, description, start_time, end_time, updated_at, space_id, source, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'sync', ?6)",
                        rusqlite::params![
                            &delta.entity_id,
                            event_data["title"].as_str().unwrap_or(""),
                            event_data["description"].as_str(),
                            event_data["start_time"].as_i64().unwrap_or(0),
                            event_data["end_time"].as_i64(),
                            delta.timestamp,
                            space_id
                        ],
                    )?;
                }
                SyncOperation::Delete => conn
                    .execute(
                        "DELETE FROM calendar_event WHERE id = ?1",
                        [&delta.entity_id],
                    )
                    .map(|_| ())?,
            }
        }
        Ok(())
    }
}
