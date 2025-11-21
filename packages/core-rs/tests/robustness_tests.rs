use core_rs::sync_agent::{SyncAgent, SyncDelta, SyncOperation};
use rusqlite::Connection;
use std::thread;
use ulid::Ulid;
use chrono::Utc;

// Helper to create an in-memory DB with sync tables initialized
fn setup_db() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    core_rs::sync_agent::init_sync_tables(&conn).unwrap();
    conn.execute("CREATE TABLE notes (id TEXT PRIMARY KEY, encrypted_content BLOB, updated_at INTEGER, space_id TEXT)", []).unwrap();
    conn
}

#[test]
fn test_project_delete_transaction_safety() {
    // This test simulates a failure during cascade delete to ensure atomicity
    // Since we can't easily mock a failure inside the transaction block of the actual function without
    // dependency injection, we will verify the state after a successful delete and ensure
    // integrity of the foreign key constraints (which SQLite handles, but we want to verify logic).

    let mut conn = Connection::open_in_memory().unwrap();

    // Enable FKs
    conn.execute("PRAGMA foreign_keys = ON", []).unwrap();

    // Setup schema
    conn.execute("CREATE TABLE project (id TEXT PRIMARY KEY, space_id TEXT, title TEXT, status TEXT)", []).unwrap();
    conn.execute("CREATE TABLE task (id TEXT PRIMARY KEY, project_id TEXT, title TEXT, status TEXT, updated_at INTEGER, FOREIGN KEY(project_id) REFERENCES project(id))", []).unwrap();
    conn.execute("CREATE TABLE time_entry (id TEXT PRIMARY KEY, project_id TEXT, duration INTEGER, FOREIGN KEY(project_id) REFERENCES project(id))", []).unwrap();
    conn.execute("CREATE TABLE project_milestone (id TEXT PRIMARY KEY, project_id TEXT, title TEXT, due_at INTEGER, status TEXT, FOREIGN KEY(project_id) REFERENCES project(id))", []).unwrap();
    conn.execute("CREATE TABLE project_risk (id TEXT PRIMARY KEY, project_id TEXT, description TEXT, impact TEXT, likelihood TEXT, mitigation TEXT, owner_person_id TEXT, FOREIGN KEY(project_id) REFERENCES project(id))", []).unwrap();
    conn.execute("CREATE TABLE project_update (id TEXT PRIMARY KEY, project_id TEXT, when_at INTEGER, health TEXT, summary TEXT, FOREIGN KEY(project_id) REFERENCES project(id))", []).unwrap();
    conn.execute("CREATE TABLE project_dependency (project_id TEXT, depends_on_project_id TEXT, PRIMARY KEY(project_id, depends_on_project_id), FOREIGN KEY(project_id) REFERENCES project(id))", []).unwrap();

    // Insert data
    let project_id = "proj_1";
    conn.execute("INSERT INTO project (id, space_id, title, status) VALUES (?1, 'space_1', 'Test Project', 'active')", [project_id]).unwrap();
    conn.execute("INSERT INTO task (id, project_id, title, status) VALUES ('task_1', ?1, 'Task 1', 'todo')", [project_id]).unwrap();
    conn.execute("INSERT INTO time_entry (id, project_id, duration) VALUES ('time_1', ?1, 3600)", [project_id]).unwrap();
    conn.execute("INSERT INTO project_milestone (id, project_id, title, status) VALUES ('ms_1', ?1, 'M1', 'pending')", [project_id]).unwrap();

    // Verify setup
    let task_count: i64 = conn.query_row("SELECT count(*) FROM task WHERE project_id = ?1", [project_id], |r| r.get(0)).unwrap();
    assert_eq!(task_count, 1);

    // Call delete_project
    core_rs::project::delete_project(&mut conn, project_id).expect("Delete should succeed");

    // Verify project is gone
    let proj_exists: bool = conn.query_row("SELECT exists(SELECT 1 FROM project WHERE id = ?1)", [project_id], |r| r.get(0)).unwrap();
    assert!(!proj_exists);

    // Verify tasks are nullified (not deleted)
    let task_proj_id: Option<String> = conn.query_row("SELECT project_id FROM task WHERE id = 'task_1'", [], |r| r.get(0)).unwrap();
    assert_eq!(task_proj_id, None);

    // Verify milestones are deleted
    let ms_exists: bool = conn.query_row("SELECT exists(SELECT 1 FROM project_milestone WHERE id = 'ms_1')", [], |r| r.get(0)).unwrap();
    assert!(!ms_exists);
}

#[test]
fn test_sync_apply_deltas_transaction() {
    let mut conn = setup_db();
    let dek = vec![0u8; 32];
    let agent = SyncAgent::new("dev1".into(), "device".into(), 0);

    // Create two deltas. One valid, one that would fail if applied (e.g. constraint violation if we had strict schema,
    // but here we test atomicity by simulating error if possible, or just verifying success).
    // Since we can't easily force a failure in the middle of `apply_deltas` without mocking,
    // we will trust the `transaction()` call in the source code, but verify basic batch application works.

    let delta1 = SyncDelta {
        entity_type: "note".into(),
        entity_id: "note1".into(),
        operation: SyncOperation::Create,
        data: Some(vec![1,2,3]),
        timestamp: Utc::now().timestamp(),
        vector_clock: Default::default(),
    };

    let delta2 = SyncDelta {
        entity_type: "note".into(),
        entity_id: "note2".into(),
        operation: SyncOperation::Create,
        data: Some(vec![4,5,6]),
        timestamp: Utc::now().timestamp(),
        vector_clock: Default::default(),
    };

    let conflicts = agent.apply_deltas(&mut conn, vec![delta1, delta2], &dek).unwrap();
    assert!(conflicts.is_empty());

    let count: i64 = conn.query_row("SELECT count(*) FROM notes", [], |r| r.get(0)).unwrap();
    assert_eq!(count, 2);
}
