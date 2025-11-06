use crate::db::DbError;
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

    Ok(task)
}

pub fn get_task(conn: &Connection, id: Ulid) -> Result<Option<Task>, DbError> {
    log::info!("[task] Getting task with id: {}", id);
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE id = ?1")?;
    let task: Option<Task> = stmt
        .query_row([id.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).unwrap(),
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).unwrap(),
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
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
    Ok(())
}

pub fn delete_task(conn: &Connection, id: Ulid) -> Result<(), DbError> {
    log::info!("[task] Deleting task with id: {}", id);
    conn.execute("DELETE FROM task WHERE id = ?1", [id.to_string()])?;
    Ok(())
}

pub fn get_tasks_by_project(conn: &Connection, project_id: Ulid) -> Result<Vec<Task>, DbError> {
    log::info!("[task] Getting tasks for project with id: {}", project_id);
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE project_id = ?1")?;
    let tasks = stmt
        .query_map([project_id.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).unwrap(),
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).unwrap(),
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
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
                id: Ulid::from_string(&row.get::<_, String>(0)?).unwrap(),
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).unwrap(),
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
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

impl From<&rusqlite::Row<'_>> for Task {
    fn from(row: &rusqlite::Row<'_>) -> Self {
        Task {
            id: Ulid::from_string(&row.get_unwrap::<_, String>(0)).unwrap(),
            space_id: Ulid::from_string(&row.get_unwrap::<_, String>(1)).unwrap(),
            note_id: row
                .get::<_, Option<String>>(2)
                .unwrap()
                .map(|s| Ulid::from_string(&s).unwrap()),
            project_id: row
                .get::<_, Option<String>>(3)
                .unwrap()
                .map(|s| Ulid::from_string(&s).unwrap()),
            parent_task_id: row
                .get::<_, Option<String>>(4)
                .unwrap()
                .map(|s| Ulid::from_string(&s).unwrap()),
            title: row.get_unwrap(5),
            description: row.get_unwrap(6),
            status: row.get_unwrap(7),
            due_at: row.get_unwrap(8),
            start_at: row.get_unwrap(9),
            completed_at: row.get_unwrap(10),
            priority: row.get_unwrap(11),
            estimate_minutes: row.get_unwrap(12),
            recur_rule: row.get_unwrap(13),
            context: row.get_unwrap(14),
            area: row.get_unwrap(15),
        }
    }
}

pub fn get_all_tasks_in_space(conn: &Connection, space_id: Ulid) -> Result<Vec<Task>, DbError> {
    log::info!("[task] Getting all tasks for space with id: {}", space_id);
    let mut stmt = conn.prepare("SELECT id, space_id, note_id, project_id, parent_task_id, title, description, status, due_at, start_at, completed_at, priority, estimate_minutes, recur_rule, context, area FROM task WHERE space_id = ?1")?;
    let tasks = stmt
        .query_map([space_id.to_string()], |row| {
            Ok(Task {
                id: Ulid::from_string(&row.get::<_, String>(0)?).unwrap(),
                space_id: Ulid::from_string(&row.get::<_, String>(1)?).unwrap(),
                note_id: row
                    .get::<_, Option<String>>(2)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                project_id: row
                    .get::<_, Option<String>>(3)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
                parent_task_id: row
                    .get::<_, Option<String>>(4)?
                    .map(|s| Ulid::from_string(&s).unwrap()),
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
