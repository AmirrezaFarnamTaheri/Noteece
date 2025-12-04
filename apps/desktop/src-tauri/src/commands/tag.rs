use crate::state::DbConnection;
use core_rs::tag::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn get_all_tags_in_space_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<Tag>, String> {
    crate::with_db!(db, conn, {
        core_rs::tag::get_all_tags_in_space(
            &conn,
            Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_tags_with_counts_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<TagWithCount>, String> {
    crate::with_db!(db, conn, {
        core_rs::tag::get_tags_with_counts(
            &conn,
            Ulid::from_string(&space_id).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())
    })
}
