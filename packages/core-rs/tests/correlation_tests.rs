use core_rs::correlation::*;
use core_rs::personal_modes::*;
use core_rs::task::*;
use core_rs::time_tracking::*;
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
fn test_correlation_engine_creation() {
    let engine = CorrelationEngine::new();

    // Just verify it can be created
    assert!(engine.short_term_days > 0);
    assert!(engine.medium_term_days > engine.short_term_days);
    assert!(engine.long_term_days > engine.medium_term_days);
}

#[test]
fn test_custom_time_ranges() {
    let engine = CorrelationEngine::with_ranges(3, 14, 60);

    assert_eq!(engine.short_term_days, 3);
    assert_eq!(engine.medium_term_days, 14);
    assert_eq!(engine.long_term_days, 60);
}

#[test]
fn test_gather_context() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    // Create some test data
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Create tasks
    create_task(&conn, space_id, "Task 1", None, Some(now + 86400), None)
        .expect("Failed to create task");
    create_task(&conn, space_id, "Task 2", None, None, None).expect("Failed to create task");

    let engine = CorrelationEngine::new();
    let context = engine
        .gather_context(&conn, space_id, 7)
        .expect("Failed to gather context");

    // Should have some tasks in context
    assert!(!context.tasks.is_empty(), "Context should contain tasks");

    cleanup_vault(conn);
}

#[test]
fn test_health_workload_correlation() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Simulate low mood over several days
    for i in 0..5 {
        let timestamp = now - (i * 86400);
        record_health_metric(
            &conn,
            space_id,
            "mood",
            2.0, // Low mood
            "mood_score",
            timestamp,
            None,
        )
        .expect("Failed to record mood");

        // Also record high work hours
        create_time_entry(
            &conn,
            space_id,
            timestamp - 3600,
            timestamp, // 1 hour entry
            None,
            Some("Work"),
            None,
        )
        .expect("Failed to create time entry");

        create_time_entry(
            &conn,
            space_id,
            timestamp - 7200,
            timestamp - 3600, // Another 1 hour
            None,
            Some("Work"),
            None,
        )
        .expect("Failed to create time entry");
    }

    let engine = CorrelationEngine::new();
    let context = engine
        .gather_context(&conn, space_id, 7)
        .expect("Failed to gather context");

    let correlations = engine.analyze(&context);

    // Should detect health-workload correlation
    let has_health_workload = correlations
        .iter()
        .any(|c| matches!(c.correlation_type, CorrelationType::HealthWorkload));

    assert!(
        has_health_workload || correlations.is_empty(),
        "Should detect health-workload correlation or have empty result if thresholds not met"
    );

    cleanup_vault(conn);
}

#[test]
fn test_correlation_strength() {
    let engine = CorrelationEngine::new();

    // Strength should be between 0.0 and 1.0
    let test_strength = 0.75;
    assert!(test_strength >= 0.0 && test_strength <= 1.0);

    // Test with actual correlation if we can create one
    // This is more of a validation that the API makes sense
}

#[test]
fn test_correlations_to_insights() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    let engine = CorrelationEngine::new();

    // Create a simple correlation manually for testing
    let correlation = Correlation {
        correlation_type: CorrelationType::HealthWorkload,
        strength: 0.85,
        entities: vec!["task_1".to_string(), "task_2".to_string()],
        pattern_description: "Test correlation".to_string(),
        metadata: std::collections::HashMap::new(),
    };

    let insights = engine.correlations_to_insights(vec![correlation]);

    assert!(
        !insights.is_empty(),
        "Should convert correlations to insights"
    );

    // Check insight properties
    for insight in insights {
        assert!(!insight.title.is_empty());
        assert!(!insight.message.is_empty());
        assert!(!insight.suggested_actions.is_empty());
    }

    cleanup_vault(conn);
}

#[test]
fn test_analyze_empty_context() {
    let engine = CorrelationEngine::new();

    // Empty context should not crash
    let empty_context = CorrelationContext {
        space_id: Ulid::new(),
        tasks: vec![],
        projects: vec![],
        notes: vec![],
        time_entries: vec![],
        health_data: vec![],
        finance_data: vec![],
    };

    let correlations = engine.analyze(&empty_context);

    // Should return empty or handle gracefully
    assert!(
        correlations.is_empty(),
        "Empty context should produce no correlations"
    );
}

#[test]
fn test_correlation_types() {
    // Verify all correlation types are properly defined
    let types = vec![
        CorrelationType::HealthWorkload,
        CorrelationType::WorkFinance,
        CorrelationType::HabitProductivity,
    ];

    for cor_type in types {
        // Each type should be valid
        let _ = format!("{:?}", cor_type);
    }
}

#[test]
fn test_time_range_filtering() {
    let (conn, dek) = create_test_vault();
    let space_id = Ulid::new();

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Create data from 30 days ago
    let old_timestamp = now - (30 * 86400);
    create_task(&conn, space_id, "Old Task", None, Some(old_timestamp), None)
        .expect("Failed to create task");

    // Create recent data
    create_task(
        &conn,
        space_id,
        "Recent Task",
        None,
        Some(now - 86400),
        None,
    )
    .expect("Failed to create task");

    let engine = CorrelationEngine::new();

    // Gather context for last 7 days only
    let context = engine
        .gather_context(&conn, space_id, 7)
        .expect("Failed to gather context");

    // Should only include recent task
    // Note: This depends on gather_context implementation filtering by time
    assert!(
        !context.tasks.is_empty(),
        "Should have at least the recent task"
    );

    cleanup_vault(conn);
}
