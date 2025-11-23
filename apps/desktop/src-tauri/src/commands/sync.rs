use crate::state::DbConnection;
use core_rs::sync_agent::{
    SyncAgent, SyncConflict as DbSyncConflict, ConflictResolution as SyncConflictResolution, SyncHistoryEntry, SyncStats,
    SyncTask,
};
use core_rs::sync::discovery::DiscoveredDevice;
use crate::config::AppConfig;
use tauri::State;

#[tauri::command]
pub fn init_sync_tables_cmd(db: State<DbConnection>) -> Result<(), String> {
    crate::with_db!(db, conn, {
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
    crate::with_db!(db, conn, {
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
    crate::with_db!(db, conn, {
         let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
         let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());

         let params = core_rs::sync::history::SyncRecordParams {
             device_id: &device_id,
             space_id: &space_id,
             direction: "push",
             entities_pushed: 0,
             entities_pulled: 0,
             conflicts: 0,
             success: status == "success",
             error_message: details.as_deref(),
         };

         agent.record_sync_history(&conn, params).map_err(|e| e.to_string())?;
         Ok(())
    })
}

#[tauri::command]
pub fn get_all_sync_tasks_cmd(db: State<DbConnection>, space_id: String) -> Result<Vec<SyncTask>, String> {
    crate::with_db!(db, conn, {
        let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());
        agent.get_all_sync_tasks(&conn, &space_id).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_sync_stats_cmd(db: State<DbConnection>, space_id: String) -> Result<SyncStats, String> {
    crate::with_db!(db, conn, {
        let user_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let agent = SyncAgent::new(user_id, "Desktop".to_string(), AppConfig::sync_port());
        agent.get_sync_stats(&conn, &space_id).map_err(|e| e.to_string())
    })
}

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
    crate::with_db!(db, conn, {
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
    crate::with_db!(db, conn, {
        let device_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
        let sync_port = core_rs::db::get_sync_port(&conn).unwrap_or_else(|_| AppConfig::sync_port());
        let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
        agent.get_unresolved_conflicts(&conn).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_sync_history_for_space_cmd(db: State<DbConnection>, space_id: String, limit: u32) -> Result<Vec<SyncHistoryEntry>, String> {
    crate::with_db!(db, conn, {
         let device_id = core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())?;
         let sync_port = core_rs::db::get_sync_port(&conn).unwrap_or_else(|_| AppConfig::sync_port());
         let agent = SyncAgent::new(device_id, "Desktop".to_string(), sync_port);
         agent.get_sync_history(&conn, &space_id, limit).map_err(|e| e.to_string())
    })
}
