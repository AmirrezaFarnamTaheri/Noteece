use core_rs::db::{migrate, DbError};
use core_rs::project::*;
use core_rs::space::create_space;
use core_rs::task::create_task;
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
fn test_project_lifecycle() -> Result<(), DbError> {
    let (_dir, mut conn) = setup_db();

    let space_id = create_space(&mut conn, "test_space").unwrap();

    // Create a project
    let project = create_project(&conn, &space_id.to_string(), "Test Project").unwrap();
    assert_eq!(project.title, "Test Project");

    // Get the project
    let fetched_project = get_project(&conn, &project.id).unwrap().unwrap();
    assert_eq!(fetched_project.title, "Test Project");

    // Create a milestone
    let milestone =
        create_project_milestone(&conn, &project.id, "Test Milestone", None, "active").unwrap();
    assert_eq!(milestone.title, "Test Milestone");

    // Get the milestone
    let fetched_milestone = get_project_milestone(&conn, &milestone.id)
        .unwrap()
        .unwrap();
    assert_eq!(fetched_milestone.title, "Test Milestone");

    // Create a task
    let task = create_task(&conn, space_id, "Test Task", None).unwrap();
    assert_eq!(task.title, "Test Task");

    Ok(())
}
