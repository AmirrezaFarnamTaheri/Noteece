use core_rs::db::migrate;
use core_rs::task::{create_task, delete_task, get_task, update_task};
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    // Use in-memory database for testing to avoid filesystem locking issues and "malformed database" errors
    // common with SQLite in temporary directories during high-concurrency test runs.
    let mut conn = Connection::open_in_memory().unwrap();

    // In-memory databases don't need WAL mode optimization, but we enable foreign keys.
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .unwrap();

    migrate(&mut conn).unwrap();
    (conn, dir)
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
fn test_task_crud() {
    let (conn, _dir) = setup_db();
    let space_id = create_space(&conn);
    let mut task = create_task(&conn, space_id, "test task", None).expect("failed to create task");
    assert_eq!(task.title, "test task");

    let retrieved_task = get_task(&conn, task.id).expect("failed to get task").unwrap();
    assert_eq!(retrieved_task.id, task.id);

    task.title = "updated test task".to_string();
    task.status = "done".to_string();
    update_task(&conn, &task).expect("failed to update task");
    let updated_task = get_task(&conn, task.id).expect("failed to get updated task").unwrap();
    assert_eq!(updated_task.title, "updated test task");
    assert_eq!(updated_task.status, "done");

    delete_task(&conn, task.id).expect("failed to delete task");
    let deleted_task = get_task(&conn, task.id).expect("failed to get deleted task");
    assert!(deleted_task.is_none());

    // Explicitly drop connection before temp directory is cleaned up
    drop(conn);
}
