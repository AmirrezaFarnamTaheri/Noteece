use crate::state::DbConnection;
use core_rs::caldav::*;
use tauri::State;

#[tauri::command]
pub fn add_caldav_account_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    url: String,
    username: String,
    password: Option<String>,
) -> Result<CalDavAccount, String> {
    crate::with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
        if dek.is_empty() { return Err("DEK not available".to_string()); }

        // add_caldav_account(conn, url, username, password, calendar_path, dek)
        core_rs::caldav::add_caldav_account(&conn, &url, &username, password.as_deref().unwrap_or(""), &name, dek)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_accounts_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<CalDavAccount>, String> {
    crate::with_db!(db, conn, {
        core_rs::caldav::get_caldav_accounts(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<Option<CalDavAccount>, String> {
    crate::with_db!(db, conn, {
        core_rs::caldav::get_caldav_account(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_caldav_account_cmd(
    db: State<DbConnection>,
    account_id: String,
    name: String,
    url: String,
    username: String,
    password: Option<String>,
) -> Result<CalDavAccount, String> {
    crate::with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice());

        core_rs::caldav::update_caldav_account(
            &conn,
            &account_id,
            None,
            None,
            None,
            None,
            Some(&url),
            Some(&username),
            password.as_deref(),
            Some(&name),
            dek
        ).map_err(|e| e.to_string())?;

        core_rs::caldav::get_caldav_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "CalDAV account not found".to_string())
    })
}

#[tauri::command]
pub fn delete_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::caldav::delete_caldav_account(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn sync_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<SyncResult, String> {
    crate::with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
        if dek.is_empty() { return Err("DEK not available".to_string()); }

        core_rs::caldav::sync_caldav_account(&conn, &account_id, dek).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_sync_history_cmd(db: State<DbConnection>, account_id: String) -> Result<Vec<SyncResult>, String> {
    crate::with_db!(db, conn, {
        core_rs::caldav::get_sync_history(&conn, &account_id, 50).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_conflicts_cmd(db: State<DbConnection>, account_id: String) -> Result<Vec<SyncConflict>, String> {
    crate::with_db!(db, conn, {
        core_rs::caldav::get_unresolved_conflicts(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn resolve_caldav_conflict_cmd(db: State<DbConnection>, conflict_id: String, resolution: ConflictResolution) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::caldav::resolve_conflict(&conn, &conflict_id, resolution).map_err(|e| e.to_string())
    })
}
