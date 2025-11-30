use crate::state::DbConnection;
use core_rs::time_tracking::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn start_time_entry_cmd(
    db: State<DbConnection>,
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    description: Option<String>,
) -> Result<TimeEntry, String> {
    crate::with_db!(db, conn, {
        let task_ulid = task_id
            .map(|s| Ulid::from_string(&s))
            .transpose()
            .map_err(|e| e.to_string())?;
        let project_ulid = project_id
            .map(|s| Ulid::from_string(&s))
            .transpose()
            .map_err(|e| e.to_string())?;
        core_rs::time_tracking::start_time_entry(
            &conn,
            Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
            task_ulid,
            project_ulid,
            None,
            description,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn stop_time_entry_cmd(db: State<DbConnection>, entry_id: String) -> Result<TimeEntry, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&entry_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::stop_time_entry(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_time_entries_cmd(
    db: State<DbConnection>,
    task_id: String,
) -> Result<Vec<TimeEntry>, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&task_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_task_time_entries(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_time_entries_cmd(
    db: State<DbConnection>,
    project_id: String,
) -> Result<Vec<TimeEntry>, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_project_time_entries(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_running_entries_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<TimeEntry>, String> {
    crate::with_db!(db, conn, {
        core_rs::time_tracking::get_running_entries(
            &conn,
            Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recent_time_entries_cmd(
    db: State<DbConnection>,
    space_id: String,
    limit: u32,
) -> Result<Vec<TimeEntry>, String> {
    crate::with_db!(db, conn, {
        core_rs::time_tracking::get_recent_time_entries(
            &conn,
            Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
            limit as i64,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_time_stats_cmd(
    db: State<DbConnection>,
    task_id: String,
) -> Result<TimeStats, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&task_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_task_time_stats(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_time_stats_cmd(
    db: State<DbConnection>,
    project_id: String,
) -> Result<TimeStats, String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_project_time_stats(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_time_entry_cmd(db: State<DbConnection>, entry_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&entry_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::delete_time_entry(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_manual_time_entry_cmd(
    db: State<DbConnection>,
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    note_id: Option<String>,
    description: Option<String>,
    started_at: i64,
    duration_seconds: i64,
) -> Result<TimeEntry, String> {
    crate::with_db!(db, conn, {
        let task_ulid = task_id
            .map(|s| Ulid::from_string(&s))
            .transpose()
            .map_err(|e| e.to_string())?;
        let project_ulid = project_id
            .map(|s| Ulid::from_string(&s))
            .transpose()
            .map_err(|e| e.to_string())?;
        let note_ulid = note_id
            .map(|s| Ulid::from_string(&s))
            .transpose()
            .map_err(|e| e.to_string())?;
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;

        let params = core_rs::time_tracking::CreateManualEntryParams {
            space_id: space_ulid,
            task_id: task_ulid,
            project_id: project_ulid,
            note_id: note_ulid,
            description,
            started_at,
            duration_seconds,
        };

        core_rs::time_tracking::create_manual_time_entry(&conn, params).map_err(|e| e.to_string())
    })
}
