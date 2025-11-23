use crate::state::DbConnection;
use core_rs::form::*;
use tauri::State;

#[tauri::command]
pub fn create_form_template_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    fields: String,
) -> Result<FormTemplate, String> {
    crate::with_db!(db, conn, {
        let form_fields: Vec<core_rs::form::FormField> = serde_json::from_str(&fields).map_err(|e| e.to_string())?;
        core_rs::form::create_form_template(&conn, &space_id, &name, form_fields).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_form_template_cmd(db: State<DbConnection>, id: String) -> Result<FormTemplate, String> {
    crate::with_db!(db, conn, {
        core_rs::form::get_form_template(&conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_form_templates_for_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<FormTemplate>, String> {
    crate::with_db!(db, conn, {
        core_rs::form::get_form_templates_for_space(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_form_template_cmd(
    db: State<DbConnection>,
    id: String,
    name: String,
    fields: String,
) -> Result<FormTemplate, String> {
    crate::with_db!(db, conn, {
        let form_fields: Vec<core_rs::form::FormField> = serde_json::from_str(&fields).map_err(|e| e.to_string())?;
        core_rs::form::update_form_template(&conn, &id, &name, form_fields.clone()).map_err(|e| e.to_string())?;
        core_rs::form::get_form_template(&conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_form_template_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    crate::with_db!(db, conn, {
        core_rs::form::delete_form_template(&conn, &id).map_err(|e| e.to_string())
    })
}
