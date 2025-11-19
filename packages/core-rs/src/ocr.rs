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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OcrResult {
    pub id: String,
    pub blob_id: String,
    pub extracted_text: Option<String>,
    pub confidence: Option<f64>,
    pub processed_at: Option<i64>,
    pub status: OcrStatus,
    pub error_message: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OcrStatus {
    Pending,
    Processing,
    Completed,
    Failed,
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

    pub fn from_str(s: &str) -> Self {
        match s {
            "pending" => OcrStatus::Pending,
            "processing" => OcrStatus::Processing,
            "completed" => OcrStatus::Completed,
            "failed" => OcrStatus::Failed,
            _ => OcrStatus::Unknown,
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

fn find_tesseract() -> Option<String> {
    let possible_paths = vec![
        "tesseract",
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/homebrew/bin/tesseract",
        "C:\\Program Files\\Tesseract-OCR\\tesseract.exe",
        "C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe",
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

pub fn process_image_ocr(image_path: &Path, language: Option<&str>) -> Result<String, OcrError> {
    let tesseract_path = find_tesseract().ok_or(OcrError::TesseractNotFound)?;

    if !image_path.exists() {
        return Err(OcrError::Processing(format!(
            "Image not found: {}",
            image_path.display()
        )));
    }

    let lang = language.unwrap_or("eng");
    if lang.len() > 20 || !lang.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-') {
        return Err(OcrError::Processing(
            "Invalid language parameter".to_string(),
        ));
    }

    let output = Command::new(&tesseract_path)
        .arg(image_path)
        .arg("stdout")
        .arg("-l")
        .arg(lang)
        .output()
        .map_err(OcrError::from)?;

    if !output.status.success() {
        let code = output.status.code().unwrap_or(-1);
        return Err(OcrError::Processing(format!(
            "Tesseract failed (exit {})",
            code
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub fn queue_ocr(conn: &Connection, blob_id: &str) -> Result<String, OcrError> {
    let id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO ocr_result (id, blob_id, status, created_at) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![&id, blob_id, OcrStatus::Pending.as_str(), now],
    )?;

    Ok(id)
}

pub fn get_ocr_status(conn: &Connection, blob_id: &str) -> Result<Option<OcrResult>, OcrError> {
    let mut stmt = conn.prepare(
        "SELECT id, blob_id, extracted_text, confidence, status, processed_at, error_message, created_at
         FROM ocr_result WHERE blob_id = ?1",
    )?;

    let result = stmt.query_row([blob_id], |row| {
        let status_str: String = row.get(4)?;
        Ok(OcrResult {
            id: row.get(0)?,
            blob_id: row.get(1)?,
            extracted_text: row.get(2)?,
            confidence: row.get(3)?,
            status: OcrStatus::from_str(&status_str),
            processed_at: row.get(5)?,
            error_message: row.get(6)?,
            created_at: row.get(7)?,
        })
    });

    match result {
        Ok(r) => Ok(Some(r)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn process_ocr_job(
    conn: &Connection,
    blob_id: &str,
    image_path: &Path,
    language: Option<&str>,
) -> Result<String, OcrError> {
    let now = chrono::Utc::now().timestamp();

    {
        let tx = conn.unchecked_transaction()?;
        tx.execute(
            "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
            rusqlite::params![OcrStatus::Processing.as_str(), blob_id],
        )?;
        tx.commit()?;
    }

    let text_or_err = process_image_ocr(image_path, language);

    let tx2 = conn.unchecked_transaction()?;
    match text_or_err {
        Ok(text) => {
            tx2.execute(
                "UPDATE ocr_result SET extracted_text = ?1, status = ?2, processed_at = ?3 WHERE blob_id = ?4",
                rusqlite::params![&text, OcrStatus::Completed.as_str(), now, blob_id],
            )?;
            tx2.commit()?;
            Ok(text)
        }
        Err(e) => {
            tx2.execute(
                "UPDATE ocr_result SET status = ?1, error_message = ?2, processed_at = ?3 WHERE blob_id = ?4",
                rusqlite::params![OcrStatus::Failed.as_str(), e.to_string(), now, blob_id],
            )?;
            tx2.commit()?;
            Err(e)
        }
    }
}

pub fn search_ocr_text(
    conn: &Connection,
    query: &str,
    limit: u32,
) -> Result<Vec<OcrResult>, OcrError> {
    let mut stmt = conn.prepare(
        "SELECT id, blob_id, extracted_text, confidence, status, processed_at, error_message, created_at
         FROM ocr_result
         WHERE status = 'completed' AND extracted_text LIKE ?1
         ORDER BY processed_at DESC
         LIMIT ?2",
    )?;

    let search_pattern = format!("%{}%", query);
    let rows = stmt.query_map(rusqlite::params![search_pattern, limit], |row| {
        let status_str: String = row.get(4)?;
        Ok(OcrResult {
            id: row.get(0)?,
            blob_id: row.get(1)?,
            extracted_text: row.get(2)?,
            confidence: row.get(3)?,
            status: OcrStatus::from_str(&status_str),
            processed_at: row.get(5)?,
            error_message: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}
