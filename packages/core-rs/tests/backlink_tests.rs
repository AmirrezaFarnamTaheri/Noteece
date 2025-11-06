use core_rs::backlink::{find_backlinks, update_links};
use core_rs::db::migrate;
use rusqlite::Connection;
use ulid::Ulid;

fn setup_db() -> Connection {
    let mut conn = Connection::open_in_memory().unwrap();
    migrate(&mut conn).unwrap();
    conn
}

fn create_space(conn: &Connection) -> Ulid {
    let space_id = Ulid::new();
    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, ?2)",
        (space_id.to_string(), "test space"),
    )
    .unwrap();
    space_id
}

fn create_note(conn: &Connection, space_id: Ulid, title: &str, content: &str) -> Ulid {
    let note_id = Ulid::new();
    conn.execute(
        "INSERT INTO note (id, space_id, title, content_md, created_at, modified_at) VALUES (?1, ?2, ?3, ?4, 0, 0)",
        (note_id.to_string(), space_id.to_string(), title, content),
    )
    .unwrap();
    note_id
}

#[test]
fn test_backlinks() {
    let conn = setup_db();
    let space_id = create_space(&conn);
    let note1_id = create_note(&conn, space_id, "note1", "");
    let note2_id = create_note(&conn, space_id, "note2", &format!("[[{}]]", note1_id));

    update_links(&conn, note2_id, &format!("[[{}]]", note1_id)).unwrap();

    let backlinks = find_backlinks(&conn, note1_id).unwrap();
    assert_eq!(backlinks.len(), 1);
    assert_eq!(backlinks[0].source_note_id, note2_id);
}
