use crate::state::DbConnection;
use tauri::State;
use std::path::Path;

#[tauri::command]
pub fn queue_ocr_cmd(db: State<DbConnection>, blob_id: String) -> Result<(), String> {
     crate::with_db!(db, conn, {
        core_rs::ocr::queue_ocr(&conn, &blob_id).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_ocr_status_cmd(db: State<DbConnection>, blob_id: String) -> Result<Option<core_rs::ocr::OcrResult>, String> {
    crate::with_db!(db, conn, {
        core_rs::ocr::get_ocr_status(&conn, &blob_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_ocr_text_cmd(db: State<DbConnection>, query: String) -> Result<Vec<core_rs::ocr::OcrResult>, String> {
    crate::with_db!(db, conn, {
        core_rs::ocr::search_ocr_text(&conn, &query, 100).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn process_ocr_job_cmd(db: State<DbConnection>, job_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        let jid = job_id;
        core_rs::ocr::process_ocr_job(&conn, &jid, Path::new("placeholder"), None).map_err(|e| e.to_string())?;
        Ok(())
    })
}
