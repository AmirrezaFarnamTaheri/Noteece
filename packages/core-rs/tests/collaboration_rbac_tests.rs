// Comprehensive RBAC and Collaboration Tests
// Tests all security fixes from Session 5 QA

use core_rs::collaboration::{
    activate_user, add_user_to_space, check_permission, get_roles, get_space_users,
    grant_permission, init_rbac_tables, invite_user, remove_user_from_space, revoke_permission,
    suspend_user,
};
use core_rs::db;
use rusqlite::Connection;
use tempfile::{tempdir, TempDir};
use ulid::Ulid;

fn setup_db() -> (Connection, TempDir) {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("test.db");
    let mut conn = Connection::open(&db_path).unwrap();
    db::migrate(&mut conn).unwrap();

    // Initialize RBAC tables
    init_rbac_tables(&conn).expect("Failed to initialize RBAC tables");

    (conn, dir)
}

// ============== SECURITY TESTS - TOKEN GENERATION ==============

#[test]
fn test_invitation_token_security_uniqueness() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let inviter_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Create multiple invitations
    let mut tokens = Vec::new();
    for i in 0..20 {
        let invitation = invite_user(
            &conn,
            &space_id,
            &format!("user{}@example.com", i),
            "editor",
            &inviter_id,
        )
        .expect("Failed to create invitation");

        tokens.push(invitation.token.clone());
    }

    // SECURITY TEST: All tokens must be globally unique
    let unique_tokens: std::collections::HashSet<_> = tokens.iter().collect();
    assert_eq!(
        tokens.len(),
        unique_tokens.len(),
        "All {} tokens must be unique - found {} unique",
        tokens.len(),
        unique_tokens.len()
    );
}

#[test]
fn test_invitation_token_length() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let inviter_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    let invitation = invite_user(&conn, &space_id, "test@example.com", "viewer", &inviter_id)
        .expect("Failed to create invitation");

    // SECURITY TEST: Token must be exactly 64 characters (384 bits entropy)
    assert_eq!(
        invitation.token.len(),
        64,
        "Token length must be 64 characters for 384-bit entropy"
    );
}

#[test]
fn test_invitation_token_alphanumeric_only() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let inviter_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    for i in 0..10 {
        let invitation = invite_user(
            &conn,
            &space_id,
            &format!("user{}@example.com", i),
            "viewer",
            &inviter_id,
        )
        .expect("Failed to create invitation");

        // SECURITY TEST: Must be alphanumeric only (no special chars for injection prevention)
        assert!(
            invitation.token.chars().all(|c| c.is_ascii_alphanumeric()),
            "Token '{}' contains non-alphanumeric characters",
            invitation.token
        );
    }
}

#[test]
fn test_invitation_token_high_entropy() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let inviter_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    let inv1 = invite_user(&conn, &space_id, "user1@example.com", "editor", &inviter_id)
        .expect("Failed to create invitation");

    let inv2 = invite_user(&conn, &space_id, "user2@example.com", "editor", &inviter_id)
        .expect("Failed to create invitation");

    // SECURITY TEST: High variance between sequential tokens (entropy check)
    let different_chars = inv1
        .token
        .chars()
        .zip(inv2.token.chars())
        .filter(|(a, b)| a != b)
        .count();

    assert!(
        different_chars > 32,
        "Tokens show insufficient randomness: only {} out of 64 chars differ (expected >32)",
        different_chars
    );
}

#[test]
fn test_invitation_token_not_ulid() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let inviter_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    let invitation = invite_user(&conn, &space_id, "test@example.com", "viewer", &inviter_id)
        .expect("Failed to create invitation");

    // CRITICAL SECURITY TEST: Token must NOT be a predictable ULID
    assert_ne!(
        invitation.token.len(),
        26,
        "Token must not be ULID length (ULIDs are predictable)"
    );

    // Try parsing as ULID - must fail
    assert!(
        ulid::Ulid::from_string(&invitation.token).is_err(),
        "Token must not be parseable as ULID (Session 5 fix verification)"
    );
}

#[test]
fn test_invitation_token_distribution() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let inviter_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    let mut tokens = Vec::new();
    for i in 0..50 {
        let inv = invite_user(
            &conn,
            &space_id,
            &format!("user{}@example.com", i),
            "viewer",
            &inviter_id,
        )
        .expect("Failed to create invitation");
        tokens.push(inv.token);
    }

    // SECURITY TEST: First character distribution should be varied
    let first_char_distribution: std::collections::HashMap<char, usize> = tokens
        .iter()
        .map(|t| t.chars().next().unwrap())
        .fold(std::collections::HashMap::new(), |mut acc, c| {
            *acc.entry(c).or_insert(0) += 1;
            acc
        });

    // With 50 random tokens, expect good distribution (at least 10 different first chars)
    assert!(
        first_char_distribution.len() >= 10,
        "First character shows insufficient randomness: only {} unique chars in 50 tokens",
        first_char_distribution.len()
    );
}

// ============== N+1 QUERY PERFORMANCE TESTS ==============

#[test]
fn test_get_space_users_bulk_fetch_small() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Add 10 users
    for i in 0..10 {
        let user_id = Ulid::new().to_string();
        add_user_to_space(
            &conn,
            &space_id,
            &user_id,
            &format!("user{}@example.com", i),
            "viewer",
        )
        .expect("Failed to add user");
    }

    let users = get_space_users(&conn, &space_id).expect("Failed to get space users");

    assert_eq!(users.len(), 10);
    for user in &users {
        assert!(
            !user.permissions.is_empty(),
            "User should have permissions loaded"
        );
    }
}

#[test]
fn test_get_space_users_bulk_fetch_large() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Add 100 users with mixed roles
    for i in 0..100 {
        let user_id = Ulid::new().to_string();
        let role = match i % 3 {
            0 => "admin",
            1 => "editor",
            _ => "viewer",
        };
        add_user_to_space(
            &conn,
            &space_id,
            &user_id,
            &format!("user{}@example.com", i),
            role,
        )
        .expect("Failed to add user");

        // Add custom permissions to some users
        if i % 5 == 0 {
            grant_permission(&conn, &space_id, &user_id, "manage_tags")
                .expect("Failed to grant permission");
        }
    }

    // PERFORMANCE TEST: Should use bulk fetch (2 queries) not N+1
    let start = std::time::Instant::now();
    let users = get_space_users(&conn, &space_id).expect("Failed to get space users");
    let duration = start.elapsed();

    assert_eq!(users.len(), 100);

    // Verify all permissions loaded correctly
    let users_with_custom_perms = users
        .iter()
        .filter(|u| u.permissions.contains(&"manage_tags".to_string()))
        .count();
    assert_eq!(users_with_custom_perms, 20); // 20% of 100 have custom perm

    // Performance assertion: <1 second for 100 users
    assert!(
        duration.as_millis() < 1000,
        "Query took {}ms for 100 users - indicates N+1 problem (expected <1000ms with bulk fetch)",
        duration.as_millis()
    );
}

#[test]
fn test_get_space_users_mixed_permissions() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Add user with viewer role
    add_user_to_space(&conn, &space_id, &user_id, "user@example.com", "viewer")
        .expect("Failed to add user");

    // Grant multiple custom permissions
    grant_permission(&conn, &space_id, &user_id, "manage_tags").expect("Failed");
    grant_permission(&conn, &space_id, &user_id, "export_data").expect("Failed");
    grant_permission(&conn, &space_id, &user_id, "import_data").expect("Failed");

    let users = get_space_users(&conn, &space_id).expect("Failed to get users");
    assert_eq!(users.len(), 1);

    let user = &users[0];

    // Should include both role and custom permissions
    assert!(
        user.permissions.contains(&"read_notes".to_string()),
        "Missing role permission"
    );
    assert!(
        user.permissions.contains(&"manage_tags".to_string()),
        "Missing custom permission"
    );
    assert!(
        user.permissions.contains(&"export_data".to_string()),
        "Missing custom permission"
    );
    assert!(
        user.permissions.contains(&"import_data".to_string()),
        "Missing custom permission"
    );
}

// ============== PERMISSION REVOCATION FIX TESTS ==============

#[test]
fn test_permission_revocation_with_empty_custom_permissions() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Add user as editor (has write permission)
    add_user_to_space(&conn, &space_id, &user_id, "user@example.com", "editor")
        .expect("Failed to add user");

    // Grant custom permission
    grant_permission(&conn, &space_id, &user_id, "manage_tags").expect("Failed");

    // Verify custom permission exists
    let has_manage =
        check_permission(&conn, &space_id, &user_id, "manage_tags").expect("Failed to check");
    assert!(has_manage);

    // Now revoke the custom permission (simulating UI reset to role defaults)
    revoke_permission(&conn, &space_id, &user_id, "manage_tags").expect("Failed to revoke");

    // CRITICAL TEST: Permission should be revoked even when customPermissions array is empty
    // This tests the Session 5 fix where we removed the `length > 0` check
    let has_manage_after =
        check_permission(&conn, &space_id, &user_id, "manage_tags").expect("Failed to check");
    assert!(
        !has_manage_after,
        "Permission should be revoked (Session 5 fix verification)"
    );

    // Role permissions should still exist
    let can_write =
        check_permission(&conn, &space_id, &user_id, "write_notes").expect("Failed to check");
    assert!(can_write, "Role permissions should remain intact");
}

#[test]
fn test_reset_to_role_defaults() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    add_user_to_space(&conn, &space_id, &user_id, "user@example.com", "viewer")
        .expect("Failed to add user");

    // Grant several custom permissions
    grant_permission(&conn, &space_id, &user_id, "write_notes").expect("Failed");
    grant_permission(&conn, &space_id, &user_id, "delete_notes").expect("Failed");
    grant_permission(&conn, &space_id, &user_id, "manage_space").expect("Failed");

    // Verify custom permissions exist
    assert!(check_permission(&conn, &space_id, &user_id, "write_notes").unwrap());
    assert!(check_permission(&conn, &space_id, &user_id, "delete_notes").unwrap());
    assert!(check_permission(&conn, &space_id, &user_id, "manage_space").unwrap());

    // Reset to role defaults by revoking all custom permissions
    revoke_permission(&conn, &space_id, &user_id, "write_notes").expect("Failed");
    revoke_permission(&conn, &space_id, &user_id, "delete_notes").expect("Failed");
    revoke_permission(&conn, &space_id, &user_id, "manage_space").expect("Failed");

    // Verify all custom permissions gone
    assert!(!check_permission(&conn, &space_id, &user_id, "write_notes").unwrap());
    assert!(!check_permission(&conn, &space_id, &user_id, "delete_notes").unwrap());
    assert!(!check_permission(&conn, &space_id, &user_id, "manage_space").unwrap());

    // Role permissions should still work
    assert!(check_permission(&conn, &space_id, &user_id, "read_notes").unwrap());
}

// ============== RBAC FUNCTIONALITY TESTS ==============

#[test]
fn test_role_permission_hierarchy() {
    let (conn, _dir) = setup_db();
    let roles = get_roles(&conn).expect("Failed to get roles");

    let admin = roles.iter().find(|r| r.name == "Administrator").unwrap();
    let editor = roles.iter().find(|r| r.name == "Editor").unwrap();
    let viewer = roles.iter().find(|r| r.name == "Viewer").unwrap();

    // Admin should have most permissions
    assert!(admin.permissions.len() > editor.permissions.len());
    assert!(admin.permissions.len() > viewer.permissions.len());

    // Editor should have more than viewer
    assert!(editor.permissions.len() > viewer.permissions.len());

    // All should have read permission
    assert!(admin.permissions.contains(&"read_notes".to_string()));
    assert!(editor.permissions.contains(&"read_notes".to_string()));
    assert!(viewer.permissions.contains(&"read_notes".to_string()));

    // Only admin and editor should have write
    assert!(admin.permissions.contains(&"write_notes".to_string()));
    assert!(editor.permissions.contains(&"write_notes".to_string()));
    assert!(!viewer.permissions.contains(&"write_notes".to_string()));
}

#[test]
fn test_custom_permission_override() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Add as viewer (no write permission)
    add_user_to_space(&conn, &space_id, &user_id, "user@example.com", "viewer")
        .expect("Failed to add user");

    assert!(!check_permission(&conn, &space_id, &user_id, "write_notes").unwrap());

    // Grant custom write permission
    grant_permission(&conn, &space_id, &user_id, "write_notes").expect("Failed to grant");

    // Now should have write permission
    assert!(check_permission(&conn, &space_id, &user_id, "write_notes").unwrap());
}

#[test]
fn test_user_suspension() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();
    let admin_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    add_user_to_space(&conn, &space_id, &user_id, "user@example.com", "editor")
        .expect("Failed to add user");

    // Suspend user
    suspend_user(&conn, &space_id, &user_id).expect("Failed to suspend");

    let users = get_space_users(&conn, &space_id).expect("Failed to get users");
    assert_eq!(users[0].status, "suspended");

    // Reactivate
    activate_user(&conn, &space_id, &user_id).expect("Failed to activate");

    let users = get_space_users(&conn, &space_id).expect("Failed to get users");
    assert_eq!(users[0].status, "active");
}

// ============== EDGE CASES ==============

#[test]
fn test_nonexistent_space() {
    let (conn, _dir) = setup_db();
    let fake_space = Ulid::new().to_string();
    let user_id = Ulid::new().to_string();

    let result = check_permission(&conn, &fake_space, &user_id, "read_notes");
    assert!(result.is_ok());
    assert!(
        !result.unwrap(),
        "Nonexistent space should deny permissions"
    );
}

#[test]
fn test_empty_space_users_list() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Empty Space')",
        [&space_id],
    )
    .unwrap();

    let users = get_space_users(&conn, &space_id).expect("Failed to get users");
    assert_eq!(users.len(), 0);
}

#[test]
fn test_remove_nonexistent_user() {
    let (conn, _dir) = setup_db();
    let space_id = Ulid::new().to_string();
    let fake_user = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO space (id, name) VALUES (?1, 'Test Space')",
        [&space_id],
    )
    .unwrap();

    // Should not error, just no-op
    let result = remove_user_from_space(&conn, &space_id, &fake_user);
    assert!(result.is_ok(), "Removing nonexistent user should not error");
}
