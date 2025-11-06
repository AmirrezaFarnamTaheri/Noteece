use crate::db::DbError;
use crate::note;
use chrono::{Duration, Utc};
use rusqlite::{Connection, Result};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum WeeklyReviewError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("Note error: {0}")]
    Note(#[from] DbError),
}

pub fn generate_weekly_review(
    conn: &Connection,
    space_id: Ulid,
) -> Result<note::Note, WeeklyReviewError> {
    log::info!(
        "[weekly_review] Generating weekly review for space: {}",
        space_id
    );
    let now = Utc::now();
    let last_week = now - Duration::weeks(1);
    let space_id_str = space_id.to_string();

    let completed_tasks = conn
        .prepare(
            "SELECT title FROM task WHERE space_id = ? AND completed_at >= ? AND completed_at < ?",
        )?
        .query_map(
            rusqlite::params![space_id_str, last_week.timestamp(), now.timestamp()],
            |row| row.get(0),
        )?
        .collect::<Result<Vec<String>, _>>()?;

    let overdue_tasks = conn
        .prepare("SELECT title FROM task WHERE space_id = ? AND due_at < ? AND status != 'done'")?
        .query_map(rusqlite::params![space_id_str, now.timestamp()], |row| {
            row.get(0)
        })?
        .collect::<Result<Vec<String>, _>>()?;

    let next_week = now + Duration::weeks(1);
    let upcoming_tasks = conn.prepare(
        "SELECT title FROM task WHERE space_id = ? AND due_at >= ? AND due_at < ? AND status != 'done'",
    )?
    .query_map(rusqlite::params![space_id_str, now.timestamp(), next_week.timestamp()], |row| row.get(0))?
    .collect::<Result<Vec<String>, _>>()?;

    let mut review_content = String::new();

    review_content.push_str("## ✅ Completed Tasks\n");
    if completed_tasks.is_empty() {
        review_content.push_str("- None\n");
    } else {
        for task in completed_tasks {
            review_content.push_str(&format!("- [x] {}\n", task));
        }
    }

    review_content.push_str("\n##  overdue Tasks\n");
    if overdue_tasks.is_empty() {
        review_content.push_str("- None\n");
    } else {
        for task in overdue_tasks {
            review_content.push_str(&format!("- [ ] {}\n", task));
        }
    }

    review_content.push_str("\n## 📅 Upcoming Tasks\n");
    if upcoming_tasks.is_empty() {
        review_content.push_str("- None\n");
    } else {
        for task in upcoming_tasks {
            review_content.push_str(&format!("- [ ] {}\n", task));
        }
    }

    let title = format!("Weekly Review for {}", now.format("%Y-%m-%d"));

    match note::create_note(conn, &space_id.to_string(), &title, &review_content) {
        Ok(review_note) => {
            log::info!("[weekly_review] Weekly review generated successfully");
            Ok(review_note)
        }
        Err(e) => {
            log::error!("[weekly_review] Error generating weekly review: {}", e);
            Err(e.into())
        }
    }
}
