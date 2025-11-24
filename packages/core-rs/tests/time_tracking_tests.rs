use core_rs::db;
use core_rs::space;
use core_rs::task;
use core_rs::time_tracking;
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    conn.execute("PRAGMA foreign_keys = ON", []).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, dir)
}

#[test]
fn test_manual_time_entry_calculation() {
    let (mut conn, _dir) = setup_db();

    let space_id = space::create_space(&mut conn, "Test Space").unwrap();

    // We MUST create a task because CHECK constraint requires at least one of task/project/note
    let task = task::create_task(&conn, space_id, "Time Task", None).unwrap();

    let start_time = 1000;
    let duration = 3600;

    let params = time_tracking::CreateManualEntryParams {
        space_id,
        task_id: Some(task.id),
        project_id: None,
        note_id: None,
        description: Some("Manual Entry".to_string()),
        started_at: start_time,
        duration_seconds: duration,
    };
    let entry = time_tracking::create_manual_time_entry(&conn, params).unwrap();

    assert_eq!(entry.started_at, start_time);
    assert_eq!(entry.duration_seconds, Some(duration));
    assert_eq!(entry.ended_at, Some(start_time + duration));
    assert!(!entry.is_running);

    let retrieved = time_tracking::get_time_entry(&conn, entry.id)
        .unwrap()
        .unwrap();
    assert_eq!(retrieved.ended_at, Some(start_time + duration));
}

#[test]
fn test_manual_time_entry_constraints() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Test Space").unwrap();
    let task = task::create_task(&conn, space_id, "Time Task", None).unwrap();

    let start_time = 1000;
    let duration = -500;

    let params = time_tracking::CreateManualEntryParams {
        space_id,
        task_id: Some(task.id),
        project_id: None,
        note_id: None,
        description: Some("Negative Duration".to_string()),
        started_at: start_time,
        duration_seconds: duration,
    };
    let entry = time_tracking::create_manual_time_entry(&conn, params).unwrap();

    assert_eq!(entry.ended_at, Some(500));

    // Robustness check: Ensure we can't link to non-existent task if FKs are ON
    let fake_task_id = Ulid::new();
    let params = time_tracking::CreateManualEntryParams {
        space_id,
        task_id: Some(fake_task_id),
        project_id: None,
        note_id: None,
        description: None,
        started_at: start_time,
        duration_seconds: 3600,
    };
    let result = time_tracking::create_manual_time_entry(&conn, params);

    // Should fail due to FK constraint
    assert!(result.is_err());
}
