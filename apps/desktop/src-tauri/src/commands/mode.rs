use crate::state::DbConnection;
use core_rs::mode::*;
use tauri::State;

#[tauri::command]
pub fn get_space_modes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Mode>, String> {
    crate::with_db!(db, conn, {
        core_rs::mode::get_space_modes(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn enable_mode_cmd(db: State<DbConnection>, space_id: String, mode: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let mode_enum: Mode = serde_json::from_value(serde_json::Value::String(mode)).map_err(|e| e.to_string())?;
        core_rs::mode::enable_mode(&conn, &space_id, &mode_enum).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn disable_mode_cmd(db: State<DbConnection>, space_id: String, mode: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let mode_enum: Mode = serde_json::from_value(serde_json::Value::String(mode)).map_err(|e| e.to_string())?;
        core_rs::mode::disable_mode(&conn, &space_id, &mode_enum).map_err(|e| e.to_string())
    })
}
