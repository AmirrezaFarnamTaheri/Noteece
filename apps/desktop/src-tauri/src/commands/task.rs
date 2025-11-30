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
