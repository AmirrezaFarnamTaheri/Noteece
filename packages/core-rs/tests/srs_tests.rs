use core_rs::db::{migrate, DbError};
use core_rs::note::create_note;
use core_rs::space::create_space;
use core_rs::srs::*;
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
fn test_srs_lifecycle() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();

    let space_id = create_space(&mut conn, "test_space").unwrap();

    let note = create_note(
        &conn,
        &space_id.to_string(),
        "Test Note",
        "This is a test note.",
    )
    .unwrap();

    // Create a knowledge card
    let card = create_knowledge_card(&conn, note.id.0).unwrap();
    assert_eq!(card.note_id, note.id.0);

    // Review the card
    review_card(&conn, card.id, 3).unwrap();

    // Get the card
    let fetched_card = get_knowledge_card(&conn, card.id).unwrap().unwrap();
    assert_eq!(fetched_card.state, CardState::Review);

    // Get the review logs
    let logs = get_review_logs(&conn, card.id).unwrap();
    assert_eq!(logs.len(), 1);

    // Get the due cards
    let due_cards = get_due_cards(&conn).unwrap();
    assert_eq!(due_cards.len(), 0);

    Ok(())
}
