use crate::state::DbConnection;
use core_rs::analytics::AnalyticsData;
use core_rs::dashboard::DashboardStats;
use tauri::State;

#[tauri::command]
pub fn get_analytics_data_cmd(db: State<DbConnection>) -> Result<AnalyticsData, String> {
    crate::with_db!(db, conn, {
        core_rs::analytics::get_analytics_data(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_dashboard_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<DashboardStats, String> {
    crate::with_db!(db, conn, {
        core_rs::dashboard::get_dashboard_stats(&conn, &space_id).map_err(|e| e.to_string())
    })
}
