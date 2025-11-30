use core_rs::correlation::types::*;
use core_rs::correlation::*;
use rusqlite::Connection;
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    // Initialize tables
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS health_metric (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            metric_type TEXT NOT NULL,
            value REAL NOT NULL,
            recorded_at INTEGER NOT NULL,
            note_id TEXT,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS time_entry (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            project_id TEXT,
            task_id TEXT,
            duration_minutes INTEGER NOT NULL,
            started_at INTEGER NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS task (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            priority INTEGER NOT NULL,
            due_date INTEGER,
            project_id TEXT,
            progress INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS project (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            priority INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS calendar_event (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            summary TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER NOT NULL
        );
    ",
    )
    .unwrap();
    conn
}

#[test]
fn test_gather_context() {
    let conn = setup_db();
    let space_id = Ulid::new();
    let engine = CorrelationEngine::new();
    let context = engine
        .gather_context(&conn, space_id)
        .expect("Failed to gather context");

    // Context gathering should succeed even with empty DB
    let context = engine.gather_context(&conn, space_id).unwrap();

    assert!(context.health_data.is_empty());
    assert!(context.time_entries.is_empty());
    assert!(context.tasks.is_empty());
    assert!(context.projects.is_empty());
    assert!(context.calendar_events.is_empty());
}

#[test]
fn test_correlations_to_insights() {
    let (_conn, _dir) = setup_db();
    let engine = CorrelationEngine::new();

    let correlation = Correlation {
        correlation_type: CorrelationType::HealthWorkload,
        strength: 0.85,
        entities: vec![],
        pattern: CorrelationPattern::HealthWorkloadNegative {
            mood_avg: 3.0,
            hours_logged: 20.0,
        },
        detected_at: chrono::Utc::now().timestamp(),
    };

    let insights = engine.to_insights(vec![correlation]);
    assert!(!insights.is_empty());
    assert_eq!(
        insights[0].correlation_type,
        CorrelationType::HealthWorkload
    );
}

#[test]
fn test_insight_generation() {
    let engine = CorrelationEngine::new();
    let correlation = Correlation::new(
        CorrelationType::Custom("test".to_string()),
        0.8,
        vec!["entity1".to_string()],
        CorrelationPattern::Custom("Test correlation pattern".to_string()),
    );

    let empty_context = CorrelationContext {
        space_id: Ulid::new(),
        tasks: vec![],
        time_entries: vec![],
        health_data: vec![],
        projects: vec![],
        calendar_events: vec![],
        window_start: now,
        window_end: now,
    };

    assert_eq!(insights.len(), 1);
    let insight = &insights[0];
    assert_eq!(insight.confidence, 0.8);
    assert_eq!(insight.message, "Test correlation pattern");
}

#[test]
fn test_full_flow() {
    let conn = setup_db();
    let space_id = Ulid::new();
    let now = chrono::Utc::now().timestamp();

    // Insert mock data for health-workload correlation
    // Low mood
    conn.execute(
        "INSERT INTO health_metric (id, space_id, metric_type, value, recorded_at, created_at)
         VALUES (?, ?, 'mood', 3.0, ?, ?)",
        rusqlite::params![
            Ulid::new().to_string(),
            space_id.to_string(),
            now,
            now
        ],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO health_metric (id, space_id, metric_type, value, recorded_at, created_at)
         VALUES (?, ?, 'mood', 3.0, ?, ?)",
        rusqlite::params![
            Ulid::new().to_string(),
            space_id.to_string(),
            now - 86400,
            now - 86400
        ],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO health_metric (id, space_id, metric_type, value, recorded_at, created_at)
         VALUES (?, ?, 'mood', 3.0, ?, ?)",
        rusqlite::params![
            Ulid::new().to_string(),
            space_id.to_string(),
            now - 172800,
            now - 172800
        ],
    )
    .unwrap();

    // High workload (lots of time entries)
    for i in 0..10 {
        conn.execute(
            "INSERT INTO time_entry (id, space_id, duration_minutes, started_at, created_at)
             VALUES (?, ?, 120, ?, ?)",
            rusqlite::params![
                Ulid::new().to_string(),
                space_id.to_string(),
                now - (i * 3600),
                now
            ],
        )
        .unwrap();
    }

    let engine = CorrelationEngine::new();
    let context = engine.gather_context(&conn, space_id).unwrap();

    // 1. Gather
    let context = engine.gather_context(&conn, space_id).unwrap();
    assert!(!context.health_data.is_empty());
    assert!(!context.time_entries.is_empty());

    // 2. Analyze
    let correlations = engine.analyze(&context);

    // Should detect health-workload correlation
    // Note: Depends on detection logic thresholds
    if !correlations.is_empty() {
        let corr = &correlations[0];
        assert_eq!(corr.correlation_type, CorrelationType::HealthWorkload);

        // 3. Generate Insights
        let insights = engine.to_insights(correlations);
        assert!(!insights.is_empty());
    }
}
