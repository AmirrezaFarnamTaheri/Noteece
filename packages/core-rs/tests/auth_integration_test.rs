use core_rs::auth::{AuthError, AuthService};
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;

fn setup_db() -> (Arc<Mutex<Connection>>, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let conn = Connection::open(&db_path).unwrap();

    // Create auth tables manually as we are testing auth module in isolation or integration
    // In real app, db::migrate handles this.
    // Let's use the same schema as in auth.rs tests for consistency
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            last_login_at INTEGER
        )",
        [],
    )
    .unwrap();

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        [],
    )
    .unwrap();

    (Arc::new(Mutex::new(conn)), dir)
}

#[test]
fn test_auth_flow_integration() {
    let (conn_mutex, _dir) = setup_db();
    let conn = conn_mutex.lock().unwrap();

    // 1. Create User
    let user = AuthService::create_user(
        &conn,
        "integration_user",
        "int@example.com",
        "secure_password_123",
    );
    assert!(user.is_ok());
    let user = user.unwrap();
    assert_eq!(user.username, "integration_user");

    // 2. Authenticate
    let session = AuthService::authenticate(&conn, "integration_user", "secure_password_123");
    assert!(session.is_ok());
    let session = session.unwrap();

    // 3. Validate Session
    let validated_user_id = AuthService::validate_session(&conn, &session.token);
    assert!(validated_user_id.is_ok());
    assert_eq!(validated_user_id.unwrap(), user.id);

    // 4. Logout
    let logout_result = AuthService::logout(&conn, &session.token);
    assert!(logout_result.is_ok());

    // 5. Validate Session again (should fail)
    let validation_after_logout = AuthService::validate_session(&conn, &session.token);
    assert!(matches!(
        validation_after_logout,
        Err(AuthError::InvalidSession)
    ));
}
