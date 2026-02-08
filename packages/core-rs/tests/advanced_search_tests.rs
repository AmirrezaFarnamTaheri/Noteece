use core_rs::db::{migrate, DbError};
use core_rs::note::create_note;
use core_rs::search::search_notes;
use core_rs::space::create_space;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (tempfile::TempDir, Connection) {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.db");
    let mut conn = Connection::open(&file_path).unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();
    migrate(&mut conn).unwrap();
    (dir, conn)
}

#[test]
fn test_search_sql_injection_resilience() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();

    create_note(&conn, &space_id.to_string(), "Note 1", "Safe content").unwrap();
    create_note(&conn, &space_id.to_string(), "Note 2", "Another safe note").unwrap();

    // Try SQL injection in query
    let injection_query = "Note'; DROP TABLE note; --";
    let _results = search_notes(&conn, injection_query, &space_id.to_string());

    // Verify table still exists and has data
    let count: i64 = conn.query_row("SELECT count(*) FROM note", [], |row| row.get(0)).unwrap();
    assert_eq!(count, 2, "Table should not be dropped");

    Ok(())
}

#[test]
fn test_search_unicode_handling() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();

    // Note: FTS5 unicode61 tokenizer removes diacritics and case-folds, but might strip emojis as "punctuation" or symbols.
    // If emojis are stripped, searching for them will return nothing.
    // However, searching for text WITH emojis should still work for the text part.
    // Let's test standard unicode text support (Kanji, Cyrillic, etc) which is critical.

    create_note(&conn, &space_id.to_string(), "Kanji Note 漢字", "日本語のテスト").unwrap();
    create_note(&conn, &space_id.to_string(), "Cyrillic Note Привет", "Мир").unwrap();

    // Search for Kanji in title
    let results = search_notes(&conn, "漢字", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1, "Should find note by Kanji in title");
    assert_eq!(results[0].title, "Kanji Note 漢字");

    // Search for Cyrillic
    let results = search_notes(&conn, "Привет", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1, "Should find note by Cyrillic in title");

    Ok(())
}

#[test]
fn test_search_empty_whitespace() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();
    let space_id = create_space(&mut conn, "test_space").unwrap();
    create_note(&conn, &space_id.to_string(), "Note 1", "Content").unwrap();

    // Empty query -> Should return all notes in space
    let results = search_notes(&conn, "", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1);

    // Whitespace query -> Should return all notes in space
    let results = search_notes(&conn, "   ", &space_id.to_string()).unwrap();
    assert_eq!(results.len(), 1);

    Ok(())
}
