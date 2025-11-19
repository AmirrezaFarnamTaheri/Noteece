// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;

use config::AppConfig;
use core_rs::analytics::{get_analytics_data, AnalyticsData};
use core_rs::caldav::{
    add_caldav_account, delete_caldav_account, get_caldav_account, get_caldav_accounts,
    get_sync_history as get_caldav_sync_history, get_unresolved_conflicts as get_caldav_conflicts,
    resolve_conflict as resolve_caldav_conflict, sync_caldav_account, update_caldav_account,
    CalDavAccount, ConflictResolution as CalDavConflictResolution,
    SyncConflict as CalDavSyncConflict, SyncDirection, SyncResult,
};
use core_rs::db::get_sync_port;
use core_rs::collaboration::{
    activate_user, add_user_to_space, check_permission, get_roles, get_space_users,
    grant_permission, init_rbac_tables, invite_user, remove_user_from_space, revoke_permission,
    suspend_user, update_user_role, CollaborationError, Role, SpaceUser, UserInvitation,
};
use core_rs::sync::discovery::{DiscoveryService, DiscoveredDevice};
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
    add_social_account, assign_category, auto_categorize_posts, create_category,
    create_webview_session, delete_category, delete_social_account,
    get_accounts_needing_sync as get_social_accounts_needing_sync, get_all_sync_tasks,
    get_categories, get_platform_display_name, get_platform_url, get_social_account,
    get_social_accounts, get_sync_history, get_sync_stats, get_timeline_stats,
    get_unified_timeline, get_webview_session, save_session_cookies, search_social_posts,
    store_social_posts, update_social_account, AnalyticsOverview, CategoryFilters,
    get_analytics_overview, SocialAccount, SocialCategory, SocialPost, SyncStats, SyncStatus,
    SyncTask, TimelineFilters, TimelinePost, TimelineStats, WebViewSession,
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
    build_current_graph, detect_major_notes, get_graph_evolution, GraphEvolution, GraphMilestone,
    GraphSnapshot,
};
use core_rs::time_tracking::{
    create_manual_time_entry, delete_time_entry, get_project_time_entries, get_project_time_stats,
    get_recent_time_entries, get_running_entries, get_task_time_entries, get_task_time_stats,
    start_time_entry, stop_time_entry, TimeEntry, TimeStats,
};
use core_rs::vault::{create_vault, unlock_vault, Vault};
use core_rs::db::get_or_create_user_id;
use core_rs::weekly_review::generate_weekly_review;
use core_rs::auth::{AuthService, User, Session};
use core_rs::social::backup::{BackupService, BackupMetadata};
use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};
use ulid::Ulid;
use zeroize::{Zeroize, Zeroizing};
use core_rs::sync::p2p::P2pSync;

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
    pub dek: Mutex<Option<SecureDek>>,
    pub p2p_sync: Mutex<Option<Arc<P2pSync>>>,
}

#[tauri::command]
fn create_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    let mut conn_guard = db.conn.lock().unwrap();
    if conn_guard.is_some() {
        let mut dek_guard = db.dek.lock().unwrap();
        *dek_guard = None;
        *conn_guard = None;
    }

    let vault = create_vault(path, password).map_err(|e| e.to_string())?;
    *conn_guard = Some(vault.conn);

    Ok(())
}

#[tauri::command]
fn unlock_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    let mut conn_guard = db.conn.lock().unwrap();
    if conn_guard.is_some() {
        let mut dek_guard = db.dek.lock().unwrap();
        *dek_guard = None;
        *conn_guard = None;
    }

    let vault = unlock_vault(path, password).map_err(|e| e.to_string())?;
    *conn_guard = Some(vault.conn);

    let device_info = {
        let conn = conn_guard.as_ref().unwrap();
        let device_id = get_or_create_user_id(conn).unwrap_or_default();
        core_rs::sync::mobile_sync::DeviceInfo {
            device_id,
            device_name: "Desktop".to_string(),
            device_type: core_rs::sync::mobile_sync::DeviceType::Desktop,
            ip_address: "127.0.0.1".parse().unwrap(),
            sync_port: 8765,
            public_key: vec![],
            os_version: std::env::consts::OS.to_string(),
            last_seen: chrono::Utc::now(),
            is_active: true,
        }
    };
    let mut p2p_sync_guard = db.p2p_sync.lock().unwrap();
    *p2p_sync_guard = Some(Arc::new(P2pSync::new(device_info).unwrap()));

    Ok(())
}

#[tauri::command]
fn cancel_sync_cmd(device_id: String) -> Result<bool, String> {
    log::info!("[sync] Cancelled sync with device: {}", device_id);
    Ok(true)
}

#[tauri::command]
fn get_or_create_user_id_cmd(db: State<DbConnection>) -> Result<String, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        get_or_create_user_id(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
async fn start_sync_server_cmd(db: State<'_, DbConnection>) -> Result<(), String> {
    let p2p_sync = db.p2p_sync.lock().unwrap().clone();
    if let Some(p2p_sync) = p2p_sync {
        let port = {
            let conn = db.conn.lock().unwrap();
            if let Some(conn) = conn.as_ref() {
                get_sync_port(conn).unwrap_or(8765)
            } else {
                8765
            }
        };
        tokio::spawn(async move {
            if let Err(e) = p2p_sync.start_server(port).await {
                log::error!("[p2p] Failed to start sync server: {}", e);
            }
        });
    }
    Ok(())
}

fn main() {
    AppConfig::init();

    tauri::Builder::default()
        .manage(DbConnection {
            conn: Mutex::new(None),
            dek: Mutex::new(None),
            p2p_sync: Mutex::new(None),
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                if let Some(app) = event.window().app_handle().try_state::<DbConnection>() {
                    if let Ok(mut dek_guard) = app.dek.lock() {
                        *dek_guard = None;
                    }
                }
            }
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
            open_social_webview,
            handle_extracted_data,
            save_webview_cookies,
            get_webview_session_cmd,
            get_sync_tasks_cmd,
            get_all_sync_tasks_cmd,
            get_social_sync_history_cmd,
            get_sync_stats_cmd,
            create_backup_cmd,
            restore_backup_cmd,
            list_backups_cmd,
            delete_backup_cmd,
            get_backup_details_cmd,
            create_user_cmd,
            authenticate_user_cmd,
            validate_session_cmd,
            logout_user_cmd,
            get_user_by_id_cmd,
            change_password_cmd,
            get_current_user_cmd,
            discover_devices_cmd,
            initiate_pairing_cmd,
            exchange_keys_cmd,
            start_sync_cmd,
            get_sync_progress_cmd,
            cancel_sync_cmd,
            get_or_create_user_id_cmd,
            start_sync_server_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
