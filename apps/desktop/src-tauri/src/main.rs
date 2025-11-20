// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;

use config::AppConfig;
use core_rs::analytics::*;
use core_rs::caldav::*;
use core_rs::db::*;
use core_rs::collaboration::*;
use core_rs::sync::discovery::*;
use core_rs::foresight::*;
use core_rs::form::*;
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
fn resolve_sync_conflict_cmd(
    db: State<DbConnection>,
    conflict: SyncConflict,
    resolution: SyncConflictResolution,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let dek_guard = db.dek.lock().unwrap();
        let dek = dek_guard.as_ref().map(|d| d.as_slice()).unwrap_or(&[]);

        let device_id = get_or_create_user_id(conn).map_err(|e| e.to_string())?;
        // Use dynamic device name/port if possible, or defaults
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), 8765);

        agent
            .resolve_conflict(conn, &conflict, resolution, dek)
            .map_err(|e| e.to_string())
    } else {
        Err("Database connection not available".to_string())
    }
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
            get_project,
            get_projects_in_space,
            get_project_milestones,
            get_project_risks,
            get_project_updates,
            create_project_risk,
            create_saved_search,
            get_saved_search,
            get_saved_searches,
            update_saved_search,
            delete_saved_search,
            execute_saved_search,
            generate_weekly_review,
            get_space_modes,
            enable_mode,
            disable_mode,
            create_note,
            get_note,
            update_note_content,
            trash_note,
            create_task,
            get_task,
            update_task,
            delete_task,
            get_tasks_by_project,
            get_due_cards,
            review_card,
            get_all_notes_in_space,
            get_all_tasks_in_space,
            import_from_obsidian,
            import_from_notion,
            create_form_template,
            get_form_template,
            get_form_templates_for_space,
            update_form_template,
            delete_form_template,
            get_analytics_data,
            search_notes,
            get_or_create_daily_note,
            get_all_spaces,
            get_all_tags_in_space,
            get_upcoming_tasks,
            get_recent_notes,
            start_time_entry,
            stop_time_entry,
            get_task_time_entries,
            get_project_time_entries,
            get_running_entries,
            get_recent_time_entries,
            get_task_time_stats,
            get_project_time_stats,
            delete_time_entry,
            create_manual_time_entry,
            queue_ocr,
            get_ocr_status,
            search_ocr_text,
            process_ocr_job,
            generate_insights,
            get_active_insights,
            dismiss_insight,
            record_feedback,
            add_caldav_account,
            get_caldav_accounts,
            get_caldav_account,
            update_caldav_account,
            delete_caldav_account,
            sync_caldav_account,
            get_caldav_sync_history,
            get_caldav_conflicts,
            resolve_caldav_conflict,
            init_sync_tables,
            get_devices,
            register_device,
            get_sync_history_for_space,
            get_sync_conflicts,
            resolve_sync_conflict_cmd,
            record_sync,
            create_health_metric,
            get_health_metrics,
            create_transaction,
            get_transactions,
            create_recipe,
            get_recipes,
            create_trip,
            get_trips,
            build_current_graph,
            get_graph_evolution,
            detect_major_notes,
            shutdown_clear_keys,
            init_rbac_tables,
            get_space_users,
            check_permission,
            invite_user,
            update_user_role,
            grant_permission,
            revoke_permission,
            suspend_user,
            activate_user,
            get_roles,
            add_user_to_space,
            remove_user_from_space,
            add_social_account,
            get_social_accounts,
            get_social_account,
            update_social_account,
            delete_social_account,
            store_social_posts,
            get_unified_timeline,
            create_category,
            get_categories,
            assign_category,
            delete_category,
            get_timeline_stats,
            get_analytics_overview,
            search_social_posts,
            auto_categorize_posts,
            create_webview_session,
            get_webview_session,
            save_session_cookies,
            get_all_sync_tasks,
            get_sync_stats,
            create_backup,
            restore_backup,
            list_backups,
            delete_backup,
            get_backup_details,
            create_user,
            authenticate_user,
            validate_session,
            logout_user,
            get_user_by_id,
            change_password,
            get_current_user,
            discover_devices,
            initiate_pairing,
            exchange_keys,
            start_sync,
            get_sync_progress,
            cancel_sync_cmd,
            get_or_create_user_id_cmd,
            start_sync_server_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
