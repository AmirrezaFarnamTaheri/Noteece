use core_rs::db::{migrate, DbError};
use core_rs::meeting::extract_action_items;
use core_rs::note::create_note;
use core_rs::space::create_space;
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
fn test_extract_action_items() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();

    let space_id = create_space(&mut conn, "test_space").unwrap();

    let note = create_note(
        &conn,
        &space_id.to_string(),
        "Meeting Note",
        "- [ ] @jules Do the thing\n- [ ] @jules Do another thing",
    )
    .unwrap();

    let new_task_ids = extract_action_items(
        &conn,
        &space_id.to_string(),
        &note.id.to_string(),
        &note.content_md,
    )
    .unwrap();

    assert_eq!(new_task_ids.len(), 2);

    let mut stmt = conn
        .prepare("SELECT title FROM task WHERE id = ?1")
        .unwrap();
    let title: String = stmt
        .query_row([&new_task_ids[0]], |row| row.get(0))
        .unwrap();
    assert_eq!(title, "Do the thing");

    let title: String = stmt
        .query_row([&new_task_ids[1]], |row| row.get(0))
        .unwrap();
    assert_eq!(title, "Do another thing");

    Ok(())
}
