use core_rs::audit;
use core_rs::db;
use rusqlite::Connection;
use tempfile::tempdir;

fn setup_db() -> (Connection, tempfile::TempDir) {
    let temp_dir = tempdir().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    (conn, temp_dir)
}

#[test]
fn test_audit_logging() {
    let (conn, _temp_dir) = setup_db();

    // Log an event
    let log_id = audit::log_event(
        &conn,
        Some("user_123"),
        "LOGIN",
        "user",
        Some("user_123"),
        Some(r#"{"method": "password"}"#),
        Some("127.0.0.1"),
        Some("Mozilla/5.0"),
    )
    .unwrap();

    // Retrieve logs
    let logs = audit::get_audit_logs(&conn, 10, 0).unwrap();

    assert_eq!(logs.len(), 1);
    let log = &logs[0];

    assert_eq!(log.id, log_id);
    assert_eq!(log.user_id, Some("user_123".to_string()));
    assert_eq!(log.event_type, "LOGIN");
    assert_eq!(log.entity_type, "user");
    assert_eq!(log.entity_id, Some("user_123".to_string()));
    assert_eq!(
        log.details_json,
        Some(r#"{"method": "password"}"#.to_string())
    );
    assert_eq!(log.ip_address, Some("127.0.0.1".to_string()));
}
