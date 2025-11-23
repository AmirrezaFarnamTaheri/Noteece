use crate::db::DbError;
use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HealthMetric {
    pub id: Ulid,
    pub space_id: Ulid,
    pub note_id: Option<Ulid>,
    pub metric_type: String,
    pub value: f64,
    pub unit: Option<String>,
    pub notes: Option<String>,
    pub recorded_at: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

pub fn create_health_metric(
    conn: &Connection,
    space_id: Ulid,
    note_id: Option<Ulid>,
    metric_type: &str,
    value: f64,
    unit: Option<String>,
    notes: Option<String>,
    recorded_at: i64,
) -> Result<HealthMetric, DbError> {
    let now = chrono::Utc::now().timestamp();
    let metric = HealthMetric {
        id: Ulid::new(),
        space_id,
        note_id,
        metric_type: metric_type.to_string(),
        value,
        unit,
        notes,
        recorded_at,
        created_at: now,
        updated_at: now,
    };

    conn.execute(
        "INSERT INTO health_metric (id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            &metric.id.to_string(),
            &metric.space_id.to_string(),
            &metric.note_id.map(|id| id.to_string()),
            &metric.metric_type,
            &metric.value,
            &metric.unit,
            &metric.notes,
            &metric.recorded_at,
            &metric.created_at,
            &metric.updated_at
        ],
    )?;

    Ok(metric)
}

pub fn get_health_metrics(
    conn: &Connection,
    space_id: Ulid,
    limit: u32,
) -> Result<Vec<HealthMetric>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, space_id, note_id, metric_type, value, unit, notes, recorded_at, created_at, updated_at
         FROM health_metric
         WHERE space_id = ?1
         ORDER BY recorded_at DESC
         LIMIT ?2",
    )?;

    let metrics = stmt
        .query_map([space_id.to_string(), limit.to_string()], |row| {
            Ok(HealthMetric {
                id: Ulid::from_string(&row.get::<_, String>(0)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?)
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?,
                metric_type: row.get(3)?,
                value: row.get(4)?,
                unit: row.get(5)?,
                notes: row.get(6)?,
                recorded_at: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(metrics)
}
