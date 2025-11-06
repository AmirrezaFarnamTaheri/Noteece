use core_rs::db;
use core_rs::mode::{disable_mode, enable_mode, get_space_modes, Mode};
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, dir)
}

#[test]
fn test_mode_lifecycle() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();

    conn.execute(
        "INSERT INTO space (id, name, enabled_modes_json) VALUES (?, 'Test Space', '[]')",
        [space_id.to_string()],
    )
    .unwrap();

    let mode = Mode {
        id: "test-mode".to_string(),
        name: "Test Mode".to_string(),
    };

    // Enable mode
    enable_mode(&conn, &space_id.to_string(), &mode).unwrap();
    let modes = get_space_modes(&conn, &space_id.to_string()).unwrap();
    assert_eq!(modes.len(), 1);
    assert_eq!(modes[0], mode);

    // Disable mode
    disable_mode(&conn, &space_id.to_string(), &mode).unwrap();
    let modes_after_disable = get_space_modes(&conn, &space_id.to_string()).unwrap();
    assert_eq!(modes_after_disable.len(), 0);
}

#[test]
fn test_double_enable_mode() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();

    conn.execute(
        "INSERT INTO space (id, name, enabled_modes_json) VALUES (?, 'Test Space', '[]')",
        [space_id.to_string()],
    )
    .unwrap();

    let mode = Mode {
        id: "test-mode".to_string(),
        name: "Test Mode".to_string(),
    };

    enable_mode(&conn, &space_id.to_string(), &mode).unwrap();
    enable_mode(&conn, &space_id.to_string(), &mode).unwrap();

    let modes = get_space_modes(&conn, &space_id.to_string()).unwrap();
    assert_eq!(modes.len(), 1);
}

#[test]
fn test_disable_non_existent_mode() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();

    conn.execute(
        "INSERT INTO space (id, name, enabled_modes_json) VALUES (?, 'Test Space', '[]')",
        [space_id.to_string()],
    )
    .unwrap();

    let mode = Mode {
        id: "test-mode".to_string(),
        name: "Test Mode".to_string(),
    };

    disable_mode(&conn, &space_id.to_string(), &mode).unwrap();

    let modes = get_space_modes(&conn, &space_id.to_string()).unwrap();
    assert_eq!(modes.len(), 0);
}
