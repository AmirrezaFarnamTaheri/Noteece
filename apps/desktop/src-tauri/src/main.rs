// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod commands;

use config::AppConfig;
use commands::*;
use core_rs::analytics::*;
use core_rs::caldav::*;
use core_rs::db::*;
use core_rs::collaboration::*;
use core_rs::sync::discovery::*;
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
use core_rs::social::*;
use core_rs::space::*;
use core_rs::srs::*;
use core_rs::sync_agent::*;
use core_rs::tag::*;
use core_rs::task::*;
use core_rs::temporal_graph::*;
use core_rs::time_tracking::*;
use core_rs::vault::{create_vault, unlock_vault, Vault};
use core_rs::weekly_review::generate_weekly_review;
use core_rs::auth::{AuthService, User, Session};
use core_rs::social::backup::{BackupService, BackupMetadata};
use core_rs::dashboard::*;
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
    let mut conn_guard = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if conn_guard.is_some() {
        let mut dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        *dek_guard = None;
        *conn_guard = None;
    }

    let vault = create_vault(path, password).map_err(|e| e.to_string())?;
    *conn_guard = Some(vault.conn);

    Ok(())
}

#[tauri::command]
fn unlock_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    let mut conn_guard = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if conn_guard.is_some() {
        let mut dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        *dek_guard = None;
        *conn_guard = None;
    }

    let vault = unlock_vault(path, password).map_err(|e| e.to_string())?;
    *conn_guard = Some(vault.conn);

    let device_info = {
        let conn = conn_guard.as_ref().ok_or("Database connection failed to initialize")?;
        let device_id = get_or_create_user_id(conn).unwrap_or_default();
        core_rs::sync::mobile_sync::DeviceInfo {
            device_id,
            device_name: "Desktop".to_string(),
            device_type: core_rs::sync::mobile_sync::DeviceType::Desktop,
            ip_address: "127.0.0.1".parse().unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))),
            sync_port: AppConfig::sync_port(),
            public_key: vec![],
            os_version: std::env::consts::OS.to_string(),
            last_seen: chrono::Utc::now(),
            is_active: true,
        }
    };
    let mut p2p_sync_guard = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?;
    *p2p_sync_guard = Some(Arc::new(P2pSync::new(device_info).map_err(|e| e.to_string())?));

    Ok(())
}

#[tauri::command]
fn cancel_sync_cmd(device_id: String) -> Result<bool, String> {
    log::info!("[sync] Cancelled sync with device: {}", device_id);
    Ok(true)
}

#[tauri::command]
fn resolve_sync_conflict_cmd(
    db: State<DbConnection>,
    conflict: SyncConflict,
    resolution: SyncConflictResolution,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let dek_guard = db.dek.lock().map_err(|_| "Failed to lock DEK".to_string())?;
        let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);

        if dek.is_empty() {
            return Err("DEK not available (Vault locked or error)".to_string());
        }

        let device_id = get_or_create_user_id(conn).map_err(|e| e.to_string())?;
        // Use dynamic device name/port if possible, or defaults
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), AppConfig::sync_port());

        agent
            .resolve_conflict(conn, &conflict, resolution, dek)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_dashboard_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<DashboardStats, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        get_dashboard_stats(conn, &space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_or_create_user_id_cmd(db: State<DbConnection>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        get_or_create_user_id(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
async fn start_sync_server_cmd(db: State<'_, DbConnection>) -> Result<(), String> {
    let p2p_sync = db.p2p_sync.lock().map_err(|_| "Failed to lock P2P sync".to_string())?.clone();
    if let Some(p2p_sync) = p2p_sync {
        let port = {
            let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
            if let Some(conn) = conn.as_ref() {
                get_sync_port(conn).unwrap_or_else(|_| AppConfig::sync_port())
            } else {
                AppConfig::sync_port()
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

#[tauri::command]
async fn start_p2p_sync_cmd(db: State<'_, DbConnection>, device_id: String) -> Result<(), String> {
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
fn get_devices_cmd(db: State<DbConnection>) -> Result<Vec<core_rs::sync::mobile_sync::DeviceInfo>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let device_id = get_or_create_user_id(conn).map_err(|e| e.to_string())?;
        let sync_port = get_sync_port(conn).unwrap_or_else(|_| AppConfig::sync_port());
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
        agent.get_devices(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_sync_conflicts_cmd(db: State<DbConnection>) -> Result<Vec<SyncConflict>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let device_id = get_or_create_user_id(conn).map_err(|e| e.to_string())?;
        let sync_port = get_sync_port(conn).unwrap_or_else(|_| AppConfig::sync_port());
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
        agent.get_unresolved_conflicts(conn).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_sync_history_for_space_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<SyncHistoryEntry>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
         let device_id = get_or_create_user_id(conn).map_err(|e| e.to_string())?;
         let sync_port = get_sync_port(conn).unwrap_or_else(|_| AppConfig::sync_port());
         let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
         agent.get_sync_history(conn, &space_id, limit).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_goal_cmd(db: State<DbConnection>, space_id: String, title: String, target: f64, category: String) -> Result<Goal, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        create_goal(conn, space_id, &title, target, &category).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_goals_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Goal>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        get_goals(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn update_goal_progress_cmd(db: State<DbConnection>, goal_id: String, current: f64) -> Result<Goal, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let goal_id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        update_goal_progress(conn, goal_id, current).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_goal_cmd(db: State<DbConnection>, goal_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let goal_id = Ulid::from_string(&goal_id).map_err(|e| e.to_string())?;
        delete_goal(conn, goal_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn create_habit_cmd(db: State<DbConnection>, space_id: String, name: String, frequency: String) -> Result<Habit, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        create_habit(conn, space_id, &name, &frequency).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn get_habits_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<Habit>, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let space_id = Ulid::from_string(&space_id).map_err(|e| e.to_string())?;
        get_habits(conn, space_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn complete_habit_cmd(db: State<DbConnection>, habit_id: String) -> Result<Habit, String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let habit_id = Ulid::from_string(&habit_id).map_err(|e| e.to_string())?;
        complete_habit(conn, habit_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
}

#[tauri::command]
fn delete_habit_cmd(db: State<DbConnection>, habit_id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|_| "Failed to lock database connection".to_string())?;
    if let Some(conn) = conn.as_ref() {
        let habit_id = Ulid::from_string(&habit_id).map_err(|e| e.to_string())?;
        delete_habit(conn, habit_id).map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
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
            get_projects_in_space_cmd,
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
            process_ocr_job_cmd,
            generate_insights_cmd,
            get_active_insights_cmd,
            dismiss_insight_cmd,
            record_feedback_cmd,
            add_caldav_account_cmd,
            get_caldav_accounts_cmd,
            get_caldav_account_cmd,
            update_caldav_account_cmd,
            delete_caldav_account_cmd,
            sync_caldav_account_cmd,
            get_caldav_sync_history_cmd,
            get_caldav_conflicts_cmd,
            resolve_caldav_conflict_cmd,
            init_sync_tables_cmd,
            get_devices_cmd,
            register_device_cmd,
            get_sync_history_for_space_cmd,
            get_sync_conflicts_cmd,
            resolve_sync_conflict_cmd,
            record_sync_cmd,
            start_p2p_sync_cmd,
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
            create_category_cmd,
            get_categories_cmd,
            assign_category_cmd,
            delete_category_cmd,
            get_timeline_stats_cmd,
            get_analytics_overview_cmd,
            search_social_posts_cmd,
            auto_categorize_posts_cmd,
            create_webview_session_cmd,
            get_webview_session_cmd,
            save_session_cookies_cmd,
            get_all_sync_tasks_cmd,
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
            get_sync_progress_cmd,
            cancel_sync_cmd,
            get_or_create_user_id_cmd,
            start_sync_server_cmd,
            get_dashboard_stats_cmd,
            create_goal_cmd,
            get_goals_cmd,
            update_goal_progress_cmd,
            delete_goal_cmd,
            create_habit_cmd,
            get_habits_cmd,
            complete_habit_cmd,
            delete_habit_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
