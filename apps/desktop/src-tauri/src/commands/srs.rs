use crate::state::DbConnection;
use core_rs::srs::*;
use tauri::State;
use ulid::Ulid;

#[tauri::command]
pub fn get_due_cards_cmd(db: State<DbConnection>) -> Result<Vec<KnowledgeCard>, String> {
    crate::with_db!(db, conn, {
        core_rs::srs::get_due_cards(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn review_card_cmd(db: State<DbConnection>, card_id: String, quality: u8) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let id = Ulid::from_string(&card_id).map_err(|e| e.to_string())?;
        // review_card takes i64 rating (0-5)
        core_rs::srs::review_card(&conn, id, quality as i64).map_err(|e| e.to_string())
    })
}
