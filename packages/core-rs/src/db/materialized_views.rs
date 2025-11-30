//! Materialized Views for Dashboard Statistics
//!
//! Pre-computed aggregate statistics for fast dashboard rendering.
//! Uses SQLite triggers to maintain consistency.
//!
//! SPDX-License-Identifier: AGPL-3.0-or-later
//! Copyright (c) 2024-2025 Amirreza 'Farnam' Taheri <taherifarnam@gmail.com>

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

/// Dashboard statistics for a space
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DashboardStats {
    pub space_id: String,
    pub total_notes: i64,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub pending_tasks: i64,
    pub overdue_tasks: i64,
    pub total_projects: i64,
    pub active_habits: i64,
    pub streak_days: i64,
    pub notes_this_week: i64,
    pub tasks_completed_this_week: i64,
    pub last_updated: i64,
}

/// Initialize materialized views tables and triggers
pub fn init_materialized_views(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Create the dashboard_stats table
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS dashboard_stats (
            space_id TEXT PRIMARY KEY,
            total_notes INTEGER DEFAULT 0,
            total_tasks INTEGER DEFAULT 0,
            completed_tasks INTEGER DEFAULT 0,
            pending_tasks INTEGER DEFAULT 0,
            overdue_tasks INTEGER DEFAULT 0,
            total_projects INTEGER DEFAULT 0,
            active_habits INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            notes_this_week INTEGER DEFAULT 0,
            tasks_completed_this_week INTEGER DEFAULT 0,
            last_updated INTEGER DEFAULT (strftime('%s', 'now'))
        )
        "#,
        [],
    )?;

    // Create triggers to maintain dashboard_stats

    // Note insert trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_note_insert_stats
        AFTER INSERT ON note
        BEGIN
            INSERT INTO dashboard_stats (space_id, total_notes)
            VALUES (NEW.space_id, 1)
            ON CONFLICT(space_id) DO UPDATE SET
                total_notes = total_notes + 1,
                notes_this_week = CASE 
                    WHEN NEW.created_at >= strftime('%s', 'now', 'weekday 0', '-7 days')
                    THEN notes_this_week + 1 
                    ELSE notes_this_week 
                END,
                last_updated = strftime('%s', 'now');
        END
        "#,
        [],
    )?;

    // Note delete trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_note_delete_stats
        AFTER DELETE ON note
        BEGIN
            UPDATE dashboard_stats SET
                total_notes = MAX(0, total_notes - 1),
                last_updated = strftime('%s', 'now')
            WHERE space_id = OLD.space_id;
        END
        "#,
        [],
    )?;

    // Task insert trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_task_insert_stats
        AFTER INSERT ON task
        WHEN NEW.project_id IS NOT NULL
        BEGIN
            INSERT INTO dashboard_stats (space_id, total_tasks, pending_tasks)
            SELECT p.space_id, 1, 1
            FROM project p WHERE p.id = NEW.project_id
            ON CONFLICT(space_id) DO UPDATE SET
                total_tasks = total_tasks + 1,
                pending_tasks = CASE WHEN NEW.status != 'done' THEN pending_tasks + 1 ELSE pending_tasks END,
                completed_tasks = CASE WHEN NEW.status = 'done' THEN completed_tasks + 1 ELSE completed_tasks END,
                last_updated = strftime('%s', 'now');
        END
        "#,
        [],
    )?;

    // Task update trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_task_update_stats
        AFTER UPDATE OF status ON task
        WHEN OLD.status != NEW.status AND NEW.project_id IS NOT NULL
        BEGIN
            UPDATE dashboard_stats SET
                pending_tasks = CASE 
                    WHEN OLD.status != 'done' AND NEW.status = 'done' THEN MAX(0, pending_tasks - 1)
                    WHEN OLD.status = 'done' AND NEW.status != 'done' THEN pending_tasks + 1
                    ELSE pending_tasks
                END,
                completed_tasks = CASE 
                    WHEN OLD.status != 'done' AND NEW.status = 'done' THEN completed_tasks + 1
                    WHEN OLD.status = 'done' AND NEW.status != 'done' THEN MAX(0, completed_tasks - 1)
                    ELSE completed_tasks
                END,
                tasks_completed_this_week = CASE 
                    WHEN NEW.status = 'done' AND NEW.updated_at >= strftime('%s', 'now', 'weekday 0', '-7 days')
                    THEN tasks_completed_this_week + 1 
                    ELSE tasks_completed_this_week 
                END,
                last_updated = strftime('%s', 'now')
            WHERE space_id = (SELECT space_id FROM project WHERE id = NEW.project_id);
        END
        "#,
        [],
    )?;

    // Task delete trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_task_delete_stats
        AFTER DELETE ON task
        WHEN OLD.project_id IS NOT NULL
        BEGIN
            UPDATE dashboard_stats SET
                total_tasks = MAX(0, total_tasks - 1),
                pending_tasks = CASE WHEN OLD.status != 'done' THEN MAX(0, pending_tasks - 1) ELSE pending_tasks END,
                completed_tasks = CASE WHEN OLD.status = 'done' THEN MAX(0, completed_tasks - 1) ELSE completed_tasks END,
                last_updated = strftime('%s', 'now')
            WHERE space_id = (SELECT space_id FROM project WHERE id = OLD.project_id);
        END
        "#,
        [],
    )?;

    // Project insert trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_project_insert_stats
        AFTER INSERT ON project
        BEGIN
            INSERT INTO dashboard_stats (space_id, total_projects)
            VALUES (NEW.space_id, 1)
            ON CONFLICT(space_id) DO UPDATE SET
                total_projects = total_projects + 1,
                last_updated = strftime('%s', 'now');
        END
        "#,
        [],
    )?;

    // Project delete trigger
    conn.execute(
        r#"
        CREATE TRIGGER IF NOT EXISTS trg_project_delete_stats
        AFTER DELETE ON project
        BEGIN
            UPDATE dashboard_stats SET
                total_projects = MAX(0, total_projects - 1),
                last_updated = strftime('%s', 'now')
            WHERE space_id = OLD.space_id;
        END
        "#,
        [],
    )?;

    Ok(())
}

/// Get dashboard stats for a space
pub fn get_dashboard_stats(
    conn: &Connection,
    space_id: &str,
) -> Result<DashboardStats, rusqlite::Error> {
    let result = conn.query_row(
        r#"
        SELECT 
            space_id, total_notes, total_tasks, completed_tasks, pending_tasks,
            overdue_tasks, total_projects, active_habits, streak_days,
            notes_this_week, tasks_completed_this_week, last_updated
        FROM dashboard_stats
        WHERE space_id = ?1
        "#,
        params![space_id],
        |row| {
            Ok(DashboardStats {
                space_id: row.get(0)?,
                total_notes: row.get(1)?,
                total_tasks: row.get(2)?,
                completed_tasks: row.get(3)?,
                pending_tasks: row.get(4)?,
                overdue_tasks: row.get(5)?,
                total_projects: row.get(6)?,
                active_habits: row.get(7)?,
                streak_days: row.get(8)?,
                notes_this_week: row.get(9)?,
                tasks_completed_this_week: row.get(10)?,
                last_updated: row.get(11)?,
            })
        },
    );

    match result {
        Ok(stats) => Ok(stats),
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Return default stats if no entry exists
            Ok(DashboardStats {
                space_id: space_id.to_string(),
                ..Default::default()
            })
        }
        Err(e) => Err(e),
    }
}

/// Refresh dashboard stats for a space by recalculating from source tables
pub fn refresh_dashboard_stats(
    conn: &Connection,
    space_id: &str,
) -> Result<DashboardStats, rusqlite::Error> {
    let now = chrono::Utc::now().timestamp();
    let week_ago = now - (7 * 24 * 60 * 60);

    // Calculate all stats from source tables
    let total_notes: i64 = conn.query_row(
        "SELECT COUNT(*) FROM note WHERE space_id = ?1",
        params![space_id],
        |row| row.get(0),
    )?;

    let notes_this_week: i64 = conn.query_row(
        "SELECT COUNT(*) FROM note WHERE space_id = ?1 AND created_at >= ?2",
        params![space_id, week_ago],
        |row| row.get(0),
    )?;

    let total_projects: i64 = conn.query_row(
        "SELECT COUNT(*) FROM project WHERE space_id = ?1",
        params![space_id],
        |row| row.get(0),
    )?;

    // Task stats need to join through project
    let (total_tasks, completed_tasks, pending_tasks): (i64, i64, i64) = conn.query_row(
        r#"
        SELECT 
            COUNT(*),
            COUNT(CASE WHEN t.status = 'done' THEN 1 END),
            COUNT(CASE WHEN t.status != 'done' THEN 1 END)
        FROM task t
        JOIN project p ON t.project_id = p.id
        WHERE p.space_id = ?1
        "#,
        params![space_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let overdue_tasks: i64 = conn.query_row(
        r#"
        SELECT COUNT(*)
        FROM task t
        JOIN project p ON t.project_id = p.id
        WHERE p.space_id = ?1 AND t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ?2
        "#,
        params![space_id, now],
        |row| row.get(0),
    )?;

    let tasks_completed_this_week: i64 = conn.query_row(
        r#"
        SELECT COUNT(*)
        FROM task t
        JOIN project p ON t.project_id = p.id
        WHERE p.space_id = ?1 AND t.status = 'done' AND t.updated_at >= ?2
        "#,
        params![space_id, week_ago],
        |row| row.get(0),
    )?;

    // Habit stats
    let active_habits: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM habit WHERE space_id = ?1 AND is_archived = 0",
            params![space_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Insert or update the stats
    conn.execute(
        r#"
        INSERT INTO dashboard_stats (
            space_id, total_notes, total_tasks, completed_tasks, pending_tasks,
            overdue_tasks, total_projects, active_habits, notes_this_week,
            tasks_completed_this_week, last_updated
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(space_id) DO UPDATE SET
            total_notes = excluded.total_notes,
            total_tasks = excluded.total_tasks,
            completed_tasks = excluded.completed_tasks,
            pending_tasks = excluded.pending_tasks,
            overdue_tasks = excluded.overdue_tasks,
            total_projects = excluded.total_projects,
            active_habits = excluded.active_habits,
            notes_this_week = excluded.notes_this_week,
            tasks_completed_this_week = excluded.tasks_completed_this_week,
            last_updated = excluded.last_updated
        "#,
        params![
            space_id,
            total_notes,
            total_tasks,
            completed_tasks,
            pending_tasks,
            overdue_tasks,
            total_projects,
            active_habits,
            notes_this_week,
            tasks_completed_this_week,
            now
        ],
    )?;

    Ok(DashboardStats {
        space_id: space_id.to_string(),
        total_notes,
        total_tasks,
        completed_tasks,
        pending_tasks,
        overdue_tasks,
        total_projects,
        active_habits,
        streak_days: 0, // Calculated separately
        notes_this_week,
        tasks_completed_this_week,
        last_updated: now,
    })
}

/// Refresh all dashboard stats (for maintenance)
pub fn refresh_all_dashboard_stats(conn: &Connection) -> Result<usize, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT DISTINCT id FROM space")?;
    let spaces: Vec<String> = stmt
        .query_map([], |row| row.get(0))?
        .filter_map(|r| r.ok())
        .collect();

    let mut count = 0;
    for space_id in spaces {
        refresh_dashboard_stats(conn, &space_id)?;
        count += 1;
    }

    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();

        // Create minimal schema
        conn.execute_batch(
            r#"
            CREATE TABLE space (id TEXT PRIMARY KEY, name TEXT);
            CREATE TABLE note (id TEXT PRIMARY KEY, space_id TEXT, title TEXT, created_at INTEGER);
            CREATE TABLE project (id TEXT PRIMARY KEY, space_id TEXT, name TEXT);
            CREATE TABLE task (id TEXT PRIMARY KEY, project_id TEXT, status TEXT, due_date INTEGER, updated_at INTEGER);
            CREATE TABLE habit (id TEXT PRIMARY KEY, space_id TEXT, is_archived INTEGER DEFAULT 0);
            "#,
        )
        .unwrap();

        init_materialized_views(&conn).unwrap();

        conn
    }

    #[test]
    fn test_init_materialized_views() {
        let conn = setup_test_db();

        // Check that dashboard_stats table exists
        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='dashboard_stats'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(exists, 1);
    }

    #[test]
    fn test_get_dashboard_stats_empty() {
        let conn = setup_test_db();

        let stats = get_dashboard_stats(&conn, "test-space").unwrap();

        assert_eq!(stats.space_id, "test-space");
        assert_eq!(stats.total_notes, 0);
        assert_eq!(stats.total_tasks, 0);
    }

    #[test]
    fn test_refresh_dashboard_stats() {
        let conn = setup_test_db();

        // Add test data
        conn.execute(
            "INSERT INTO space (id, name) VALUES ('space1', 'Test Space')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO note (id, space_id, title, created_at) VALUES ('n1', 'space1', 'Note 1', strftime('%s', 'now'))",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO note (id, space_id, title, created_at) VALUES ('n2', 'space1', 'Note 2', strftime('%s', 'now'))",
            [],
        )
        .unwrap();

        let stats = refresh_dashboard_stats(&conn, "space1").unwrap();

        assert_eq!(stats.total_notes, 2);
    }

    #[test]
    fn test_note_insert_trigger() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO space (id, name) VALUES ('space1', 'Test Space')",
            [],
        )
        .unwrap();

        // Insert a note (trigger should update stats)
        conn.execute(
            "INSERT INTO note (id, space_id, title, created_at) VALUES ('n1', 'space1', 'Note 1', strftime('%s', 'now'))",
            [],
        )
        .unwrap();

        let stats = get_dashboard_stats(&conn, "space1").unwrap();
        assert_eq!(stats.total_notes, 1);
    }

    #[test]
    fn test_note_delete_trigger() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO space (id, name) VALUES ('space1', 'Test Space')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO note (id, space_id, title, created_at) VALUES ('n1', 'space1', 'Note 1', strftime('%s', 'now'))",
            [],
        )
        .unwrap();

        // Delete the note
        conn.execute("DELETE FROM note WHERE id = 'n1'", [])
            .unwrap();

        let stats = get_dashboard_stats(&conn, "space1").unwrap();
        assert_eq!(stats.total_notes, 0);
    }

    #[test]
    fn test_refresh_all() {
        let conn = setup_test_db();

        conn.execute(
            "INSERT INTO space (id, name) VALUES ('space1', 'Space 1')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO space (id, name) VALUES ('space2', 'Space 2')",
            [],
        )
        .unwrap();

        let count = refresh_all_dashboard_stats(&conn).unwrap();
        assert_eq!(count, 2);
    }
}
