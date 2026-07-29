// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod concurrency_tests;
mod config;
mod db_pool;
mod state;

use commands::*;
use config::AppConfig;
use state::DbConnection;
use std::sync::Mutex;
use tauri::Manager;

#[macro_export]
macro_rules! with_db {
    ($db:expr, $conn:ident, $block:block) => {{
        let pool_guard = $db.pool.lock().map_err(|_| "Failed to lock database pool".to_string())?;
        let pool = pool_guard.as_ref().ok_or_else(|| "Database not initialized. Please unlock the vault.".to_string())?;
        let mut $conn = pool.get().map_err(|e| format!("Failed to get connection from pool: {}", e))?;
        $block
    }};
}

#[macro_export]
macro_rules! with_db_mut {
    ($db:expr, $conn:ident, $block:block) => {{
        $crate::with_db!($db, $conn, $block)
    }};
}

fn main() {
    AppConfig::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(DbConnection {
            pool: Mutex::new(None),
            dek: Mutex::new(None),
            p2p_sync: Mutex::new(None),
            vault_path: Mutex::new(None),
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
            // Existing command exports retained by the original list.
            create_vault_cmd,
            unlock_vault_cmd,
            get_dashboard_stats_cmd,
            create_note_cmd,
            get_note_cmd,
            update_note_content_cmd,
            trash_note_cmd,
            create_task_cmd,
            get_task_cmd,
            update_task_cmd,
            delete_task_cmd,
            get_tasks_by_project_cmd,
            get_all_tasks_in_space_cmd,
            get_upcoming_tasks_cmd,
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
            create_webview_session_cmd,
            get_webview_session_cmd,
            save_session_cookies_cmd,
            get_all_sync_tasks_cmd,
            get_sync_stats_cmd,
            start_p2p_sync_cmd,
            create_backup_cmd,
            restore_backup_cmd,
            list_backups_cmd,
            delete_backup_cmd,
            get_backup_details_cmd,
            generate_insights_cmd,
            get_active_insights_cmd,
            dismiss_insight_cmd,
            record_feedback_cmd,
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
            start_time_entry_cmd,
            stop_time_entry_cmd,
            get_task_time_entries_cmd,
            get_project_time_entries_cmd,
            get_task_time_stats_cmd,
            get_project_time_stats_cmd,
            check_ollama_connection_cmd,
            list_ollama_models_cmd,
            chat_with_ollama_cmd,
            test_cloud_provider_cmd,
            get_ai_config_cmd,
            save_ai_config_cmd,
            queue_ocr_cmd,
            get_ocr_status_cmd,
            search_ocr_text_cmd,
            process_ocr_job_cmd,
            // Compatibility surface validated by scripts/check-ipc-contract.mjs.
            get_task_summaries_cmd,
            batch_update_tasks_cmd,
            get_note_summaries_cmd,
            create_social_category_cmd,
            get_social_categories_cmd,
            assign_social_category_cmd,
            delete_social_category_cmd,
            get_unified_timeline,
            open_social_webview,
            get_sync_tasks_cmd,
            sync_with_device_cmd,
            complete_goal_cmd,
            create_note_for_recipe_cmd,
            create_note_for_trip_cmd,
            get_finance_stats_cmd,
            get_gamification_data_cmd,
            use_streak_freeze_cmd,
            get_rag_stats_cmd,
            rag_query_cmd,
            get_time_distribution_cmd,
            get_temporal_correlations_cmd,
            record_insight_feedback_cmd,
            process_ocr_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
