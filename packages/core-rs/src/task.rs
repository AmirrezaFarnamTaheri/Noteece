use crate::audit;
use crate::db::DbError;
use chrono::TimeZone;
use rusqlite::{Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use ulid::Ulid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: Ulid,
    pub space_id: Ulid,
    pub note_id: Option<Ulid>,
    pub project_id: Option<Ulid>,
    pub parent_task_id: Option<Ulid>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub due_at: Option<i64>,
    pub start_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub priority: Option<i64>,
    pub estimate_minutes: Option<i64>,
    pub recur_rule: Option<String>,
    pub context: Option<String>,
    pub area: Option<String>,
}

pub fn create_task(
    conn: &Connection,
    space_id: Ulid,
    title: &str,
    description: Option<String>,
) -> Result<Task, DbError> {
    log::info!("[task] Creating task with title: {}", title);
    let task = Task {
        id: Ulid::new(),
        space_id,
        note_id: None,
        project_id: None,
        parent_task_id: None,
        title: title.to_string(),
        description,
        status: "inbox".to_string(),
        due_at: None,
        start_at: None,
        completed_at: None,
        priority: None,
        estimate_minutes: None,
        recur_rule: None,
        context: None,
        area: None,
    };

    conn.execute(
        "INSERT INTO task (id, space_id, title, description, status) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            &task.id.to_string(),
            &task.space_id.to_string(),
            &task.title,
            &task.description,
            &task.status
        ],
    )?;

    let _ = audit::log_event(
        conn,
        None,
        "TASK_CREATED",
        "task",
        Some(&task.id.to_string()),
        Some(&format!(r#"{{"title": "{}"}}"#, task.title)),
        None,
        None,
    );

    Ok(task)
}

pub fn get_task(conn: &Connection, id: Ulid) -> Result<Option<Task>, DbError> {
    log::info!("[task] Getting task with id: {}", id);
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE id = ?1")?;
    let task: Option<Task> = stmt
        .query_row([id.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?,
                title: row.get(5)?,
                description: row.get(6)?,
                status: row.get(7)?,
                due_at: row.get(8)?,
                start_at: row.get(9)?,
                completed_at: row.get(10)?,
                priority: row.get(11)?,
                estimate_minutes: row.get(12)?,
                recur_rule: row.get(13)?,
                context: row.get(14)?,
                area: row.get(15)?,
            })
        })
        .optional()?;
    log::info!("[task] Found task: {:?}", task);
    Ok(task)
}

pub fn update_task(conn: &Connection, task: &Task) -> Result<(), DbError> {
    log::info!("[task] Updating task with id: {}", task.id);
    conn.execute(
        "UPDATE task SET note_id = ?1, project_id = ?2, parent_task_id = ?3, title = ?4, description = ?5, status = ?6, due_at = ?7, start_at = ?8, completed_at = ?9, priority = ?10, estimate_minutes = ?11, recur_rule = ?12, context = ?13, area = ?14 WHERE id = ?15",
        rusqlite::params![
            &task.note_id.map(|id| id.to_string()),
            &task.project_id.map(|id| id.to_string()),
            &task.parent_task_id.map(|id| id.to_string()),
            &task.title,
            &task.description,
            &task.status,
            &task.due_at,
            &task.start_at,
            &task.completed_at,
            &task.priority,
            &task.estimate_minutes,
            &task.recur_rule,
            &task.context,
            &task.area,
            &task.id.to_string(),
        ],
    )?;

    // Handle recurrence if task is marked as done
    if task.status == "done" && task.recur_rule.is_some() {
        handle_recurrence(conn, task)?;
    }

    Ok(())
}

fn handle_recurrence(conn: &Connection, task: &Task) -> Result<(), DbError> {
    if let Some(rule) = &task.recur_rule {
        // Prevent duplicate recurrence: Check if a child task already exists
        let count: i64 = conn
            .query_row(
                "SELECT count(*) FROM task WHERE parent_task_id = ?1",
                [&task.id.to_string()],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if count > 0 {
            log::info!("[task] Next recurring task already exists for parent: {}", task.id);
            return Ok(());
        }

        log::info!("[task] Handling recurrence for task: {}", task.id);

        let current_due = task.due_at.unwrap_or_else(|| chrono::Utc::now().timestamp());

        // Try legacy simple rules first, then full RRULE parsing
        let next_due = match rule.to_uppercase().as_str() {
            "DAILY" => Some(current_due + 86400),
            "WEEKLY" => Some(current_due + 604800),
            "MONTHLY" => Some(current_due + 2592000), // Approx 30 days
            _ => {
                // Try parsing as RFC 5545 RRULE
                match rule.parse::<rrule::RRuleSet>() {
                    Ok(rrule_set) => {
                        match chrono::Utc.timestamp_opt(current_due, 0) {
                            chrono::LocalResult::Single(dt_start_utc) => {
                                // Convert to rrule::Tz (UTC)
                                let dt_start = dt_start_utc.with_timezone(&rrule::Tz::UTC);

                                // RRuleSet implements IntoIterator
                                // We want the first occurrence *after* current_due
                                let next = rrule_set.into_iter().find(|dt| *dt > dt_start);
                                next.map(|dt| dt.timestamp())
                            },
                            _ => {
                                log::warn!("[task] Invalid timestamp for recurrence: {}", current_due);
                                None
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("[task] Failed to parse recurrence rule '{}': {}", rule, e);
                        None
                    }
                }
            }
        };

        if let Some(due) = next_due {
            let mut new_task = task.clone();
            new_task.id = Ulid::new();
            new_task.status = "next".to_string();
            new_task.due_at = Some(due);
            new_task.completed_at = None;
            new_task.parent_task_id = Some(task.id); // Link to previous task to prevent duplicates
            // We don't clear recur_rule so the new task also recurs

            log::info!("[task] Creating next recurring task instance: {}", new_task.id);

            // Pre-convert optionals to own types to avoid temporary lifetime issues in params!
            let nid = new_task.note_id.map(|id| id.to_string());
            let pid = new_task.project_id.map(|id| id.to_string());
            let par_id = new_task.parent_task_id.map(|id| id.to_string());

            conn.execute(
                "INSERT INTO task (id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
                rusqlite::params![
                    &new_task.id.to_string(),
                    &new_task.space_id.to_string(),
                    &nid,
                    &pid,
                    &par_id,
                    &new_task.title,
                    &new_task.description,
                    &new_task.status,
                    &new_task.due_at,
                    &new_task.start_at,
                    &new_task.completed_at,
                    &new_task.priority,
                    &new_task.estimate_minutes,
                    &new_task.recur_rule,
                    &new_task.context,
                    &new_task.area,
                ],
            )?;

            let _ = audit::log_event(
                conn,
                None,
                "TASK_RECURRENCE_CREATED",
                "task",
                Some(&new_task.id.to_string()),
                Some(&format!(r#"{{"parent_id": "{}"}}"#, task.id)),
                None,
                None,
            );
        }
    }
    Ok(())
}

pub fn delete_task(conn: &Connection, id: Ulid) -> Result<(), DbError> {
    log::info!("[task] Deleting task with id: {}", id);
    conn.execute("DELETE FROM task WHERE id = ?1", [id.to_string()])?;

    let _ = audit::log_event(
        conn,
        None,
        "TASK_DELETED",
        "task",
        Some(&id.to_string()),
        None,
        None,
        None,
    );

    Ok(())
}

pub fn get_tasks_by_project(conn: &Connection, project_id: Ulid) -> Result<Vec<Task>, DbError> {
    log::info!("[task] Getting tasks for project with id: {}", project_id);
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE project_id = ?1")?;
    let tasks = stmt
        .query_map([project_id.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?,
                title: row.get(5)?,
                description: row.get(6)?,
                status: row.get(7)?,
                due_at: row.get(8)?,
                start_at: row.get(9)?,
                completed_at: row.get(10)?,
                priority: row.get(11)?,
                estimate_minutes: row.get(12)?,
                recur_rule: row.get(13)?,
                context: row.get(14)?,
                area: row.get(15)?,
            })
        })?
        .collect::<Result<Vec<Task>, _>>()?;
    log::info!("[task] Found {} tasks", tasks.len());
    Ok(tasks)
}

pub fn get_upcoming_tasks(
    conn: &Connection,
    space_id: Ulid,
    limit: u32,
) -> Result<Vec<Task>, DbError> {
    log::info!(
        "[task] Getting upcoming tasks for space with id: {}",
        space_id
    );
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE space_id = ?1 AND due_at IS NOT NULL AND status != 'done' ORDER BY due_at ASC LIMIT ?2")?;
    let tasks = stmt
        .query_map([space_id.to_string(), limit.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?,
                title: row.get(5)?,
                description: row.get(6)?,
                status: row.get(7)?,
                due_at: row.get(8)?,
                start_at: row.get(9)?,
                completed_at: row.get(10)?,
                priority: row.get(11)?,
                estimate_minutes: row.get(12)?,
                recur_rule: row.get(13)?,
                context: row.get(14)?,
                area: row.get(15)?,
            })
        })?
        .collect::<Result<Vec<Task>, _>>()?;
    log::info!("[task] Found {} upcoming tasks", tasks.len());
    Ok(tasks)
}

impl TryFrom<&rusqlite::Row<'_>> for Task {
    type Error = rusqlite::Error;

    fn try_from(row: &rusqlite::Row<'_>) -> Result<Self, Self::Error> {
        Ok(Task {
            id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
            space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
            note_id: row
                .get::<_, Option<String>>(2)?
                .map(|s| Ulid::from_string(&s))
                .transpose()
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e)))?,
            project_id: row
                .get::<_, Option<String>>(3)?
                .map(|s| Ulid::from_string(&s))
                .transpose()
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
            parent_task_id: row
                .get::<_, Option<String>>(4)?
                .map(|s| Ulid::from_string(&s))
                .transpose()
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?,
            title: row.get(5)?,
            description: row.get(6)?,
            status: row.get(7)?,
            due_at: row.get(8)?,
            start_at: row.get(9)?,
            completed_at: row.get(10)?,
            priority: row.get(11)?,
            estimate_minutes: row.get(12)?,
            recur_rule: row.get(13)?,
            context: row.get(14)?,
            area: row.get(15)?,
        })
    }
}

pub fn get_all_tasks_in_space(conn: &Connection, space_id: Ulid) -> Result<Vec<Task>, DbError> {
    log::info!("[task] Getting all tasks for space with id: {}", space_id);
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE space_id = ?1")?;
    let tasks = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))?,
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).map_err(|e| rusqlite::Error::FromSqlConversionFailure(1, rusqlite::types::Type::Text, Box::new(e)))?,
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e)))?,
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(3, rusqlite::types::Type::Text, Box::new(e)))?,
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s))
                    .transpose()
                    .map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(e)))?,
                title: row.get(5)?,
                description: row.get(6)?,
                status: row.get(7)?,
                due_at: row.get(8)?,
                start_at: row.get(9)?,
                completed_at: row.get(10)?,
                priority: row.get(11)?,
                estimate_minutes: row.get(12)?,
                recur_rule: row.get(13)?,
                context: row.get(14)?,
                area: row.get(15)?,
            })
        })?
        .collect::<Result<Vec<Task>, _>>()?;
    log::info!("[task] Found {} tasks", tasks.len());
    Ok(tasks)
}
