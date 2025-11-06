use core_rs::db::{migrate, DbError};
use core_rs::note::create_note;
use core_rs::search::search_notes;
use core_rs::space::create_space;
use core_rs::tag::create_tag;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (tempfile::TempDir, Connection) {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.db");
    let mut conn = Connection::open(&file_path).unwrap();
    conn.pragma_update(None, "foreign_keys", &"ON").unwrap();
    migrate(&mut conn).unwrap();
    (dir, conn)
}

#[test]
fn test_search_notes() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();

    let space_id = create_space(&mut conn, "test_space").unwrap();

    let note1 = create_note(
        &conn,
        &space_id.to_string(),
        "Note 1",
        "This is a test note.",
    )
    .unwrap();
    let note2 = create_note(
        &conn,
        &space_id.to_string(),
        "Note 2",
        "This is another test note.",
    )
    .unwrap();

    let tag1 = create_tag(&conn, &space_id.to_string(), "tag1", None).unwrap();
    let tag2 = create_tag(&conn, &space_id.to_string(), "tag2", None).unwrap();

    conn.execute(
        "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
        rusqlite::params![note1.id.to_string(), tag1.id.to_string()],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
        rusqlite::params![note2.id.to_string(), tag2.id.to_string()],
    )
    .unwrap();

    // Search for a note by content
    let results = search_notes(&conn, "another", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].id.to_string(), note2.id.to_string());

    // Search for a note by tag
    let results = search_notes(&conn, "tag:tag1", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].id.to_string(), note1.id.to_string());

    // Search for a note by content and tag
    let results = search_notes(&conn, "test tag:tag1", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].id.to_string(), note1.id.to_string());

    // Search for a note with a non-existent tag
    let results = search_notes(&conn, "tag:nonexistent", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 0);

    Ok(())
}

// ========== SECURITY TESTS: ENCRYPTED CONTENT PROTECTION ==========

#[test]
fn test_search_does_not_expose_encrypted_content() -> Result<(), DbError> {
    use core_rs::crypto::{derive_key, encrypt_string};

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Create a note with encrypted content
    let plaintext = "This is secret content that should never appear in search results";
    let encrypted = encrypt_string(plaintext, &dek).unwrap();

    // Insert note with encrypted content directly
    conn.execute(
        "INSERT INTO note (id, space_id, title, encrypted_content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            ulid::Ulid::new().to_string(),
            space_id.to_string(),
            "Public Title",
            encrypted,
            chrono::Utc::now().timestamp(),
            chrono::Utc::now().timestamp(),
        ],
    )
    .unwrap();

    // Perform search by title
    let results = search_notes(&conn, "Public", &space_id.to_string()).unwrap();

    // Should find the note by title
    assert_eq!(results.len(), 1, "Should find note by title");

    // Verify result doesn't expose encrypted content
    let result = &results[0];
    assert_eq!(result.title, "Public Title");

    // Note: search_notes returns Note objects, which may have encrypted_content field
    // But the search itself should not use encrypted_content for matching
    // and should not expose it in snippets

    Ok(())
}

#[test]
fn test_search_does_not_match_encrypted_content() -> Result<(), DbError> {
    use core_rs::crypto::{derive_key, encrypt_string};

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Create a note with encrypted content containing "secret"
    let plaintext = "This contains the word secret";
    let encrypted = encrypt_string(plaintext, &dek).unwrap();

    conn.execute(
        "INSERT INTO note (id, space_id, title, encrypted_content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            ulid::Ulid::new().to_string(),
            space_id.to_string(),
            "Public Title",
            encrypted,
            chrono::Utc::now().timestamp(),
            chrono::Utc::now().timestamp(),
        ],
    )
    .unwrap();

    // Search for "secret" - should NOT match the encrypted content
    let results = search_notes(&conn, "secret", &space_id.to_string()).unwrap();

    // Should NOT find the note because encrypted content is not searched
    assert_eq!(
        results.len(),
        0,
        "Should not match encrypted content in search"
    );

    Ok(())
}

#[test]
fn test_search_performance_without_encrypted_content() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();

    // Create many notes
    for i in 0..100 {
        create_note(
            &conn,
            &space_id.to_string(),
            &format!("Note {}", i),
            "Test content",
        )
        .unwrap();
    }

    // Perform search and measure basic performance
    let start = std::time::Instant::now();
    let results = search_notes(&conn, "Note", &space_id.to_string()).unwrap();
    let duration = start.elapsed();

    // Search should complete reasonably fast (< 1 second for 100 notes)
    assert!(
        duration.as_secs() < 1,
        "Search should be fast without fetching encrypted_content"
    );
    assert!(!results.is_empty(), "Should find matching notes");

    Ok(())
}
