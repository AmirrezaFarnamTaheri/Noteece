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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrelationResult {
    pub metric_type: String,
    pub correlation_coefficient: f64,
    pub insight: String,
}

pub fn calculate_habit_correlation(
    conn: &Connection,
    metric_type: &str,
) -> Result<CorrelationResult, DbError> {
    // Get daily health metric values
    // We join with daily task completions
    // Assuming daily aggregation.

    let mut stmt = conn.prepare(
        "
        WITH daily_tasks AS (
            SELECT date(completed_at, 'unixepoch') as day, COUNT(*) as task_count
            FROM task
            WHERE completed_at IS NOT NULL
            GROUP BY day
        ),
        daily_health AS (
            SELECT date(recorded_at, 'unixepoch') as day, avg(value) as health_val
            FROM health_metric
            WHERE metric_type = ?1
            GROUP BY day
        )
        SELECT t.task_count, h.health_val
        FROM daily_tasks t
        JOIN daily_health h ON t.day = h.day
        "
    )?;

    let rows = stmt.query_map([metric_type], |row| {
        Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
    })?;

    let mut xs = Vec::new();
    let mut ys = Vec::new();

    for row in rows {
        let (x, y) = row?;
        xs.push(x);
        ys.push(y);
    }

    if xs.len() < 5 {
        return Ok(CorrelationResult {
            metric_type: metric_type.to_string(),
            correlation_coefficient: 0.0,
            insight: "Not enough data to correlate.".to_string(),
        });
    }

    // Calculate Pearson Correlation
    let n = xs.len() as f64;
    let sum_x: f64 = xs.iter().sum();
    let sum_y: f64 = ys.iter().sum();
    let sum_x2: f64 = xs.iter().map(|x| x * x).sum();
    let sum_y2: f64 = ys.iter().map(|y| y * y).sum();
    let sum_xy: f64 = xs.iter().zip(ys.iter()).map(|(x, y)| x * y).sum();

    let numerator = n * sum_xy - sum_x * sum_y;
    let denominator = ((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)).sqrt();

    let r = if denominator == 0.0 {
        0.0
    } else {
        numerator / denominator
    };

    let insight = if r > 0.5 {
        format!("Strong positive link: Higher {} leads to more tasks.", metric_type)
    } else if r < -0.5 {
        format!("Strong negative link: Higher {} leads to fewer tasks.", metric_type)
    } else {
        format!("No significant link found for {}.", metric_type)
    };

    Ok(CorrelationResult {
        metric_type: metric_type.to_string(),
        correlation_coefficient: r,
        insight,
    })
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

    let mut stmt = conn.prepare("SELECT strftime('%Y-%W', datetime(created_at, 'unixepoch')) as week, COUNT(*) FROM note WHERE created_at IS NOT NULL GROUP BY week ORDER BY week DESC LIMIT 12")?;
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
