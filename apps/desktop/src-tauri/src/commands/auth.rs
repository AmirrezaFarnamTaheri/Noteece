use crate::state::DbConnection;
use core_rs::auth::{AuthService, Session, User};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

// Simple rate limiter
lazy_static::lazy_static! {
    static ref LOGIN_ATTEMPTS: Mutex<HashMap<String, (u32, Instant)>> = Mutex::new(HashMap::new());
}

const MAX_ATTEMPTS: u32 = 5;
const LOCKOUT_DURATION: Duration = Duration::from_secs(300); // 5 minutes

fn check_rate_limit(username: &str) -> Result<(), String> {
    let mut attempts = LOGIN_ATTEMPTS.lock().map_err(|e| e.to_string())?;
    if let Some((count, first_attempt)) = attempts.get(username) {
        if *count >= MAX_ATTEMPTS && first_attempt.elapsed() < LOCKOUT_DURATION {
            return Err(format!(
                "Too many login attempts. Try again in {} seconds.",
                (LOCKOUT_DURATION - first_attempt.elapsed()).as_secs()
            ));
        }
    }
    Ok(())
}

#[tauri::command]
pub fn create_user_cmd(
    db: State<DbConnection>,
    username: String,
    email: String,
    password: String,
) -> Result<User, String> {
    crate::with_db!(db, conn, {
        AuthService::create_user(&conn, &username, &email, &password).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn authenticate_user_cmd(
    db: State<DbConnection>,
    username: String,
    password: String,
) -> Result<Session, String> {
    check_rate_limit(&username)?;

    crate::with_db!(db, conn, {
        let result = AuthService::authenticate(&conn, &username, &password);

        // Track failed attempts
        if result.is_err() {
            let mut attempts = LOGIN_ATTEMPTS.lock().map_err(|e| e.to_string())?;
            let entry = attempts
                .entry(username.clone())
                .or_insert((0, Instant::now()));
            entry.0 += 1;
        }

        result.map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn validate_session_cmd(db: State<DbConnection>, token: String) -> Result<String, String> {
    crate::with_db!(db, conn, {
        AuthService::validate_session(&conn, &token).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn logout_user_cmd(db: State<DbConnection>, token: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        AuthService::logout(&conn, &token).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_user_by_id_cmd(db: State<DbConnection>, user_id: String) -> Result<User, String> {
    crate::with_db!(db, conn, {
        AuthService::get_user(&conn, &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn change_password_cmd(
    db: State<DbConnection>,
    user_id: String,
    old_pass: String,
    new_pass: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        AuthService::change_password(&conn, &user_id, &old_pass, &new_pass)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_current_user_cmd(db: State<DbConnection>, token: String) -> Result<User, String> {
    crate::with_db!(db, conn, {
        let user_id = AuthService::validate_session(&conn, &token).map_err(|e| e.to_string())?;
        AuthService::get_user(&conn, &user_id).map_err(|e| e.to_string())
    })
}
