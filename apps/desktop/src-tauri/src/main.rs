// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use core_rs::vault::{create_vault, unlock_vault};
use core_rs::project::{get_project, get_projects_in_space, get_project_milestones, get_project_risks, get_project_updates, create_project_risk, Project, ProjectMilestone, ProjectRisk, ProjectUpdate};
use core_rs::search::{create_saved_search, get_saved_search, get_saved_searches, update_saved_search, delete_saved_search, execute_saved_search, SavedSearch};
use core_rs::weekly_review::generate_weekly_review;
use core_rs::form::{create_form_template, get_form_template, get_form_templates_for_space, update_form_template, delete_form_template, FormTemplate, FormField};
use core_rs::analytics::{get_analytics_data, AnalyticsData};
use core_rs::note::{Note, create_note, get_note, get_all_notes_in_space, update_note_content, trash_note, get_or_create_daily_note, get_recent_notes};
use core_rs::search::search_notes;
use core_rs::mode::{get_space_modes, enable_mode, disable_mode, Mode};
use core_rs::task::{Task, create_task, get_task, get_tasks_by_project, get_all_tasks_in_space, update_task, delete_task, get_upcoming_tasks};
use core_rs::import::{import_from_obsidian, import_from_notion};
use core_rs::srs::{get_due_cards, review_card, KnowledgeCard};
use core_rs::space::{get_all_spaces, Space};
use core_rs::tag::{get_all_tags_in_space, Tag};
use core_rs::time_tracking::{TimeEntry, TimeStats, start_time_entry, stop_time_entry, get_task_time_entries, get_project_time_entries, get_running_entries, get_recent_time_entries, get_task_time_stats, get_project_time_stats, delete_time_entry, create_manual_time_entry};
use core_rs::ocr::{queue_ocr, get_ocr_status, search_ocr_text, process_ocr_job, OcrResult};
use core_rs::foresight::{generate_insights, get_active_insights, dismiss_insight, record_feedback, Insight, FeedbackType};
use core_rs::caldav::{add_caldav_account, get_caldav_accounts, get_caldav_account, update_caldav_account, delete_caldav_account, sync_caldav_account, get_sync_history, get_unresolved_conflicts, resolve_conflict, CalDavAccount, SyncResult, SyncConflict, SyncDirection, ConflictResolution};
use core_rs::personal_modes::{create_health_metric, get_health_metrics, create_health_goal, create_transaction, get_transactions, create_recipe, get_recipes, add_recipe_ingredient, create_trip, get_trips, add_itinerary_item, HealthMetric, HealthGoal, Transaction, Recipe, Trip};
use core_rs::temporal_graph::{build_current_graph, save_graph_snapshot, get_graph_evolution, create_milestone, detect_major_notes, GraphSnapshot, GraphEvolution, GraphMilestone};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;
use ulid::Ulid;
use zeroize::{Zeroize, Zeroizing};

/// Wrapper for Data Encryption Key that securely zeros memory on drop
/// SECURITY NOTE: The DEK remains in memory for the application lifetime to support
/// encryption/decryption operations. While this increases exposure risk compared to
/// ephemeral keys, it's a necessary trade-off for the local-first architecture.
/// The key is:
/// - Derived from user password via Argon2 (not stored directly)
/// - Only exists in process memory (never written to disk unencrypted)
/// - Automatically zeroed when the application exits via Zeroize
/// - Protected by OS process isolation
struct SecureDek(Zeroizing<Vec<u8>>);

impl SecureDek {
    fn new(key: Vec<u8>) -> Self {
        Self(Zeroizing::new(key))
    }

    fn as_slice(&self) -> &[u8] {
        self.0.as_slice()
    }
}

pub struct DbConnection {
    pub conn: Mutex<Option<Connection>>,
    pub dek: Mutex<Option<SecureDek>>, // Data Encryption Key from vault (auto-zeroed on drop)
}

#[tauri::command]
fn create_vault_cmd(path: &str, password: &str, db: State<DbConnection>) -> Result<(), String> {
    let vault = create_vault(path, password).map_err(|e| e.to_string())?;
    // Store DEK for encryption operations (wrapped in SecureDek for auto-zeroing)
    *db.dek.lock().unwrap() = Some(SecureDek::new(vault.dek.clone()));
    *db.conn.lock().unwrap() = Some(vault.conn);
    Ok(())
}

#[tauri::command]
fn unlock_vault_cmd(path: &str, password: &str, db: State<DbConnection>) -> Result<(), String> {
    let vault = unlock_vault(path, password).map_err(|e| e.to_string())?;
    // Store DEK for encryption operations (wrapped in SecureDek for auto-zeroing)
    *db.dek.lock().unwrap() = Some(SecureDek::new(vault.dek.clone()));
    *db.conn.lock().unwrap() = Some(vault.conn);
    Ok(())
}

#[tauri::command]
fn get_project_cmd(id: &str, db: State<DbConnection>) -> Result<Option<Project>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project(conn, id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_project_risk_cmd(project_id: &str, description: &str, likelihood: &str, impact: &str, db: State<DbConnection>) -> Result<ProjectRisk, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        create_project_risk(conn, project_id, description, impact, likelihood, "", None).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_all_projects_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<Project>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_projects_in_space(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_all_tasks_in_space_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_all_tasks_in_space(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_all_notes_in_space_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_all_notes_in_space(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_milestones_cmd(project_id: &str, db: State<DbConnection>) -> Result<Vec<ProjectMilestone>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project_milestones(conn, project_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_risks_cmd(project_id: &str, db: State<DbConnection>) -> Result<Vec<ProjectRisk>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project_risks(conn, project_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_updates_cmd(project_id: &str, db: State<DbConnection>) -> Result<Vec<ProjectUpdate>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project_updates(conn, project_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_saved_search_cmd(space_id: &str, title: &str, query_string: &str, scope: &str, db: State<DbConnection>) -> Result<SavedSearch, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        create_saved_search(conn, space_id, title, query_string, scope).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_saved_search_cmd(id: &str, db: State<DbConnection>) -> Result<Option<SavedSearch>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_saved_search(conn, id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_saved_searches_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<SavedSearch>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_saved_searches(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_saved_search_cmd(id: &str, title: &str, query_string: &str, scope: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        update_saved_search(conn, id, title, query_string, scope).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_saved_search_cmd(id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        delete_saved_search(conn, id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn execute_saved_search_cmd(saved_search: SavedSearch, db: State<DbConnection>) -> Result<Vec<String>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        execute_saved_search(conn, &saved_search).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn generate_weekly_review_cmd(space_id: &str, db: State<DbConnection>) -> Result<Note, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        generate_weekly_review(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_space_modes_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<Mode>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_space_modes(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn enable_mode_cmd(space_id: &str, mode: Mode, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        enable_mode(conn, space_ulid, &mode).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn disable_mode_cmd(space_id: &str, mode: Mode, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        disable_mode(conn, space_ulid, &mode).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_note_cmd(space_id: &str, title: &str, content: &str, db: State<DbConnection>) -> Result<Note, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_note(conn, space_ulid, title, content).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_note_cmd(id: &str, db: State<DbConnection>) -> Result<Option<Note>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let note_ulid = Ulid::from_string(id).map_err(|e| e.to_string())?;
        get_note(conn, note_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_note_content_cmd(id: &str, title: &str, content: &str, db: State<DbConnection>) -> Result<(), String> {
    let mut conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_mut() {
        let note_ulid = Ulid::from_string(id).map_err(|e| e.to_string())?;
        update_note_content(conn, note_ulid, title, content).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn trash_note_cmd(id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let note_ulid = Ulid::from_string(id).map_err(|e| e.to_string())?;
        trash_note(conn, note_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_task_cmd(space_id: &str, title: &str, description: Option<String>, db: State<DbConnection>) -> Result<Task, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_task(conn, space_ulid, title, description).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_task_cmd(id: &str, db: State<DbConnection>) -> Result<Option<Task>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let task_ulid = Ulid::from_string(id).map_err(|e| e.to_string())?;
        get_task(conn, task_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_task_cmd(task: Task, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        update_task(conn, &task).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_task_cmd(id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let task_ulid = Ulid::from_string(id).map_err(|e| e.to_string())?;
        delete_task(conn, task_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_tasks_by_project_cmd(project_id: &str, db: State<DbConnection>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let project_ulid = Ulid::from_string(project_id).map_err(|e| e.to_string())?;
        get_tasks_by_project(conn, project_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn import_from_obsidian_cmd(space_id: &str, path: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        import_from_obsidian(conn, space_ulid, path).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn import_from_notion_cmd(space_id: &str, path: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        import_from_notion(conn, space_ulid, path).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_due_cards_cmd(db: State<DbConnection>) -> Result<Vec<KnowledgeCard>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_due_cards(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn review_card_cmd(card_id: &str, quality: u32, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let card_ulid = Ulid::from_string(card_id).map_err(|e| e.to_string())?;
        review_card(conn, card_ulid, quality as i64).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_form_template_cmd(space_id: &str, name: &str, fields: Vec<FormField>, db: State<DbConnection>) -> Result<FormTemplate, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        create_form_template(conn, space_id, name, fields).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_form_template_cmd(id: &str, db: State<DbConnection>) -> Result<FormTemplate, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_form_template(conn, id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_form_templates_for_space_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<FormTemplate>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_form_templates_for_space(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_form_template_cmd(id: &str, name: &str, fields: Vec<FormField>, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        update_form_template(conn, id, name, fields).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_form_template_cmd(id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        delete_form_template(conn, id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn search_notes_cmd(query: &str, scope: &str, db: State<DbConnection>) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        search_notes(conn, query, scope).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_or_create_daily_note_cmd(space_id: &str, db: State<DbConnection>) -> Result<Note, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_or_create_daily_note(conn, core_rs::note::DbUlid(space_ulid)).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_analytics_data_cmd(db: State<DbConnection>) -> Result<AnalyticsData, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_analytics_data(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn start_time_entry_cmd(
    space_id: &str,
    task_id: Option<String>,
    project_id: Option<String>,
    note_id: Option<String>,
    description: Option<String>,
    db: State<DbConnection>,
) -> Result<TimeEntry, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        let task_ulid = task_id.map(|id| Ulid::from_string(&id)).transpose().map_err(|e| e.to_string())?;
        let project_ulid = project_id.map(|id| Ulid::from_string(&id)).transpose().map_err(|e| e.to_string())?;
        let note_ulid = note_id.map(|id| Ulid::from_string(&id)).transpose().map_err(|e| e.to_string())?;

        start_time_entry(conn, space_ulid, task_ulid, project_ulid, note_ulid, description)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn stop_time_entry_cmd(entry_id: &str, db: State<DbConnection>) -> Result<TimeEntry, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(entry_id).map_err(|e| e.to_string())?;
        stop_time_entry(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_task_time_entries_cmd(task_id: &str, db: State<DbConnection>) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(task_id).map_err(|e| e.to_string())?;
        get_task_time_entries(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_time_entries_cmd(project_id: &str, db: State<DbConnection>) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(project_id).map_err(|e| e.to_string())?;
        get_project_time_entries(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_running_entries_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_running_entries(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_recent_time_entries_cmd(space_id: &str, limit: i64, db: State<DbConnection>) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_recent_time_entries(conn, ulid, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_task_time_stats_cmd(task_id: &str, db: State<DbConnection>) -> Result<TimeStats, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(task_id).map_err(|e| e.to_string())?;
        get_task_time_stats(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_time_stats_cmd(project_id: &str, db: State<DbConnection>) -> Result<TimeStats, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(project_id).map_err(|e| e.to_string())?;
        get_project_time_stats(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_time_entry_cmd(entry_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(entry_id).map_err(|e| e.to_string())?;
        delete_time_entry(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_manual_time_entry_cmd(
    space_id: &str,
    task_id: Option<String>,
    project_id: Option<String>,
    note_id: Option<String>,
    description: Option<String>,
    started_at: i64,
    duration_seconds: i64,
    db: State<DbConnection>,
) -> Result<TimeEntry, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        let task_ulid = task_id.map(|id| Ulid::from_string(&id)).transpose().map_err(|e| e.to_string())?;
        let project_ulid = project_id.map(|id| Ulid::from_string(&id)).transpose().map_err(|e| e.to_string())?;
        let note_ulid = note_id.map(|id| Ulid::from_string(&id)).transpose().map_err(|e| e.to_string())?;

        create_manual_time_entry(
            conn,
            space_ulid,
            task_ulid,
            project_ulid,
            note_ulid,
            description,
            started_at,
            duration_seconds,
        ).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// OCR Commands
#[tauri::command]
fn queue_ocr_cmd(blob_id: &str, db: State<DbConnection>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        queue_ocr(conn, blob_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_ocr_status_cmd(blob_id: &str, db: State<DbConnection>) -> Result<Option<OcrResult>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_ocr_status(conn, blob_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn search_ocr_text_cmd(query: &str, limit: u32, db: State<DbConnection>) -> Result<Vec<OcrResult>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        search_ocr_text(conn, query, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn process_ocr_cmd(blob_id: &str, image_path: &str, language: Option<String>, db: State<DbConnection>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let path = std::path::Path::new(image_path);
        process_ocr_job(conn, blob_id, path, language.as_deref()).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Foresight / Insights Commands
#[tauri::command]
fn generate_insights_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<Insight>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        generate_insights(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_active_insights_cmd(limit: u32, db: State<DbConnection>) -> Result<Vec<Insight>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_active_insights(conn, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn dismiss_insight_cmd(insight_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        dismiss_insight(conn, insight_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn record_insight_feedback_cmd(
    insight_id: &str,
    action_taken: bool,
    action_type: Option<String>,
    feedback_type: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let feedback = match feedback_type.as_str() {
            "accepted" => FeedbackType::Accepted,
            "dismissed" => FeedbackType::Dismissed,
            "snoozed" => FeedbackType::Snoozed,
            "not_helpful" => FeedbackType::NotHelpful,
            _ => FeedbackType::Dismissed,
        };
        record_feedback(conn, insight_id, action_taken, action_type.as_deref(), feedback)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// CalDAV Commands
#[tauri::command]
fn add_caldav_account_cmd(url: &str, username: &str, password: &str, calendar_path: &str, db: State<DbConnection>) -> Result<CalDavAccount, String> {
    let conn = db.conn.lock().unwrap();
    let dek_lock = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek_lock.as_ref()) {
        add_caldav_account(conn, url, username, password, calendar_path, dek.as_slice()).map_err(|e| e.to_string())
    } else {
        Err("Database connection or vault not available".to_string())
    }
}

#[tauri::command]
fn get_caldav_accounts_cmd(db: State<DbConnection>) -> Result<Vec<CalDavAccount>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_caldav_accounts(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn sync_caldav_account_cmd(account_id: &str, db: State<DbConnection>) -> Result<SyncResult, String> {
    let conn = db.conn.lock().unwrap();
    let dek_lock = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek_lock.as_ref()) {
        sync_caldav_account(conn, account_id, dek.as_slice()).map_err(|e| e.to_string())
    } else {
        Err("Database connection or vault not available".to_string())
    }
}

// Personal Modes - Health Commands
#[tauri::command]
fn create_health_metric_cmd(space_id: &str, metric_type: &str, value: f64, unit: &str, recorded_at: i64, db: State<DbConnection>) -> Result<HealthMetric, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_health_metric(conn, space_ulid, metric_type, value, unit, recorded_at, None, None).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_health_metrics_cmd(space_id: &str, metric_type: Option<String>, limit: u32, db: State<DbConnection>) -> Result<Vec<HealthMetric>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_health_metrics(conn, space_ulid, metric_type.as_deref(), limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Personal Modes - Finance Commands
#[tauri::command]
fn create_transaction_cmd(space_id: &str, transaction_type: &str, amount: f64, currency: &str, category: &str, account: &str, date: i64, db: State<DbConnection>) -> Result<Transaction, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_transaction(conn, space_ulid, transaction_type, amount, currency, category, account, date, None).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_transactions_cmd(space_id: &str, limit: u32, db: State<DbConnection>) -> Result<Vec<Transaction>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_transactions(conn, space_ulid, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Personal Modes - Recipe Commands
#[tauri::command]
fn create_recipe_cmd(space_id: &str, note_id: &str, name: &str, servings: i32, difficulty: &str, db: State<DbConnection>) -> Result<Recipe, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_recipe(conn, space_ulid, note_id, name, servings, difficulty).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_recipes_cmd(space_id: &str, limit: u32, db: State<DbConnection>) -> Result<Vec<Recipe>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_recipes(conn, space_ulid, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Personal Modes - Travel Commands
#[tauri::command]
fn create_trip_cmd(space_id: &str, note_id: &str, name: &str, destination: &str, start_date: i64, end_date: i64, db: State<DbConnection>) -> Result<Trip, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_trip(conn, space_ulid, note_id, name, destination, start_date, end_date).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_trips_cmd(space_id: &str, limit: u32, db: State<DbConnection>) -> Result<Vec<Trip>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_trips(conn, space_ulid, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Temporal Graph Commands
#[tauri::command]
fn build_current_graph_cmd(space_id: &str, db: State<DbConnection>) -> Result<GraphSnapshot, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        build_current_graph(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_graph_evolution_cmd(space_id: &str, start_time: i64, end_time: i64, snapshot_limit: u32, db: State<DbConnection>) -> Result<GraphEvolution, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_graph_evolution(conn, space_ulid, start_time, end_time, snapshot_limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn detect_major_notes_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<GraphMilestone>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        detect_major_notes(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Explicit shutdown handler to clear the Data Encryption Key from memory
#[tauri::command]
fn shutdown_clear_keys_cmd(db: State<DbConnection>) -> Result<(), String> {
    // Drop DEK to trigger Zeroize and clear memory
    let mut dek_guard = db.dek.lock().map_err(|_| "Mutex poisoned")?;
    *dek_guard = None;
    Ok(())
}

fn main() {
  tauri::Builder::default()
    .manage(DbConnection {
        conn: Mutex::new(None),
        dek: Mutex::new(None),
    })
    .on_window_event(|event| {
        if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
            // Best-effort cleanup: clear keys before window closes
            if let Some(app) = event.window().app_handle().try_state::<DbConnection>() {
                if let Ok(mut dek_guard) = app.dek.lock() {
                    *dek_guard = None; // Zeroize on drop
                }
            }
        }
    })
    .setup(|app| {
        // Register global exit handler to ensure DEK is reliably cleared
        let app_handle = app.handle();
        std::panic::set_hook(Box::new(move |_| {
            if let Some(db) = app_handle.try_state::<DbConnection>() {
                if let Ok(mut dek_guard) = db.dek.lock() {
                    *dek_guard = None; // Ensure DEK is cleared on app exit
                }
            }
        }));
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        create_vault_cmd,
        unlock_vault_cmd,
        get_project_cmd,
        get_all_projects_cmd,
        get_project_milestones_cmd,
        get_project_risks_cmd,
        get_project_updates_cmd,
        create_project_risk_cmd,
        create_saved_search_cmd,
        get_saved_search_cmd,
        get_saved_searches_cmd,
        update_saved_search_cmd,
        delete_saved_search_cmd,
        execute_saved_search_cmd,
        generate_weekly_review_cmd,
        get_space_modes_cmd,
        enable_mode_cmd,
        disable_mode_cmd,
        create_note_cmd,
        get_note_cmd,
        update_note_content_cmd,
        trash_note_cmd,
        create_task_cmd,
        get_task_cmd,
        update_task_cmd,
        delete_task_cmd,
        get_tasks_by_project_cmd,
        get_due_cards_cmd,
        review_card_cmd,
        get_all_notes_in_space_cmd,
        get_all_tasks_in_space_cmd,
        import_from_obsidian_cmd,
        import_from_notion_cmd,
        create_form_template_cmd,
        get_form_template_cmd,
        get_form_templates_for_space_cmd,
        update_form_template_cmd,
        delete_form_template_cmd,
        get_analytics_data_cmd,
        search_notes_cmd,
        get_or_create_daily_note_cmd,
        get_all_spaces_cmd,
        get_all_tags_in_space_cmd,
        get_upcoming_tasks_cmd,
        get_recent_notes_cmd,
        start_time_entry_cmd,
        stop_time_entry_cmd,
        get_task_time_entries_cmd,
        get_project_time_entries_cmd,
        get_running_entries_cmd,
        get_recent_time_entries_cmd,
        get_task_time_stats_cmd,
        get_project_time_stats_cmd,
        delete_time_entry_cmd,
        create_manual_time_entry_cmd,
        queue_ocr_cmd,
        get_ocr_status_cmd,
        search_ocr_text_cmd,
        process_ocr_cmd,
        generate_insights_cmd,
        get_active_insights_cmd,
        dismiss_insight_cmd,
        record_insight_feedback_cmd,
        add_caldav_account_cmd,
        get_caldav_accounts_cmd,
        sync_caldav_account_cmd,
        create_health_metric_cmd,
        get_health_metrics_cmd,
        create_transaction_cmd,
        get_transactions_cmd,
        create_recipe_cmd,
        get_recipes_cmd,
        create_trip_cmd,
        get_trips_cmd,
        build_current_graph_cmd,
        get_graph_evolution_cmd,
        detect_major_notes_cmd,
        shutdown_clear_keys_cmd
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_recent_notes_cmd(space_id: &str, limit: u32, db: State<DbConnection>) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_recent_notes(conn, space_id, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_upcoming_tasks_cmd(space_id: &str, limit: u32, db: State<DbConnection>) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_upcoming_tasks(conn, space_ulid, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_all_tags_in_space_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_all_tags_in_space(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_all_spaces_cmd(db: State<DbConnection>) -> Result<Vec<Space>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_all_spaces(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}
