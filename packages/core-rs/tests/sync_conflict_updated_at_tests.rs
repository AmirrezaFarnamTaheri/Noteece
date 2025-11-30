use core_rs::db::migrate;
use core_rs::sync_agent::{SyncAgent, SyncDelta, SyncOperation};
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;
use ulid::Ulid;

fn setup_db() -> (Arc<Mutex<Connection>>, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    migrate(&mut conn).unwrap();
    core_rs::sync_agent::init_sync_tables(&conn).unwrap();
    (Arc::new(Mutex::new(conn)), dir)
}

#[test]
fn test_task_conflict_detection_updated_at() {
    let (conn, _dir) = setup_db();
    let mut conn_guard = conn.lock().unwrap();

    let agent = SyncAgent::new("device_local".to_string(), "Local".to_string(), 8080);

    // Setup: Create Space
    let space_id = Ulid::new().to_string();
    conn_guard
        .execute(
            "INSERT INTO space (id, name) VALUES (?1, ?2)",
            rusqlite::params![space_id, "Test Space"],
        )
        .unwrap();

    // 1. Initial Sync (Simulate successful sync 1 hour ago)
    let last_sync_time = chrono::Utc::now().timestamp() - 3600;
    conn_guard
        .execute(
            "INSERT INTO sync_history (id, device_id, space_id, sync_time, direction, entities_pushed, entities_pulled, conflicts_detected, success) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![Ulid::new().to_string(), "device_remote", space_id, last_sync_time, "pull", 1, 0, 0, 1],
        )
        .unwrap();

    // 2. Local Update (Newer than last sync)
    let task_id = Ulid::new().to_string();
    let local_update_time = last_sync_time + 100;
    conn_guard.execute(
        "INSERT INTO task (id, space_id, title, status, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&task_id, space_id, "Local Task Title", "inbox", local_update_time]
    ).unwrap();

    // 3. Remote Update (Also newer than last sync, conflict!)
    let remote_update_time = last_sync_time + 200;
    let delta = SyncDelta {
        entity_type: "task".to_string(),
        entity_id: task_id.clone(),
        operation: SyncOperation::Update,
        data: Some(
            serde_json::json!({"title": "Remote Task Title", "status": "done"})
                .to_string()
                .into_bytes(),
        ),
        timestamp: remote_update_time,
        vector_clock: HashMap::new(),
        space_id: Some(space_id.clone()),
    };

    // 4. Apply Delta
    let conflicts = agent
        .apply_deltas(&mut conn_guard, vec![delta], &[])
        .unwrap();

    // 5. Verify Conflict Detected
    assert_eq!(conflicts.len(), 1, "Should detect 1 conflict for task");
    let conflict = &conflicts[0];
    assert_eq!(conflict.entity_id, task_id);
    assert_eq!(conflict.entity_type, "task");
}

#[test]
fn test_project_conflict_detection_updated_at() {
    let (conn, _dir) = setup_db();
    let mut conn_guard = conn.lock().unwrap();

    let agent = SyncAgent::new("device_local".to_string(), "Local".to_string(), 8080);

    // Setup: Create Space
    let space_id = Ulid::new().to_string();
    conn_guard
        .execute(
            "INSERT INTO space (id, name) VALUES (?1, ?2)",
            rusqlite::params![space_id, "Test Space"],
        )
        .unwrap();

    // 1. Initial Sync
    let last_sync_time = chrono::Utc::now().timestamp() - 3600;
    conn_guard
        .execute(
            "INSERT INTO sync_history (id, device_id, space_id, sync_time, direction, entities_pushed, entities_pulled, conflicts_detected, success) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![Ulid::new().to_string(), "device_remote", space_id, last_sync_time, "pull", 1, 0, 0, 1],
        )
        .unwrap();

    // 2. Local Update
    let project_id = Ulid::new().to_string();
    let local_update_time = last_sync_time + 100;
    conn_guard.execute(
        "INSERT INTO project (id, space_id, title, status, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![&project_id, space_id, "Local Project", "active", local_update_time]
    ).unwrap();

    // 3. Remote Update
    let remote_update_time = last_sync_time + 200;
    let delta = SyncDelta {
        entity_type: "project".to_string(),
        entity_id: project_id.clone(),
        operation: SyncOperation::Update,
        data: Some(
            serde_json::json!({"name": "Remote Project"})
                .to_string()
                .into_bytes(),
        ),
        timestamp: remote_update_time,
        vector_clock: HashMap::new(),
        space_id: Some(space_id.clone()),
    };

    // 4. Apply Delta
    let conflicts = agent
        .apply_deltas(&mut conn_guard, vec![delta], &[])
        .unwrap();

    // 5. Verify Conflict Detected
    assert_eq!(conflicts.len(), 1, "Should detect 1 conflict for project");
    let conflict = &conflicts[0];
    assert_eq!(conflict.entity_id, project_id);
    assert_eq!(conflict.entity_type, "project");
}
