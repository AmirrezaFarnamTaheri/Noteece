use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum OcrError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("OCR processing error: {0}")]
    Processing(String),
    #[error("Tesseract not found or not executable")]
    TesseractNotFound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    pub blob_id: String,
    pub text: Option<String>,
    pub confidence: Option<f32>,
    pub processed_at: Option<i64>,
    pub status: OcrStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OcrStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    /// Unknown status from database - used for forward compatibility
    Unknown,
}

impl OcrStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            OcrStatus::Pending => "pending",
            OcrStatus::Processing => "processing",
            OcrStatus::Completed => "completed",
            OcrStatus::Failed => "failed",
            OcrStatus::Unknown => "unknown",
        }
    }
}

/// Initialize OCR tables in the database
pub fn init_ocr_tables(conn: &Connection) -> Result<(), OcrError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ocr_result (
            id TEXT PRIMARY KEY,
            blob_id TEXT NOT NULL UNIQUE,
            extracted_text TEXT,
            confidence REAL,
            status TEXT NOT NULL DEFAULT 'pending',
            processed_at INTEGER,
            error_message TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (blob_id) REFERENCES blob(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create index for faster lookups
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ocr_result_status ON ocr_result(status)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ocr_result_blob_id ON ocr_result(blob_id)",
        [],
    )?;

    Ok(())
}

/// Find Tesseract executable path
fn find_tesseract() -> Option<String> {
    // Check common locations
    let possible_paths = vec![
        "tesseract",                                             // In PATH
        "/usr/bin/tesseract",                                    // Linux/macOS system
        "/usr/local/bin/tesseract",                              // macOS Homebrew
        "/opt/homebrew/bin/tesseract",                           // macOS M1 Homebrew
        "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",       // Windows
        "C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe", // Windows 32-bit
    ];

    for path in possible_paths {
        if let Ok(output) = Command::new(path).arg("--version").output() {
            if output.status.success() {
                return Some(path.to_string());
            }
        }
    }

    None
}

/// Process image with Tesseract OCR
///
/// SECURITY: This function validates the language parameter to prevent command injection
/// and enforces size limits on the output to prevent memory exhaustion.
pub fn process_image_ocr(image_path: &Path, language: Option<&str>) -> Result<String, OcrError> {


    let tesseract_path = find_tesseract().ok_or(OcrError::TesseractNotFound)?;

    // Pre-flight check for path existence/readability
    if !image_path.exists() {
        return Err(OcrError::Processing(format!(
            "Image not found: {}",
            image_path.display()
        )));
    }
    if !image_path.is_file() {
        return Err(OcrError::Processing(format!(
            "Not a file: {}",
            image_path.display()
        )));
    }

    // Validate language parameter to prevent command injection
    // Allow only alphanumeric characters, '+' (for language combinations like 'eng+fra'),
    // and '-' (for script variants like 'chi-sim')
    let lang = language.unwrap_or("eng");
    if lang.len() > 20
        || !lang
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-')
    {
        return Err(OcrError::Processing(
            "Invalid language parameter: must be alphanumeric with optional '+' or '-'".to_string(),
        ));
    }

    let mut cmd = Command::new(&tesseract_path);
    cmd.arg(image_path) // pass OsStr directly to avoid UTF-8 assumption
        .arg("stdout")
        .arg("-l")
        .arg(lang);

    let output = cmd.output().map_err(OcrError::from)?;

    if !output.status.success() {
        let code = output.status.code().unwrap_or(-1);
        let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(OcrError::Processing(format!(
            "Tesseract failed (exit {}): {}",
            code, error_msg
        )));
    }

    // Guard against excessively large output (10MB cap)
    const MAX_OUTPUT_SIZE: usize = 10 * 1024 * 1024;
    if output.stdout.len() > MAX_OUTPUT_SIZE {
        return Err(OcrError::Processing(format!(
            "Tesseract output too large: {} bytes (max {})",
            output.stdout.len(),
            MAX_OUTPUT_SIZE
        )));
    }

    let text = String::from_utf8(output.stdout).map_err(|e| {
        OcrError::Processing(format!("Tesseract output was not valid UTF-8: {}", e))
    })?;
    Ok(text.trim().to_string())
}

/// Queue an image blob for OCR processing
pub fn queue_ocr(conn: &Connection, blob_id: &str) -> Result<String, OcrError> {
    use rusqlite::params;

    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO ocr_result (id, blob_id, status, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![&id, blob_id, OcrStatus::Pending.as_str(), now],
    )?;

    Ok(id)
}

/// Get OCR status for a blob
pub fn get_ocr_status(conn: &Connection, blob_id: &str) -> Result<Option<OcrResult>, OcrError> {
    let mut stmt = conn.prepare(
        "SELECT id, blob_id, extracted_text, confidence, status, processed_at
         FROM ocr_result WHERE blob_id = ?1",
    )?;

    let result = stmt.query_row([blob_id], |row| {
        let status_str: String = row.get(4)?;
        // Lenient parsing: unknown status values map to Unknown variant
        // This prevents query failures if the database contains unexpected values
        let status = match status_str.as_str() {
            "pending" => OcrStatus::Pending,
            "processing" => OcrStatus::Processing,
            "completed" => OcrStatus::Completed,
            "failed" => OcrStatus::Failed,
            _ => OcrStatus::Unknown,
        };

        Ok(OcrResult {
            blob_id: row.get(1)?,
            text: row.get::<_, Option<String>>(2)?,
            confidence: row.get(3)?,
            processed_at: row.get::<_, Option<i64>>(5)?,
            status,
        })
    });

    match result {
        Ok(r) => Ok(Some(r)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Process a queued OCR job
/// This function orchestrates the entire OCR workflow:
/// 1. Mark the job as processing (transactionally)
/// 2. Run Tesseract on the image (outside DB lock)
/// 3. Update the database with results or error (transactionally)
///
/// RELIABILITY: Uses transactions to ensure atomic status updates, preventing
/// inconsistent states if errors occur during processing.
pub fn process_ocr_job(
    conn: &Connection,
    blob_id: &str,
    image_path: &Path,
    language: Option<&str>,
) -> Result<String, OcrError> {
    use rusqlite::params;

    let now = chrono::Utc::now().timestamp();

    // Transaction 1: Mark as processing atomically
    {
        let tx = conn.unchecked_transaction()?;
        tx.execute(
            "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
            params![OcrStatus::Processing.as_str(), blob_id],
        )?;
        tx.commit()?;
    }

    // Process the image outside DB lock to avoid blocking other operations
    let text_or_err = process_image_ocr(image_path, language);

    // Transaction 2: Persist result atomically
    let tx2 = conn.unchecked_transaction()?;
    match text_or_err {
        Ok(text) => {
            // Success - update with extracted text
            tx2.execute(
                "UPDATE ocr_result
                 SET extracted_text = ?1, status = ?2, processed_at = ?3
                 WHERE blob_id = ?4",
                params![&text, OcrStatus::Completed.as_str(), now, blob_id],
            )?;
            tx2.commit()?;
            Ok(text)
        }
        Err(e) => {
            // Failure - mark as failed with error message
            tx2.execute(
                "UPDATE ocr_result
                 SET status = ?1, error_message = ?2, processed_at = ?3
                 WHERE blob_id = ?4",
                params![OcrStatus::Failed.as_str(), e.to_string(), now, blob_id],
            )?;
            tx2.commit()?;
            Err(e)
        }
    }
}

/// Update OCR result after processing
pub fn update_ocr_result(
    conn: &Connection,
    blob_id: &str,
    text: &str,
    confidence: Option<f32>,
    status: OcrStatus,
) -> Result<(), OcrError> {
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "UPDATE ocr_result
         SET extracted_text = ?1, confidence = ?2, status = ?3, processed_at = ?4
         WHERE blob_id = ?5",
        [
            &text.to_string(),
            &confidence.map(|c| c.to_string()).unwrap_or_default(),
            &status.as_str().to_string(),
            &now.to_string(),
            &blob_id.to_string(),
        ],
    )?;

    Ok(())
}

/// Search OCR extracted text
pub fn search_ocr_text(
    conn: &Connection,
    query: &str,
    limit: u32,
) -> Result<Vec<OcrResult>, OcrError> {
    let mut stmt = conn.prepare(
        "SELECT id, blob_id, extracted_text, confidence, status, processed_at
         FROM ocr_result
         WHERE status = 'completed' AND extracted_text LIKE ?1
         ORDER BY processed_at DESC
         LIMIT ?2",
    )?;

    let search_pattern = format!("%{}%", query);
    let results = stmt.query_map([search_pattern, limit.to_string()], |row| {
        let status_str: String = row.get(4)?;
        // Lenient parsing: unknown status values map to Unknown variant
        let status = match status_str.as_str() {
            "pending" => OcrStatus::Pending,
            "processing" => OcrStatus::Processing,
            "completed" => OcrStatus::Completed,
            "failed" => OcrStatus::Failed,
            _ => OcrStatus::Unknown,
        };

        Ok(OcrResult {
            blob_id: row.get(1)?,
            text: row.get::<_, Option<String>>(2)?,
            confidence: row.get(3)?,
            processed_at: row.get::<_, Option<i64>>(5)?,
            status,
        })
    })?;

    let mut ocr_results = Vec::new();
    for result in results {
        ocr_results.push(result?);
    }

    Ok(ocr_results)
}

/// Get pending OCR jobs
pub fn get_pending_ocr_jobs(
    conn: &Connection,
    limit: u32,
) -> Result<Vec<(String, String)>, OcrError> {
    let mut stmt = conn.prepare(
        "SELECT id, blob_id FROM ocr_result
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT ?1",
    )?;

    let results = stmt.query_map([limit.to_string()], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut jobs = Vec::new();
    for result in results {
        jobs.push(result?);
    }

    Ok(jobs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_status_serialization() {
        assert_eq!(OcrStatus::Pending.as_str(), "pending");
        assert_eq!(OcrStatus::Processing.as_str(), "processing");
        assert_eq!(OcrStatus::Completed.as_str(), "completed");
        assert_eq!(OcrStatus::Failed.as_str(), "failed");
        assert_eq!(OcrStatus::Unknown.as_str(), "unknown");
    }

    #[test]
    fn test_tesseract_detection() {
        // This test checks if tesseract is available
        // It may fail on CI systems without tesseract installed
        let result = find_tesseract();
        if result.is_some() {
            println!("Tesseract found at: {:?}", result);
        } else {
            println!("Tesseract not found - OCR features will be unavailable");
        }
    }
}
