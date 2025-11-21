/// Authentication Module
/// Handles user authentication, password hashing, and session management
use argon2::{password_hash::SaltString, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use rand_core::OsRng;
use rusqlite::Connection;
use thiserror::Error;
use ulid::Ulid;

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Invalid username or password")]
    InvalidCredentials,

    #[error("User already exists")]
    UserAlreadyExists,

    #[error("User not found")]
    UserNotFound,

    #[error("Invalid session token")]
    InvalidSession,

    #[error("Session expired")]
    SessionExpired,

    #[error("Password hashing error: {0}")]
    PasswordHashError(String),

    #[error("Invalid user ID")]
    InvalidUserId,

    #[error("Email already in use")]
    EmailInUse,

    #[error("Weak password")]
    WeakPassword,

    #[error("Session already exists")]
    SessionAlreadyExists,
}

impl From<rusqlite::Error> for AuthError {
    fn from(err: rusqlite::Error) -> Self {
        AuthError::DatabaseError(err.to_string())
    }
}

/// Represents a user in the system
#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub created_at: i64,
    pub updated_at: Option<i64>,
    pub last_login_at: Option<i64>,
}

/// Represents an active session
#[derive(Debug, Clone)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub token: String,
    pub expires_at: i64,
    pub created_at: i64,
}

/// Authentication Service (Stateless functions)
pub struct AuthService;

impl AuthService {
    /// Create a new user with username, email, and password
    pub fn create_user(
        conn: &Connection,
        username: &str,
        email: &str,
        password: &str,
    ) -> Result<User, AuthError> {
        // Validate password strength (minimum 8 characters)
        if password.len() < 8 {
            return Err(AuthError::WeakPassword);
        }

        // Hash password with Argon2id
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AuthError::PasswordHashError(e.to_string()))?
            .to_string();

        let user_id = Ulid::new().to_string();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO users (id, username, email, password_hash, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![user_id, username, email, password_hash, now],
        )
        .map_err(|e| {
            if e.to_string().contains("UNIQUE constraint failed") {
                if e.to_string().contains("username") {
                    AuthError::UserAlreadyExists
                } else {
                    AuthError::EmailInUse
                }
            } else {
                AuthError::DatabaseError(e.to_string())
            }
        })?;

        Ok(User {
            id: user_id,
            username: username.to_string(),
            email: email.to_string(),
            created_at: now,
            updated_at: None,
            last_login_at: None,
        })
    }

    /// Authenticate a user and create a session
    pub fn authenticate(conn: &Connection, username: &str, password: &str) -> Result<Session, AuthError> {
        let mut stmt = conn
            .prepare("SELECT id, password_hash FROM users WHERE username = ?1")
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        let (user_id, stored_hash) = stmt
            .query_row(rusqlite::params![username], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|_| AuthError::InvalidCredentials)?;

        // Verify password
        let parsed_hash =
            PasswordHash::new(&stored_hash).map_err(|_| AuthError::InvalidCredentials)?;
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;

        // Create session
        let session_id = Ulid::new().to_string();
        let session_token = generate_session_token();
        let now = chrono::Utc::now().timestamp();
        let expires_at = now + (24 * 60 * 60); // 24 hours

        conn.execute(
            "INSERT INTO sessions (id, user_id, token, expires_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![session_id, user_id, session_token, expires_at, now],
        )?;

        // Update last_login_at
        conn.execute(
            "UPDATE users SET last_login_at = ?1 WHERE id = ?2",
            rusqlite::params![now, user_id],
        )?;

        Ok(Session {
            id: session_id,
            user_id,
            token: session_token,
            expires_at,
            created_at: now,
        })
    }

    /// Validate a session token and return the user ID
    pub fn validate_session(conn: &Connection, token: &str) -> Result<String, AuthError> {
        let mut stmt = conn
            .prepare(
                "SELECT user_id, expires_at FROM sessions
                 WHERE token = ?1",
            )
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        let now = chrono::Utc::now().timestamp();
        let user_id = stmt
            .query_row(rusqlite::params![token], |row| {
                let user_id: String = row.get(0)?;
                let expires_at: i64 = row.get(1)?;

                if expires_at < now {
                    Err(rusqlite::Error::QueryReturnedNoRows)
                } else {
                    Ok(user_id)
                }
            })
            .map_err(|_| AuthError::InvalidSession)?;

        Ok(user_id)
    }

    /// Logout by deleting the session
    pub fn logout(conn: &Connection, token: &str) -> Result<(), AuthError> {
        conn.execute(
            "DELETE FROM sessions WHERE token = ?1",
            rusqlite::params![token],
        )?;
        Ok(())
    }

    /// Get a user by ID
    pub fn get_user(conn: &Connection, user_id: &str) -> Result<User, AuthError> {
        let mut stmt = conn
            .prepare(
                "SELECT id, username, email, created_at, updated_at, last_login_at
                 FROM users WHERE id = ?1",
            )
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        stmt.query_row(rusqlite::params![user_id], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                last_login_at: row.get(5)?,
            })
        })
        .map_err(|_| AuthError::UserNotFound)
    }

    /// Get all users (admin function)
    pub fn get_all_users(conn: &Connection) -> Result<Vec<User>, AuthError> {
        let mut stmt = conn
            .prepare(
                "SELECT id, username, email, created_at, updated_at, last_login_at
                 FROM users ORDER BY created_at DESC",
            )
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        let users = stmt
            .query_map([], |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    email: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    last_login_at: row.get(5)?,
                })
            })
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AuthError::DatabaseError(e.to_string()))?;

        Ok(users)
    }

    /// Change user password
    pub fn change_password(
        conn: &Connection,
        user_id: &str,
        old_password: &str,
        new_password: &str,
    ) -> Result<(), AuthError> {
        if new_password.len() < 8 {
            return Err(AuthError::WeakPassword);
        }

        // Get user's current password hash
        let stored_hash: String = conn
            .query_row(
                "SELECT password_hash FROM users WHERE id = ?1",
                rusqlite::params![user_id],
                |row| row.get(0),
            )
            .map_err(|_| AuthError::UserNotFound)?;

        // Verify old password
        let parsed_hash =
            PasswordHash::new(&stored_hash).map_err(|_| AuthError::InvalidCredentials)?;
        Argon2::default()
            .verify_password(old_password.as_bytes(), &parsed_hash)
            .map_err(|_| AuthError::InvalidCredentials)?;

        // Hash new password
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let new_password_hash = argon2
            .hash_password(new_password.as_bytes(), &salt)
            .map_err(|e| AuthError::PasswordHashError(e.to_string()))?
            .to_string();

        // Update password
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![new_password_hash, now, user_id],
        )?;

        Ok(())
    }
}

/// Generate a cryptographically secure session token
fn generate_session_token() -> String {
    use base64::Engine;
    let mut token_bytes = [0u8; 32];
    use rand::Rng;
    rand::thread_rng().fill(&mut token_bytes);
    base64::engine::general_purpose::STANDARD.encode(&token_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use tempfile::tempdir;

    fn setup_auth_db() -> (Arc<Mutex<Connection>>, tempfile::TempDir) {
        let dir = tempdir().expect("Failed to create temp dir");
        let db_path = dir.path().join("test.db");
        let conn = Connection::open(&db_path).expect("Failed to open DB");

        // Create auth tables
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
        .expect("Failed to create users table");

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
        .expect("Failed to create sessions table");

        (Arc::new(Mutex::new(conn)), dir)
    }

    #[test]
    fn test_user_registration() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        let user = AuthService::create_user(&conn, "testuser", "test@example.com", "password123")
            .expect("Failed to create user");

        assert_eq!(user.username, "testuser");
        assert_eq!(user.email, "test@example.com");
    }

    #[test]
    fn test_weak_password_rejected() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        let result = AuthService::create_user(&conn, "testuser", "test@example.com", "short");
        assert!(matches!(result, Err(AuthError::WeakPassword)));
    }

    #[test]
    fn test_duplicate_username_rejected() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        AuthService::create_user(&conn, "testuser", "test1@example.com", "password123")
            .expect("Failed to create user");

        let result = AuthService::create_user(&conn, "testuser", "test2@example.com", "password123");
        assert!(matches!(result, Err(AuthError::UserAlreadyExists)));
    }

    #[test]
    fn test_authentication_success() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        AuthService::create_user(&conn, "testuser", "test@example.com", "password123")
            .expect("Failed to create user");

        let session = AuthService::authenticate(&conn, "testuser", "password123").expect("Failed to authenticate");
        assert_eq!(session.user_id.len(), 26); // ULID length
        assert!(!session.token.is_empty());
    }

    #[test]
    fn test_authentication_failure_invalid_password() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        AuthService::create_user(&conn, "testuser", "test@example.com", "password123")
            .expect("Failed to create user");

        let result = AuthService::authenticate(&conn, "testuser", "wrongpassword");
        assert!(matches!(result, Err(AuthError::InvalidCredentials)));
    }

    #[test]
    fn test_authentication_failure_nonexistent_user() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        let result = AuthService::authenticate(&conn, "nonexistent", "password123");
        assert!(matches!(result, Err(AuthError::InvalidCredentials)));
    }

    #[test]
    fn test_session_validation() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        AuthService::create_user(&conn, "testuser", "test@example.com", "password123")
            .expect("Failed to create user");

        let session = AuthService::authenticate(&conn, "testuser", "password123").expect("Failed to authenticate");

        let user_id = AuthService::validate_session(&conn, &session.token).expect("Failed to validate session");
        assert_eq!(user_id, session.user_id);
    }

    #[test]
    fn test_session_expiration() {
        let (conn, _dir) = setup_auth_db();
        // We need manual lock control here
        {
            let conn = conn.lock().expect("Failed to lock DB");
            AuthService::create_user(&conn, "testuser", "test@example.com", "password123").expect("Failed to create user");
        }

        let session = {
            let conn = conn.lock().expect("Failed to lock DB");
            AuthService::authenticate(&conn, "testuser", "password123").expect("Failed to authenticate")
        };

        // Set expiration to past
        {
            let conn = conn.lock().expect("Failed to lock DB");
            conn.execute(
                "UPDATE sessions SET expires_at = ?1 WHERE id = ?2",
                rusqlite::params![0, session.id],
            ).expect("Failed to update session");
        }

        let conn = conn.lock().expect("Failed to lock DB");
        let result = AuthService::validate_session(&conn, &session.token);
        assert!(matches!(result, Err(AuthError::InvalidSession)));
    }

    #[test]
    fn test_logout() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        AuthService::create_user(&conn, "testuser", "test@example.com", "password123")
            .expect("Failed to create user");

        let session = AuthService::authenticate(&conn, "testuser", "password123").expect("Failed to authenticate");

        AuthService::logout(&conn, &session.token).expect("Failed to logout");

        let result = AuthService::validate_session(&conn, &session.token);
        assert!(matches!(result, Err(AuthError::InvalidSession)));
    }

    #[test]
    fn test_get_user() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        let created_user = AuthService::create_user(&conn, "testuser", "test@example.com", "password123")
            .expect("Failed to create user");

        let retrieved_user = AuthService::get_user(&conn, &created_user.id).expect("Failed to get user");
        assert_eq!(retrieved_user.username, "testuser");
        assert_eq!(retrieved_user.email, "test@example.com");
    }

    #[test]
    fn test_change_password() {
        let (conn, _dir) = setup_auth_db();
        let conn = conn.lock().expect("Failed to lock DB");

        let user = AuthService::create_user(&conn, "testuser", "test@example.com", "oldpassword123")
            .expect("Failed to create user");

        AuthService::change_password(&conn, &user.id, "oldpassword123", "newpassword123")
            .expect("Failed to change password");

        // Old password should fail
        let result = AuthService::authenticate(&conn, "testuser", "oldpassword123");
        assert!(matches!(result, Err(AuthError::InvalidCredentials)));

        // New password should work
        let session = AuthService::authenticate(&conn, "testuser", "newpassword123").expect("Failed to authenticate");
        assert!(!session.token.is_empty());
    }
}
