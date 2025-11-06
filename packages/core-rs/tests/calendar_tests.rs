use core_rs::calendar::{export_ics, import_ics};
use core_rs::db::migrate;
use rusqlite::Connection;
use std::fs::File;
use std::io::Write;
use tempfile::tempdir;
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

#[test]
fn test_import_ics() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.ics");
    let mut file = File::create(&file_path).unwrap();
    writeln!(file, "BEGIN:VCALENDAR").unwrap();
    writeln!(file, "VERSION:2.0").unwrap();
    writeln!(file, "PRODID:-//hacksw/handcal//NONSGML v1.0//EN").unwrap();
    writeln!(file, "BEGIN:VEVENT").unwrap();
    writeln!(file, "UID:uid1@example.com").unwrap();
    writeln!(file, "DTSTAMP:19970714T170000Z").unwrap();
    writeln!(file, "ORGANIZER;CN=John Doe:MAILTO:john.doe@example.com").unwrap();
    writeln!(file, "DTSTART:19970714T170000Z").unwrap();
    writeln!(file, "DTEND:19970715T035959Z").unwrap();
    writeln!(file, "SUMMARY:Bastille Day Party").unwrap();
    writeln!(file, "DESCRIPTION:This is a test event").unwrap();
    writeln!(file, "END:VEVENT").unwrap();
    writeln!(file, "END:VCALENDAR").unwrap();

    let conn = setup_db();
    let space_id = create_space(&conn);

    import_ics(&conn, file_path.to_str().unwrap(), space_id).unwrap();

    let mut stmt = conn.prepare("SELECT title, description FROM task").unwrap();
    let mut rows = stmt.query([]).unwrap();
    let row = rows.next().unwrap().unwrap();
    let title: String = row.get(0).unwrap();
    let description: String = row.get(1).unwrap();
    assert_eq!(title, "Bastille Day Party");
    assert_eq!(description, "This is a test event");
}

#[test]
fn test_export_ics() {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.ics");

    let conn = setup_db();
    let space_id = create_space(&conn);

    core_rs::task::create_task(
        &conn,
        space_id,
        "test task",
        Some("test description".to_string()),
    )
    .unwrap();

    export_ics(&conn, file_path.to_str().unwrap(), space_id).unwrap();

    let ics_content = std::fs::read_to_string(&file_path).unwrap();
    assert!(ics_content.contains("SUMMARY:test task"));
    assert!(ics_content.contains("DESCRIPTION:test description"));
}
