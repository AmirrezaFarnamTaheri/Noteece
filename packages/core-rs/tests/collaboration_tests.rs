use core_rs::collaboration::{add_person_to_space, remove_person_from_space};
use core_rs::db;
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    db::migrate(&mut conn).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, dir)
}

#[test]
fn test_collaboration() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();
    let person_id = Ulid::new();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?, 'Test Space')",
        [space_id.to_string()],
    )
    .unwrap();
    conn.execute(
        "INSERT INTO person (id, name) VALUES (?, 'Test Person')",
        [person_id.to_string()],
    )
    .unwrap();

    add_person_to_space(&conn, space_id, person_id, "member").unwrap();

    let mut stmt = conn
        .prepare("SELECT role FROM space_people WHERE space_id = ? AND person_id = ?")
        .unwrap();
    let mut rows = stmt
        .query(rusqlite::params![
            space_id.to_string(),
            person_id.to_string()
        ])
        .unwrap();
    let row = rows.next().unwrap().unwrap();
    let role: String = row.get(0).unwrap();
    assert_eq!(role, "member");

    remove_person_from_space(&conn, space_id, person_id).unwrap();

    let mut stmt = conn
        .prepare("SELECT role FROM space_people WHERE space_id = ? AND person_id = ?")
        .unwrap();
    let mut rows = stmt
        .query(rusqlite::params![
            space_id.to_string(),
            person_id.to_string()
        ])
        .unwrap();
    assert!(rows.next().unwrap().is_none());
}
