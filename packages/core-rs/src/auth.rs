/// Authentication Module
/// Handles user authentication, password hashing, and session management
use argon2::{password_hash::SaltString, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use rand_core::OsRng;
use rusqlite::Connection;
use std::sync::Arc;
use std::sync::Mutex;
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

/// Authentication Service
pub struct AuthService {
    conn: Arc<Mutex<Connection>>,
}

impl AuthService {
    /// Create a new AuthService with a database connection
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        AuthService { conn }
    }

    /// Create a new user with username, email, and password
    pub fn create_user(
        &self,
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

        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

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
    pub fn authenticate(&self, username: &str, password: &str) -> Result<Session, AuthError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

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
    pub fn validate_session(&self, token: &str) -> Result<String, AuthError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

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
    pub fn logout(&self, token: &str) -> Result<(), AuthError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

        conn.execute(
            "DELETE FROM sessions WHERE token = ?1",
            rusqlite::params![token],
        )?;
        Ok(())
    }

    /// Get a user by ID
    pub fn get_user(&self, user_id: &str) -> Result<User, AuthError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

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
    pub fn get_all_users(&self) -> Result<Vec<User>, AuthError> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

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
        &self,
        user_id: &str,
        old_password: &str,
        new_password: &str,
    ) -> Result<(), AuthError> {
        if new_password.len() < 8 {
            return Err(AuthError::WeakPassword);
        }

        let conn = self
            .conn
            .lock()
            .map_err(|e| AuthError::DatabaseError(format!("Failed to lock database: {}", e)))?;

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
    use tempfile::tempdir;

    fn setup_auth_db() -> (Arc<Mutex<Connection>>, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let conn = Connection::open(&db_path).unwrap();

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
    fn test_user_registration() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        let user = auth
            .create_user("testuser", "test@example.com", "password123")
            .unwrap();

        assert_eq!(user.username, "testuser");
        assert_eq!(user.email, "test@example.com");
    }

    #[test]
    fn test_weak_password_rejected() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        let result = auth.create_user("testuser", "test@example.com", "short");
        assert!(matches!(result, Err(AuthError::WeakPassword)));
    }

    #[test]
    fn test_duplicate_username_rejected() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        auth.create_user("testuser", "test1@example.com", "password123")
            .unwrap();

        let result = auth.create_user("testuser", "test2@example.com", "password123");
        assert!(matches!(result, Err(AuthError::UserAlreadyExists)));
    }

    #[test]
    fn test_authentication_success() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        auth.create_user("testuser", "test@example.com", "password123")
            .unwrap();

        let session = auth.authenticate("testuser", "password123").unwrap();
        assert_eq!(session.user_id.len(), 26); // ULID length
        assert!(!session.token.is_empty());
    }

    #[test]
    fn test_authentication_failure_invalid_password() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        auth.create_user("testuser", "test@example.com", "password123")
            .unwrap();

        let result = auth.authenticate("testuser", "wrongpassword");
        assert!(matches!(result, Err(AuthError::InvalidCredentials)));
    }

    #[test]
    fn test_authentication_failure_nonexistent_user() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        let result = auth.authenticate("nonexistent", "password123");
        assert!(matches!(result, Err(AuthError::InvalidCredentials)));
    }

    #[test]
    fn test_session_validation() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        auth.create_user("testuser", "test@example.com", "password123")
            .unwrap();

        let session = auth.authenticate("testuser", "password123").unwrap();

        let user_id = auth.validate_session(&session.token).unwrap();
        assert_eq!(user_id, session.user_id);
    }

    #[test]
    fn test_session_expiration() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn.clone());

        auth.create_user("testuser", "test@example.com", "password123")
            .unwrap();

        let mut session = auth.authenticate("testuser", "password123").unwrap();

        // Set expiration to past
        let conn_lock = conn.lock().unwrap();
        conn_lock
            .execute(
                "UPDATE sessions SET expires_at = ?1 WHERE id = ?2",
                rusqlite::params![0, session.id],
            )
            .unwrap();
        drop(conn_lock);

        let result = auth.validate_session(&session.token);
        assert!(matches!(result, Err(AuthError::InvalidSession)));
    }

    #[test]
    fn test_logout() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        auth.create_user("testuser", "test@example.com", "password123")
            .unwrap();

        let session = auth.authenticate("testuser", "password123").unwrap();

        auth.logout(&session.token).unwrap();

        let result = auth.validate_session(&session.token);
        assert!(matches!(result, Err(AuthError::InvalidSession)));
    }

    #[test]
    fn test_get_user() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        let created_user = auth
            .create_user("testuser", "test@example.com", "password123")
            .unwrap();

        let retrieved_user = auth.get_user(&created_user.id).unwrap();
        assert_eq!(retrieved_user.username, "testuser");
        assert_eq!(retrieved_user.email, "test@example.com");
    }

    #[test]
    fn test_change_password() {
        let (conn, _dir) = setup_auth_db();
        let auth = AuthService::new(conn);

        let user = auth
            .create_user("testuser", "test@example.com", "oldpassword123")
            .unwrap();

        auth.change_password(&user.id, "oldpassword123", "newpassword123")
            .unwrap();

        // Old password should fail
        let result = auth.authenticate("testuser", "oldpassword123");
        assert!(matches!(result, Err(AuthError::InvalidCredentials)));

        // New password should work
        let session = auth.authenticate("testuser", "newpassword123").unwrap();
        assert!(!session.token.is_empty());
    }
}
