use crate::state::DbConnection;
use core_rs::collaboration::*;
use tauri::State;

#[tauri::command]
pub fn init_rbac_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::init_rbac_tables(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_space_users_cmd(
    db: State<DbConnection>,
    space_id: String,
) -> Result<Vec<SpaceUser>, String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::get_space_users(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn check_permission_cmd(
    db: State<DbConnection>,
    user_id: String,
    space_id: String,
    permission: String,
) -> Result<bool, String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::check_permission(&conn, &user_id, &space_id, &permission)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn invite_user_cmd(
    db: State<DbConnection>,
    space_id: String,
    email: String,
    role: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::invite_user(&conn, &space_id, &email, &role, "admin")
            .map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn update_user_role_cmd(
    db: State<DbConnection>,
    space_id: String,
    user_id: String,
    new_role: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::update_user_role(&conn, &space_id, &user_id, &new_role, "system")
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn grant_permission_cmd(
    db: State<DbConnection>,
    role: String,
    permission: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::grant_permission(&conn, "default", &role, &permission)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn revoke_permission_cmd(
    db: State<DbConnection>,
    role: String,
    permission: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::revoke_permission(&conn, "default", &role, &permission)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn suspend_user_cmd(db: State<DbConnection>, user_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::suspend_user(&conn, "default", &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn activate_user_cmd(db: State<DbConnection>, user_id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::activate_user(&conn, "default", &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_roles_cmd(db: State<DbConnection>) -> Result<Vec<Role>, String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::get_roles(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn add_user_to_space_cmd(
    db: State<DbConnection>,
    user_id: String,
    space_id: String,
    role: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::add_user_to_space(
            &conn,
            &space_id,
            &user_id,
            "unknown@example.com",
            &role,
        )
        .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn remove_user_from_space_cmd(
    db: State<DbConnection>,
    user_id: String,
    space_id: String,
) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::collaboration::remove_user_from_space(&conn, &space_id, &user_id)
            .map_err(|e| e.to_string())
    })
}
