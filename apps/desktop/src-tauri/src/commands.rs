use crate::state::DbConnection;
use crate::state::SecureDek;
use crate::db_pool::EncryptedConnectionManager;
use r2d2::Pool;
use core_rs::analytics::*;
use core_rs::auth::{AuthService, Session, User};
use core_rs::caldav::*;
use core_rs::collaboration::*;
use core_rs::dashboard::*;
use core_rs::foresight::*;
use core_rs::form::*;
use core_rs::goals::*;
use core_rs::habits::*;
use core_rs::import::*;
use core_rs::mode::*;
use core_rs::note::*;
use core_rs::ocr::*;
use core_rs::personal_modes::*;
use core_rs::project::*;
use core_rs::search::*;
use core_rs::social::backup::{BackupMetadata, BackupService};
use core_rs::social::{
    SocialAccount, SocialCategory, SocialPost, TimelinePost, TimelineStats, WebViewSession, AnalyticsOverview
};
use core_rs::space::*;
use core_rs::srs::*;
use core_rs::sync::mobile_sync::DeviceInfo;
use core_rs::sync::discovery::DiscoveredDevice;
use core_rs::sync_agent::{
    SyncAgent, SyncConflict as DbSyncConflict, ConflictResolution as SyncConflictResolution, SyncHistoryEntry, SyncStats,
    SyncTask,
};
use core_rs::tag::*;
use core_rs::task::*;
use core_rs::temporal_graph::{
    GraphEvolution, GraphMilestone, GraphNode, GraphSnapshot, GraphEdge, GraphMetrics,
};
use core_rs::time_tracking::*;
use core_rs::weekly_review::generate_weekly_review;
use core_rs::vault::{create_vault, unlock_vault};
use tauri::State;
use ulid::Ulid;
use crate::config::AppConfig;
use core_rs::sync::p2p::P2pSync;
use std::sync::Arc;
use std::path::Path;

// Aliases for conflicts
use core_rs::project::{ProjectMilestone as Milestone, ProjectRisk as Risk};
use core_rs::search::SavedSearch;
use core_rs::caldav::{SyncResult, SyncConflict, ConflictResolution as CaldavConflictResolution};

// Helper macro to simplify DB locking and error handling with Pooling
macro_rules! with_db {
    ($db:expr, $conn:ident, $body:block) => {{
        let pool_guard = $db
            .pool
            .lock()
            .map_err(|_| "Failed to lock database pool state".to_string())?;
        let pool = pool_guard
            .as_ref()
            .ok_or_else(|| "Database pool not initialized (Vault locked)".to_string())?;
        let $conn = pool.get().map_err(|e| format!("Failed to get connection from pool: {}", e))?;
        $body
    }};
}

macro_rules! with_db_mut {
    ($db:expr, $conn:ident, $body:block) => {{
        let pool_guard = $db
            .pool
            .lock()
            .map_err(|_| "Failed to lock database pool state".to_string())?;
        let pool = pool_guard
            .as_ref()
            .ok_or_else(|| "Database pool not initialized (Vault locked)".to_string())?;
        let mut $conn = pool.get().map_err(|e| format!("Failed to get connection from pool: {}", e))?;
        $body
    }};
}

// --- Vault Commands ---

#[tauri::command]
pub fn create_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    // Lock everything to reset
    let mut pool_guard = db.pool.lock().map_err(|_| "Failed to lock database pool".to_string())?;
    let mut dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
    let mut p2p_sync_guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;

    *pool_guard = None;
    *dek_guard = None;
    *p2p_sync_guard = None;

    // Create vault (returns conn and dek)
    let vault = create_vault(path, password).map_err(|e| e.to_string())?;

    // Store DEK
    *dek_guard = Some(SecureDek::new(vault.dek.to_vec()));

    // Create Pool
    let manager = EncryptedConnectionManager::new(
        Path::new(path).join("vault.sqlite3"),
        vault.dek
    );
    let pool = Pool::builder()
        .max_size(10) // Default to 10 connections
        .build(manager)
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    *pool_guard = Some(pool);

    Ok(())
}

#[tauri::command]
pub fn unlock_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    let mut pool_guard = db.pool.lock().map_err(|_| "Failed to lock database pool".to_string())?;
    let mut dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
    let mut p2p_sync_guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;

    *pool_guard = None;
    *dek_guard = None;
    *p2p_sync_guard = None;

    let vault = unlock_vault(path, password).map_err(|e| e.to_string())?;

    *dek_guard = Some(SecureDek::new(vault.dek.to_vec()));

    let manager = EncryptedConnectionManager::new(
        Path::new(path).join("vault.sqlite3"),
        vault.dek
    );
    let pool = Pool::builder()
        .max_size(10)
        .build(manager)
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    *pool_guard = Some(pool.clone());

    // Initialize P2P Sync
    // Get a connection from the pool for initialization
    let conn = pool.get().map_err(|e| format!("Failed to get connection for P2P init: {}", e))?;

    let device_id = core_rs::db::get_or_create_user_id(&conn).unwrap_or_default();
    let device_info = core_rs::sync::mobile_sync::DeviceInfo {
        device_id,
        device_name: "Desktop".to_string(),
        device_type: core_rs::sync::mobile_sync::DeviceType::Desktop,
        ip_address: "127.0.1.1".parse().unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))),
        sync_port: AppConfig::sync_port(),
        public_key: vec![],
        os_version: std::env::consts::OS.to_string(),
        last_seen: chrono::Utc::now(),
        is_active: true,
    };

    *p2p_sync_guard = Some(Arc::new(P2pSync::new(device_info).map_err(|e| e.to_string())?));

    Ok(())
}

#[tauri::command]
pub fn get_or_create_user_id_cmd(db: State<DbConnection>) -> Result<String, String> {
    with_db!(db, conn, {
        core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())
    })
}

// --- Project Commands ---

#[tauri::command]
pub fn get_project_cmd(db: State<DbConnection>, id: String) -> Result<Option<Project>, String> {
    with_db!(db, conn, {
        core_rs::project::get_project(&conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_projects_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Project>, String> {
    with_db!(db, conn, {
        core_rs::project::get_projects_in_space(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_milestones_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<Milestone>, String> {
    with_db!(db, conn, {
        core_rs::project::get_project_milestones(&conn, &project_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_risks_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<Risk>, String> {
    with_db!(db, conn, {
        core_rs::project::get_project_risks(&conn, &project_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_updates_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<ProjectUpdate>, String> {
    with_db!(db, conn, {
        core_rs::project::get_project_updates(&conn, &project_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_project_risk_cmd(
    db: State<DbConnection>,
    project_id: String,
    description: String,
    likelihood: String,
    impact: String,
) -> Result<Risk, String> {
    with_db!(db, conn, {
        core_rs::project::create_project_risk(&conn, &project_id, &description, &likelihood, &impact, "", None)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_project_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db_mut!(db, conn, {
        core_rs::project::delete_project(&mut conn, &id).map_err(|e| e.to_string())
    })
}

// --- Search Commands ---

#[tauri::command]
pub fn create_saved_search_cmd(
    db: State<DbConnection>,
    name: String,
    query: String,
    space_id: Option<String>,
) -> Result<SavedSearch, String> {
    with_db!(db, conn, {
        core_rs::search::create_saved_search(&conn, &name, &query, space_id.as_deref())
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<SavedSearch, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::get_saved_search(&conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Saved search not found".to_string())
    })
}

#[tauri::command]
pub fn get_saved_searches_cmd(db: State<DbConnection>, space_id: Option<String>) -> Result<Vec<SavedSearch>, String> {
    with_db!(db, conn, {
        core_rs::search::get_saved_searches(&conn, space_id.as_deref()).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_saved_search_cmd(
    db: State<DbConnection>,
    id: String,
    name: String,
    query: String,
) -> Result<SavedSearch, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::update_saved_search(&conn, id, &name, &query).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::search::delete_saved_search(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn execute_saved_search_cmd(db: State<DbConnection>, id: String) -> Result<Vec<SearchResult>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        let search = core_rs::search::get_saved_search(&conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Saved search not found".to_string())?;

        use core_rs::search::{SearchQuery, EntityType, SearchFilters, SortOptions};
        let space_ulid = search.space_id.as_deref().map(|s| Ulid::from_string(s).unwrap_or_default());

        let query = SearchQuery {
            query: search.query,
            entity_types: vec![EntityType::Note],
            filters: SearchFilters {
                space_id: space_ulid,
                ..Default::default()
            },
            sort: SortOptions::default(),
            limit: Some(50),
            offset: None,
        };
        core_rs::search::search_all(&conn, &query).map_err(|e| e.to_string())
    })
}

// --- Weekly Review ---

#[tauri::command]
pub fn generate_weekly_review_cmd(db: State<DbConnection>, space_id: String) -> Result<Note, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        generate_weekly_review(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

// --- Mode Commands ---

#[tauri::command]
pub fn get_space_modes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Mode>, String> {
    with_db!(db, conn, {
        core_rs::mode::get_space_modes(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn enable_mode_cmd(db: State<DbConnection>, space_id: String, mode: String) -> Result<(), String> {
    with_db!(db, conn, {
        let mode_enum: Mode = serde_json::from_value(serde_json::Value::String(mode)).map_err(|e| e.to_string())?;
        core_rs::mode::enable_mode(&conn, &space_id, &mode_enum).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn disable_mode_cmd(db: State<DbConnection>, space_id: String, mode: String) -> Result<(), String> {
    with_db!(db, conn, {
        let mode_enum: Mode = serde_json::from_value(serde_json::Value::String(mode)).map_err(|e| e.to_string())?;
        core_rs::mode::disable_mode(&conn, &space_id, &mode_enum).map_err(|e| e.to_string())
    })
}

// --- Note Commands ---

#[tauri::command]
pub fn create_note_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    content: String,
) -> Result<Note, String> {
    with_db!(db, conn, {
        core_rs::note::create_note(&conn, &space_id, &title, &content).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_note_cmd(db: State<DbConnection>, id: String) -> Result<Option<Note>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::get_note(&conn, core_rs::note::DbUlid(id)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_note_content_cmd(
    db: State<DbConnection>,
    id: String,
    title: String,
    content: String,
) -> Result<(), String> {
    with_db_mut!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::update_note_content(&mut conn, core_rs::note::DbUlid(id), &title, &content)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn trash_note_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::note::trash_note(&conn, core_rs::note::DbUlid(id)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_notes_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Note>, String> {
    with_db!(db, conn, {
        core_rs::note::get_all_notes_in_space(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recent_notes_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<Note>, String> {
    with_db!(db, conn, {
        core_rs::note::get_recent_notes(&conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_or_create_daily_note_cmd(db: State<DbConnection>, space_id: String) -> Result<Note, String> {
    with_db!(db, conn, {
        core_rs::note::get_or_create_daily_note(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_notes_cmd(
    db: State<DbConnection>,
    query: String,
    scope: Option<String>,
) -> Result<Vec<SearchResult>, String> {
    with_db!(db, conn, {
        let scope_str = scope.as_deref().unwrap_or("");
        use core_rs::search::{SearchQuery, EntityType, SearchFilters, SortOptions};
        let search_query = SearchQuery {
            query: query,
            entity_types: vec![EntityType::Note],
            filters: SearchFilters {
                space_id: if !scope_str.is_empty() { Some(Ulid::from_string(scope_str).unwrap_or_default()) } else { None },
                ..Default::default()
            },
            sort: SortOptions::default(),
            limit: Some(50),
            offset: None,
        };
        core_rs::search::search_all(&conn, &search_query).map_err(|e| e.to_string())
    })
}

// --- Task Commands ---

#[tauri::command]
pub fn create_task_cmd(
    db: State<DbConnection>,
    space_id: String,
    title: String,
    description: Option<String>,
) -> Result<Task, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::task::create_task(&conn, space_ulid, &title, description)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_cmd(db: State<DbConnection>, id: String) -> Result<Option<Task>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::task::get_task(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_task_cmd(db: State<DbConnection>, task: Task) -> Result<Task, String> {
    with_db!(db, conn, {
        core_rs::task::update_task(&conn, &task).map_err(|e| e.to_string())?;
        Ok(task)
    })
}

#[tauri::command]
pub fn delete_task_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&id).map_err(|e| e.to_string())?;
        core_rs::task::delete_task(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_tasks_by_project_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<Task>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::task::get_tasks_by_project(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_all_tasks_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Task>, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::task::get_all_tasks_in_space(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_upcoming_tasks_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<Task>, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::task::get_upcoming_tasks(&conn, space_ulid, limit).map_err(|e| e.to_string())
    })
}

// --- SRS Commands ---

#[tauri::command]
pub fn get_due_cards_cmd(db: State<DbConnection>) -> Result<Vec<KnowledgeCard>, String> {
    with_db!(db, conn, {
        core_rs::srs::get_due_cards(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn review_card_cmd(db: State<DbConnection>, card_id: String, quality: u8) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&card_id).map_err(|e| e.to_string())?;
        // review_card takes i64 rating (0-5)
        core_rs::srs::review_card(&conn, id, quality as i64).map_err(|e| e.to_string())
    })
}

// --- Import Commands ---

#[tauri::command]
pub fn import_from_obsidian_cmd(db: State<DbConnection>, space_id: String, path: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::import::import_from_obsidian(&conn, id, &path).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn import_from_notion_cmd(db: State<DbConnection>, space_id: String, path: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::import::import_from_notion(&conn, id, &path).map_err(|e| e.to_string())
    })
}

// --- Form Commands ---

#[tauri::command]
pub fn create_form_template_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    fields: String,
) -> Result<FormTemplate, String> {
    with_db!(db, conn, {
        let form_fields: Vec<core_rs::form::FormField> = serde_json::from_str(&fields).map_err(|e| e.to_string())?;
        core_rs::form::create_form_template(&conn, &space_id, &name, form_fields).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_form_template_cmd(db: State<DbConnection>, id: String) -> Result<FormTemplate, String> {
    with_db!(db, conn, {
        core_rs::form::get_form_template(&conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_form_templates_for_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<FormTemplate>, String> {
    with_db!(db, conn, {
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
    with_db!(db, conn, {
        let form_fields: Vec<core_rs::form::FormField> = serde_json::from_str(&fields).map_err(|e| e.to_string())?;
        core_rs::form::update_form_template(&conn, &id, &name, form_fields.clone()).map_err(|e| e.to_string())?;
        core_rs::form::get_form_template(&conn, &id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_form_template_cmd(db: State<DbConnection>, id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::form::delete_form_template(&conn, &id).map_err(|e| e.to_string())
    })
}

// --- Analytics Commands ---

#[tauri::command]
pub fn get_analytics_data_cmd(db: State<DbConnection>) -> Result<AnalyticsData, String> {
    with_db!(db, conn, {
        core_rs::analytics::get_analytics_data(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_dashboard_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<DashboardStats, String> {
    with_db!(db, conn, {
        core_rs::dashboard::get_dashboard_stats(&conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Space Commands ---

#[tauri::command]
pub fn get_all_spaces_cmd(db: State<DbConnection>) -> Result<Vec<core_rs::space::Space>, String> {
    with_db!(db, conn, {
        core_rs::space::get_all_spaces(&conn).map_err(|e| e.to_string())
    })
}

// --- Tag Commands ---

#[tauri::command]
pub fn get_all_tags_in_space_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Tag>, String> {
    with_db!(db, conn, {
        core_rs::tag::get_all_tags_in_space(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
    })
}

// --- Time Tracking Commands ---

#[tauri::command]
pub fn start_time_entry_cmd(
    db: State<DbConnection>,
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    description: Option<String>,
) -> Result<TimeEntry, String> {
    with_db!(db, conn, {
        let task_ulid = task_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let project_ulid = project_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        core_rs::time_tracking::start_time_entry(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, task_ulid, project_ulid, None, description)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn stop_time_entry_cmd(db: State<DbConnection>, entry_id: String) -> Result<TimeEntry, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&entry_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::stop_time_entry(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_time_entries_cmd(db: State<DbConnection>, task_id: String) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&task_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_task_time_entries(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_time_entries_cmd(db: State<DbConnection>, project_id: String) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_project_time_entries(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_running_entries_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        core_rs::time_tracking::get_running_entries(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recent_time_entries_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<TimeEntry>, String> {
    with_db!(db, conn, {
        core_rs::time_tracking::get_recent_time_entries(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, limit as i64).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_task_time_stats_cmd(db: State<DbConnection>, task_id: String) -> Result<TimeStats, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&task_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_task_time_stats(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_project_time_stats_cmd(db: State<DbConnection>, project_id: String) -> Result<TimeStats, String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&project_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::get_project_time_stats(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_time_entry_cmd(db: State<DbConnection>, entry_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&entry_id).map_err(|e| e.to_string())?;
        core_rs::time_tracking::delete_time_entry(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_manual_time_entry_cmd(
    db: State<DbConnection>,
    space_id: String,
    task_id: Option<String>,
    project_id: Option<String>,
    note_id: Option<String>,
    description: Option<String>,
    started_at: i64,
    duration_seconds: i64,
) -> Result<TimeEntry, String> {
    with_db!(db, conn, {
        let task_ulid = task_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let project_ulid = project_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let note_ulid = note_id.map(|s| Ulid::from_string(&s)).transpose().map_err(|e| e.to_string())?;
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;

        core_rs::time_tracking::create_manual_time_entry(
            &conn,
            space_ulid,
            task_ulid,
            project_ulid,
            note_ulid,
            description,
            started_at,
            duration_seconds
        ).map_err(|e| e.to_string())
    })
}

// --- OCR Commands ---

#[tauri::command]
pub fn queue_ocr_cmd(db: State<DbConnection>, blob_id: String) -> Result<(), String> {
     with_db!(db, conn, {
        core_rs::ocr::queue_ocr(&conn, &blob_id).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_ocr_status_cmd(db: State<DbConnection>, blob_id: String) -> Result<Option<core_rs::ocr::OcrResult>, String> {
    with_db!(db, conn, {
        core_rs::ocr::get_ocr_status(&conn, &blob_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_ocr_text_cmd(db: State<DbConnection>, query: String) -> Result<Vec<core_rs::ocr::OcrResult>, String> {
    with_db!(db, conn, {
        core_rs::ocr::search_ocr_text(&conn, &query, 100).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn process_ocr_job_cmd(db: State<DbConnection>, job_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let jid = job_id;
        core_rs::ocr::process_ocr_job(&conn, &jid, Path::new("placeholder"), None).map_err(|e| e.to_string())?;
        Ok(())
    })
}

// --- Foresight Commands ---

#[tauri::command]
pub fn generate_insights_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Insight>, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::foresight::generate_insights(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_active_insights_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Insight>, String> {
    with_db!(db, conn, {
        core_rs::foresight::get_active_insights(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn dismiss_insight_cmd(db: State<DbConnection>, insight_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        core_rs::foresight::dismiss_insight(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn record_feedback_cmd(db: State<DbConnection>, insight_id: String, useful: bool) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&insight_id).map_err(|e| e.to_string())?;
        core_rs::foresight::record_feedback(&conn, id, useful).map_err(|e| e.to_string())
    })
}

// --- CalDAV Commands ---

#[tauri::command]
pub fn add_caldav_account_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    url: String,
    username: String,
    password: Option<String>,
) -> Result<CalDavAccount, String> {
    with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
        if dek.is_empty() { return Err("DEK not available".to_string()); }

        // add_caldav_account(conn, url, username, password, calendar_path, dek)
        core_rs::caldav::add_caldav_account(&conn, &url, &username, password.as_deref().unwrap_or(""), &name, dek)
            .map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_accounts_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<CalDavAccount>, String> {
    with_db!(db, conn, {
        core_rs::caldav::get_caldav_accounts(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<Option<CalDavAccount>, String> {
    with_db!(db, conn, {
        core_rs::caldav::get_caldav_account(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_caldav_account_cmd(
    db: State<DbConnection>,
    account_id: String,
    name: String,
    url: String,
    username: String,
    password: Option<String>,
) -> Result<CalDavAccount, String> {
    with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice());

        core_rs::caldav::update_caldav_account(
            &conn,
            &account_id,
            None,
            None,
            None,
            None,
            Some(&url),
            Some(&username),
            password.as_deref(),
            Some(&name),
            dek
        ).map_err(|e| e.to_string())?;

        core_rs::caldav::get_caldav_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "CalDAV account not found".to_string())
    })
}

#[tauri::command]
pub fn delete_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::caldav::delete_caldav_account(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn sync_caldav_account_cmd(db: State<DbConnection>, account_id: String) -> Result<SyncResult, String> {
    with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
        if dek.is_empty() { return Err("DEK not available".to_string()); }

        core_rs::caldav::sync_caldav_account(&conn, &account_id, dek).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_sync_history_cmd(db: State<DbConnection>, account_id: String) -> Result<Vec<SyncResult>, String> {
    with_db!(db, conn, {
        core_rs::caldav::get_sync_history(&conn, &account_id, 50).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_caldav_conflicts_cmd(db: State<DbConnection>, account_id: String) -> Result<Vec<SyncConflict>, String> {
    with_db!(db, conn, {
        core_rs::caldav::get_unresolved_conflicts(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn resolve_caldav_conflict_cmd(db: State<DbConnection>, conflict_id: String, resolution: CaldavConflictResolution) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::caldav::resolve_conflict(&conn, &conflict_id, resolution).map_err(|e| e.to_string())
    })
}

// --- Sync Agent ---

#[tauri::command]
pub fn init_sync_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::sync_agent::init_sync_tables(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn register_device_cmd(
    db: State<DbConnection>,
    device_id: String,
    name: String,
    public_key: Vec<u8>,
) -> Result<(), String> {
    with_db!(db, conn, {
        let device_info = core_rs::sync_agent::DeviceInfo {
            device_id: device_id.clone(),
            device_name: name,
            device_type: core_rs::sync_agent::DeviceType::Mobile,
            last_seen: chrono::Utc::now().timestamp(),
            sync_address: "".to_string(),
            sync_port: 0,
            protocol_version: "1.0.0".to_string(),
        };

        let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());
        agent.register_device(&conn, &device_info).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn record_sync_cmd(
    db: State<DbConnection>,
    space_id: String,
    device_id: String,
    status: String,
    details: Option<String>,
) -> Result<(), String> {
    with_db!(db, conn, {
         let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
         let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());
         agent.record_sync_history(&conn, &space_id, "push", 0, 0, 0, status == "success", details.as_deref()).map_err(|e| e.to_string())?;
         Ok(())
    })
}

#[tauri::command]
pub fn get_all_sync_tasks_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SyncTask>, String> {
    with_db!(db, conn, {
        let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());
        agent.get_all_sync_tasks(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_sync_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<SyncStats, String> {
    with_db!(db, conn, {
        let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());
        agent.get_sync_stats(&conn, &space_id).map_err(|e| e.to_string())
    })
}

// --- Personal Modes Commands ---

#[tauri::command]
pub fn create_health_metric_cmd(
    db: State<DbConnection>,
    space_id: String,
    metric_type: String,
    value: f64,
    unit: String,
) -> Result<HealthMetric, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::create_health_metric(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, &metric_type, value, &unit, chrono::Utc::now().timestamp(), None, None).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_health_metrics_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<HealthMetric>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_health_metrics(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100, None).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_transaction_cmd(
    db: State<DbConnection>,
    space_id: String,
    amount: f64,
    category: String,
    description: String,
) -> Result<Transaction, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::create_transaction(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, "expense", amount, "USD", &category, "default", chrono::Utc::now().timestamp(), Some(&description)).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_transactions_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Transaction>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_transactions(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_recipe_cmd(
    db: State<DbConnection>,
    space_id: String,
    name: String,
    ingredients: String,
    instructions: String,
) -> Result<Recipe, String> {
    with_db!(db, conn, {
        let note = core_rs::note::create_note(&conn, &space_id, &name, &instructions).map_err(|e| e.to_string())?;
        core_rs::personal_modes::create_recipe(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, &note.id.to_string(), &name, 4, "medium").map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_recipes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Recipe>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_recipes(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_trip_cmd(
    db: State<DbConnection>,
    space_id: String,
    destination: String,
    start_date: i64,
    end_date: i64,
) -> Result<Trip, String> {
    with_db!(db, conn, {
        let note = core_rs::note::create_note(&conn, &space_id, &format!("Trip to {}", destination), "").map_err(|e| e.to_string())?;
        core_rs::personal_modes::create_trip(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, &note.id.to_string(), &format!("Trip to {}", destination), &destination, start_date, end_date).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_trips_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Trip>, String> {
    with_db!(db, conn, {
        core_rs::personal_modes::get_trips(&conn, Ulid::from_string(&space_id).map_err(|e| e.to_string())?, 100).map_err(|e| e.to_string())
    })
}

// --- Temporal Graph ---

#[tauri::command]
pub fn build_current_graph_cmd(db: State<DbConnection>, space_id: String) -> Result<core_rs::temporal_graph::GraphSnapshot, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::temporal_graph::build_current_graph(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_graph_evolution_cmd(db: State<DbConnection>, space_id: String, start: i64, end: i64) -> Result<Vec<GraphSnapshot>, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        let evolution = core_rs::temporal_graph::get_graph_evolution(&conn, space_ulid, start, end, 10).map_err(|e| e.to_string())?;
        Ok(evolution.snapshots)
    })
}

#[tauri::command]
pub fn detect_major_notes_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<core_rs::temporal_graph::GraphMilestone>, String> {
    with_db!(db, conn, {
        let space_ulid = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::temporal_graph::detect_major_notes(&conn, space_ulid).map_err(|e| e.to_string())
    })
}

// --- Collaboration ---

#[tauri::command]
pub fn init_rbac_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::init_rbac_tables(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_space_users_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SpaceUser>, String> {
    with_db!(db, conn, {
        core_rs::collaboration::get_space_users(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn check_permission_cmd(db: State<DbConnection>, user_id: String, space_id: String, permission: String) -> Result<bool, String> {
    with_db!(db, conn, {
        core_rs::collaboration::check_permission(&conn, &user_id, &space_id, &permission).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn invite_user_cmd(db: State<DbConnection>, space_id: String, email: String, role: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::invite_user(&conn, &space_id, &email, &role, "admin").map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn update_user_role_cmd(db: State<DbConnection>, space_id: String, user_id: String, new_role: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::update_user_role(&conn, &space_id, &user_id, &new_role, "system").map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn grant_permission_cmd(db: State<DbConnection>, role: String, permission: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::grant_permission(&conn, "default", &role, &permission).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn revoke_permission_cmd(db: State<DbConnection>, role: String, permission: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::revoke_permission(&conn, "default", &role, &permission).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn suspend_user_cmd(db: State<DbConnection>, user_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::suspend_user(&conn, "default", &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn activate_user_cmd(db: State<DbConnection>, user_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::activate_user(&conn, "default", &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_roles_cmd(db: State<DbConnection>) -> Result<Vec<Role>, String> {
    with_db!(db, conn, {
        core_rs::collaboration::get_roles(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn add_user_to_space_cmd(db: State<DbConnection>, user_id: String, space_id: String, role: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::add_user_to_space(&conn, &space_id, &user_id, "unknown@example.com", &role).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn remove_user_from_space_cmd(db: State<DbConnection>, user_id: String, space_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::collaboration::remove_user_from_space(&conn, &space_id, &user_id).map_err(|e| e.to_string())
    })
}

// --- Social Media Suite ---

#[tauri::command]
pub fn add_social_account_cmd(
    db: State<DbConnection>,
    space_id: String,
    platform: String,
    username: String,
) -> Result<SocialAccount, String> {
    with_db!(db, conn, {
        core_rs::social::add_social_account(&conn, &space_id, &platform, &username, None, "unknown", &[]).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_accounts_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SocialAccount>, String> {
    with_db!(db, conn, {
        core_rs::social::get_social_accounts(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_social_account_cmd(db: State<DbConnection>, account_id: String) -> Result<SocialAccount, String> {
    with_db!(db, conn, {
        core_rs::social::get_social_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Social account not found".to_string())
    })
}

#[tauri::command]
pub fn update_social_account_cmd(
    db: State<DbConnection>,
    account_id: String,
    username: String,
    cookies: Option<String>,
) -> Result<SocialAccount, String> {
    with_db!(db, conn, {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice());

        core_rs::social::update_social_account(
            &conn,
            &account_id,
            None,
            None,
            None,
            Some(&username),
            cookies.as_deref(),
            dek
        ).map_err(|e| e.to_string())?;

        core_rs::social::get_social_account(&conn, &account_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Social account not found".to_string())
    })
}

#[tauri::command]
pub fn delete_social_account_cmd(db: State<DbConnection>, account_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::social::delete_social_account(&conn, &account_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn store_social_posts_cmd(db: State<DbConnection>, account_id: String, posts: Vec<SocialPost>) -> Result<(), String> {
    with_db_mut!(db, conn, {
        core_rs::social::store_social_posts(&mut conn, &account_id, posts).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn get_unified_timeline_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<TimelinePost>, String> {
    with_db!(db, conn, {
        let filters = core_rs::social::TimelineFilters {
            limit: Some(limit as i64),
            ..Default::default()
        };
        core_rs::social::get_unified_timeline(&conn, &space_id, filters).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_category_cmd(db: State<DbConnection>, space_id: String, name: String, rules: String) -> Result<SocialCategory, String> {
    with_db!(db, conn, {
        let filters: Option<core_rs::social::CategoryFilters> = serde_json::from_str(&rules).ok();
        core_rs::social::create_category(&conn, &space_id, &name, None, None, filters).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_categories_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SocialCategory>, String> {
    with_db!(db, conn, {
        core_rs::social::get_categories(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn assign_category_cmd(db: State<DbConnection>, post_id: String, category_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::social::assign_category(&conn, &post_id, &category_id, "manual").map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_category_cmd(db: State<DbConnection>, category_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::social::delete_category(&conn, &category_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_timeline_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<TimelineStats, String> {
    with_db!(db, conn, {
        core_rs::social::get_timeline_stats(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_analytics_overview_cmd(db: State<DbConnection>, space_id: String) -> Result<AnalyticsOverview, String> {
    with_db!(db, conn, {
        let now = chrono::Utc::now().timestamp();
        core_rs::social::get_analytics_overview(&conn, &space_id, now - 30 * 24 * 60 * 60).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn search_social_posts_cmd(db: State<DbConnection>, query: String, space_id: String) -> Result<Vec<SocialPost>, String> {
    with_db!(db, conn, {
        core_rs::social::search_social_posts(&conn, &query, &space_id, None).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn auto_categorize_posts_cmd(db: State<DbConnection>, space_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::social::auto_categorize_posts(&conn, &space_id).map_err(|e| e.to_string())?;
        Ok(())
    })
}

#[tauri::command]
pub fn create_webview_session_cmd(db: State<DbConnection>, account_id: String) -> Result<WebViewSession, String> {
    with_db!(db, conn, {
        core_rs::social::create_webview_session(&conn, &account_id, "Mozilla/5.0", &[]).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_webview_session_cmd(db: State<DbConnection>, session_id: String) -> Result<WebViewSession, String> {
    with_db!(db, conn, {
        core_rs::social::get_webview_session(&conn, &session_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Session not found".to_string())
    })
}

#[tauri::command]
pub fn save_session_cookies_cmd(db: State<DbConnection>, session_id: String, cookies: String) -> Result<(), String> {
    with_db!(db, conn, {
        core_rs::social::save_session_cookies(&conn, &session_id, &cookies, &[]).map_err(|e| e.to_string())
    })
}

// --- Backup Commands ---

#[tauri::command]
pub fn create_backup_cmd(db: State<DbConnection>, space_id: String) -> Result<BackupMetadata, String> {
    with_db!(db, conn, {
         let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
         let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
         if dek.is_empty() { return Err("DEK not available".to_string()); }

        let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
        let backup_id = service.create_backup(&conn, dek, Some(&space_id)).map_err(|e| e.to_string())?;
        service.get_backup_details(&backup_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn restore_backup_cmd(db: State<DbConnection>, backup_id: String) -> Result<(), String> {
    with_db_mut!(db, conn, {
         let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
         let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);
         if dek.is_empty() { return Err("DEK not available".to_string()); }

        let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
        service.restore_backup(&backup_id, &mut conn, dek).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn list_backups_cmd(_db: State<DbConnection>, _space_id: String) -> Result<Vec<BackupMetadata>, String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    let backups = service.list_backups().map_err(|e| e.to_string())?;
    Ok(backups.into_iter().map(|(_, m)| m).collect())
}

#[tauri::command]
pub fn delete_backup_cmd(_db: State<DbConnection>, backup_id: String) -> Result<(), String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    service.delete_backup(&backup_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_backup_details_cmd(_db: State<DbConnection>, backup_id: String) -> Result<BackupMetadata, String> {
    let service = BackupService::new(std::path::PathBuf::from("backups")).map_err(|e| e.to_string())?;
    service.get_backup_details(&backup_id).map_err(|e| e.to_string())
}

// --- Auth Commands ---

#[tauri::command]
pub fn create_user_cmd(db: State<DbConnection>, username: String, email: String, password: String) -> Result<User, String> {
    with_db!(db, conn, {
        AuthService::create_user(&conn, &username, &email, &password).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn authenticate_user_cmd(db: State<DbConnection>, username: String, password: String) -> Result<Session, String> {
     with_db!(db, conn, {
        AuthService::authenticate(&conn, &username, &password).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn validate_session_cmd(db: State<DbConnection>, token: String) -> Result<String, String> {
     with_db!(db, conn, {
        AuthService::validate_session(&conn, &token).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn logout_user_cmd(db: State<DbConnection>, token: String) -> Result<(), String> {
     with_db!(db, conn, {
        AuthService::logout(&conn, &token).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_user_by_id_cmd(db: State<DbConnection>, user_id: String) -> Result<User, String> {
     with_db!(db, conn, {
        AuthService::get_user(&conn, &user_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn change_password_cmd(db: State<DbConnection>, user_id: String, old_pass: String, new_pass: String) -> Result<(), String> {
     with_db!(db, conn, {
        AuthService::change_password(&conn, &user_id, &old_pass, &new_pass).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_current_user_cmd(db: State<DbConnection>, token: String) -> Result<User, String> {
     with_db!(db, conn, {
        let user_id = AuthService::validate_session(&conn, &token).map_err(|e| e.to_string())?;
        AuthService::get_user(&conn, &user_id).map_err(|e| e.to_string())
    })
}

// --- Sync Discovery (Mobile) & P2P Commands ---

#[tauri::command]
pub fn discover_devices_cmd(db: State<DbConnection>) -> Result<Vec<DiscoveredDevice>, String> {
    let guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;
    if let Some(sync) = guard.as_ref() {
        sync.discover_peers().map_err(|e| e.to_string())
    } else {
        Err("P2P sync not initialized".to_string())
    }
}

#[tauri::command]
pub async fn initiate_pairing_cmd(db: State<'_, DbConnection>, device_id: String) -> Result<(), String> {
    let p2p_sync = {
        let guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;
        guard.clone()
    };

    if let Some(sync) = p2p_sync {
        sync.initiate_pairing(&device_id).await.map_err(|e| e.to_string())
    } else {
        Err("P2P Sync not initialized".to_string())
    }
}

#[tauri::command]
pub fn exchange_keys_cmd(_db: State<DbConnection>, _device_id: String) -> Result<(), String> {
     // Placeholder for key exchange if separate from pairing
    Ok(())
}

#[tauri::command]
pub fn get_sync_progress_cmd(_db: State<DbConnection>, _device_id: String) -> Result<f32, String> {
    Ok(0.0) // Placeholder
}

#[tauri::command]
pub fn shutdown_clear_keys_cmd(db: State<DbConnection>) -> Result<(), String> {
    let mut dek = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
    *dek = None;
    Ok(())
}

#[tauri::command]
pub fn cancel_sync_cmd(device_id: String) -> Result<bool, String> {
    log::info!("[sync] Cancelled sync with device: {}", device_id);
    Ok(true)
}

#[tauri::command]
pub fn resolve_sync_conflict_cmd(
    db: State<DbConnection>,
    conflict: DbSyncConflict,
    resolution: SyncConflictResolution,
) -> Result<(), String> {
    let pool_guard = db.pool.lock().map_err(|_| "Failed to lock database pool state".to_string())?;
    let pool = pool_guard.as_ref().ok_or_else(|| "Database pool not initialized (Vault locked)".to_string())?;
    let conn = pool.get().map_err(|e| format!("Failed to get connection from pool: {}", e))?;

    let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
    let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);

    if dek.is_empty() {
        return Err("DEK not available (Vault locked or error)".to_string());
    }

    let device_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
    let agent = SyncAgent::new(device_id, "Desktop".to_string(), AppConfig::sync_port());

    agent
        .resolve_conflict(&conn, &conflict, resolution, dek)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn start_sync_server_cmd(db: State<'_, DbConnection>) -> Result<(), String> {
    let p2p_sync = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?.clone();
    if let Some(p2p_sync) = p2p_sync {
        let port = {
            let pool_guard = db.pool.lock().map_err(|_| "Failed to lock database pool state".to_string())?;
            let pool = pool_guard.as_ref().ok_or_else(|| "Database pool not initialized".to_string())?;
            let conn = pool.get().map_err(|e| format!("Failed to get connection from pool: {}", e))?;

            core_rs::db::get_sync_port(&conn).unwrap_or_else(|_| AppConfig::sync_port())
        };
        tokio::spawn(async move {
            if let Err(e) = p2p_sync.start_server(port).await {
                log::error!("[p2p] Failed to start sync server: {}", e);
            }
        });
    }
    Ok(())
}

#[tauri::command]
pub async fn start_p2p_sync_cmd(db: State<'_, DbConnection>, device_id: String) -> Result<(), String> {
    let p2p_sync = {
        let guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;
        guard.clone()
    };

    if let Some(sync) = p2p_sync {
        sync.start_sync(&device_id).await.map_err(|e| e.to_string())
    } else {
        Err("P2P Sync not initialized (Vault locked?)".to_string())
    }
}

#[tauri::command]
pub fn get_devices_cmd(db: State<DbConnection>) -> Result<Vec<core_rs::sync::mobile_sync::DeviceInfo>, String> {
    with_db!(db, conn, {
        let device_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let sync_port = core_rs::db::get_sync_port(&conn).unwrap_or_else(|_| AppConfig::sync_port());
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);

        let devices = agent.get_devices(&conn).map_err(|e| e.to_string())?;
        Ok(devices.into_iter().map(|d| core_rs::sync::mobile_sync::DeviceInfo {
            device_id: d.device_id,
            device_name: d.device_name,
            device_type: core_rs::sync::mobile_sync::DeviceType::Mobile,
            ip_address: d.sync_address.parse().unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(0,0,0,0))),
            sync_port: d.sync_port,
            public_key: vec![],
            os_version: "unknown".to_string(),
            last_seen: chrono::DateTime::from_timestamp(d.last_seen, 0).unwrap_or_default(),
            is_active: true,
        }).collect())
    })
}

#[tauri::command]
pub fn get_sync_conflicts_cmd(db: State<DbConnection>) -> Result<Vec<DbSyncConflict>, String> {
    with_db!(db, conn, {
        let device_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let sync_port = core_rs::db::get_sync_port(&conn).unwrap_or_else(|_| AppConfig::sync_port());
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
        agent.get_unresolved_conflicts(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_sync_history_for_space_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<SyncHistoryEntry>, String> {
    with_db!(db, conn, {
         let device_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
         let sync_port = core_rs::db::get_sync_port(&conn).unwrap_or_else(|_| AppConfig::sync_port());
         let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
         agent.get_sync_history(&conn, &space_id, limit).map_err(|e| e.to_string())
    })
}

// --- Goal & Habit Commands ---

#[tauri::command]
pub fn create_goal_cmd(db: State<DbConnection>, space_id: String, title: String, target: f64, category: String) -> Result<Goal, String> {
    with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::goals::create_goal(&conn, space_id, &title, target, &category).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_goals_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Goal>, String> {
    with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::goals::get_goals(&conn, space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn update_goal_progress_cmd(db: State<DbConnection>, goal_id: String, current: f64) -> Result<Goal, String> {
    with_db!(db, conn, {
        let goal_id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        core_rs::goals::update_goal_progress(&conn, goal_id, current).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_goal_cmd(db: State<DbConnection>, goal_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        core_rs::goals::delete_goal(&conn, id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn create_habit_cmd(db: State<DbConnection>, space_id: String, name: String, frequency: String) -> Result<Habit, String> {
    with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::habits::create_habit(&conn, space_id, &name, &frequency).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_habits_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Habit>, String> {
    with_db!(db, conn, {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        core_rs::habits::get_habits(&conn, space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn complete_habit_cmd(db: State<DbConnection>, habit_id: String) -> Result<Habit, String> {
    with_db!(db, conn, {
        let habit_id = Ulid::from_string(&habit_id).map_err(|e| e.to_string())?;
        core_rs::habits::complete_habit(&conn, habit_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn delete_habit_cmd(db: State<DbConnection>, habit_id: String) -> Result<(), String> {
    with_db!(db, conn, {
        let habit_id = Ulid::from_string(&habit_id).map_err(|e| e.to_string())?;
        core_rs::habits::delete_habit(&conn, habit_id).map_err(|e| e.to_string())
    })
}
