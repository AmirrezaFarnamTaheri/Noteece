use crate::state::DbConnection;
use core_rs::foresight::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn generate_insights_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Insight>, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::foresight::generate_insights(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_active_insights_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Insight>, String> {
    crate::with_db!(db, conn, {
        core_rs::foresight::get_active_insights(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn dismiss_insight_cmd(db: State<DbConnection>, insight_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        core_rs::foresight::dismiss_insight(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn record_feedback_cmd(db: State<DbConnection>, insight_id: String, useful: bool) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        core_rs::foresight::record_feedback(&conn, id, useful).map_err(|e| e.to_string())
    })
}
