use core_rs::ocr::*;
use rusqlite::Connection;
use ulid::Ulid;

fn setup_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    // Mock blob table foreign key dependency
    conn.execute("CREATE TABLE blob (id TEXT PRIMARY KEY)", [])
        .unwrap();
    init_ocr_tables(&conn).unwrap();
    conn
}

#[test]
fn test_ocr_status_enum() {
    let statuses = vec![
        OcrStatus::Pending,
        OcrStatus::Processing,
        OcrStatus::Completed,
        OcrStatus::Failed,
    ];
    for status in statuses {
        let s = status.as_str();
        assert!(!s.is_empty());
        let parsed = OcrStatus::from_str(s);
        assert_eq!(parsed, status);
    }
}

#[test]
fn test_queue_ocr_job() {
    let conn = setup_db();
    let blob_id = Ulid::new().to_string();

    // Insert dummy blob to satisfy FK
    conn.execute("INSERT INTO blob (id) VALUES (?1)", [&blob_id])
        .unwrap();

    let id = queue_ocr(&conn, &blob_id).expect("Failed to queue OCR result");

    let result = get_ocr_status(&conn, &blob_id).unwrap().unwrap();
    assert_eq!(result.id, id);
    assert_eq!(result.blob_id, blob_id);
    assert_eq!(result.status, OcrStatus::Pending);
    assert!(result.extracted_text.is_none());
}

#[test]
fn test_update_ocr_status_flow() {
    let conn = setup_db();
    let blob_id = Ulid::new().to_string();
    conn.execute("INSERT INTO blob (id) VALUES (?1)", [&blob_id])
        .unwrap();
    queue_ocr(&conn, &blob_id).unwrap();

    // Simulate Processing
    conn.execute(
        "UPDATE ocr_result SET status = ?1 WHERE blob_id = ?2",
        rusqlite::params![OcrStatus::Processing.as_str(), &blob_id],
    )
    .unwrap();

    let processing = get_ocr_status(&conn, &blob_id).unwrap().unwrap();
    assert_eq!(processing.status, OcrStatus::Processing);

    // Simulate Completion
    let text = "Extracted Text";
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE ocr_result SET status = ?1, extracted_text = ?2, processed_at = ?3 WHERE blob_id = ?4",
        rusqlite::params![OcrStatus::Completed.as_str(), text, now, &blob_id],
    )
    .unwrap();

    let completed = get_ocr_status(&conn, &blob_id).unwrap().unwrap();
    assert_eq!(completed.status, OcrStatus::Completed);
    assert_eq!(completed.extracted_text, Some(text.to_string()));
}

#[test]
fn test_search_ocr_text() {
    let conn = setup_db();
    let blob_id = Ulid::new().to_string();
    conn.execute("INSERT INTO blob (id) VALUES (?1)", [&blob_id])
        .unwrap();
    queue_ocr(&conn, &blob_id).unwrap();

    // Manually complete it
    let text = "The quick brown fox jumps over the lazy dog";
    conn.execute(
        "UPDATE ocr_result SET status = 'completed', extracted_text = ?1 WHERE blob_id = ?2",
        rusqlite::params![text, &blob_id],
    )
    .unwrap();

    let results = search_ocr_text(&conn, "fox", 10).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].blob_id, blob_id);

    let empty_results = search_ocr_text(&conn, "zebra", 10).unwrap();
    assert_eq!(empty_results.len(), 0);
}

#[test]
fn test_security_validation_inputs() {
    let path = std::path::Path::new("test.png");

    // Valid
    let res = process_image_ocr(path, Some("eng"));
    // Will fail because tesseract/file missing, but should NOT fail validation
    assert!(matches!(
        res,
        Err(OcrError::TesseractNotFound) | Err(OcrError::Processing(_))
    ));

    // Invalid (Injection attempt)
    let res = process_image_ocr(path, Some("eng; rm -rf /"));
    if let Err(OcrError::Processing(msg)) = res {
        assert_eq!(msg, "Invalid language parameter");
    } else {
        panic!("Should have failed validation");
    }
}
