use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum CollaborationError {
    #[error("Rusqlite error: {0}")]
    Rusqlite(#[from] rusqlite::Error),
    #[error("User not found")]
    UserNotFound,
    #[error("Permission denied")]
    PermissionDenied,
    #[error("Invalid role")]
    InvalidRole,
    #[error("Invitation expired")]
    InvitationExpired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceUser {
    pub user_id: String,
    pub email: String,
    pub role: String,
    pub status: String, // active, invited, suspended
    pub permissions: Vec<String>,
    pub last_active: Option<i64>,
    pub joined_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: String,
    pub name: String,
    pub description: String,
    pub permissions: Vec<String>,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInvitation {
    pub id: String,
    pub space_id: String,
    pub email: String,
    pub role: String,
    pub permissions: Vec<String>,
    pub invited_by: String,
    pub invited_at: i64,
    pub expires_at: i64,
    pub status: String, // pending, accepted, expired, rejected
    pub token: String,
}

/// Initialize RBAC database tables
pub fn init_rbac_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Roles table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            is_system INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )",
        [],
    )?;

    // Role permissions table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS role_permissions (
            role_id TEXT NOT NULL,
            permission TEXT NOT NULL,
            PRIMARY KEY (role_id, permission),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // User roles in spaces
    conn.execute(
        "CREATE TABLE IF NOT EXISTS space_user_roles (
            space_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            assigned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            assigned_by TEXT,
            PRIMARY KEY (space_id, user_id),
            FOREIGN KEY (role_id) REFERENCES roles(id)
        )",
        [],
    )?;

    // User status in spaces
    conn.execute(
        "CREATE TABLE IF NOT EXISTS space_users (
            space_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            email TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            last_active INTEGER,
            joined_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            PRIMARY KEY (space_id, user_id)
        )",
        [],
    )?;

    // User invitations
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_invitations (
            id TEXT PRIMARY KEY,
            space_id TEXT NOT NULL,
            email TEXT NOT NULL,
            role_id TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            invited_by TEXT NOT NULL,
            invited_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            FOREIGN KEY (role_id) REFERENCES roles(id)
        )",
        [],
    )?;

    // Custom user permissions (override role permissions)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_permissions (
            space_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            permission TEXT NOT NULL,
            granted INTEGER NOT NULL DEFAULT 1,
            PRIMARY KEY (space_id, user_id, permission)
        )",
        [],
    )?;

    // Create default system roles
    init_default_roles(conn)?;

    Ok(())
}

/// Initialize default system roles
fn init_default_roles(conn: &Connection) -> Result<(), rusqlite::Error> {
    let roles = vec![
        (
            "owner",
            "Owner",
            "Full control over the space including user management and billing",
            vec![
                "read",
                "write",
                "delete",
                "admin",
                "manage_users",
                "manage_billing",
            ],
        ),
        (
            "admin",
            "Administrator",
            "Can manage users and configure space settings",
            vec!["read", "write", "delete", "admin", "manage_users"],
        ),
        (
            "editor",
            "Editor",
            "Can read, write, and delete content",
            vec!["read", "write", "delete"],
        ),
        ("viewer", "Viewer", "Can only read content", vec!["read"]),
    ];

    for (id, name, description, permissions) in roles {
        // Check if role exists
        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM roles WHERE id = ?1)",
                [id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !exists {
            conn.execute(
                "INSERT INTO roles (id, name, description, is_system) VALUES (?1, ?2, ?3, 1)",
                rusqlite::params![id, name, description],
            )?;

            // Add permissions
            for permission in permissions {
                conn.execute(
                    "INSERT INTO role_permissions (role_id, permission) VALUES (?1, ?2)",
                    rusqlite::params![id, permission],
                )?;
            }
        }
    }

    Ok(())
}

/// Get all user permissions for a space in bulk (optimized to avoid N+1 queries)
fn get_all_space_user_permissions(
    conn: &Connection,
    space_id: &str,
) -> Result<std::collections::HashMap<String, Vec<String>>, CollaborationError> {
    use std::collections::HashMap;

    let mut permissions_map: HashMap<String, Vec<String>> = HashMap::new();

    // Get all role permissions for users in this space
    let mut stmt = conn.prepare(
        "SELECT sur.user_id, rp.permission
         FROM space_user_roles sur
         JOIN role_permissions rp ON sur.role_id = rp.role_id
         WHERE sur.space_id = ?1",
    )?;

    let role_perms = stmt
        .query_map([space_id], |row| {
            let user_id: String = row.get(0)?;
            let permission: String = row.get(1)?;
            Ok((user_id, permission))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    for (user_id, permission) in role_perms {
        permissions_map
            .entry(user_id)
            .or_insert_with(Vec::new)
            .push(permission);
    }

    // Get all custom permissions (overrides) for users in this space
    let mut stmt = conn.prepare(
        "SELECT user_id, permission, granted
         FROM user_permissions
         WHERE space_id = ?1",
    )?;

    let custom_perms = stmt
        .query_map([space_id], |row| {
            let user_id: String = row.get(0)?;
            let permission: String = row.get(1)?;
            let granted: i32 = row.get(2)?;
            Ok((user_id, permission, granted))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // Apply custom permissions
    for (user_id, permission, granted) in custom_perms {
        let perms = permissions_map.entry(user_id).or_insert_with(Vec::new);
        if granted == 1 && !perms.contains(&permission) {
            perms.push(permission);
        } else if granted == 0 {
            perms.retain(|p| p != &permission);
        }
    }

    Ok(permissions_map)
}

/// Get all users in a space (optimized to avoid N+1 query)
pub fn get_space_users(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SpaceUser>, CollaborationError> {
    let mut stmt = conn.prepare(
        "SELECT su.user_id, su.email, r.name as role, su.status, su.last_active, su.joined_at
         FROM space_users su
         JOIN space_user_roles sur ON su.space_id = sur.space_id AND su.user_id = sur.user_id
         JOIN roles r ON sur.role_id = r.id
         WHERE su.space_id = ?1
         ORDER BY su.joined_at ASC",
    )?;

    let users = stmt
        .query_map([space_id], |row| {
            let user_id: String = row.get(0)?;
            let email: String = row.get(1)?;
            let role: String = row.get(2)?;
            let status: String = row.get(3)?;
            let last_active: Option<i64> = row.get(4)?;
            let joined_at: i64 = row.get(5)?;

            Ok((user_id, email, role, status, last_active, joined_at))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // Fetch all permissions in bulk (single query instead of N queries)
    let permissions_map = get_all_space_user_permissions(conn, space_id)?;

    // Map permissions to users in memory
    let space_users: Vec<SpaceUser> = users
        .into_iter()
        .map(|(user_id, email, role, status, last_active, joined_at)| {
            let permissions = permissions_map
                .get(&user_id)
                .cloned()
                .unwrap_or_else(Vec::new);

            SpaceUser {
                user_id,
                email,
                role,
                status,
                permissions,
                last_active,
                joined_at,
            }
        })
        .collect();

    Ok(space_users)
}

/// Get user permissions in a space
pub fn get_user_permissions(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
) -> Result<Vec<String>, CollaborationError> {
    // Get role permissions
    let mut stmt = conn.prepare(
        "SELECT rp.permission
         FROM space_user_roles sur
         JOIN role_permissions rp ON sur.role_id = rp.role_id
         WHERE sur.space_id = ?1 AND sur.user_id = ?2",
    )?;

    let mut permissions: Vec<String> = stmt
        .query_map([space_id, user_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    // Get custom permissions (overrides)
    let mut stmt = conn.prepare(
        "SELECT permission, granted
         FROM user_permissions
         WHERE space_id = ?1 AND user_id = ?2",
    )?;

    let custom_perms: Vec<(String, i32)> = stmt
        .query_map([space_id, user_id], |row| Ok((row.get(0)?, row.get(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    for (permission, granted) in custom_perms {
        if granted == 1 && !permissions.contains(&permission) {
            permissions.push(permission);
        } else if granted == 0 {
            permissions.retain(|p| p != &permission);
        }
    }

    Ok(permissions)
}

/// Check if user has permission
pub fn check_permission(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
    permission: &str,
) -> Result<bool, CollaborationError> {
    let permissions = get_user_permissions(conn, space_id, user_id)?;
    Ok(permissions.contains(&permission.to_string()))
}

/// Invite user to space
pub fn invite_user(
    conn: &Connection,
    space_id: &str,
    email: &str,
    role_id: &str,
    invited_by: &str,
) -> Result<UserInvitation, CollaborationError> {
    // Verify role exists
    let role_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM roles WHERE id = ?1)",
            [role_id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !role_exists {
        return Err(CollaborationError::InvalidRole);
    }

    let id = Ulid::new().to_string();

    // Generate cryptographically secure random token (32 bytes = 64 hex chars)
    // Generate cryptographically secure 32-byte token and hex-encode to 64 chars (256-bit entropy)
    use rand::RngCore;
    let mut raw = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut raw);
    let token = hex::encode(raw); // requires 'hex' crate in Cargo.toml

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let expires_at = now + (7 * 24 * 60 * 60); // 7 days

    conn.execute(
        "INSERT INTO user_invitations (id, space_id, email, role_id, token, invited_by, invited_at, expires_at, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')",
        rusqlite::params![id, space_id, email, role_id, token, invited_by, now, expires_at],
    )?;

    // Get role permissions
    let permissions = get_role_permissions(conn, role_id)?;

    Ok(UserInvitation {
        id,
        space_id: space_id.to_string(),
        email: email.to_string(),
        role: role_id.to_string(),
        permissions,
        invited_by: invited_by.to_string(),
        invited_at: now,
        expires_at,
        status: "pending".to_string(),
        token,
    })
}

/// Get role permissions
fn get_role_permissions(
    conn: &Connection,
    role_id: &str,
) -> Result<Vec<String>, CollaborationError> {
    let mut stmt = conn.prepare("SELECT permission FROM role_permissions WHERE role_id = ?1")?;

    let permissions = stmt
        .query_map([role_id], |row| row.get(0))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(permissions)
}

/// Update user role
pub fn update_user_role(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
    new_role_id: &str,
    updated_by: &str,
) -> Result<(), CollaborationError> {
    // Verify role exists
    let role_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM roles WHERE id = ?1)",
            [new_role_id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !role_exists {
        return Err(CollaborationError::InvalidRole);
    }

    conn.execute(
        "UPDATE space_user_roles
         SET role_id = ?1, assigned_by = ?2, assigned_at = strftime('%s', 'now')
         WHERE space_id = ?3 AND user_id = ?4",
        rusqlite::params![new_role_id, updated_by, space_id, user_id],
    )?;

    Ok(())
}

/// Grant custom permission to user
pub fn grant_permission(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
    permission: &str,
) -> Result<(), CollaborationError> {
    conn.execute(
        "INSERT OR REPLACE INTO user_permissions (space_id, user_id, permission, granted)
         VALUES (?1, ?2, ?3, 1)",
        rusqlite::params![space_id, user_id, permission],
    )?;

    Ok(())
}

/// Revoke custom permission from user
pub fn revoke_permission(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
    permission: &str,
) -> Result<(), CollaborationError> {
    conn.execute(
        "INSERT OR REPLACE INTO user_permissions (space_id, user_id, permission, granted)
         VALUES (?1, ?2, ?3, 0)",
        rusqlite::params![space_id, user_id, permission],
    )?;

    Ok(())
}

/// Suspend user
pub fn suspend_user(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
) -> Result<(), CollaborationError> {
    conn.execute(
        "UPDATE space_users SET status = 'suspended' WHERE space_id = ?1 AND user_id = ?2",
        rusqlite::params![space_id, user_id],
    )?;

    Ok(())
}

/// Activate user
pub fn activate_user(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
) -> Result<(), CollaborationError> {
    conn.execute(
        "UPDATE space_users SET status = 'active' WHERE space_id = ?1 AND user_id = ?2",
        rusqlite::params![space_id, user_id],
    )?;

    Ok(())
}

/// Get all roles
pub fn get_roles(conn: &Connection) -> Result<Vec<Role>, CollaborationError> {
    let mut stmt = conn.prepare("SELECT id, name, description, is_system FROM roles")?;

    let roles = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let description: String = row.get(2)?;
            let is_system: i32 = row.get(3)?;

            Ok((id, name, description, is_system == 1))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut result = Vec::new();
    for (id, name, description, is_system) in roles {
        let permissions = get_role_permissions(conn, &id)?;
        result.push(Role {
            id,
            name,
            description,
            permissions,
            is_system,
        });
    }

    Ok(result)
}

/// Add user to space (when accepting invitation)
pub fn add_user_to_space(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
    email: &str,
    role_id: &str,
) -> Result<(), CollaborationError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Add to space_users
    conn.execute(
        "INSERT OR REPLACE INTO space_users (space_id, user_id, email, status, joined_at)
         VALUES (?1, ?2, ?3, 'active', ?4)",
        rusqlite::params![space_id, user_id, email, now],
    )?;

    // Assign role
    conn.execute(
        "INSERT OR REPLACE INTO space_user_roles (space_id, user_id, role_id, assigned_at)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![space_id, user_id, role_id, now],
    )?;

    Ok(())
}

/// Remove user from space
pub fn remove_user_from_space(
    conn: &Connection,
    space_id: &str,
    user_id: &str,
) -> Result<(), CollaborationError> {
    conn.execute(
        "DELETE FROM space_users WHERE space_id = ?1 AND user_id = ?2",
        rusqlite::params![space_id, user_id],
    )?;

    conn.execute(
        "DELETE FROM space_user_roles WHERE space_id = ?1 AND user_id = ?2",
        rusqlite::params![space_id, user_id],
    )?;

    conn.execute(
        "DELETE FROM user_permissions WHERE space_id = ?1 AND user_id = ?2",
        rusqlite::params![space_id, user_id],
    )?;

    Ok(())
}

