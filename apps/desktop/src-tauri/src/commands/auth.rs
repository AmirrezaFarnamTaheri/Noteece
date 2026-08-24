use crate::state::DbConnection;
use core_rs::auth::{AuthService, Session, User};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::State;

// Rate limiter with escalating lockout
lazy_static::lazy_static! {
    static ref LOGIN_ATTEMPTS: Mutex<HashMap<String, (u32, Instant, u32)>> = Mutex::new(HashMap::new());
    // (count, first_attempt_in_window, total_lockout_count)
}

const MAX_ATTEMPTS: u32 = 5;
const BASE_LOCKOUT: Duration = Duration::from_secs(300); // 5 minutes

/// Returns the lockout duration, escalating with repeated lockouts:
/// 5min → 15min → 1hr → 24hr
fn escalating_lockout(lockout_count: u32) -> Duration {
    match lockout_count {
        0 => BASE_LOCKOUT,
        1 => Duration::from_secs(900),   // 15 minutes
        2 => Duration::from_secs(3600),  // 1 hour
        _ => Duration::from_secs(86400), // 24 hours
    }
}

pub fn check_rate_limit(username: &str) -> Result<(), String> {
    let attempts = LOGIN_ATTEMPTS.lock().map_err(|e| e.to_string())?;
    if let Some((count, first_attempt, lockout_count)) = attempts.get(username) {
        let lockout_dur = escalating_lockout(*lockout_count);
        if *count >= MAX_ATTEMPTS && first_attempt.elapsed() < lockout_dur {
            return Err(format!(
                "Too many login attempts. Try again in {} seconds.",
                (lockout_dur - first_attempt.elapsed()).as_secs()
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
pub fn reset_rate_limit(username: &str) {
    let mut attempts = LOGIN_ATTEMPTS.lock().unwrap();
    attempts.remove(username);
}

/// Persist rate limit state to the encrypted database.
/// Call this periodically or before app exit to survive restarts.
#[allow(dead_code)] // wired when relay config persistence lands
pub fn persist_rate_limits(db: &rusqlite::Connection) -> Result<(), String> {
    let attempts = LOGIN_ATTEMPTS.lock().map_err(|e| e.to_string())?;
    for (username, (count, first_attempt, lockout_count)) in attempts.iter() {
        db.execute(
            "INSERT OR REPLACE INTO rate_limits (username, attempt_count, first_attempt_epoch, lockout_count)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                username,
                count,
                first_attempt.elapsed().as_secs() as i64,
                lockout_count
            ],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Load persisted rate limit state from the database on startup.
#[allow(dead_code)] // wired when relay config persistence lands
pub fn load_rate_limits(db: &rusqlite::Connection) -> Result<(), String> {
    let mut stmt = db
        .prepare("SELECT username, attempt_count, first_attempt_epoch, lockout_count FROM rate_limits")
        .map_err(|e| e.to_string())?;
    let mut attempts = LOGIN_ATTEMPTS.lock().map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, u32>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, u32>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    for row in rows.flatten() {
        let (username, count, _epoch, lockout_count) = row;
        attempts.insert(
            username,
            (count, Instant::now(), lockout_count),
        );
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

        // Track failed attempts with escalating lockout
        if result.is_err() {
            let mut attempts = LOGIN_ATTEMPTS.lock().map_err(|e| e.to_string())?;
            let entry = attempts
                .entry(username.clone())
                .or_insert((0, Instant::now(), 0u32));
            entry.0 += 1;
            // If we just hit the limit, bump the lockout counter and reset the window
            if entry.0 >= MAX_ATTEMPTS {
                entry.2 += 1; // increment lockout escalation level
                entry.0 = 0;  // reset attempt count for next window
                entry.1 = Instant::now(); // reset window start
            }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiter_allows_valid_attempts() {
        let username = "test_allow_user";
        reset_rate_limit(username);
        for i in 0..5 {
            let result = check_rate_limit(username);
            assert!(result.is_ok(), "Attempt {} should be allowed", i + 1);
        }
        reset_rate_limit(username);
    }

    #[test]
    fn test_rate_limiter_blocks_after_max_attempts() {
        let username = "test_block_user";
        reset_rate_limit(username);
        for _ in 0..5 {
            assert!(check_rate_limit(username).is_ok());
        }
        let result = check_rate_limit(username);
        assert!(result.is_err(), "Should be blocked after max attempts");
        assert!(
            result.unwrap_err().contains("Too many login attempts"),
            "Error message should indicate rate limiting"
        );
        reset_rate_limit(username);
    }

    #[test]
    fn test_rate_limiter_independent_per_user() {
        let user_a = "test_indep_a";
        let user_b = "test_indep_b";
        reset_rate_limit(user_a);
        reset_rate_limit(user_b);

        for _ in 0..5 {
            assert!(check_rate_limit(user_a).is_ok());
        }
        assert!(check_rate_limit(user_a).is_err());
        assert!(check_rate_limit(user_b).is_ok());

        reset_rate_limit(user_a);
        reset_rate_limit(user_b);
    }

    #[test]
    fn test_rate_limiter_blocks_with_correct_message() {
        let username = "test_msg_user";
        reset_rate_limit(username);
        for _ in 0..5 {
            check_rate_limit(username).ok();
        }
        let result = check_rate_limit(username);
        assert!(result.is_err());
        let err_msg = result.unwrap_err();
        assert!(err_msg.contains("Too many login attempts"));
        assert!(err_msg.contains("seconds"));
        reset_rate_limit(username);
    }
}
