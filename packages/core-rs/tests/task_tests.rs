use core_rs::db::migrate;
use core_rs::task::{create_task, delete_task, get_task, update_task};
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

#[test]
fn test_task_crud() {
    let conn = setup_db();
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
