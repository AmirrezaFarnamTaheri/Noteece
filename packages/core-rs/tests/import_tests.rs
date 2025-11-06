use core_rs::db::{migrate, DbError};
use core_rs::import::*;
use core_rs::space::create_space;
use rusqlite::Connection;
use std::fs::File;
use std::io::Write;
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
fn test_import_from_obsidian() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();

    let import_dir = tempdir().unwrap();
    let file_path = import_dir.path().join("test.md");
    let mut file = File::create(file_path).unwrap();
    file.write_all(b"This is a test note.").unwrap();

    import_from_obsidian(&conn, space_id, import_dir.path().to_str().unwrap()).unwrap();

    let mut stmt = conn
        .prepare("SELECT title FROM note WHERE space_id = ?1")
        .unwrap();
    let title: String = stmt
        .query_row([space_id.to_string()], |row| row.get(0))
        .unwrap();
    assert_eq!(title, "test");

    Ok(())
}

#[test]
fn test_import_from_notion() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();

    import_from_notion(&conn, space_id, "./tests/fixtures/notion.zip").unwrap();

    let mut stmt = conn
        .prepare("SELECT title FROM note WHERE space_id = ?1")
        .unwrap();
    let title: String = stmt
        .query_row([space_id.to_string()], |row| row.get(0))
        .unwrap();
    assert_eq!(title, "test");

    Ok(())
}

// ========== EXPORT SECURITY TESTS ==========

#[test]
fn test_export_to_zip_unique_filenames() -> Result<(), DbError> {
    use core_rs::crypto::derive_key;
    use core_rs::note::create_note;

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Create two notes with identical titles
    let note1 = create_note(
        &conn,
        &space_id.to_string(),
        "Duplicate Title",
        "First note content",
    )
    .unwrap();
    let note2 = create_note(
        &conn,
        &space_id.to_string(),
        "Duplicate Title",
        "Second note content",
    )
    .unwrap();

    // Export to ZIP
    let export_dir = tempdir().unwrap();
    let zip_path = export_dir.path().join("export.zip");

    // This should succeed without filename collisions
    let result = export_to_zip(&conn, space_id, &zip_path, &dek);
    assert!(
        result.is_ok(),
        "Export should succeed with duplicate titles"
    );

    // Verify ZIP contains both files with unique names
    let file = File::open(&zip_path).unwrap();
    let mut archive = zip::ZipArchive::new(file).unwrap();

    let mut found_files = Vec::new();
    for i in 0..archive.len() {
        let file = archive.by_index(i).unwrap();
        found_files.push(file.name().to_string());
    }

    // Should have notes/ directory + 2 unique note files
    assert!(found_files.iter().any(|f| f == "notes/"));

    // Both notes should exist with ID-prefixed filenames
    let note1_pattern = format!("{}_", note1.id);
    let note2_pattern = format!("{}_", note2.id);

    assert!(
        found_files.iter().any(|f| f.contains(&note1_pattern)),
        "Should find note1 with ID prefix: {}",
        note1_pattern
    );
    assert!(
        found_files.iter().any(|f| f.contains(&note2_pattern)),
        "Should find note2 with ID prefix: {}",
        note2_pattern
    );

    // Verify no duplicate filenames
    let mut sorted_files = found_files.clone();
    sorted_files.sort();
    sorted_files.dedup();
    assert_eq!(
        found_files.len(),
        sorted_files.len(),
        "All filenames should be unique"
    );

    Ok(())
}

#[test]
fn test_export_to_json_decrypts_content() -> Result<(), DbError> {
    use core_rs::crypto::{derive_key, encrypt_string};

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Create a note with encrypted content
    let plaintext = "This is secret content that should be encrypted";
    let encrypted = encrypt_string(plaintext, &dek).unwrap();

    // Insert note with encrypted content directly
    conn.execute(
        "INSERT INTO note (id, space_id, title, encrypted_content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            ulid::Ulid::new().to_string(),
            space_id.to_string(),
            "Test Note",
            encrypted,
            chrono::Utc::now().timestamp(),
            chrono::Utc::now().timestamp(),
        ],
    )
    .unwrap();

    // Export to JSON
    let json_output = export_to_json(&conn, space_id, &dek).unwrap();

    // Verify the exported JSON contains decrypted plaintext, not ciphertext
    assert!(
        json_output.contains(plaintext),
        "Exported JSON should contain decrypted plaintext"
    );
    assert!(
        !json_output.contains(&encrypted),
        "Exported JSON should NOT contain encrypted ciphertext"
    );
    assert!(
        json_output.contains("Test Note"),
        "Exported JSON should contain note title"
    );

    Ok(())
}

#[test]
fn test_export_to_json_handles_decryption_failure() -> Result<(), DbError> {
    use core_rs::crypto::derive_key;

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Insert note with invalid "encrypted" content
    conn.execute(
        "INSERT INTO note (id, space_id, title, encrypted_content, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            ulid::Ulid::new().to_string(),
            space_id.to_string(),
            "Test Note",
            "not-actually-encrypted-content",
            chrono::Utc::now().timestamp(),
            chrono::Utc::now().timestamp(),
        ],
    )
    .unwrap();

    // Export should succeed but content should be empty for failed decryption
    let json_output = export_to_json(&conn, space_id, &dek).unwrap();

    // Should still contain the note structure
    assert!(
        json_output.contains("Test Note"),
        "Exported JSON should contain note title even if decryption fails"
    );
    // Content should be omitted (empty string)
    assert!(
        json_output.contains("\"content\":\"\"") || json_output.contains("\"content\": \"\""),
        "Failed decryption should result in empty content"
    );

    Ok(())
}

#[test]
fn test_export_to_zip_filename_sanitization() -> Result<(), DbError> {
    use core_rs::crypto::derive_key;
    use core_rs::note::create_note;

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Create notes with problematic filenames
    let problematic_titles = vec![
        "Note with / slash",
        "Note with \\ backslash",
        "Note with : colon",
        "Note with * asterisk",
        "Note with ? question",
        "Note with \" quote",
        "Note with < less",
        "Note with > greater",
        "Note with | pipe",
    ];

    for title in &problematic_titles {
        create_note(&conn, &space_id.to_string(), title, "Content").unwrap();
    }

    // Export to ZIP
    let export_dir = tempdir().unwrap();
    let zip_path = export_dir.path().join("export.zip");

    // Should succeed without filesystem errors
    let result = export_to_zip(&conn, space_id, &zip_path, &dek);
    assert!(
        result.is_ok(),
        "Export should succeed with special characters in titles"
    );

    // Verify ZIP was created and is valid
    assert!(zip_path.exists());
    let file = File::open(&zip_path).unwrap();
    let archive = zip::ZipArchive::new(file);
    assert!(archive.is_ok(), "ZIP file should be valid");

    Ok(())
}

#[test]
fn test_export_to_zip_preserves_content() -> Result<(), DbError> {
    use core_rs::crypto::{decrypt_string, derive_key, encrypt_string};
    use core_rs::note::create_note;

    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    let dek = derive_key("test_password", b"test_salt");

    // Create note
    let plaintext = "Original content with unicode: 日本語 🚀";
    let note = create_note(&conn, &space_id.to_string(), "Test Note", plaintext).unwrap();

    // Export to ZIP
    let export_dir = tempdir().unwrap();
    let zip_path = export_dir.path().join("export.zip");
    export_to_zip(&conn, space_id, &zip_path, &dek).unwrap();

    // Read back from ZIP and verify content
    let file = File::open(&zip_path).unwrap();
    let mut archive = zip::ZipArchive::new(file).unwrap();

    // Find the note file
    let note_prefix = format!("notes/{}_", note.id);
    let mut found = false;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).unwrap();
        if file.name().starts_with(&note_prefix) {
            let mut contents = String::new();
            file.read_to_string(&mut contents).unwrap();

            // Verify content was decrypted and preserved
            assert!(
                contents.contains(plaintext),
                "Exported markdown should contain original plaintext"
            );
            found = true;
            break;
        }
    }

    assert!(found, "Should find the exported note in ZIP");

    Ok(())
}
