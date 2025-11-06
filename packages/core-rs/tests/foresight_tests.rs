use core_rs::foresight::*;
use core_rs::project::*;
use core_rs::task::*;
use core_rs::vault::*;
use rusqlite::Connection;
use ulid::Ulid;

fn create_test_vault() -> (Connection, Vec<u8>) {
    let temp_path = std::env::temp_dir().join(format!("test_vault_{}.db", Ulid::new()));
    let password = "test_password_123";

    let vault =
        create_vault(temp_path.to_str().unwrap(), password).expect("Failed to create test vault");

    (vault.conn, vault.dek)
}

fn cleanup_vault(conn: Connection) {
    let path = conn.path().unwrap().to_path_buf();
    drop(conn);
    let _ = std::fs::remove_file(path);
}

#[test]
fn test_generate_insights() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    // Create some test data
    let project = create_project(&conn, space_id, "Test Project", Some("Test description"))
        .expect("Failed to create project");

    // Create a task with upcoming deadline
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let tomorrow = now + 86400;

    let task = create_task(
        &conn,
        space_id,
        "Urgent Task",
        Some("Test description"),
        Some(tomorrow),
        Some(project.id),
    )
    .expect("Failed to create task");

    // Generate insights
    let insights = generate_insights(&conn, space_id).expect("Failed to generate insights");

    // Should have at least one insight (deadline pressure)
    assert!(
        !insights.is_empty(),
        "Should generate insights for upcoming deadline"
    );

    cleanup_vault(conn);
}

#[test]
fn test_insight_severity() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    // Create overdue tasks to trigger high severity insight
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let yesterday = now - 86400;

    create_task(
        &conn,
        space_id,
        "Overdue Task 1",
        None,
        Some(yesterday),
        None,
    )
    .expect("Failed to create task");

    create_task(
        &conn,
        space_id,
        "Overdue Task 2",
        None,
        Some(yesterday),
        None,
    )
    .expect("Failed to create task");

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
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    // Create a project with old updated_at
    let old_timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        - (15 * 86400); // 15 days ago

    let project = create_project(&conn, space_id, "Stagnant Project", Some("Old project"))
        .expect("Failed to create project");

    // Manually update the project's timestamp to be old
    conn.execute(
        "UPDATE projects SET updated_at = ?1 WHERE id = ?2",
        rusqlite::params![old_timestamp, &project.id],
    )
    .expect("Failed to update project timestamp");

    let insights = generate_insights(&conn, space_id).expect("Failed to generate insights");

    // Should detect project stagnation
    let has_stagnation = insights
        .iter()
        .any(|i| matches!(i.insight_type, InsightType::ProjectStagnation));

    assert!(has_stagnation, "Should detect stagnant projects");

    cleanup_vault(conn);
}

#[test]
fn test_suggested_actions() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    // Create data that triggers insights with actions
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let soon = now + 7200; // 2 hours from now

    create_task(&conn, space_id, "Urgent Task", None, Some(soon), None)
        .expect("Failed to create task");

    let insights = generate_insights(&conn, space_id).expect("Failed to generate insights");

    // Check that insights have suggested actions
    let has_actions = insights.iter().any(|i| !i.suggested_actions.is_empty());

    assert!(has_actions, "Insights should have suggested actions");

    cleanup_vault(conn);
}

#[test]
fn test_insight_context() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    // Create test data
    let project =
        create_project(&conn, space_id, "Test Project", None).expect("Failed to create project");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let tomorrow = now + 86400;

    create_task(
        &conn,
        space_id,
        "Task 1",
        None,
        Some(tomorrow),
        Some(project.id),
    )
    .expect("Failed to create task");

    let insights = generate_insights(&conn, space_id).expect("Failed to generate insights");

    // Insights should have context with entity information
    for insight in insights {
        assert!(
            insight.context.entity_id.is_some() || insight.context.entity_type.is_some(),
            "Insight should have context information"
        );
    }

    cleanup_vault(conn);
}
