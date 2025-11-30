//! OCR Command Handlers
//!
//! Provides Tauri commands for queueing, processing, and searching OCR results.
//! OCR is performed using Tesseract when available, with results stored in the database.

use crate::config::AppConfig;
use crate::state::DbConnection;
use std::fs;
use std::path::PathBuf;
use tauri::State;

/// Queue a blob for OCR processing
#[tauri::command]
pub fn queue_ocr_cmd(db: State<DbConnection>, blob_id: String) -> Result<String, String> {
    crate::with_db!(db, conn, {
        core_rs::ocr::queue_ocr(&conn, &blob_id).map_err(|e| e.to_string())
    })
}

/// Get OCR status for a specific blob
#[tauri::command]
pub fn get_ocr_status_cmd(
    db: State<DbConnection>,
    blob_id: String,
) -> Result<Option<core_rs::ocr::OcrResult>, String> {
    crate::with_db!(db, conn, {
        core_rs::ocr::get_ocr_status(&conn, &blob_id).map_err(|e| e.to_string())
    })
}

/// Search OCR extracted text
#[tauri::command]
pub fn search_ocr_text_cmd(
    db: State<DbConnection>,
    query: String,
) -> Result<Vec<core_rs::ocr::OcrResult>, String> {
    crate::with_db!(db, conn, {
        core_rs::ocr::search_ocr_text(&conn, &query, 100).map_err(|e| e.to_string())
    })
}

/// Process a pending OCR job
///
/// This retrieves the blob from encrypted storage, writes it to a temporary file,
/// runs OCR using Tesseract, and stores the result.
#[tauri::command]
pub fn process_ocr_job_cmd(
    db: State<DbConnection>,
    blob_id: String,
    language: Option<String>,
) -> Result<String, String> {
    // Get vault path and DEK
    let vault_path =
        AppConfig::vault_path().ok_or_else(|| "Vault path not configured".to_string())?;

    let dek = {
        let dek_guard = db
            .dek
            .lock()
            .map_err(|_| "Failed to lock DEK".to_string())?;
        dek_guard
            .clone()
            .ok_or_else(|| "DEK not available (Vault locked)".to_string())?
    };

    // Retrieve the blob from encrypted storage
    let blob_data = core_rs::blob::retrieve_blob(&vault_path, &dek, &blob_id)
        .map_err(|e| format!("Failed to retrieve blob: {}", e))?;

    // Create a temporary file for OCR processing
    let temp_dir = std::env::temp_dir();
    let temp_file_path = temp_dir.join(format!(
        "noteece_ocr_{}.png",
        &blob_id[..8.min(blob_id.len())]
    ));

    fs::write(&temp_file_path, &blob_data)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Process OCR
    let result = crate::with_db!(db, conn, {
        core_rs::ocr::process_ocr_job(&conn, &blob_id, &temp_file_path, language.as_deref())
            .map_err(|e| e.to_string())
    });

    // Clean up temp file
    let _ = fs::remove_file(&temp_file_path);

    result
}

/// Get all pending OCR jobs
#[tauri::command]
pub fn get_pending_ocr_jobs_cmd(
    db: State<DbConnection>,
) -> Result<Vec<core_rs::ocr::OcrResult>, String> {
    crate::with_db!(db, conn, {
        let mut stmt = conn.prepare(
            "SELECT id, blob_id, extracted_text, confidence, status, processed_at, error_message, created_at
             FROM ocr_result WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let status_str: String = row.get(4)?;
                Ok(core_rs::ocr::OcrResult {
                    id: row.get(0)?,
                    blob_id: row.get(1)?,
                    extracted_text: row.get(2)?,
                    confidence: row.get(3)?,
                    status: status_str
                        .parse()
                        .unwrap_or(core_rs::ocr::OcrStatus::Unknown),
                    processed_at: row.get(5)?,
                    error_message: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }
        Ok(results)
    })
}

/// Process all pending OCR jobs in the queue
#[tauri::command]
pub async fn process_ocr_queue_cmd(
    db: State<'_, DbConnection>,
    language: Option<String>,
) -> Result<u32, String> {
    // Get pending jobs
    let pending_jobs: Vec<String> = crate::with_db!(db, conn, {
        let mut stmt = conn.prepare(
            "SELECT blob_id FROM ocr_result WHERE status = 'pending' ORDER BY created_at ASC LIMIT 10"
        ).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        let mut ids = Vec::new();
        for row in rows {
            ids.push(row.map_err(|e| e.to_string())?);
        }
        Ok(ids)
    })?;

    let vault_path =
        AppConfig::vault_path().ok_or_else(|| "Vault path not configured".to_string())?;

    let dek = {
        let dek_guard = db
            .dek
            .lock()
            .map_err(|_| "Failed to lock DEK".to_string())?;
        dek_guard
            .clone()
            .ok_or_else(|| "DEK not available".to_string())?
    };

    let mut processed = 0u32;

    for blob_id in pending_jobs {
        // Retrieve blob
        let blob_data = match core_rs::blob::retrieve_blob(&vault_path, &dek, &blob_id) {
            Ok(data) => data,
            Err(e) => {
                log::warn!("[ocr] Failed to retrieve blob {}: {}", blob_id, e);
                continue;
            }
        };

        // Write to temp file
        let temp_file_path = std::env::temp_dir().join(format!(
            "noteece_ocr_{}.png",
            &blob_id[..8.min(blob_id.len())]
        ));
        if let Err(e) = fs::write(&temp_file_path, &blob_data) {
            log::warn!("[ocr] Failed to write temp file for {}: {}", blob_id, e);
            continue;
        }

        // Process
        let result = crate::with_db!(db, conn, {
            core_rs::ocr::process_ocr_job(&conn, &blob_id, &temp_file_path, language.as_deref())
        });

        // Cleanup
        let _ = fs::remove_file(&temp_file_path);

        if result.is_ok() {
            processed += 1;
        }
    }

    Ok(processed)
}
