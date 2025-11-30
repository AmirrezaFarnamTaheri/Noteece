use crate::state::DbConnection;
use core_rs::auth::{AuthService, Session, User};
use tauri::State;

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
    crate::with_db!(db, conn, {
        AuthService::authenticate(&conn, &username, &password).map_err(|e| e.to_string())
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
