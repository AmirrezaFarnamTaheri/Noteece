use crate::state::DbConnection;
use core_rs::task::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn create_task_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    description: Option<String>,
) -> Result<Task, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::task::create_task(&conn, space_ulid, &title, description)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_cmd(db: State<DbConnection>, id: String) -> Result<Option<Task>, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::task::get_task(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_task_cmd(db: State<DbConnection>, task: Task) -> Result<Task, String> {
    crate::with_db!(db, conn, {
        core_rs::task::update_task(&conn, &task).map_err(|e| e.to_string())?;
        Ok(task)
    })
}

#[tauri::command]
pub fn delete_task_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::task::delete_task(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_tasks_by_project_cmd(
    db: State<DbConnection>,
    project_id: String,
) -> Result<Vec<Task>, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::task::get_tasks_by_project(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_tasks_in_space_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<Task>, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::task::get_all_tasks_in_space(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_upcoming_tasks_cmd(
    db: State<DbConnection>,
    space_id: String,
    limit: u32,
) -> Result<Vec<Task>, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::task::get_upcoming_tasks(&conn, space_ulid, limit).map_err(|e| e.to_string())
    })
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use ulid::Ulid;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "
            CREATE TABLE space(
                id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT,
                enabled_modes_json TEXT NOT NULL DEFAULT '[]',
                created_at INTEGER NOT NULL DEFAULT 0,
                updated_at INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE task(
                id TEXT PRIMARY KEY, space_id TEXT NOT NULL,
                note_id TEXT, project_id TEXT,
                parent_task_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL CHECK(status IN('inbox','next','in_progress','waiting','done','cancelled')),
                due_at INTEGER, start_at INTEGER, completed_at INTEGER DEFAULT NULL,
                priority INTEGER CHECK(priority BETWEEN 1 AND 4),
                estimate_minutes INTEGER, recur_rule TEXT,
                context TEXT, area TEXT,
                updated_at INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE audit_log(
                id TEXT PRIMARY KEY,
                user_id TEXT,
                event_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT,
                details_json TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at INTEGER NOT NULL
            );
            ",
        )
        .unwrap();
        conn
    }

    fn create_test_space(conn: &Connection) -> Ulid {
        let space_id = Ulid::new();
        conn.execute(
            "INSERT INTO space (id, name, created_at, updated_at) VALUES (?1, ?2, 0, 0)",
            rusqlite::params![space_id.to_string(), "Test Space"],
        )
        .unwrap();
        space_id
    }

    #[test]
    fn test_create_and_get_task() {
        let conn = setup_test_db();
        let space_id = create_test_space(&conn);

        let task = core_rs::task::create_task(&conn, space_id, "Buy groceries", Some("Milk, eggs".to_string())).unwrap();
        assert_eq!(task.title, "Buy groceries");
        assert_eq!(task.description, Some("Milk, eggs".to_string()));
        assert_eq!(task.status, "inbox");

        let fetched = core_rs::task::get_task(&conn, task.id).unwrap().unwrap();
        assert_eq!(fetched.id, task.id);
        assert_eq!(fetched.title, "Buy groceries");
    }

    #[test]
    fn test_get_nonexistent_task() {
        let conn = setup_test_db();
        let fake_id = Ulid::new();
        let result = core_rs::task::get_task(&conn, fake_id).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_task() {
        let conn = setup_test_db();
        let space_id = create_test_space(&conn);

        let mut task = core_rs::task::create_task(&conn, space_id, "Original", None).unwrap();
        task.title = "Updated Title".to_string();
        task.status = "in_progress".to_string();
        core_rs::task::update_task(&conn, &task).unwrap();

        let fetched = core_rs::task::get_task(&conn, task.id).unwrap().unwrap();
        assert_eq!(fetched.title, "Updated Title");
        assert_eq!(fetched.status, "in_progress");
    }

    #[test]
    fn test_delete_task() {
        let conn = setup_test_db();
        let space_id = create_test_space(&conn);

        let task = core_rs::task::create_task(&conn, space_id, "To Delete", None).unwrap();
        core_rs::task::delete_task(&conn, task.id).unwrap();

        let result = core_rs::task::get_task(&conn, task.id).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_get_all_tasks_in_space() {
        let conn = setup_test_db();
        let space_id = create_test_space(&conn);

        core_rs::task::create_task(&conn, space_id, "Task 1", None).unwrap();
        core_rs::task::create_task(&conn, space_id, "Task 2", None).unwrap();
        core_rs::task::create_task(&conn, space_id, "Task 3", None).unwrap();

        let tasks = core_rs::task::get_all_tasks_in_space(&conn, space_id).unwrap();
        assert_eq!(tasks.len(), 3);
    }
}
