use crate::state::DbConnection;
use core_rs::space::*;
use tauri::State;

#[tauri::command]
pub fn get_all_spaces_cmd(db: State<DbConnection>) -> Result<Vec<core_rs::space::Space>, String> {
    crate::with_db!(db, conn, {
        core_rs::space::get_all_spaces(&conn).map_err(|e| e.to_string())
    })
}
