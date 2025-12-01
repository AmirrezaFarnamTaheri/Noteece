use crate::config::AppConfig;
use crate::db_pool::EncryptedConnectionManager;
use crate::state::{DbConnection, SecureDek};
use core_rs::sync::p2p::P2pSync;
use core_rs::vault::{create_vault, unlock_vault};
use r2d2::Pool;
use std::path::Path;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub fn create_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    // Lock everything to reset
    let mut pool_guard = db
        .pool
        .lock()
        .map_err(|_| "Failed to lock database pool".to_string())?;
    let mut dek_guard = db
        .dek
        .lock()
        .map_err(|_| "Failed to lock DEK".to_string())?;
    let mut p2p_sync_guard = db
        .p2p_sync
        .lock()
        .map_err(|_| "Failed to lock P2P sync".to_string())?;

    *pool_guard = None;
    *dek_guard = None;
    *p2p_sync_guard = None;

    // Create vault (returns conn and dek)
    let vault = create_vault(path, password).map_err(|e| e.to_string())?;

    // Store DEK
    *dek_guard = Some(SecureDek::new(vault.dek.to_vec()));

    // Create Pool
    let manager = EncryptedConnectionManager::new(Path::new(path).join("vault.sqlite3"), vault.dek);
    let pool = Pool::builder()
        .max_size(10) // Default to 10 connections
        .build(manager)
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    *pool_guard = Some(pool);

    Ok(())
}

#[tauri::command]
pub fn unlock_vault_cmd(db: State<DbConnection>, path: &str, password: &str) -> Result<(), String> {
    let mut pool_guard = db
        .pool
        .lock()
        .map_err(|_| "Failed to lock database pool".to_string())?;
    let mut dek_guard = db
        .dek
        .lock()
        .map_err(|_| "Failed to lock DEK".to_string())?;
    let mut p2p_sync_guard = db
        .p2p_sync
        .lock()
        .map_err(|_| "Failed to lock P2P sync".to_string())?;

    *pool_guard = None;
    *dek_guard = None;
    *p2p_sync_guard = None;

    let vault = unlock_vault(path, password).map_err(|e| e.to_string())?;

    *dek_guard = Some(SecureDek::new(vault.dek.to_vec()));

    let manager = EncryptedConnectionManager::new(Path::new(path).join("vault.sqlite3"), vault.dek);
    let pool = Pool::builder()
        .max_size(10)
        .build(manager)
        .map_err(|e| format!("Failed to create connection pool: {}", e))?;

    *pool_guard = Some(pool.clone());

    // Initialize P2P Sync
    // Get a connection from the pool for initialization
    let conn = pool
        .get()
        .map_err(|e| format!("Failed to get connection for P2P init: {}", e))?;

    let device_id = core_rs::db::get_or_create_user_id(&conn).unwrap_or_default();
    let device_info = core_rs::sync::mobile_sync::DeviceInfo {
        device_id,
        device_name: "Desktop".to_string(),
        device_type: core_rs::sync::mobile_sync::DeviceType::Desktop,
        ip_address: "127.0.1.1"
            .parse()
            .unwrap_or_else(|_| std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))),
        sync_port: AppConfig::sync_port(),
        public_key: vec![],
        os_version: std::env::consts::OS.to_string(),
        last_seen: chrono::Utc::now(),
        is_active: true,
    };

    let p2p = P2pSync::new(device_info).map_err(|e| e.to_string())?;
    // Advertise this device on the local network via MDNS
    if let Err(e) = p2p.discovery.register(&device_id, "Noteece Desktop", AppConfig::sync_port()) {
        log::error!("[p2p] Discovery registration failed: {}", e);
    }

        // Start the P2P sync server to accept incoming connections
        let port = AppConfig::sync_port();
        tauri::async_runtime::spawn({
            let p2p_clone = p2p.clone();
            async move {
                if let Err(e) = p2p_clone.start_server(port).await {
                    log::error!("[p2p] Failed to start server on {}: {}", port, e);
                }
            }
        });

    *p2p_sync_guard = Some(Arc::new(p2p));

    Ok(())
}

#[tauri::command]
pub fn get_or_create_user_id_cmd(db: State<DbConnection>) -> Result<String, String> {
    crate::with_db!(db, conn, {
        core_rs::db::get_or_create_user_id(&conn).map_err(|e| e.to_string())
    })
}
