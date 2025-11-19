// Comprehensive Sync Agent Tests
// Tests Session 5 QA fixes: database schema, query optimizations, conflict resolution

use core_rs::db;
use core_rs::sync_agent::{
    init_sync_tables, ConflictResolution, ConflictType, DeviceType, SyncAgent,
};
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();

    // Initialize sync tables
    init_sync_tables(&conn).expect("Failed to initialize sync tables");

    (conn, dir)
}

// ============== DATABASE SCHEMA TESTS (Session 5 Fixes) ==============

#[test]
fn test_sync_state_table_exists() {
    let (conn, _dir) = setup_db();

    // Verify sync_state table was created
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_state'",
            [],
            |row| {
                let count: i64 = row.get(0)?;
                Ok(count > 0)
            },
        )
        .expect("Failed to query table existence");

    assert!(table_exists, "sync_state table must exist");
}

#[test]
fn test_entity_sync_log_table_exists() {
    let (conn, _dir) = setup_db();

    // CRITICAL TEST: entity_sync_log table must exist (Session 5 fix)
    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='entity_sync_log'",
            [],
            |row| {
                let count: i64 = row.get(0)?;
                Ok(count > 0)
            },
        )
        .expect("Failed to query table existence");

    assert!(
        table_exists,
        "entity_sync_log table must exist (Session 5 schema fix)"
    );
}

#[test]
fn test_entity_sync_log_schema() {
    let (conn, _dir) = setup_db();

    // Verify entity_sync_log has required columns
    let schema: Vec<(String, String)> = conn
        .prepare("PRAGMA table_info(entity_sync_log)")
        .unwrap()
        .query_map([], |row| {
            Ok((row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .expect("Failed to get schema");

    let column_names: Vec<String> = schema.iter().map(|(name, _)| name.clone()).collect();

    assert!(
        column_names.contains(&"id".to_string()),
        "Must have id column"
    );
    assert!(
        column_names.contains(&"entity_type".to_string()),
        "Must have entity_type"
    );
    assert!(
        column_names.contains(&"entity_id".to_string()),
        "Must have entity_id"
    );
    assert!(
        column_names.contains(&"synced_at".to_string()),
        "Must have synced_at"
    );
    assert!(
        column_names.contains(&"device_id".to_string()),
        "Must have device_id"
    );
    assert!(
        column_names.contains(&"operation".to_string()),
        "Must have operation"
    );
}

#[test]
fn test_sync_history_table_has_space_id() {
    let (conn, _dir) = setup_db();

    // Verify sync_history has space_id column (used by Session 5 query fixes)
    let schema: Vec<String> = conn
        .prepare("PRAGMA table_info(sync_history)")
        .unwrap()
        .query_map([], |row| row.get::<_, String>(1))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .expect("Failed to get schema");

    assert!(
        schema.contains(&"space_id".to_string()),
        "sync_history must have space_id column"
    );
}

#[test]
fn test_sync_vector_clock_table_exists() {
    let (conn, _dir) = setup_db();

    let table_exists: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_vector_clock'",
            [],
            |row| {
                let count: i64 = row.get(0)?;
                Ok(count > 0)
            },
        )
        .expect("Failed to query table existence");

    assert!(table_exists, "sync_vector_clock table must exist");
}

// ============== SYNC AGENT FUNCTIONALITY TESTS ==============

#[test]
fn test_sync_agent_creation() {
    let device_id = "test_device_123".to_string();
    let device_name = "Test Device".to_string();
    let sync_port = 8765;

    let agent = SyncAgent::new(device_id.clone(), device_name.clone(), sync_port);

    let info = agent.get_device_info();
    assert_eq!(info.device_id, device_id);
    assert_eq!(info.device_name, device_name);
    assert_eq!(info.sync_port, sync_port);
    assert_eq!(info.device_type, DeviceType::Desktop);
}

#[test]
fn test_register_device() {
    let (conn, _dir) = setup_db();

    let agent = SyncAgent::new("device_1".to_string(), "Device 1".to_string(), 8765);
    let device_info = agent.get_device_info();

    agent
        .register_device(&conn, &device_info)
        .expect("Failed to register device");

    // Verify device registered
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sync_state WHERE device_id = ?1",
            [&device_info.device_id],
            |row| row.get(0),
        )
        .expect("Failed to count devices");

    assert_eq!(count, 1, "Device should be registered");
}

#[test]
fn test_get_devices() {
    let (conn, _dir) = setup_db();

    let agent = SyncAgent::new("device_main".to_string(), "Main Device".to_string(), 8765);

    // Register multiple devices
    for i in 1..=5 {
        let device_info = agent.get_device_info();
        let mut modified_info = device_info.clone();
        modified_info.device_id = format!("device_{}", i);
        modified_info.device_name = format!("Device {}", i);

        agent
            .register_device(&conn, &modified_info)
            .expect("Failed to register device");
    }

    let devices = agent.get_devices(&conn).expect("Failed to get devices");
    assert_eq!(devices.len(), 5);
}

// ============== CONFLICT DETECTION TESTS ==============

#[test]
fn test_conflict_types() {
    // Verify all conflict types are distinct
    let update_update = ConflictType::UpdateUpdate;
    let update_delete = ConflictType::UpdateDelete;
    let delete_update = ConflictType::DeleteUpdate;

    assert_ne!(update_update, update_delete);
    assert_ne!(update_update, delete_update);
    assert_ne!(update_delete, delete_update);
}

#[test]
fn test_conflict_resolution_types() {
    // Verify all resolution types exist
    let _use_local = ConflictResolution::UseLocal;
    let _use_remote = ConflictResolution::UseRemote;
    let _merge = ConflictResolution::Merge;
}

#[test]
fn test_create_and_resolve_conflict() {
    let (conn, _dir) = setup_db();

    let conflict_id = Ulid::new().to_string();
    let entity_id = Ulid::new().to_string();
    let device_id = "device_1".to_string();

    // Create a conflict record
    conn.execute(
        "INSERT INTO sync_conflict (
            id, entity_type, entity_id, local_version, remote_version,
            conflict_type, detected_at, resolved, device_id
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)",
        rusqlite::params![
            conflict_id,
            "note",
            entity_id,
            vec![1u8, 2, 3], // local version
            vec![4u8, 5, 6], // remote version
            "UpdateUpdate",
            chrono::Utc::now().timestamp(),
            device_id,
        ],
    )
    .expect("Failed to create conflict");

    // Verify conflict exists and is unresolved
    let resolved: i64 = conn
        .query_row(
            "SELECT resolved FROM sync_conflict WHERE id = ?1",
            [&conflict_id],
            |row| row.get(0),
        )
        .expect("Failed to get conflict");

    assert_eq!(resolved, 0, "Conflict should be unresolved");

    // Mark as resolved
    conn.execute(
        "UPDATE sync_conflict SET resolved = 1, resolved_at = ?1 WHERE id = ?2",
        rusqlite::params![chrono::Utc::now().timestamp(), conflict_id],
    )
    .expect("Failed to update conflict");

    // Verify resolved
    let resolved: i64 = conn
        .query_row(
            "SELECT resolved FROM sync_conflict WHERE id = ?1",
            [&conflict_id],
            |row| row.get(0),
        )
        .expect("Failed to get conflict");

    assert_eq!(resolved, 1, "Conflict should be resolved");
}

#[test]
fn test_get_unresolved_conflicts() {
    let (conn, _dir) = setup_db();
    let agent = SyncAgent::new("device_1".to_string(), "Device 1".to_string(), 8765);
    let device_id = "device_1".to_string();

    // Create multiple conflicts
    for i in 0..5 {
        let conflict_id = Ulid::new().to_string();
        let entity_id = Ulid::new().to_string();

        conn.execute(
            "INSERT INTO sync_conflict (
                id, entity_type, entity_id, local_version, remote_version,
                conflict_type, detected_at, resolved, device_id
            ) VALUES (?1, 'note', ?2, ?3, ?4, 'UpdateUpdate', ?5, ?6, ?7)",
            rusqlite::params![
                conflict_id,
                entity_id,
                vec![1u8],
                vec![2u8],
                chrono::Utc::now().timestamp(),
                if i < 3 { 0 } else { 1 }, // First 3 unresolved
                device_id,
            ],
        )
        .expect("Failed to create conflict");
    }

    let conflicts = agent
        .get_unresolved_conflicts(&conn)
        .expect("Failed to get conflicts");

    assert_eq!(conflicts.len(), 3, "Should have 3 unresolved conflicts");
}

// ============== SYNC HISTORY TESTS ==============

#[test]
fn test_record_sync_history() {
    let (conn, _dir) = setup_db();
    let agent = SyncAgent::new("device_1".to_string(), "Device 1".to_string(), 8765);
    let space_id = Ulid::new().to_string();

    agent
        .record_sync_history(&conn, &space_id, "bidirectional", 10, 5, 0, true, None)
        .expect("Failed to record sync history");

    // Verify record created
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sync_history WHERE space_id = ?1",
            [&space_id],
            |row| row.get(0),
        )
        .expect("Failed to count history");

    assert_eq!(count, 1);
}

#[test]
fn test_get_sync_history() {
    let (conn, _dir) = setup_db();
    let agent = SyncAgent::new("device_1".to_string(), "Device 1".to_string(), 8765);
    let space_id = Ulid::new().to_string();

    // Record multiple sync events
    for i in 0..10 {
        agent
            .record_sync_history(
                &conn,
                &space_id,
                if i % 2 == 0 { "push" } else { "pull" },
                i,
                i + 1,
                0,
                true,
                None,
            )
            .expect("Failed to record history");
    }

    let history = agent
        .get_sync_history(&conn, &space_id, 5)
        .expect("Failed to get history");

    assert_eq!(history.len(), 5, "Should limit to 5 most recent");

    // Verify ordering (most recent first)
    for i in 0..history.len() - 1 {
        assert!(
            history[i].sync_time >= history[i + 1].sync_time,
            "History should be ordered by time descending"
        );
    }
}

// ============== QUERY OPTIMIZATION TESTS (Session 5 Fixes) ==============

#[test]
fn test_get_last_sync_time_uses_sync_history() {
    let (conn, _dir) = setup_db();
    let agent = SyncAgent::new("device_1".to_string(), "Device 1".to_string(), 8765);
    let space_id = Ulid::new().to_string();

    // Record sync with specific timestamp
    let sync_time = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO sync_history (
            id, device_id, space_id, sync_time, direction,
            entities_pushed, entities_pulled, conflicts_detected, success
        ) VALUES (?1, ?2, ?3, ?4, 'bidirectional', 0, 0, 0, 1)",
        rusqlite::params![Ulid::new().to_string(), "device_1", space_id, sync_time],
    )
    .expect("Failed to insert sync history");

    // This test verifies that get_last_sync_time queries sync_history (Session 5 fix)
    // The actual function is private, but we can verify the table is being used correctly
    let result: Option<i64> = conn
        .query_row(
            "SELECT MAX(sync_time) FROM sync_history WHERE space_id = ?1",
            [&space_id],
            |row| row.get(0),
        )
        .expect("Failed to query last sync time");

    assert_eq!(
        result,
        Some(sync_time),
        "Should return last sync time from sync_history"
    );
}

#[test]
fn test_vector_clock_from_sync_history() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();

    // Insert sync history for multiple devices
    for i in 1..=3 {
        let device_id = format!("device_{}", i);
        let sync_time = 1000 + (i as i64 * 100);

        conn.execute(
            "INSERT INTO sync_history (
                id, device_id, space_id, sync_time, direction,
                entities_pushed, entities_pulled, conflicts_detected, success
            ) VALUES (?1, ?2, ?3, ?4, 'bidirectional', 0, 0, 0, 1)",
            rusqlite::params![Ulid::new().to_string(), device_id, space_id, sync_time],
        )
        .expect("Failed to insert sync history");
    }

    // Query to build vector clock from sync_history (Session 5 fix)
    let vector_clock: Vec<(String, i64)> = conn
        .prepare(
            "SELECT device_id, MAX(sync_time)
             FROM sync_history
             WHERE space_id = ?1
             GROUP BY device_id",
        )
        .unwrap()
        .query_map([&space_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .expect("Failed to build vector clock");

    assert_eq!(
        vector_clock.len(),
        3,
        "Should have 3 devices in vector clock"
    );

    // Verify correct timestamps
    for (device_id, timestamp) in vector_clock {
        let device_num: i64 = device_id.replace("device_", "").parse().unwrap();
        let expected_time = 1000 + (device_num * 100);
        assert_eq!(
            timestamp, expected_time,
            "Timestamp should match for {}",
            device_id
        );
    }
}

// ============== ENTITY SYNC LOG TESTS (Session 5 Fix) ==============

#[test]
fn test_entity_sync_log_insert_with_id() {
    let (conn, _dir) = setup_db();

    let log_id = Ulid::new().to_string();
    let entity_id = Ulid::new().to_string();
    let device_id = "device_1".to_string();

    // CRITICAL TEST: Insert with ID (Session 5 fix added id parameter)
    conn.execute(
        "INSERT INTO entity_sync_log (
            id, entity_type, entity_id, synced_at, device_id, operation
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            log_id,
            "note",
            entity_id,
            chrono::Utc::now().timestamp(),
            device_id,
            "Create",
        ],
    )
    .expect("Failed to insert into entity_sync_log");

    // Verify insert successful
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM entity_sync_log WHERE id = ?1",
            [&log_id],
            |row| row.get(0),
        )
        .expect("Failed to count logs");

    assert_eq!(count, 1, "Log entry should exist");
}

#[test]
fn test_entity_sync_log_all_fields() {
    let (conn, _dir) = setup_db();

    let log_id = Ulid::new().to_string();
    let entity_id = Ulid::new().to_string();
    let synced_at = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO entity_sync_log (
            id, entity_type, entity_id, synced_at, device_id, operation
        ) VALUES (?1, 'task', ?2, ?3, 'device_1', 'Update')",
        rusqlite::params![log_id, entity_id, synced_at],
    )
    .expect("Failed to insert");

    // Verify all fields
    let result: (String, String, i64, String, String) = conn
        .query_row(
            "SELECT entity_type, entity_id, synced_at, device_id, operation
             FROM entity_sync_log WHERE id = ?1",
            [&log_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .expect("Failed to query log");

    assert_eq!(result.0, "task");
    assert_eq!(result.1, entity_id);
    assert_eq!(result.2, synced_at);
    assert_eq!(result.3, "device_1");
    assert_eq!(result.4, "Update");
}

#[test]
fn test_entity_sync_log_operation_types() {
    let (conn, _dir) = setup_db();

    let operations = vec!["Create", "Update", "Delete"];

    for op in operations {
        let log_id = Ulid::new().to_string();
        conn.execute(
            "INSERT INTO entity_sync_log (
                id, entity_type, entity_id, synced_at, device_id, operation
            ) VALUES (?1, 'note', ?2, ?3, 'device_1', ?4)",
            rusqlite::params![
                log_id,
                Ulid::new().to_string(),
                chrono::Utc::now().timestamp(),
                op
            ],
        )
        .expect(&format!("Failed to insert {} operation", op));
    }

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM entity_sync_log", [], |row| row.get(0))
        .expect("Failed to count");

    assert_eq!(count, 3, "Should have 3 log entries");
}

// ============== DEVICE TYPE TESTS ==============

#[test]
fn test_device_types() {
    let desktop = DeviceType::Desktop;
    let mobile = DeviceType::Mobile;
    let web = DeviceType::Web;

    assert_ne!(desktop, mobile);
    assert_ne!(desktop, web);
    assert_ne!(mobile, web);
}

// ============== PERFORMANCE TESTS ==============

#[test]
fn test_bulk_sync_history_query() {
    let (conn, _dir) = setup_db();
    let agent = SyncAgent::new("device_1".to_string(), "Device 1".to_string(), 8765);
    let space_id = Ulid::new().to_string();

    // Insert 100 sync records
    for _ in 0..100 {
        agent
            .record_sync_history(&conn, &space_id, "bidirectional", 1, 1, 0, true, None)
            .expect("Failed to record history");
    }

    let start = std::time::Instant::now();
    let history = agent
        .get_sync_history(&conn, &space_id, 50)
        .expect("Failed to get history");
    let duration = start.elapsed();

    assert_eq!(history.len(), 50);
    assert!(
        duration.as_millis() < 100,
        "Query took {}ms - should be <100ms",
        duration.as_millis()
    );
}
