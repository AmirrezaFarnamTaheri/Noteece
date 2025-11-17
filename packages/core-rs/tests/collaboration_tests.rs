use core_rs::collaboration::{self, add_user_to_space, remove_user_from_space};
use core_rs::db;
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();
    // Initialize the new RBAC tables
    collaboration::init_rbac_tables(&conn).unwrap();
    (conn, dir)
}

#[test]
fn test_collaboration_add_and_remove_user() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();
    let user_email = "test@example.com";
    let role_id = "editor"; // Use a default role that is created by init_rbac_tables

    // We need a space to exist for foreign key constraints
    conn.execute(
        "INSERT INTO space (id, name) VALUES (?, ?)",
        &[space_id.as_str(), "Test Space"],
    )
    .unwrap();

    // Add the user to the space with the "editor" role
    add_user_to_space(&conn, &space_id, &user_id, user_email, role_id).unwrap();

    // Verify the user was added to space_users
    let user_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM space_users WHERE space_id = ? AND user_id = ? AND email = ?)",
            &[&space_id, &user_id, &user_email.to_string()],
            |row| row.get(0),
        )
        .unwrap();
    assert!(user_exists, "User should exist in space_users table");

    // Verify the user was assigned the correct role in space_user_roles
    let assigned_role: String = conn
        .query_row(
            "SELECT role_id FROM space_user_roles WHERE space_id = ? AND user_id = ?",
            &[&space_id, &user_id],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(assigned_role, role_id, "User should have the 'editor' role");

    // Remove the user from the space
    remove_user_from_space(&conn, &space_id, &user_id).unwrap();

    // Verify the user was removed from space_users
    let user_exists_after_remove: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM space_users WHERE space_id = ? AND user_id = ?)",
            &[&space_id, &user_id],
            |row| row.get(0),
        )
        .unwrap();
    assert!(!user_exists_after_remove, "User should not exist in space_users table after removal");

    // Verify the role assignment was removed
     let role_exists_after_remove: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM space_user_roles WHERE space_id = ? AND user_id = ?)",
            &[&space_id, &user_id],
            |row| row.get(0),
        )
        .unwrap();
    assert!(!role_exists_after_remove, "User role assignment should be removed");
}
