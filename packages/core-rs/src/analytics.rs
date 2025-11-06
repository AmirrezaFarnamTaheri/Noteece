// packages/core-rs/src/analytics.rs

use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};

use crate::db::DbError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyCount {
    pub week: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsData {
    pub note_count: i64,
    pub task_count: i64,
    pub project_count: i64,
    pub tasks_completed_by_week: Vec<WeeklyCount>,
    pub notes_created_by_week: Vec<WeeklyCount>,
}

pub fn get_analytics_data(conn: &Connection) -> Result<AnalyticsData, DbError> {
    let note_count: i64 = conn.query_row("SELECT COUNT(*) FROM note", [], |row| row.get(0))?;
    let task_count: i64 = conn.query_row("SELECT COUNT(*) FROM task", [], |row| row.get(0))?;
    let project_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM project", [], |row| row.get(0))?;

    let mut stmt = conn.prepare("SELECT strftime('%Y-%W', datetime(completed_at, 'unixepoch')) as week, COUNT(*) FROM task WHERE completed_at IS NOT NULL GROUP BY week ORDER BY week DESC LIMIT 12")?;
    let mut rows = stmt.query([])?;
    let mut tasks_completed_by_week = Vec::new();
    while let Some(row) = rows.next()? {
        tasks_completed_by_week.push(WeeklyCount {
            week: row.get(0)?,
            count: row.get(1)?,
        });
    }

    let mut stmt = conn.prepare("SELECT strftime('%Y-%W', datetime(created_at, 'unixepoch')) as week, COUNT(*) FROM note GROUP BY week ORDER BY week DESC LIMIT 12")?;
    let mut rows = stmt.query([])?;
    let mut notes_created_by_week = Vec::new();
    while let Some(row) = rows.next()? {
        notes_created_by_week.push(WeeklyCount {
            week: row.get(0)?,
            count: row.get(1)?,
        });
    }

    Ok(AnalyticsData {
        note_count,
        task_count,
        project_count,
        tasks_completed_by_week,
        notes_created_by_week,
    })
}
