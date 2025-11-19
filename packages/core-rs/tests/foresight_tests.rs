use core_rs::db::migrate;
use core_rs::foresight::*;
use core_rs::project::*;
use core_rs::task::*;
use core_rs::vault::*;
use rusqlite::Connection;
use std::path::PathBuf;
use ulid::Ulid;

fn create_test_vault() -> Connection {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let password = "test_password_123";
    create_vault(db_path.to_str().unwrap(), password).expect("Failed to create vault");
    let mut conn = Connection::open(db_path).unwrap();
    migrate(&mut conn).unwrap();
    conn
}

fn cleanup_vault(conn: Connection) {
    if let Some(path) = conn.path() {
        let path_buf = PathBuf::from(path);
        drop(conn);
        let _ = std::fs::remove_file(path_buf);
    }
}

#[test]
fn test_generate_insights() {
    let mut conn = create_test_vault();
    let space_id = Ulid::new().to_string();

    // Create some test data
    let project = create_project(&mut conn, &space_id, "Test Project")
        .expect("Failed to create project");

    // Create a task with upcoming deadline
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let tomorrow = now + 86400;

    let mut task = create_task(
        &conn,
        Ulid::from_string(&space_id).unwrap(),
        "Urgent Task",
        Some("Test description".to_string()),
    )
    .expect("Failed to create task");
    task.due_at = Some(tomorrow);
    task.project_id = Some(Ulid::from_string(&project.id).unwrap());
    update_task(&conn, &task).unwrap();

    // Generate insights
    let insights = generate_insights(&conn, Ulid::from_string(&space_id).unwrap()).expect("Failed to generate insights");

    // Should have at least one insight (deadline pressure)
    assert!(
        !insights.is_empty(),
        "Should generate insights for upcoming deadline"
    );

    cleanup_vault(conn);
}

#[test]
fn test_insight_severity() {
    let conn = create_test_vault();
    let space_id = Ulid::new();

    // Create overdue tasks to trigger high severity insight
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let yesterday = now - 86400;

    let mut task1 = create_task(&conn, space_id, "Overdue Task 1", None)
        .expect("Failed to create task");
    task1.due_at = Some(yesterday);
    update_task(&conn, &task1).unwrap();

    let mut task2 = create_task(&conn, space_id, "Overdue Task 2", None)
        .expect("Failed to create task");
    task2.due_at = Some(yesterday);
    update_task(&conn, &task2).unwrap();


    let insights = generate_insights(&conn, space_id).expect("Failed to generate insights");

    // Should have high severity insight for overdue tasks
    let high_severity = insights
        .iter()
        .any(|i| matches!(i.severity, InsightSeverity::High));

    assert!(
        high_severity,
        "Should have high severity insight for overdue tasks"
    );

    cleanup_vault(conn);
}

#[test]
fn test_project_stagnation_detection() {
    let mut conn = create_test_vault();
    let space_id = Ulid::new().to_string();

    // Create a project with old updated_at
    let old_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        - (15 * 86400); // 15 days ago

    let project = create_project(&mut conn, &space_id, "Stagnant Project")
        .expect("Failed to create project");

    // Manually update the project's timestamp to be old
    conn.execute(
        "UPDATE project SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![old_timestamp, &project.id],
    )
    .expect("Failed to update project timestamp");

    let insights = generate_insights(&conn, Ulid::from_string(&space_id).unwrap()).expect("Failed to generate insights");

    // Should detect project stagnation
    let has_stagnation = insights
        .iter()
        .any(|i| matches!(i.insight_type, InsightType::ProjectStagnant));

    assert!(has_stagnation, "Should detect stagnant projects");

    cleanup_vault(conn);
}

#[test]
fn test_suggested_actions() {
    let conn = create_test_vault();
    let space_id = Ulid::new();

    // Create data that triggers insights with actions
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let soon = now + 7200; // 2 hours from now

    let mut task = create_task(&conn, space_id, "Urgent Task", None)
        .expect("Failed to create task");
    task.due_at = Some(soon);
    update_task(&conn, &task).unwrap();

    let insights = generate_insights(&conn, space_id).expect("Failed to generate insights");

    // Check that insights have suggested actions
    let has_actions = insights.iter().any(|i| !i.suggested_actions.is_empty());

    assert!(has_actions, "Insights should have suggested actions");

    cleanup_vault(conn);
}

#[test]
fn test_insight_context() {
    let mut conn = create_test_vault();
    let space_id = Ulid::new().to_string();

    // Create test data
    let project =
        create_project(&mut conn, &space_id, "Test Project").expect("Failed to create project");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let tomorrow = now + 86400;

    let mut task = create_task(&conn, Ulid::from_string(&space_id).unwrap(), "Task 1", None)
        .expect("Failed to create task");
    task.due_at = Some(tomorrow);
    task.project_id = Some(Ulid::from_string(&project.id).unwrap());
    update_task(&conn, &task).unwrap();


    let insights = generate_insights(&conn, Ulid::from_string(&space_id).unwrap()).expect("Failed to generate insights");

    // Insights should have context with entity information
    for insight in insights {
        assert!(
            insight.context.entity_id.is_some() || insight.context.entity_type.is_some(),
            "Insight should have context information"
        );
    }

    cleanup_vault(conn);
}
