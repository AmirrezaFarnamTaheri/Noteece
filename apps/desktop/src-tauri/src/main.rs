// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use core_rs::analytics::{get_analytics_data, AnalyticsData};
use core_rs::caldav::{
    add_caldav_account, delete_caldav_account, get_caldav_account, get_caldav_accounts,
    get_sync_history as get_caldav_sync_history, get_unresolved_conflicts as get_caldav_conflicts,
    resolve_conflict as resolve_caldav_conflict, sync_caldav_account, update_caldav_account,
    CalDavAccount, ConflictResolution as CalDavConflictResolution,
    SyncConflict as CalDavSyncConflict, SyncDirection, SyncResult,
};
use core_rs::collaboration::{
    activate_user, add_user_to_space, check_permission, get_roles, get_space_users,
    grant_permission, init_rbac_tables, invite_user, remove_user_from_space, revoke_permission,
    suspend_user, update_user_role, CollaborationError, Role, SpaceUser, UserInvitation,
};
use core_rs::foresight::{
    dismiss_insight, generate_insights, get_active_insights, record_feedback, FeedbackType, Insight,
};
use core_rs::form::{
    create_form_template, delete_form_template, get_form_template, get_form_templates_for_space,
    update_form_template, FormField, FormTemplate,
};
use core_rs::import::{import_from_notion, import_from_obsidian};
use core_rs::mode::{disable_mode, enable_mode, get_space_modes, Mode};
use core_rs::note::{
    create_note, get_all_notes_in_space, get_note, get_or_create_daily_note, get_recent_notes,
    trash_note, update_note_content, Note,
};
use core_rs::ocr::{get_ocr_status, process_ocr_job, queue_ocr, search_ocr_text, OcrResult};
use core_rs::personal_modes::{
    add_itinerary_item, add_recipe_ingredient, create_health_goal, create_health_metric,
    create_recipe, create_transaction, create_trip, get_health_metrics, get_recipes,
    get_transactions, get_trips, HealthGoal, HealthMetric, Recipe, Transaction, Trip,
};
use core_rs::project::{
    create_project_risk, get_project, get_project_milestones, get_project_risks,
    get_project_updates, get_projects_in_space, Project, ProjectMilestone, ProjectRisk,
    ProjectUpdate,
};
use core_rs::search::search_notes;
use core_rs::search::{
    create_saved_search, delete_saved_search, execute_saved_search, get_saved_search,
    get_saved_searches, update_saved_search, SavedSearch,
};
use core_rs::social::{
    add_social_account, assign_category, auto_categorize_posts, complete_sync, create_category,
    create_webview_session, delete_social_account, fail_sync,
    get_accounts_needing_sync as get_social_accounts_needing_sync, get_all_sync_tasks,
    get_categories, get_platform_display_name, get_platform_url, get_social_account,
    get_social_accounts, get_sync_history, get_sync_stats, get_timeline_stats,
    get_unified_timeline, get_webview_session, save_session_cookies, start_sync,
    store_social_posts, update_social_account, CategoryFilters, SocialAccount, SocialCategory,
    SocialPost, SyncStats, SyncStatus, SyncTask, TimelineFilters, TimelinePost, TimelineStats,
    WebViewSession,
};
use core_rs::space::{get_all_spaces, Space};
use core_rs::srs::{get_due_cards, review_card, KnowledgeCard};
use core_rs::sync_agent::{
    init_sync_tables, ConflictResolution as SyncConflictResolution, ConflictType, DeviceInfo,
    DeviceType, SyncAgent, SyncConflict, SyncHistoryEntry,
};
use core_rs::tag::{get_all_tags_in_space, Tag};
use core_rs::task::{
    create_task, delete_task, get_all_tasks_in_space, get_task, get_tasks_by_project,
    get_upcoming_tasks, update_task, Task,
};
use core_rs::temporal_graph::{
    build_current_graph, create_milestone, detect_major_notes, get_graph_evolution,
    save_graph_snapshot, GraphEvolution, GraphMilestone, GraphSnapshot,
};
use core_rs::time_tracking::{
    create_manual_time_entry, delete_time_entry, get_project_time_entries, get_project_time_stats,
    get_recent_time_entries, get_running_entries, get_task_time_entries, get_task_time_stats,
    start_time_entry, stop_time_entry, TimeEntry, TimeStats,
};
use core_rs::vault::{create_vault, unlock_vault};
use core_rs::weekly_review::generate_weekly_review;
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
fn create_project_risk_cmd(
    project_id: &str,
    description: &str,
    likelihood: &str,
    impact: &str,
    db: State<DbConnection>,
) -> Result<ProjectRisk, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        create_project_risk(conn, project_id, description, impact, likelihood, "", None)
            .map_err(|e| e.to_string())
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
fn get_all_tasks_in_space_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_all_tasks_in_space(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_all_notes_in_space_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_all_notes_in_space(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_milestones_cmd(
    project_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<ProjectMilestone>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project_milestones(conn, project_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_risks_cmd(
    project_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<ProjectRisk>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project_risks(conn, project_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_updates_cmd(
    project_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<ProjectUpdate>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_project_updates(conn, project_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_saved_search_cmd(
    space_id: &str,
    title: &str,
    query_string: &str,
    scope: &str,
    db: State<DbConnection>,
) -> Result<SavedSearch, String> {
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
fn get_saved_searches_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<SavedSearch>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_saved_searches(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_saved_search_cmd(
    id: &str,
    title: &str,
    query_string: &str,
    scope: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
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
fn execute_saved_search_cmd(
    saved_search: SavedSearch,
    db: State<DbConnection>,
) -> Result<Vec<String>, String> {
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
fn create_note_cmd(
    space_id: &str,
    title: &str,
    content: &str,
    db: State<DbConnection>,
) -> Result<Note, String> {
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
fn update_note_content_cmd(
    id: &str,
    title: &str,
    content: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
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
fn create_task_cmd(
    space_id: &str,
    title: &str,
    description: Option<String>,
    db: State<DbConnection>,
) -> Result<Task, String> {
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
fn get_tasks_by_project_cmd(
    project_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let project_ulid = Ulid::from_string(project_id).map_err(|e| e.to_string())?;
        get_tasks_by_project(conn, project_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn import_from_obsidian_cmd(
    space_id: &str,
    path: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        import_from_obsidian(conn, space_ulid, path).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn import_from_notion_cmd(
    space_id: &str,
    path: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
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
fn create_form_template_cmd(
    space_id: &str,
    name: &str,
    fields: Vec<FormField>,
    db: State<DbConnection>,
) -> Result<FormTemplate, String> {
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
fn get_form_templates_for_space_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<FormTemplate>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_form_templates_for_space(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_form_template_cmd(
    id: &str,
    name: &str,
    fields: Vec<FormField>,
    db: State<DbConnection>,
) -> Result<(), String> {
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
fn search_notes_cmd(
    query: &str,
    scope: &str,
    db: State<DbConnection>,
) -> Result<Vec<Note>, String> {
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
        let task_ulid = task_id
            .map(|id| Ulid::from_string(&id))
            .transpose()
            .map_err(|e| e.to_string())?;
        let project_ulid = project_id
            .map(|id| Ulid::from_string(&id))
            .transpose()
            .map_err(|e| e.to_string())?;
        let note_ulid = note_id
            .map(|id| Ulid::from_string(&id))
            .transpose()
            .map_err(|e| e.to_string())?;

        start_time_entry(
            conn,
            space_ulid,
            task_ulid,
            project_ulid,
            note_ulid,
            description,
        )
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
fn get_task_time_entries_cmd(
    task_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(task_id).map_err(|e| e.to_string())?;
        get_task_time_entries(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_project_time_entries_cmd(
    project_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(project_id).map_err(|e| e.to_string())?;
        get_project_time_entries(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_running_entries_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<TimeEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_running_entries(conn, ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_recent_time_entries_cmd(
    space_id: &str,
    limit: i64,
    db: State<DbConnection>,
) -> Result<Vec<TimeEntry>, String> {
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
fn get_project_time_stats_cmd(
    project_id: &str,
    db: State<DbConnection>,
) -> Result<TimeStats, String> {
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
        let task_ulid = task_id
            .map(|id| Ulid::from_string(&id))
            .transpose()
            .map_err(|e| e.to_string())?;
        let project_ulid = project_id
            .map(|id| Ulid::from_string(&id))
            .transpose()
            .map_err(|e| e.to_string())?;
        let note_ulid = note_id
            .map(|id| Ulid::from_string(&id))
            .transpose()
            .map_err(|e| e.to_string())?;

        create_manual_time_entry(
            conn,
            space_ulid,
            task_ulid,
            project_ulid,
            note_ulid,
            description,
            started_at,
            duration_seconds,
        )
        .map_err(|e| e.to_string())
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
fn search_ocr_text_cmd(
    query: &str,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<OcrResult>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        search_ocr_text(conn, query, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn process_ocr_cmd(
    blob_id: &str,
    image_path: &str,
    language: Option<String>,
    db: State<DbConnection>,
) -> Result<String, String> {
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
        record_feedback(
            conn,
            insight_id,
            action_taken,
            action_type.as_deref(),
            feedback,
        )
        .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// CalDAV Commands
#[tauri::command]
fn add_caldav_account_cmd(
    url: &str,
    username: &str,
    password: &str,
    calendar_path: &str,
    db: State<DbConnection>,
) -> Result<CalDavAccount, String> {
    let conn = db.conn.lock().unwrap();
    let dek_lock = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek_lock.as_ref()) {
        add_caldav_account(conn, url, username, password, calendar_path, dek.as_slice())
            .map_err(|e| e.to_string())
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
fn sync_caldav_account_cmd(
    account_id: &str,
    db: State<DbConnection>,
) -> Result<SyncResult, String> {
    let conn = db.conn.lock().unwrap();
    let dek_lock = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek_lock.as_ref()) {
        sync_caldav_account(conn, account_id, dek.as_slice()).map_err(|e| e.to_string())
    } else {
        Err("Database connection or vault not available".to_string())
    }
}

#[tauri::command]
fn get_caldav_account_cmd(
    account_id: &str,
    db: State<DbConnection>,
) -> Result<Option<CalDavAccount>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_caldav_account(conn, account_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_caldav_account_cmd(
    account_id: &str,
    enabled: Option<bool>,
    auto_sync: Option<bool>,
    sync_frequency: Option<i64>,
    sync_direction: Option<String>,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let direction = sync_direction.and_then(|d| match d.as_str() {
            "pull" => Some(SyncDirection::Pull),
            "push" => Some(SyncDirection::Push),
            "bidirectional" => Some(SyncDirection::Bidirectional),
            _ => None,
        });
        update_caldav_account(
            conn,
            account_id,
            enabled,
            auto_sync,
            sync_frequency,
            direction,
        )
        .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_caldav_account_cmd(account_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        delete_caldav_account(conn, account_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_sync_history_cmd(
    account_id: &str,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<SyncResult>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        // get_caldav_sync_history returns Vec<SyncResult> which is already serializable
        get_caldav_sync_history(conn, account_id, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_unresolved_conflicts_cmd(
    account_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<CalDavSyncConflict>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_caldav_conflicts(conn, account_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn resolve_conflict_cmd(
    conflict_id: &str,
    resolution: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let resolution_type = match resolution.as_str() {
            "accept_local" => CalDavConflictResolution::AcceptLocal,
            "accept_remote" => CalDavConflictResolution::AcceptRemote,
            "merge" => CalDavConflictResolution::Merge,
            _ => return Err("Invalid resolution type".to_string()),
        };
        resolve_caldav_conflict(conn, conflict_id, resolution_type).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Sync Agent Commands
#[tauri::command]
fn init_sync_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        init_sync_tables(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get or generate device ID for this installation
fn get_local_device_id() -> String {
    // In production, this should be stored in a config file or generated once
    // For now, use hostname + MAC address hash or similar unique identifier
    use std::env;

    // Try to get hostname, fall back to random if not available
    let hostname = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| {
            // Generate a stable device ID based on machine characteristics
            use ulid::Ulid;
            format!("desktop_{}", Ulid::new())
        });

    hostname
}

fn get_local_device_name() -> String {
    use std::env;
    env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Desktop".to_string())
}

#[tauri::command]
fn get_sync_devices_cmd(db: State<DbConnection>) -> Result<Vec<DeviceInfo>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let agent = SyncAgent::new(
            get_local_device_id(),
            get_local_device_name(),
            8765, // TODO: Make this configurable
        );
        agent.get_devices(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn register_sync_device_cmd(
    device_id: String,
    device_name: String,
    device_type: String,
    sync_address: String,
    sync_port: u16,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let agent = SyncAgent::new(
            get_local_device_id(),
            get_local_device_name(),
            8765, // TODO: Make this configurable
        );

        let device_type_enum = match device_type.as_str() {
            "mobile" => DeviceType::Mobile,
            "web" => DeviceType::Web,
            _ => DeviceType::Desktop,
        };

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let device_info = DeviceInfo {
            device_id,
            device_name,
            device_type: device_type_enum,
            last_seen: now,
            sync_address,
            sync_port,
            protocol_version: "1.0.0".to_string(),
        };

        agent
            .register_device(conn, &device_info)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_sync_history_for_space_cmd(
    space_id: String,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<SyncHistoryEntry>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let agent = SyncAgent::new(
            get_local_device_id(),
            get_local_device_name(),
            8765, // TODO: Make this configurable
        );
        agent
            .get_sync_history(conn, &space_id, limit)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_sync_conflicts_cmd(db: State<DbConnection>) -> Result<Vec<SyncConflict>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let agent = SyncAgent::new(
            get_local_device_id(),
            get_local_device_name(),
            8765, // TODO: Make this configurable
        );
        agent
            .get_unresolved_conflicts(conn)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn resolve_sync_conflict_cmd(
    entity_id: String,
    resolution: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let agent = SyncAgent::new(
            get_local_device_id(),
            get_local_device_name(),
            8765, // TODO: Make this configurable
        );

        // Get the conflict from database
        let conflict = conn
            .query_row(
                "SELECT entity_type, entity_id, local_version, remote_version, conflict_type
                 FROM sync_conflict
                 WHERE entity_id = ?1 AND resolved = 0",
                [&entity_id],
                |row| {
                    let conflict_type_str: String = row.get(4)?;
                    let conflict_type = match conflict_type_str.as_str() {
                        "UpdateUpdate" => ConflictType::UpdateUpdate,
                        "UpdateDelete" => ConflictType::UpdateDelete,
                        "DeleteUpdate" => ConflictType::DeleteUpdate,
                        _ => ConflictType::UpdateUpdate,
                    };

                    Ok(SyncConflict {
                        entity_type: row.get(0)?,
                        entity_id: row.get(1)?,
                        local_version: row.get(2)?,
                        remote_version: row.get(3)?,
                        conflict_type,
                    })
                },
            )
            .map_err(|e| format!("Conflict not found: {}", e))?;

        let resolution_type = match resolution.as_str() {
            "use_local" => SyncConflictResolution::UseLocal,
            "use_remote" => SyncConflictResolution::UseRemote,
            "merge" => SyncConflictResolution::Merge,
            _ => return Err("Invalid resolution type".to_string()),
        };

        // TODO: Replace with actual DEK from secure state management
        // For now, using empty slice as encryption is not fully implemented
        let dek: &[u8] = &[];

        agent
            .resolve_conflict(conn, &conflict, resolution_type, dek)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn record_sync_cmd(
    space_id: String,
    direction: String,
    entities_pushed: u32,
    entities_pulled: u32,
    conflicts: u32,
    success: bool,
    error_message: Option<String>,
    db: State<DbConnection>,
) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let agent = SyncAgent::new(
            get_local_device_id(),
            get_local_device_name(),
            8765, // TODO: Make this configurable
        );
        agent
            .record_sync_history(
                conn,
                &space_id,
                &direction,
                entities_pushed,
                entities_pulled,
                conflicts,
                success,
                error_message.as_deref(),
            )
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// User Management / RBAC Commands
#[tauri::command]
fn init_rbac_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        init_rbac_tables(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_space_users_cmd(space_id: &str, db: State<DbConnection>) -> Result<Vec<SpaceUser>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_space_users(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn check_permission_cmd(
    space_id: &str,
    user_id: &str,
    permission: &str,
    db: State<DbConnection>,
) -> Result<bool, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        check_permission(conn, space_id, user_id, permission).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn invite_user_cmd(
    space_id: &str,
    email: &str,
    role_id: &str,
    invited_by: &str,
    db: State<DbConnection>,
) -> Result<UserInvitation, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        invite_user(conn, space_id, email, role_id, invited_by).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_user_role_cmd(
    space_id: &str,
    user_id: &str,
    new_role_id: &str,
    updated_by: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        update_user_role(conn, space_id, user_id, new_role_id, updated_by)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn grant_permission_cmd(
    space_id: &str,
    user_id: &str,
    permission: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        grant_permission(conn, space_id, user_id, permission).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn revoke_permission_cmd(
    space_id: &str,
    user_id: &str,
    permission: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        revoke_permission(conn, space_id, user_id, permission).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn suspend_user_cmd(space_id: &str, user_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        suspend_user(conn, space_id, user_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn activate_user_cmd(space_id: &str, user_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        activate_user(conn, space_id, user_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_roles_cmd(db: State<DbConnection>) -> Result<Vec<Role>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_roles(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn add_user_to_space_cmd(
    space_id: &str,
    user_id: &str,
    email: &str,
    role_id: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        add_user_to_space(conn, space_id, user_id, email, role_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn remove_user_from_space_cmd(
    space_id: &str,
    user_id: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        remove_user_from_space(conn, space_id, user_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Personal Modes - Health Commands
#[tauri::command]
fn create_health_metric_cmd(
    space_id: &str,
    metric_type: &str,
    value: f64,
    unit: &str,
    recorded_at: i64,
    db: State<DbConnection>,
) -> Result<HealthMetric, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_health_metric(
            conn,
            space_ulid,
            metric_type,
            value,
            unit,
            recorded_at,
            None,
            None,
        )
        .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_health_metrics_cmd(
    space_id: &str,
    metric_type: Option<String>,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<HealthMetric>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_health_metrics(conn, space_ulid, metric_type.as_deref(), limit)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// Personal Modes - Finance Commands
#[tauri::command]
fn create_transaction_cmd(
    space_id: &str,
    transaction_type: &str,
    amount: f64,
    currency: &str,
    category: &str,
    account: &str,
    date: i64,
    db: State<DbConnection>,
) -> Result<Transaction, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_transaction(
            conn,
            space_ulid,
            transaction_type,
            amount,
            currency,
            category,
            account,
            date,
            None,
        )
        .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_transactions_cmd(
    space_id: &str,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<Transaction>, String> {
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
fn create_recipe_cmd(
    space_id: &str,
    note_id: &str,
    name: &str,
    servings: i32,
    difficulty: &str,
    db: State<DbConnection>,
) -> Result<Recipe, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_recipe(conn, space_ulid, note_id, name, servings, difficulty)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_recipes_cmd(
    space_id: &str,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<Recipe>, String> {
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
fn create_trip_cmd(
    space_id: &str,
    note_id: &str,
    name: &str,
    destination: &str,
    start_date: i64,
    end_date: i64,
    db: State<DbConnection>,
) -> Result<Trip, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        create_trip(
            conn,
            space_ulid,
            note_id,
            name,
            destination,
            start_date,
            end_date,
        )
        .map_err(|e| e.to_string())
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
fn build_current_graph_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<GraphSnapshot, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        build_current_graph(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_graph_evolution_cmd(
    space_id: &str,
    start_time: i64,
    end_time: i64,
    snapshot_limit: u32,
    db: State<DbConnection>,
) -> Result<GraphEvolution, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        get_graph_evolution(conn, space_ulid, start_time, end_time, snapshot_limit)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn detect_major_notes_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<GraphMilestone>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let space_ulid = Ulid::from_string(space_id).map_err(|e| e.to_string())?;
        detect_major_notes(conn, space_ulid).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// ============================================================================
// SOCIAL MEDIA SUITE COMMANDS
// ============================================================================

/// Add a new social media account
#[tauri::command]
fn add_social_account_cmd(
    space_id: &str,
    platform: &str,
    username: &str,
    display_name: Option<&str>,
    credentials: &str,
    db: State<DbConnection>,
) -> Result<SocialAccount, String> {
    // Input validation
    if space_id.len() > 100 || space_id.is_empty() {
        return Err("Invalid space_id".to_string());
    }
    if platform.len() > 50 || platform.is_empty() {
        return Err("Invalid platform".to_string());
    }
    if username.len() > 200 || username.is_empty() {
        return Err("Invalid username".to_string());
    }
    if let Some(name) = display_name {
        if name.len() > 200 {
            return Err("Display name too long".to_string());
        }
    }
    if credentials.len() > 50000 {
        return Err("Credentials payload too large".to_string());
    }

    let conn = db.conn.lock().unwrap();
    let dek = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek.as_ref()) {
        add_social_account(
            conn,
            space_id,
            platform,
            username,
            display_name,
            credentials,
            dek.as_slice(),
        )
        .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get all social accounts for a space
#[tauri::command]
fn get_social_accounts_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<SocialAccount>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_social_accounts(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get a single social account
#[tauri::command]
fn get_social_account_cmd(
    account_id: &str,
    db: State<DbConnection>,
) -> Result<Option<SocialAccount>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_social_account(conn, account_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Update social account settings
#[tauri::command]
fn update_social_account_cmd(
    account_id: &str,
    enabled: Option<bool>,
    sync_frequency_minutes: Option<i32>,
    display_name: Option<&str>,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        update_social_account(
            conn,
            account_id,
            enabled,
            sync_frequency_minutes,
            display_name,
        )
        .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Delete a social account
#[tauri::command]
fn delete_social_account_cmd(account_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        delete_social_account(conn, account_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Store social posts (bulk insert from platform extractors)
#[tauri::command]
fn store_social_posts_cmd(
    account_id: &str,
    posts: Vec<SocialPost>,
    db: State<DbConnection>,
) -> Result<usize, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        store_social_posts(conn, account_id, posts).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get unified timeline across all platforms
#[tauri::command]
fn get_unified_timeline_cmd(
    space_id: &str,
    filters: TimelineFilters,
    db: State<DbConnection>,
) -> Result<Vec<TimelinePost>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_unified_timeline(conn, space_id, filters).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Create a new category
#[tauri::command]
fn create_social_category_cmd(
    space_id: &str,
    name: &str,
    color: Option<&str>,
    icon: Option<&str>,
    keywords: Option<Vec<String>>,
    db: State<DbConnection>,
) -> Result<SocialCategory, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let filters = keywords.map(|kw| CategoryFilters {
            platforms: None,
            authors: None,
            keywords: Some(kw),
        });
        create_category(conn, space_id, name, color, icon, filters).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get all categories for a space
#[tauri::command]
fn get_social_categories_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<Vec<SocialCategory>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_categories(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Assign a category to a post
#[tauri::command]
fn assign_social_category_cmd(
    post_id: &str,
    category_id: &str,
    assigned_by: &str,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        assign_category(conn, post_id, category_id, assigned_by).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Delete a category
#[tauri::command]
fn delete_social_category_cmd(category_id: &str, db: State<DbConnection>) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        delete_category(conn, category_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get timeline statistics
#[tauri::command]
fn get_timeline_stats_cmd(
    space_id: &str,
    db: State<DbConnection>,
) -> Result<TimelineStats, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_timeline_stats(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get analytics overview
#[tauri::command]
fn get_analytics_overview_cmd(
    space_id: &str,
    days: i64,
    db: State<DbConnection>,
) -> Result<AnalyticsOverview, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_analytics_overview(conn, space_id, days).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Search social posts with FTS
#[tauri::command]
fn search_social_posts_cmd(
    space_id: &str,
    query: &str,
    limit: i64,
    db: State<DbConnection>,
) -> Result<Vec<TimelinePost>, String> {
    // Input validation
    if space_id.len() > 100 || space_id.is_empty() {
        return Err("Invalid space_id".to_string());
    }
    if query.len() > 1000 {
        return Err("Search query too long".to_string());
    }
    if limit < 1 || limit > 1000 {
        return Err("Invalid limit (must be between 1 and 1000)".to_string());
    }

    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        search_social_posts(conn, space_id, query, Some(limit)).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Auto-categorize uncategorized posts
#[tauri::command]
fn auto_categorize_posts_cmd(space_id: &str, db: State<DbConnection>) -> Result<usize, String> {
    // Input validation
    if space_id.len() > 100 || space_id.is_empty() {
        return Err("Invalid space_id".to_string());
    }

    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        auto_categorize_posts(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

// ============================================================================
// WEBVIEW & EXTRACTION COMMANDS
// ============================================================================

/// Open a social media account in an isolated WebView
#[tauri::command]
async fn open_social_webview(
    app_handle: tauri::AppHandle,
    account_id: String,
    db: State<'_, DbConnection>,
) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    let dek = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek.as_ref()) {
        // Get account
        let account = get_social_account(conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or("Account not found")?;

        // Create or get WebView session
        let session = match get_webview_session(conn, &account_id).map_err(|e| e.to_string())? {
            Some(s) => s,
            None => create_webview_session(conn, &account_id, &account.platform, dek.as_slice())
                .map_err(|e| e.to_string())?,
        };

        // Get platform URL and display name
        let url = get_platform_url(&account.platform);
        let display_name = get_platform_display_name(&account.platform);
        let window_label = format!("social-{}-{}", account.platform, &account_id[..8]);

        // Create WebView window
        let parsed_url = url
            .parse()
            .map_err(|e: url::ParseError| format!("Invalid platform URL: {}", e))?;

        let window = tauri::WindowBuilder::new(
            &app_handle,
            window_label.clone(),
            tauri::WindowUrl::External(parsed_url),
        )
        .title(format!("{} - @{}", display_name, account.username))
        .inner_size(1200.0, 800.0)
        .build()
        .map_err(|e| e.to_string())?;

        // Read extraction scripts
        let universal_script = include_str!("../js/extractors/universal.js");
        let platform_script = match account.platform.as_str() {
            "twitter" => include_str!("../js/extractors/twitter.js"),
            "youtube" => include_str!("../js/extractors/youtube.js"),
            "instagram" => include_str!("../js/extractors/instagram.js"),
            "tiktok" => include_str!("../js/extractors/tiktok.js"),
            "pinterest" => include_str!("../js/extractors/pinterest.js"),
            "linkedin" => include_str!("../js/extractors/linkedin.js"),
            "discord" => include_str!("../js/extractors/discord.js"),
            "reddit" => include_str!("../js/extractors/reddit.js"),
            "spotify" => include_str!("../js/extractors/spotify.js"),
            "castbox" => include_str!("../js/extractors/castbox.js"),
            "fotmob" => include_str!("../js/extractors/fotmob.js"),
            "sofascore" => include_str!("../js/extractors/sofascore.js"),
            "telegram" => include_str!("../js/extractors/telegram.js"),
            "gmail" => include_str!("../js/extractors/gmail.js"),
            "tinder" => include_str!("../js/extractors/tinder.js"),
            "bumble" => include_str!("../js/extractors/bumble.js"),
            "hinge" => include_str!("../js/extractors/hinge.js"),
            _ => "",
        };

        // Inject config and extraction scripts after page loads
        let account_id_clone = account_id.clone();
        let platform_clone = account.platform.clone();

        window.once("tauri://created", move |_| {
            let config_script = format!(
                r#"
                window.__NOTEECE_CONFIG__ = {{
                    accountId: '{}',
                    platform: '{}',
                    pollInterval: 5000,
                    debug: true,
                }};
                "#,
                account_id_clone, platform_clone
            );

            let full_script = format!(
                "{}\n{}\n{}",
                config_script, universal_script, platform_script
            );

            window
                .eval(&full_script)
                .expect("Failed to inject extraction script");
        });

        Ok(window_label)
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Handle extracted data from WebView
#[tauri::command]
fn handle_extracted_data(
    account_id: String,
    platform: String,
    event_type: String,
    data: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    // Input validation - protect against malicious/oversized payloads from compromised WebViews
    if account_id.len() > 100 || account_id.is_empty() {
        return Err("Invalid account_id".to_string());
    }
    if platform.len() > 50 || platform.is_empty() {
        return Err("Invalid platform".to_string());
    }
    if event_type.len() > 100 {
        return Err("Invalid event_type".to_string());
    }
    // Limit JSON payload size to prevent DoS (10MB limit)
    if data.len() > 10_000_000 {
        return Err("Data payload too large".to_string());
    }

    let conn = db.conn.lock().unwrap();

    if let Some(conn) = conn.as_ref() {
        match event_type.as_str() {
            "posts_batch" => {
                // Parse JSON array of posts with size limit
                let posts: Vec<SocialPost> = serde_json::from_str(&data)
                    .map_err(|e| format!("Failed to parse posts: {}", e))?;

                // Validate number of posts in batch
                if posts.len() > 1000 {
                    return Err("Too many posts in batch (max 1000)".to_string());
                }

                // Validate that all posts belong to the specified account (prevent cross-account injection)
                for post in &posts {
                    if post.account_id != account_id {
                        return Err(format!(
                            "Post account_id mismatch: expected {}, got {}",
                            account_id, post.account_id
                        ));
                    }
                }

                // Store posts
                let stored =
                    store_social_posts(conn, &account_id, posts).map_err(|e| e.to_string())?;

                log::info!(
                    "[Social] Stored {} posts for account {}",
                    stored,
                    account_id
                );
                Ok(())
            }
            _ => {
                log::warn!("[Social] Unknown event type: {}", event_type);
                Ok(())
            }
        }
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Save WebView cookies for persistence
#[tauri::command]
fn save_webview_cookies(
    session_id: String,
    cookies_json: String,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    let dek = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek.as_ref()) {
        save_session_cookies(conn, &session_id, &cookies_json, dek.as_slice())
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get WebView session for an account
#[tauri::command]
fn get_webview_session_cmd(
    account_id: String,
    db: State<DbConnection>,
) -> Result<Option<WebViewSession>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_webview_session(conn, &account_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get accounts that need syncing
#[tauri::command]
fn get_sync_tasks_cmd(space_id: String, db: State<DbConnection>) -> Result<Vec<SyncTask>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_social_accounts_needing_sync(conn, &space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get all sync tasks for a space
#[tauri::command]
fn get_all_sync_tasks_cmd(
    space_id: String,
    db: State<DbConnection>,
) -> Result<Vec<SyncTask>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_all_sync_tasks(conn, &space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get sync history for an account
#[tauri::command]
fn get_sync_history_cmd(
    account_id: String,
    limit: i64,
    db: State<DbConnection>,
) -> Result<Vec<SyncStatus>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_sync_history(conn, &account_id, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

/// Get sync statistics for a space
#[tauri::command]
fn get_sync_stats_cmd(space_id: String, db: State<DbConnection>) -> Result<SyncStats, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_sync_stats(conn, &space_id).map_err(|e| e.to_string())
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
            get_caldav_account_cmd,
            update_caldav_account_cmd,
            delete_caldav_account_cmd,
            sync_caldav_account_cmd,
            get_sync_history_cmd,
            get_unresolved_conflicts_cmd,
            resolve_conflict_cmd,
            init_sync_tables_cmd,
            get_sync_devices_cmd,
            register_sync_device_cmd,
            get_sync_history_for_space_cmd,
            get_sync_conflicts_cmd,
            resolve_sync_conflict_cmd,
            record_sync_cmd,
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
            shutdown_clear_keys_cmd,
            init_rbac_tables_cmd,
            get_space_users_cmd,
            check_permission_cmd,
            invite_user_cmd,
            update_user_role_cmd,
            grant_permission_cmd,
            revoke_permission_cmd,
            suspend_user_cmd,
            activate_user_cmd,
            get_roles_cmd,
            add_user_to_space_cmd,
            remove_user_from_space_cmd,
            // Social Media Suite commands
            add_social_account_cmd,
            get_social_accounts_cmd,
            get_social_account_cmd,
            update_social_account_cmd,
            delete_social_account_cmd,
            store_social_posts_cmd,
            get_unified_timeline_cmd,
            create_social_category_cmd,
            get_social_categories_cmd,
            assign_social_category_cmd,
            delete_social_category_cmd,
            get_timeline_stats_cmd,
            get_analytics_overview_cmd,
            search_social_posts_cmd,
            auto_categorize_posts_cmd,
            // Social Media WebView commands
            open_social_webview,
            handle_extracted_data,
            save_webview_cookies,
            get_webview_session_cmd,
            // Social Media Sync commands
            get_sync_tasks_cmd,
            get_all_sync_tasks_cmd,
            get_sync_history_cmd,
            get_sync_stats_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_recent_notes_cmd(
    space_id: &str,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_recent_notes(conn, space_id, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_upcoming_tasks_cmd(
    space_id: &str,
    limit: u32,
    db: State<DbConnection>,
) -> Result<Vec<Task>, String> {
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
