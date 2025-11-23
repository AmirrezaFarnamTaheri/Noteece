use crate::state::DbConnection;
use core_rs::note::Note;
use core_rs::weekly_review::generate_weekly_review;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn generate_weekly_review_cmd(db: State<DbConnection>, space_id: String) -> Result<Note, String> {
    crate::with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        generate_weekly_review(&conn, space_ulid).map_err(|e| e.to_string())
    })
}
