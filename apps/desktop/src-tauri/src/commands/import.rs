use crate::state::DbConnection;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn import_from_obsidian_cmd(db: State<DbConnection>, space_id: String, path: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::import::import_from_obsidian(&conn, id, &path).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn import_from_notion_cmd(db: State<DbConnection>, space_id: String, path: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::import::import_from_notion(&conn, id, &path).map_err(|e| e.to_string())
    })
}
