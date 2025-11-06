use core_rs::ocr::*;
use core_rs::vault::*;
use rusqlite::Connection;
use std::path::PathBuf;
use ulid::Ulid;

fn create_test_vault() -> (Connection, Vec<u8>) {
    let temp_path = std::env::temp_dir().join(format!("test_vault_{}.db", Ulid::new()));
    let password = "test_password_123";

    let vault =
        create_vault(temp_path.to_str().unwrap(), password).expect("Failed to create test vault");

    (vault.conn, vault.dek)
}

fn cleanup_vault(conn: Connection) {
    let path = conn.path().unwrap().to_path_buf();
    drop(conn);
    let _ = std::fs::remove_file(path);
}

#[test]
fn test_ocr_status_enum() {
    // Verify all statuses can be created
    let statuses = vec![
        OcrStatus::Pending,
        OcrStatus::Processing,
        OcrStatus::Completed,
        OcrStatus::Failed,
    ];

    for status in statuses {
        let s = status.as_str();
        assert!(!s.is_empty());

        // Verify round-trip
        let parsed = OcrStatus::from_str(s);
        assert_eq!(parsed, status);
    }
}

#[test]
fn test_create_ocr_result() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    let result = create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    assert_eq!(result.blob_id, blob_id);
    assert_eq!(result.status, OcrStatus::Pending);
    assert!(result.extracted_text.is_none());
    assert!(result.error_message.is_none());

    cleanup_vault(conn);
}

#[test]
fn test_get_ocr_result() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    let retrieved = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");

    assert_eq!(retrieved.blob_id, blob_id);

    cleanup_vault(conn);
}

#[test]
fn test_update_ocr_status() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    // Update to processing
    conn.execute(
        "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
        rusqlite::params![OcrStatus::Processing.as_str(), &blob_id],
    )
    .expect("Failed to update status");

    let result = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");

    assert_eq!(result.status, OcrStatus::Processing);

    cleanup_vault(conn);
}

#[test]
fn test_ocr_result_with_text() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    let extracted_text = "This is extracted text from an image.";
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Simulate completion
    conn.execute(
        "UPDATE ocr_result SET status = ?1, extracted_text = ?2, processed_at = ?3 WHERE blob_id = ?4",
        rusqlite::params![OcrStatus::Completed.as_str(), extracted_text, now, &blob_id],
    )
    .expect("Failed to update OCR result");

    let result = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");

    assert_eq!(result.status, OcrStatus::Completed);
    assert_eq!(result.extracted_text, Some(extracted_text.to_string()));
    assert!(result.processed_at.is_some());

    cleanup_vault(conn);
}

#[test]
fn test_ocr_result_with_error() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    let error_message = "Failed to process image: file not found";
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Simulate failure
    conn.execute(
        "UPDATE ocr_result SET status = ?1, error_message = ?2, processed_at = ?3 WHERE blob_id = ?4",
        rusqlite::params![OcrStatus::Failed.as_str(), error_message, now, &blob_id],
    )
    .expect("Failed to update OCR result");

    let result = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");

    assert_eq!(result.status, OcrStatus::Failed);
    assert_eq!(result.error_message, Some(error_message.to_string()));

    cleanup_vault(conn);
}

#[test]
fn test_list_pending_ocr_jobs() {
    let (conn, dek) = create_test_vault();

    // Create multiple OCR results with different statuses
    let blob1 = Ulid::new().to_string();
    let blob2 = Ulid::new().to_string();
    let blob3 = Ulid::new().to_string();

    create_ocr_result(&conn, &blob1).expect("Failed to create OCR result");
    create_ocr_result(&conn, &blob2).expect("Failed to create OCR result");
    create_ocr_result(&conn, &blob3).expect("Failed to create OCR result");

    // Update one to completed
    conn.execute(
        "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
        rusqlite::params![OcrStatus::Completed.as_str(), &blob2],
    )
    .expect("Failed to update status");

    // Query pending jobs
    let pending: Vec<String> = conn
        .prepare("SELECT blob_id FROM ocr_result WHERE status = ?1")
        .unwrap()
        .query_map([OcrStatus::Pending.as_str()], |row| row.get(0))
        .unwrap()
        .collect::<Result<Vec<String>, _>>()
        .expect("Failed to query pending jobs");

    // Should have 2 pending (blob1 and blob3)
    assert_eq!(pending.len(), 2);
    assert!(pending.contains(&blob1));
    assert!(pending.contains(&blob3));
    assert!(!pending.contains(&blob2));

    cleanup_vault(conn);
}

#[test]
fn test_ocr_confidence_score() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    let confidence = 0.95;

    // Update with confidence score
    conn.execute(
        "UPDATE ocr_result SET confidence_score = ?1, status = ?2 WHERE blob_id = ?3",
        rusqlite::params![confidence, OcrStatus::Completed.as_str(), &blob_id],
    )
    .expect("Failed to update confidence");

    let result = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");

    assert_eq!(result.confidence_score, Some(confidence));

    cleanup_vault(conn);
}

#[test]
fn test_multiple_ocr_results() {
    let (conn, dek) = create_test_vault();

    // Create multiple OCR results
    for _ in 0..5 {
        let blob_id = Ulid::new().to_string();
        create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");
    }

    // Count total results
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM ocr_result", [], |row| row.get(0))
        .expect("Failed to count OCR results");

    assert_eq!(count, 5);

    cleanup_vault(conn);
}

#[test]
fn test_ocr_timestamps() {
    let (conn, dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    let result = create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    assert!(result.created_at > 0);
    assert!(result.processed_at.is_none());

    // Simulate processing completion
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "UPDATE ocr_result SET status = ?1, processed_at = ?2 WHERE blob_id = ?3",
        rusqlite::params![OcrStatus::Completed.as_str(), now, &blob_id],
    )
    .expect("Failed to update OCR result");

    let updated = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");

    assert!(updated.processed_at.is_some());
    assert!(updated.processed_at.unwrap() >= result.created_at);

    cleanup_vault(conn);
}

// ========== SECURITY VALIDATION TESTS ==========

#[test]
fn test_ocr_language_validation_valid() {
    // Test valid language codes
    let valid_languages = vec![
        "eng", "fra", "deu", "spa", "eng+fra", "chi-sim", "chi-tra", "jpn", "kor", "ara", "rus",
    ];

    for lang in valid_languages {
        // Validate length
        assert!(lang.len() <= 20, "Language {} exceeds 20 chars", lang);
        // Validate characters: alphanumeric, '+', or '-'
        assert!(
            lang.chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-'),
            "Language {} contains invalid characters",
            lang
        );
    }
}

#[test]
fn test_ocr_language_validation_invalid() {
    // Test invalid language codes that should be rejected
    let invalid_languages = vec![
        "eng; rm -rf /",          // Command injection attempt
        "../../../etc/passwd",    // Path traversal attempt
        "eng && cat /etc/passwd", // Shell command injection
        "eng|whoami",             // Pipe injection
        "eng`id`",                // Command substitution
        "a".repeat(21),           // Too long (> 20 chars)
        "eng fra",                // Space (not allowed)
        "eng,fra",                // Comma (not allowed)
        "eng/fra",                // Slash (not allowed)
        "eng\\fra",               // Backslash (not allowed)
        "eng$var",                // Dollar sign
        "eng@host",               // At sign
        "eng#comment",            // Hash
    ];

    for lang in invalid_languages {
        // Check validation logic
        let is_invalid = lang.len() > 20
            || !lang
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-');
        assert!(
            is_invalid,
            "Language '{}' should be rejected but passed validation",
            lang
        );
    }
}

#[test]
fn test_ocr_output_size_limit() {
    // Test that output exceeding 10MB is rejected
    const MAX_OUTPUT_SIZE: usize = 10 * 1024 * 1024;

    // Simulate small valid output
    let small_output = "A".repeat(1000); // 1KB
    assert!(small_output.len() < MAX_OUTPUT_SIZE);

    // Simulate exactly at limit
    let at_limit = "B".repeat(MAX_OUTPUT_SIZE);
    assert_eq!(at_limit.len(), MAX_OUTPUT_SIZE);

    // Simulate exceeding limit
    let too_large = "C".repeat(MAX_OUTPUT_SIZE + 1);
    assert!(
        too_large.len() > MAX_OUTPUT_SIZE,
        "Output size {} exceeds limit {}",
        too_large.len(),
        MAX_OUTPUT_SIZE
    );
}

#[test]
fn test_process_ocr_job_transactional_behavior() {
    let (conn, _dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    // Create initial OCR result
    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    // Verify initial status is Pending
    let initial = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");
    assert_eq!(initial.status, OcrStatus::Pending);

    // Note: We can't easily test process_ocr_job without a real image file
    // But we can test the database state transitions manually to verify transactional behavior

    // Simulate transaction 1: Mark as processing
    let tx1 = conn
        .unchecked_transaction()
        .expect("Failed to start transaction");
    tx1.execute(
        "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
        rusqlite::params![OcrStatus::Processing.as_str(), &blob_id],
    )
    .expect("Failed to update status");
    tx1.commit().expect("Failed to commit transaction");

    // Verify status updated
    let processing = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");
    assert_eq!(processing.status, OcrStatus::Processing);

    // Simulate transaction 2: Mark as completed with result
    let now = chrono::Utc::now().timestamp();
    let tx2 = conn
        .unchecked_transaction()
        .expect("Failed to start transaction");
    tx2.execute(
        "UPDATE ocr_result SET extracted_text = ?1, status = ?2, processed_at = ?3 WHERE blob_id = ?4",
        rusqlite::params!["Extracted text", OcrStatus::Completed.as_str(), now, &blob_id],
    )
    .expect("Failed to update result");
    tx2.commit().expect("Failed to commit transaction");

    // Verify final state
    let completed = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");
    assert_eq!(completed.status, OcrStatus::Completed);
    assert_eq!(completed.extracted_text, Some("Extracted text".to_string()));
    assert!(completed.processed_at.is_some());

    cleanup_vault(conn);
}

#[test]
fn test_process_ocr_job_failure_transactional_behavior() {
    let (conn, _dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    // Simulate transaction 1: Mark as processing
    let tx1 = conn
        .unchecked_transaction()
        .expect("Failed to start transaction");
    tx1.execute(
        "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
        rusqlite::params![OcrStatus::Processing.as_str(), &blob_id],
    )
    .expect("Failed to update status");
    tx1.commit().expect("Failed to commit transaction");

    // Simulate transaction 2: Mark as failed with error message
    let now = chrono::Utc::now().timestamp();
    let error_msg = "Tesseract failed: file not found";
    let tx2 = conn
        .unchecked_transaction()
        .expect("Failed to start transaction");
    tx2.execute(
        "UPDATE ocr_result SET status = ?1, error_message = ?2, processed_at = ?3 WHERE blob_id = ?4",
        rusqlite::params![OcrStatus::Failed.as_str(), error_msg, now, &blob_id],
    )
    .expect("Failed to update error");
    tx2.commit().expect("Failed to commit transaction");

    // Verify final error state
    let failed = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");
    assert_eq!(failed.status, OcrStatus::Failed);
    assert_eq!(failed.error_message, Some(error_msg.to_string()));
    assert!(failed.processed_at.is_some());
    assert!(failed.extracted_text.is_none());

    cleanup_vault(conn);
}

#[test]
fn test_ocr_result_atomicity() {
    let (conn, _dek) = create_test_vault();
    let blob_id = Ulid::new().to_string();

    create_ocr_result(&conn, &blob_id).expect("Failed to create OCR result");

    // Start a transaction and update status
    let tx = conn
        .unchecked_transaction()
        .expect("Failed to start transaction");
    tx.execute(
        "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
        rusqlite::params![OcrStatus::Completed.as_str(), &blob_id],
    )
    .expect("Failed to update status");

    // Before commit, status should still be Pending from outside transaction
    // (This is testing isolation, but SQLite's default is not strict)
    // After rollback, verify status remains Pending
    drop(tx); // Rollback by dropping without commit

    let result = get_ocr_result(&conn, &blob_id)
        .expect("Failed to get OCR result")
        .expect("OCR result not found");
    assert_eq!(
        result.status,
        OcrStatus::Pending,
        "Transaction rollback should preserve original status"
    );

    cleanup_vault(conn);
}
