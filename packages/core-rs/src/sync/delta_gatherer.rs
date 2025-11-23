use rusqlite::{Connection, OptionalExtension, Result};
use serde_json::json;
use std::collections::HashMap;
use ulid::Ulid;

use crate::sync::error::SyncError;
use crate::sync::models::{SyncDelta, SyncOperation};

pub struct DeltaGatherer;

impl DeltaGatherer {
    pub fn get_deltas_since(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut deltas = Vec::new();

        deltas.extend(Self::get_notes_deltas(conn, space_id, since)?);
        deltas.extend(Self::get_tasks_deltas(conn, space_id, since)?);
        deltas.extend(Self::get_projects_deltas(conn, space_id, since)?);
        deltas.extend(Self::get_health_metrics_deltas(conn, space_id, since)?);
        deltas.extend(Self::get_tracks_deltas(conn, space_id, since)?);
        deltas.extend(Self::get_playlists_deltas(conn, space_id, since)?);
        deltas.extend(Self::get_calendar_events_deltas(conn, space_id, since)?);

        deltas.sort_by_key(|d| d.timestamp);

        Ok(deltas)
    }

    fn get_notes_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT id, content_md, modified_at FROM note WHERE space_id = ?1 AND modified_at > ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, content, ts) = row?;
            deltas.push(SyncDelta {
                entity_type: "note".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(content.into_bytes()),
                timestamp: ts,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }

    fn get_tasks_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, status, updated_at FROM task WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
            ))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, status, ts) = row?;
            let data = json!({ "title": title, "status": status }).to_string();
            deltas.push(SyncDelta {
                entity_type: "task".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.into_bytes()),
                timestamp: ts,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }

    fn get_projects_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare(
            "SELECT id, title, updated_at FROM project WHERE space_id = ?1 AND updated_at > ?2",
        )?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, ts) = row?;
            let data = json!({ "name": title }).to_string();
            deltas.push(SyncDelta {
                entity_type: "project".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.into_bytes()),
                timestamp: ts,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }

    fn get_health_metrics_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, metric_type, value, unit, notes, recorded_at, created_at, updated_at FROM health_metric WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
            ))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, metric_type, value, unit, notes, recorded_at, created_at, updated_at): (
                String,
                String,
                f64,
                Option<String>,
                Option<String>,
                i64,
                i64,
                i64,
            ) = row?;
            let data = json!({ "metric_type": metric_type, "value": value, "unit": unit, "notes": notes, "recorded_at": recorded_at, "created_at": created_at }).to_string();
            deltas.push(SyncDelta {
                entity_type: "health_metric".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }

    fn get_tracks_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, artist, album, updated_at FROM track WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, artist, album, updated_at): (
                String,
                String,
                Option<String>,
                Option<String>,
                i64,
            ) = row?;
            let data = json!({ "title": title, "artist": artist, "album": album }).to_string();
            deltas.push(SyncDelta {
                entity_type: "track".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }

    fn get_playlists_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, name, description, updated_at FROM playlist WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, name, description, updated_at): (String, String, Option<String>, i64) = row?;
            let data = json!({ "name": name, "description": description }).to_string();
            deltas.push(SyncDelta {
                entity_type: "playlist".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }

    fn get_calendar_events_deltas(
        conn: &Connection,
        space_id: Ulid,
        since: i64,
    ) -> Result<Vec<SyncDelta>, SyncError> {
        let mut stmt = conn.prepare("SELECT id, title, description, start_time, end_time, updated_at FROM calendar_event WHERE space_id = ?1 AND updated_at > ?2")?;
        let rows = stmt.query_map(rusqlite::params![space_id.to_string(), since], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?;
        let mut deltas = Vec::new();
        for row in rows {
            let (id, title, description, start_time, end_time, updated_at): (
                String,
                String,
                Option<String>,
                i64,
                Option<i64>,
                i64,
            ) = row?;
            let data = json!({ "title": title, "description": description, "start_time": start_time, "end_time": end_time }).to_string();
            deltas.push(SyncDelta {
                entity_type: "calendar_event".into(),
                entity_id: id,
                operation: SyncOperation::Update,
                data: Some(data.into_bytes()),
                timestamp: updated_at,
                vector_clock: HashMap::new(),
                space_id: Some(space_id.to_string()),
            });
        }
        Ok(deltas)
    }
}
