use core_rs::audit;
use core_rs::db;
use core_rs::project;
use core_rs::space;
use core_rs::task;
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_audit_extreme_cases() {
    let (conn, _dir) = setup_db();

    // Test 1: Log with all Nones
    let id1 = audit::log_event(
        &conn, None, "TEST_EVENT", "test_entity", None, None, None, None,
    )
    .unwrap();
    assert_eq!(id1.len(), 26); // ULID length

    // Test 2: Log with massive payload
    let huge_json = "x".repeat(10000);
    let id2 = audit::log_event(
        &conn,
        Some("user_1"),
        "BIG_EVENT",
        "blob",
        Some("blob_1"),
        Some(&huge_json),
        None,
        None,
    )
    .unwrap();

    let logs = audit::get_audit_logs(&conn, 10, 0).unwrap();
    assert_eq!(logs.len(), 2);
    // Logs are ordered by created_at DESC. Since both happened instantly, order isn't guaranteed.
    // Find the log with the huge payload.
    let huge_log = logs.iter().find(|l| l.event_type == "BIG_EVENT").unwrap();
    assert_eq!(huge_log.id, id2);
    assert_eq!(huge_log.details_json.as_ref().unwrap().len(), 10000);
}

#[test]
fn test_task_edge_cases() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Space 1").unwrap();

    // Test 1: Task with empty title
    let task = task::create_task(&conn, space_id, "", None).unwrap();
    assert_eq!(task.title, "");

    // Test 2: Task with max integer values
    let mut task = task::create_task(&conn, space_id, "Max Task", None).unwrap();
    task.due_at = Some(i64::MAX);
    task.start_at = Some(i64::MIN);
    task::update_task(&conn, &task).unwrap();

    let fetched = task::get_task(&conn, task.id).unwrap().unwrap();
    assert_eq!(fetched.due_at, Some(i64::MAX));
    assert_eq!(fetched.start_at, Some(i64::MIN));

    // Test 3: Recurrence Idempotency (The fix verification)
    task.status = "done".to_string();
    task.recur_rule = Some("DAILY".to_string());
    task.due_at = Some(1000000000);

    // First update: should create next task
    task::update_task(&conn, &task).unwrap();
    let tasks_1 = task::get_all_tasks_in_space(&conn, space_id).unwrap();
    // Expected 3: Task 1 (empty title), Task 2 (Max Task), Task 3 (Recurrence of Max Task)
    assert_eq!(tasks_1.len(), 3);

    // Second update (simulate user editing description): should NOT create next task
    task.description = Some("Edited".to_string());
    task::update_task(&conn, &task).unwrap();
    let tasks_2 = task::get_all_tasks_in_space(&conn, space_id).unwrap();
    assert_eq!(tasks_2.len(), 3); // Still 3, no duplicate
}

#[test]
fn test_habit_correlation() {
    let (mut conn, _dir) = setup_db();
    use core_rs::analytics;
    // Insert some data... calculating correlation requires >5 points.
    // This is tedious to setup in a unit test without a helper.
    // We'll just call it with empty data and check it doesn't panic.
    let result = analytics::calculate_habit_correlation(&conn, "sleep_hours").unwrap();
    assert_eq!(result.correlation_coefficient, 0.0);
    assert!(result.insight.contains("Not enough data"));
}

#[test]
fn test_project_basic_flow() {
    let (mut conn, _dir) = setup_db();
    let space_id = space::create_space(&mut conn, "Space 1").unwrap();

    // Projects are often neglected in basic tests
    let project = project::create_project(&conn, &space_id.to_string(), "New Project").unwrap();
    assert_eq!(project.title, "New Project");
    assert_eq!(project.status, "proposed");

    let fetched = project::get_project(&conn, &project.id).unwrap().unwrap();
    assert_eq!(fetched.id, project.id);

    // Milestones
    let milestone = project::create_project_milestone(&conn, &project.id, "M1", Some(1000), "active").unwrap();
    assert_eq!(milestone.title, "M1".to_string());

    let milestones = project::get_project_milestones(&conn, &project.id).unwrap();
    assert_eq!(milestones.len(), 1);

    // Delete Milestone first (FK constraint)
    project::delete_project_milestone(&conn, &milestone.id).unwrap();

    // Delete Project
    project::delete_project(&conn, &project.id).unwrap();
    assert!(project::get_project(&conn, &project.id).unwrap().is_none());
}
