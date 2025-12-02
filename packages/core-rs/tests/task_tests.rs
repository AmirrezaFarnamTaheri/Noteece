use core_rs::db::migrate;
use core_rs::task::{create_task, delete_task, get_task, update_task};
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    // Use query_row for PRAGMA statements that return a result to avoid ExecuteReturnedResults error
    // if using execute(). Or handle Err.
    // In recent rusqlite, execute() returns rows updated count, but PRAGMAs might behave oddly.
    // Using execute_batch is safer for pragmas usually, or query_row if it returns a value.
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
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
    let mut task = create_task(&conn, space_id, "test task", None).unwrap();
    assert_eq!(task.title, "test task");

    let retrieved_task = get_task(&conn, task.id).unwrap().unwrap();
    assert_eq!(retrieved_task.id, task.id);

    task.title = "updated test task".to_string();
    task.status = "done".to_string();
    update_task(&conn, &task).unwrap();
    let updated_task = get_task(&conn, task.id).unwrap().unwrap();
    assert_eq!(updated_task.title, "updated test task");
    assert_eq!(updated_task.status, "done");

    delete_task(&conn, task.id).unwrap();
    let deleted_task = get_task(&conn, task.id).unwrap();
    assert!(deleted_task.is_none());
}
