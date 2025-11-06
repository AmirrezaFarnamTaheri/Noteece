use core_rs::db::migrate;
use core_rs::space::create_space;
use rusqlite::Connection;

#[test]
fn test_create_space() {
    let mut conn = Connection::open_in_memory().unwrap();
    migrate(&mut conn).unwrap();

    let space_id = create_space(&mut conn, "test space").unwrap();

    let mut stmt = conn
        .prepare("SELECT name FROM space WHERE id = ?1")
        .unwrap();
    let mut rows = stmt.query([space_id.to_string()]).unwrap();
    let row = rows.next().unwrap().unwrap();
    let name: String = row.get(0).unwrap();
    assert_eq!(name, "test space");

    let modes = core_rs::mode::get_space_modes(&conn, &space_id.to_string()).unwrap();
    assert_eq!(modes.len(), 4);
}
