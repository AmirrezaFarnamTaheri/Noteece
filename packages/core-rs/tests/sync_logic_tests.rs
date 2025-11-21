use core_rs::db::migrate;
use core_rs::sync_agent::{SyncAgent, ConflictResolution, SyncDelta, SyncOperation};
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;
use ulid::Ulid;
use std::collections::HashMap;

fn setup_db() -> (Arc<Mutex<Connection>>, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    migrate(&mut conn).unwrap();
    core_rs::sync_agent::init_sync_tables(&conn).unwrap();
    (Arc::new(Mutex::new(conn)), dir)
}

#[test]
fn test_sync_conflict_resolution_use_local() {
    let (conn, _dir) = setup_db();
    let mut conn_guard = conn.lock().unwrap();

    let agent = SyncAgent::new("device_local".to_string(), "Local".to_string(), 8080);

    // Setup: Create Space and Note
    let space_id = Ulid::new().to_string();
    conn_guard.execute(
        "INSERT INTO space (id, name) VALUES (?1, ?2)",
        rusqlite::params![space_id, "Test Space"]
    ).unwrap();

    let note_id = Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp();

    // Insert local note
    conn_guard.execute(
        "INSERT INTO note (id, space_id, title, content_md, created_at, modified_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![&note_id, space_id, "Local Title", "Local Content", now, now + 100] // modified_at newer
    ).unwrap();

    // Simulate incoming delta that is older (conflict because local is newer)
    let delta = SyncDelta {
        entity_type: "note".to_string(),
        entity_id: note_id.clone(),
        operation: SyncOperation::Update,
        data: Some("Remote Content".to_string().into_bytes()),
        timestamp: now, // Older than local
        vector_clock: HashMap::new(),
        space_id: Some(space_id.clone()),
    };

    // Apply deltas
    let conflicts = agent.apply_deltas(&mut conn_guard, vec![delta], &[]).unwrap();

    assert_eq!(conflicts.len(), 1);
    let conflict = &conflicts[0];
    assert_eq!(conflict.entity_id, note_id);

    // Resolve using local
    agent.resolve_conflict(&conn_guard, conflict, ConflictResolution::UseLocal, &[]).unwrap();

    // Verify local content remains
    let content: String = conn_guard.query_row(
        "SELECT content_md FROM note WHERE id = ?1",
        [&note_id],
        |row| row.get(0)
    ).unwrap();

    assert_eq!(content, "Local Content");

    // Verify conflict marked resolved
    let resolved: i32 = conn_guard.query_row(
        "SELECT resolved FROM sync_conflict WHERE entity_id = ?1",
        [&conflict.entity_id],
        |row| row.get(0)
    ).unwrap();

    assert_eq!(resolved, 1);
}
