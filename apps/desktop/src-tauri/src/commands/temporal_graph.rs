use crate::state::DbConnection;
use core_rs::temporal_graph::{GraphSnapshot, GraphMilestone};
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn build_current_graph_cmd(db: State<DbConnection>, space_id: String) -> Result<GraphSnapshot, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::temporal_graph::build_current_graph(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_graph_evolution_cmd(db: State<DbConnection>, space_id: String, start: i64, end: i64) -> Result<Vec<GraphSnapshot>, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        let evolution = core_rs::temporal_graph::get_graph_evolution(&conn, space_ulid, start, end, 10).map_err(|e| e.to_string())?;
        Ok(evolution.snapshots)
    })
}

#[tauri::command]
pub fn detect_major_notes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<GraphMilestone>, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::temporal_graph::detect_major_notes(&conn, space_ulid).map_err(|e| e.to_string())
    })
}
