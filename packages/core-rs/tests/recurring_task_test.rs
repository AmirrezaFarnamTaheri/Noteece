use core_rs::db;
use core_rs::space;
use core_rs::task::{self};
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_recurring_task_completion() {
    let (mut conn, _temp_dir) = setup_db();
    // Create space first to satisfy FK
    let space_id = space::create_space(&mut conn, "Test Space").unwrap();

    // Create a recurring task
    let mut task = task::create_task(&conn, space_id, "Daily Standup", None).unwrap();
    task.recur_rule = Some("DAILY".to_string());
    task.due_at = Some(1600000000); // Arbitrary timestamp
    task::update_task(&conn, &task).unwrap();

    // Complete the task
    task.status = "done".to_string();
    task.completed_at = Some(1600000500);
    task::update_task(&conn, &task).unwrap();

    // Verify that a new task was created
    let all_tasks = task::get_all_tasks_in_space(&conn, space_id).unwrap();
    assert_eq!(all_tasks.len(), 2);

    // Find the new task (the one that isn't done)
    let new_task = all_tasks.iter().find(|t| t.status == "next").unwrap();

    assert_eq!(new_task.title, "Daily Standup");
    assert_eq!(new_task.recur_rule, Some("DAILY".to_string()));
    assert_eq!(new_task.due_at, Some(1600000000 + 86400)); // Previous due + 1 day
}
