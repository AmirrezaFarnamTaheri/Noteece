use core_rs::db::migrate;
use core_rs::note::create_note;
use core_rs::search::search_notes;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (tempfile::TempDir, Connection) {
    let dir = tempdir().unwrap();
    let file_path = dir.path().join("test.db");
    let mut conn = Connection::open(&file_path).unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();
    migrate(&mut conn).unwrap();

    // Create default space (only id and name are guaranteed)
    conn.execute(
        "INSERT INTO space (id, name) VALUES ('default', 'Default Space')",
        [],
    )
    .unwrap();

    (dir, conn)
}

#[test]
fn test_fts_optimization_migration_22() {
    let (_dir, conn) = setup_db();

    // Check if migration 22 ran by checking schema_version
    let version: i32 = conn
        .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert!(version >= 22, "Schema version should be at least 22");

    // Check if sync_conflict index exists
    let index_exists: bool = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='index' AND name='idx_sync_conflict_entity'",
        [],
        |row| row.get::<_, i32>(0)
    ).unwrap() > 0;

    assert!(index_exists, "idx_sync_conflict_entity should exist");
}

#[test]
fn test_fts_query_functionality() {
    let (_dir, conn) = setup_db();

    // Insert a note
    let _ = create_note(
        &conn,
        "default",
        "Rust Programming",
        "Rust is a systems programming language that runs blazingly fast.",
    )
    .unwrap();

    // Search for "systems"
    let results = search_notes(&conn, "systems", "default").unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].title, "Rust Programming");

    // Search for "python" (should not match)
    let results = search_notes(&conn, "python", "default").unwrap();
    assert_eq!(results.len(), 0);
}

#[test]
fn test_sync_conflict_storage() {
    let (_dir, conn) = setup_db();

    // Insert a conflict manually to test DB constraints and types
    let conflict_id = "conflict1";
    let entity_type = "note";
    let entity_id = "note1";
    let local_ver = b"{\"title\":\"local\"}".to_vec();
    let remote_ver = b"{\"title\":\"remote\"}".to_vec();

    conn.execute(
        "INSERT INTO sync_conflict (id, entity_type, entity_id, local_version, remote_version, conflict_type, detected_at, resolved, device_id, space_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            conflict_id,
            entity_type,
            entity_id,
            local_ver,
            remote_ver,
            "UpdateUpdate",
            1000,
            0,
            "device1",
            "default"
        )
    ).unwrap();

    // Verify retrieval
    let count: i32 = conn
        .query_row(
            "SELECT count(*) FROM sync_conflict WHERE entity_id = ?1",
            [entity_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);
}
