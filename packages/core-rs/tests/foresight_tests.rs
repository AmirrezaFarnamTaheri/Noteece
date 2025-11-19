use core_rs::db::migrate;
use core_rs::foresight::*;
use core_rs::project;
use core_rs::task;
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

// The key is to return the TempDir to keep it alive for the duration of the test.
fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    migrate(&mut conn).unwrap();
    (conn, dir)
}

#[test]
fn test_generate_insights() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();

    // A space must exist first.
    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        &[&space_id.to_string()],
    )
    .unwrap();
    let project =
        project::create_project(&conn, &space_id.to_string(), "Test Project").unwrap();

    let now = chrono::Utc::now().timestamp();
    let tomorrow = now + 86400;

    let mut task = task::create_task(&conn, space_id, "Urgent Task", None).unwrap();
    task.due_at = Some(tomorrow);
    task.project_id = Some(Ulid::from_string(&project.id).unwrap());
    task::update_task(&conn, &task).unwrap();

    let insights = generate_insights(&conn, space_id).unwrap();
    assert!(!insights.is_empty());
}

#[test]
fn test_insight_severity() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        &[&space_id.to_string()],
    )
    .unwrap();

    let now = chrono::Utc::now().timestamp();
    let tomorrow = now + 86400; // 1 day from now

    let mut task1 = task::create_task(&conn, space_id, "Due Tomorrow Task", None).unwrap();
    task1.due_at = Some(tomorrow);
    task::update_task(&conn, &task1).unwrap();

    let insights = generate_insights(&conn, space_id).unwrap();
    let deadline_insight = insights
        .iter()
        .find(|i| i.insight_type == InsightType::DeadlineApproaching)
        .expect("Deadline insight should have been generated");

    // A task due in 1 day should be of Critical severity.
    assert_eq!(deadline_insight.severity, InsightSeverity::Critical);
}

#[test]
fn test_project_stagnation_detection() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();
    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        &[&space_id.to_string()],
    )
    .unwrap();

    let _project =
        project::create_project(&conn, &space_id.to_string(), "Stagnant Project").unwrap();

    let insights = generate_insights(&conn, space_id).unwrap();

    let has_stagnation = insights
        .iter()
        .any(|i| i.insight_type == InsightType::ProjectStagnant);

    assert!(has_stagnation);
}
