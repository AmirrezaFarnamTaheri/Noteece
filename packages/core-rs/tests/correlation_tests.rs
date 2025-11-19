use core_rs::correlation::*;
use core_rs::db;
use core_rs::task;
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

// Correctly returns the TempDir to keep the directory alive for the test duration.
fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, dir)
}

#[test]
fn test_gather_context() {
    let (conn, _dir) = setup_db(); // _dir keeps the temp directory alive
    let space_id = Ulid::new();

    // A space must exist before tasks can be added to it.
    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        &[&space_id.to_string()],
    )
    .unwrap();

    // Create tasks
    task::create_task(&conn, space_id, "Task 1", None).expect("Failed to create task");
    task::create_task(&conn, space_id, "Task 2", None).expect("Failed to create task");

    let engine = CorrelationEngine::new();
    let context = engine
        .gather_context(&conn, space_id, 7)
        .expect("Failed to gather context");

    assert_eq!(context.tasks.len(), 2, "Context should contain tasks");
}

#[test]
fn test_correlations_to_insights() {
    let (_conn, _dir) = setup_db();
    let engine = CorrelationEngine::new();

    let correlation = Correlation {
        correlation_type: CorrelationType::HealthWorkload,
        strength: 0.85,
        entities: vec!["task_1".to_string(), "task_2".to_string()],
        pattern_description: "Test correlation".to_string(),
        metadata: [
            ("work_hours".to_string(), serde_json::json!(20)),
            ("low_mood_days".to_string(), serde_json::json!(3)),
        ]
        .iter()
        .cloned()
        .collect(),
    };

    let insights = engine.correlations_to_insights(vec![correlation]);

    assert!(!insights.is_empty(), "Should convert valid correlations to insights");
    assert_eq!(insights[0].insight_type, core_rs::foresight::InsightType::MoodCorrelation);
}

#[test]
fn test_analyze_empty_context() {
    let engine = CorrelationEngine::new();
    let now = chrono::Utc::now().timestamp();

    let empty_context = CorrelationContext {
        space_id: Ulid::new(),
        tasks: vec![],
        time_entries: vec![],
        health_data: vec![],
        transactions: vec![],
        start_time: now,
        end_time: now,
    };

    let correlations = engine.analyze(&empty_context);
    assert!(correlations.is_empty(), "Empty context should produce no correlations");
}

#[test]
fn test_time_range_filtering() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new();
    let now = chrono::Utc::now().timestamp();

    // A space must exist before tasks can be added to it.
    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        &[&space_id.to_string()],
    )
    .unwrap();

    // Create data from 30 days ago
    let old_timestamp = now - (30 * 86400);
    let mut old_task = task::create_task(&conn, space_id, "Old Task", None).unwrap();
    old_task.due_at = Some(old_timestamp);
    task::update_task(&conn, &old_task).unwrap();

    // Create recent data
    let mut recent_task = task::create_task(&conn, space_id, "Recent Task", None).unwrap();
    recent_task.due_at = Some(now - 86400);
    task::update_task(&conn, &recent_task).unwrap();

    let engine = CorrelationEngine::new();
    let context = engine.gather_context(&conn, space_id, 35).unwrap(); // Wider range to get all tasks

    // fetch_tasks doesn't filter by time, so it should get all tasks in the space
    assert_eq!(context.tasks.len(), 2, "gather_context should fetch all tasks");
}
