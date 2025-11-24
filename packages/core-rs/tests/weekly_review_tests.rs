use chrono::{Duration, Utc};
use core_rs::db::{migrate, DbError};
use core_rs::space::create_space;
use core_rs::task::create_task;
use core_rs::weekly_review::generate_weekly_review;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (tempfile::TempDir, Connection) {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.db");
    let mut conn = Connection::open(&file_path).unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();
    migrate(&mut conn).unwrap();
    (dir, conn)
}

#[test]
fn test_generate_weekly_review() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();

    let space_id = create_space(&mut conn, "test_space").unwrap();

    // Create a completed task
    let mut completed_task = create_task(&conn, space_id, "Completed Task", None).unwrap();
    completed_task.completed_at = Some((Utc::now() - Duration::days(1)).timestamp());
    completed_task.status = "done".to_string();
    core_rs::task::update_task(&conn, &completed_task).unwrap();

    // Create an overdue task
    let mut overdue_task = create_task(&conn, space_id, "Overdue Task", None).unwrap();
    overdue_task.due_at = Some((Utc::now() - Duration::days(1)).timestamp());
    core_rs::task::update_task(&conn, &overdue_task).unwrap();

    // Create an upcoming task
    let mut upcoming_task = create_task(&conn, space_id, "Upcoming Task", None).unwrap();
    upcoming_task.due_at = Some((Utc::now() + Duration::days(1)).timestamp());
    core_rs::task::update_task(&conn, &upcoming_task).unwrap();

    let review_note = generate_weekly_review(&conn, space_id).unwrap();

    assert!(review_note.content_md.contains("Completed Task"));
    assert!(review_note.content_md.contains("Overdue Task"));
    assert!(review_note.content_md.contains("Upcoming Task"));

    Ok(())
}
