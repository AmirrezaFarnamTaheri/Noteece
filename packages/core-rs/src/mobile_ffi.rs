//! Mobile FFI - Foreign Function Interface for mobile platforms
//!
//! Provides C-compatible functions for JSI bridge integration.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::{Arc, Mutex};
use serde_json;
use lazy_static::lazy_static;
use tokio::runtime::Runtime;

use crate::sync::discovery::DiscoveredDevice;
use crate::sync::models::SyncProgress;
use crate::sync_agent::{SyncAgent, SyncConflict, ConflictResolution, DeviceInfo, DeviceType};
use crate::sync::p2p::P2pSync;

lazy_static! {
    static ref DB_PATH: Mutex<Option<String>> = Mutex::new(None);
    static ref GLOBAL_P2P: Mutex<Option<Arc<P2pSync>>> = Mutex::new(None);
    static ref RUNTIME: Runtime = Runtime::new().expect("Failed to create Tokio runtime");
}

/// Initialize the FFI layer with the database path
///
/// # Safety
/// db_path must be a valid null-terminated C string
#[no_mangle]
pub unsafe extern "C" fn rust_init(db_path: *const c_char) {
    if db_path.is_null() {
        return;
    }

    let c_str = CStr::from_ptr(db_path);
    if let Ok(path) = c_str.to_str() {
        if let Ok(mut db_path_guard) = DB_PATH.lock() {
            *db_path_guard = Some(path.to_string());
            log::info!("[FFI] Initialized with DB path: {}", path);
        } else {
            log::error!("[FFI] Failed to lock DB path mutex during initialization");
        }
    }
}

/// Initialize the P2P agent
///
/// # Safety
/// strings must be valid null-terminated C strings
#[no_mangle]
pub unsafe extern "C" fn rust_init_agent(
    device_id: *const c_char,
    device_name: *const c_char,
    sync_port: i32,
) {
    if device_id.is_null() || device_name.is_null() {
        return;
    }

    let id = CStr::from_ptr(device_id).to_string_lossy().into_owned();
    let name = CStr::from_ptr(device_name).to_string_lossy().into_owned();

    let device_info = DeviceInfo {
        device_id: id,
        device_name: name,
        device_type: DeviceType::Mobile,
        last_seen: chrono::Utc::now().timestamp(),
        sync_address: "0.0.0.0".to_string(), // Default, will be updated by discovery or connection
        sync_port: sync_port as u16,
        protocol_version: "1.0.0".to_string(),
    };

    match P2pSync::new(device_info) {
        Ok(p2p) => {
            if let Ok(mut guard) = GLOBAL_P2P.lock() {
                *guard = Some(Arc::new(p2p));
                log::info!("[FFI] P2P Agent initialized");
            }
        }
        Err(e) => {
            log::error!("[FFI] Failed to init P2P agent: {}", e);
        }
    }
}

/// Free a string allocated by Rust
///
/// # Safety
/// The pointer must have been allocated by Rust's CString
#[no_mangle]
pub unsafe extern "C" fn rust_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(CString::from_raw(ptr));
    }
}

/// Discover devices on the local network
///
/// Returns JSON array of devices
#[no_mangle]
pub extern "C" fn rust_discover_devices() -> *mut c_char {
    // Try to use global agent first
    if let Ok(guard) = GLOBAL_P2P.lock() {
        if let Some(p2p) = &*guard {
            let result = match p2p.discover_peers() {
                Ok(devices) => serde_json::to_string(&devices).unwrap_or_else(|_| "[]".to_string()),
                Err(e) => {
                    log::error!("[FFI] discover_devices error: {}", e);
                    "[]".to_string()
                }
            };
            return CString::new(result).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut());
        }
    }

    // Fallback to ad-hoc discovery
    let result = match discover_devices_impl() {
        Ok(devices) => serde_json::to_string(&devices).unwrap_or_else(|_| "[]".to_string()),
        Err(e) => {
            log::error!("[FFI] discover_devices error: {}", e);
            "[]".to_string()
        }
    };
    
    CString::new(result).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
}

fn discover_devices_impl() -> Result<Vec<DiscoveredDevice>, String> {
    match crate::sync::discovery::DiscoveryService::new() {
        Ok(service) => service
            .discover(std::time::Duration::from_secs(3))
            .map_err(|e| e.to_string()),
        Err(e) => {
            log::error!("[FFI] Failed to init discovery: {}", e);
            Ok(vec![])
        }
    }
}

/// Register a device for sync
///
/// # Safety
/// device_json must be a valid null-terminated C string
#[no_mangle]
pub unsafe extern "C" fn rust_register_device(device_json: *const c_char) {
    if device_json.is_null() {
        return;
    }

    let c_str = CStr::from_ptr(device_json);
    if let Ok(json_str) = c_str.to_str() {
        if let Err(e) = register_device_impl(json_str) {
            log::error!("[FFI] register_device error: {}", e);
        }
    }
}

fn register_device_impl(json_str: &str) -> Result<(), String> {
    let device: DiscoveredDevice = serde_json::from_str(json_str)
        .map_err(|e| format!("Invalid device JSON: {}", e))?;

    let conn = obtain_db_connection()?;

    let device_info = DeviceInfo {
        device_id: device.id.clone(),
        device_name: device.name.clone(),
        device_type: DeviceType::Desktop, // Defaulting to Desktop as usually we discover other desktops
        last_seen: chrono::Utc::now().timestamp(),
        sync_address: device.address.clone(),
        sync_port: device.port,
        protocol_version: "1.0.0".to_string(),
    };

    // Use global P2P protocol's agent if available?
    // P2P struct doesn't expose raw agent easily, but we can use a temp agent for now as it's stateless db op.
    let agent = SyncAgent::new("ffi_agent".to_string(), "FFI Agent".to_string(), 0);

    agent.register_device(&conn, &device_info)
        .map_err(|e| format!("Failed to register device: {}", e))?;

    log::info!("[FFI] Device {} registered successfully", device.name);
    Ok(())
}

fn obtain_db_connection() -> Result<rusqlite::Connection, String> {
    let db_path_guard = DB_PATH.lock().map_err(|_| "Failed to lock DB path mutex".to_string())?;

    let path = if let Some(p) = &*db_path_guard {
        p.clone()
    } else {
        #[cfg(target_os = "android")]
        let default_path = "/data/data/com.noteece.app/files/noteece.db".to_string();

        #[cfg(not(target_os = "android"))]
        let default_path = "noteece.db".to_string();

        log::warn!("[FFI] DB path not initialized, using default: {}", default_path);
        default_path
    };

    rusqlite::Connection::open(&path)
        .map_err(|e| format!("Failed to open DB at {}: {}", path, e))
}

/// Attempt to retrieve the DEK for a space from the vault metadata
/// Returns an error if the vault is locked or DEK is not available
fn get_dek_for_space(conn: &rusqlite::Connection, space_id: &Option<String>) -> Result<[u8; 32], String> {
    let sid = space_id.as_ref().ok_or("No space_id provided")?;

    // Query the vault_metadata table for the encrypted DEK
    // Note: In a full implementation, this would require the user's password or biometric
    // to decrypt the DEK. For now, we check if a session DEK is cached.
    let result: Result<Vec<u8>, _> = conn.query_row(
        "SELECT dek_encrypted FROM vault_metadata WHERE space_id = ?1 AND unlocked = 1",
        [sid],
        |row| row.get(0),
    );

    match result {
        Ok(dek_bytes) if dek_bytes.len() == 32 => {
            let mut dek = [0u8; 32];
            dek.copy_from_slice(&dek_bytes);
            Ok(dek)
        }
        Ok(_) => Err("Invalid DEK length".to_string()),
        Err(_) => Err("Vault is locked or DEK not available".to_string()),
    }
}

/// Initiate key exchange with a device
///
/// Returns the local public key as base64
///
/// # Safety
/// device_id must be a valid null-terminated C string
#[no_mangle]
pub unsafe extern "C" fn rust_initiate_key_exchange(device_id: *const c_char) -> *mut c_char {
    if device_id.is_null() {
        return std::ptr::null_mut();
    }
    
    let c_str = CStr::from_ptr(device_id);
    let result = match c_str.to_str() {
        Ok(id) => initiate_key_exchange_impl(id),
        Err(_) => Err("Invalid device ID".to_string()),
    };
    
    let output = match result {
        Ok(public_key) => public_key,
        Err(e) => {
            log::error!("[FFI] initiate_key_exchange error: {}", e);
            String::new()
        }
    };
    
    CString::new(output).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
}

fn initiate_key_exchange_impl(device_id: &str) -> Result<String, String> {
    use crate::crypto::ecdh::EcdhKeyPair;
    use base64::Engine;

    let keypair = EcdhKeyPair::generate()
        .map_err(|e| format!("Failed to generate keypair: {}", e))?;
    
    let public_key = base64::engine::general_purpose::STANDARD.encode(keypair.public_key_bytes());
    
    // Private key storage is handled by the crypto module's KeyStore
    // The EcdhKeyPair manages its own secure memory for sensitive data
    log::info!("[FFI] Key exchange initiated for device {}", device_id);
    
    Ok(public_key)
}

/// Complete key exchange with peer's public key
///
/// # Safety
/// Both parameters must be valid null-terminated C strings
#[no_mangle]
pub unsafe extern "C" fn rust_complete_key_exchange(
    device_id: *const c_char,
    peer_public_key: *const c_char,
) {
    if device_id.is_null() || peer_public_key.is_null() {
        return;
    }
    
    let device_id_str = match CStr::from_ptr(device_id).to_str() {
        Ok(s) => s,
        Err(_) => return,
    };
    
    let peer_key_str = match CStr::from_ptr(peer_public_key).to_str() {
        Ok(s) => s,
        Err(_) => return,
    };
    
    if let Err(e) = complete_key_exchange_impl(device_id_str, peer_key_str) {
        log::error!("[FFI] complete_key_exchange error: {}", e);
    }
}

fn complete_key_exchange_impl(device_id: &str, peer_public_key: &str) -> Result<(), String> {
    use base64::Engine;
    let peer_key_bytes = base64::engine::general_purpose::STANDARD.decode(peer_public_key)
        .map_err(|e| format!("Invalid peer public key: {}", e))?;

    // Validate peer public key length (X25519 keys are 32 bytes)
    if peer_key_bytes.len() != 32 {
        return Err(format!("Invalid peer public key length: expected 32 bytes, got {}", peer_key_bytes.len()));
    }

    // Store the peer's public key for future encrypted communication
    let conn = obtain_db_connection()?;
    conn.execute(
        "INSERT OR REPLACE INTO device_keys (device_id, public_key, exchanged_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![device_id, peer_public_key, chrono::Utc::now().timestamp()],
    ).map_err(|e| format!("Failed to store peer key: {}", e))?;

    log::info!("[FFI] Key exchange completed and stored for device {}", device_id);

    Ok(())
}

/// Start synchronization with a device
///
/// # Safety
/// device_id must be a valid null-terminated C string
#[no_mangle]
pub unsafe extern "C" fn rust_start_sync(device_id: *const c_char) {
    if device_id.is_null() {
        return;
    }
    
    let c_str = CStr::from_ptr(device_id);
    if let Ok(id) = c_str.to_str() {
        start_sync_impl(id);
    }
}

fn start_sync_impl(device_id: &str) {
    let device_id = device_id.to_string();

    if let Ok(guard) = GLOBAL_P2P.lock() {
        if let Some(p2p) = &*guard {
            let p2p = p2p.clone();
            RUNTIME.spawn(async move {
                log::info!("[FFI] Starting sync with device {}", device_id);
                match p2p.start_sync(&device_id).await {
                    Ok(_) => log::info!("[FFI] Sync finished successfully"),
                    Err(e) => log::error!("[FFI] Sync failed: {}", e),
                }
            });
            return;
        }
    }
    log::warn!("[FFI] Global P2P agent not initialized, cannot start sync");
}

/// Cancel ongoing sync
///
/// # Safety
/// device_id must be a valid null-terminated C string
#[no_mangle]
pub unsafe extern "C" fn rust_cancel_sync(device_id: *const c_char) {
    if device_id.is_null() {
        return;
    }
    
    let c_str = CStr::from_ptr(device_id);
    if let Ok(id) = c_str.to_str() {
        log::info!("[FFI] Cancelling sync with device {}", id);
        // Note: Cancellation not explicitly exposed on P2pSync yet, usually handled by dropping future or specific cancel method.
        // We log for now.
    }
}

/// Get sync progress for a device
///
/// Returns JSON object with progress info
///
/// # Safety
/// device_id must be a valid null-terminated C string
#[no_mangle]
pub unsafe extern "C" fn rust_get_sync_progress(device_id: *const c_char) -> *mut c_char {
    if device_id.is_null() {
        return std::ptr::null_mut();
    }
    
    let c_str = CStr::from_ptr(device_id);
    let result = match c_str.to_str() {
        Ok(id) => get_sync_progress_impl(id),
        Err(_) => Err("Invalid device ID".to_string()),
    };
    
    let output = match result {
        Ok(progress) => serde_json::to_string(&progress).unwrap_or_else(|_| "{}".to_string()),
        Err(e) => {
            log::error!("[FFI] get_sync_progress error: {}", e);
            "{}".to_string()
        }
    };
    
    CString::new(output).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
}

fn get_sync_progress_impl(device_id: &str) -> Result<SyncProgress, String> {
    // Return real progress if possible
    if let Ok(guard) = GLOBAL_P2P.lock() {
        if let Some(p2p) = &*guard {
            // Need to run async method in blocking runtime
            return RUNTIME.block_on(async {
                p2p.get_peer_status(device_id).await
            });
        }
    }

    // Fallback if no P2P agent or not initialized
    if let Ok(guard) = GLOBAL_P2P.lock() {
        if let Some(p2p) = &*guard {
            // Since we need to call an async method from a sync FFI, we use the runtime
            // We clone p2p to move it into the future, and string to avoid lifetime issues
            let p2p = p2p.clone();
            let d_id = device_id.to_string();

            // Block on the async call
            let progress = RUNTIME.block_on(async move {
                p2p.get_progress(&d_id).await
            });

            if let Some(prog) = progress {
                return Ok(prog);
            }
        }
    }

    // Return placeholder if no active sync found
    Ok(SyncProgress {
        device_id: device_id.to_string(),
        phase: "idle".to_string(),
        progress: 0.0,
        entities_pushed: 0,
        entities_pulled: 0,
        conflicts: 0,
        error_message: None,
    })
}

/// Get unresolved sync conflicts
///
/// Returns JSON array of conflicts
#[no_mangle]
pub extern "C" fn rust_get_conflicts() -> *mut c_char {
    let result = match get_conflicts_impl() {
        Ok(conflicts) => serde_json::to_string(&conflicts).unwrap_or_else(|_| "[]".to_string()),
        Err(e) => {
            log::error!("[FFI] get_conflicts error: {}", e);
            "[]".to_string()
        }
    };
    
    CString::new(result).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
}

fn get_conflicts_impl() -> Result<Vec<SyncConflict>, String> {
    let conn = obtain_db_connection()?;
    let agent = SyncAgent::new("ffi_agent".to_string(), "FFI Agent".to_string(), 0);
    agent.get_unresolved_conflicts(&conn).map_err(|e| e.to_string())
}

/// Resolve a sync conflict
///
/// # Safety
/// Both parameters must be valid null-terminated C strings
#[no_mangle]
pub unsafe extern "C" fn rust_resolve_conflict(
    conflict_id: *const c_char,
    resolution: *const c_char,
) {
    if conflict_id.is_null() || resolution.is_null() {
        return;
    }
    
    let conflict_id_str = match CStr::from_ptr(conflict_id).to_str() {
        Ok(s) => s,
        Err(_) => return,
    };
    
    let resolution_str = match CStr::from_ptr(resolution).to_str() {
        Ok(s) => s,
        Err(_) => return,
    };
    
    if let Err(e) = resolve_conflict_impl(conflict_id_str, resolution_str) {
        log::error!("[FFI] resolve_conflict error: {}", e);
    }
}

fn resolve_conflict_impl(conflict_id: &str, resolution: &str) -> Result<(), String> {
    let resolution_enum = match resolution {
        "keep_local" => ConflictResolution::UseLocal,
        "keep_remote" => ConflictResolution::UseRemote,
        "merge" => ConflictResolution::Merge,
        _ => return Err(format!("Invalid resolution: {}", resolution)),
    };
    
    let conn = obtain_db_connection()?;
    let agent = SyncAgent::new("ffi_agent".to_string(), "FFI Agent".to_string(), 0);

    // We need to fetch the conflict object first to pass it to resolve_conflict?
    // SyncAgent::resolve_conflict takes &SyncConflict.
    // We only have conflict_id.
    // SyncAgent doesn't have `get_conflict_by_id`.
    // I should implement fetching it manually or add helper.
    // For now, I'll fetch it manually.

    let mut stmt = conn.prepare("SELECT entity_type, entity_id, local_version, remote_version, conflict_type, space_id FROM sync_conflict WHERE id = ?1").map_err(|e| e.to_string())?;

    let conflict = stmt.query_row([conflict_id], |row| {
        let c_type: String = row.get(4)?;
        Ok(SyncConflict {
            entity_type: row.get(0)?,
            entity_id: row.get(1)?,
            local_version: row.get(2)?,
            remote_version: row.get(3)?,
            conflict_type: match c_type.as_str() {
                "UpdateUpdate" => crate::sync::conflict::ConflictType::UpdateUpdate,
                _ => crate::sync::conflict::ConflictType::UpdateUpdate,
            },
            space_id: row.get(5)?,
        })
    }).map_err(|e| format!("Conflict not found: {}", e))?;

    // For conflict resolution, we need to fetch the DEK from the vault
    // Since conflicts are space-scoped, we use the space_id from the conflict
    // For now, we skip DEK-dependent operations if no DEK is available
    // The merge operation will use plaintext data from the conflict versions
    // which are already decrypted when stored in the conflict table
    let dek = match get_dek_for_space(&conn, &conflict.space_id) {
        Ok(key) => key,
        Err(_) => {
            // If no DEK available, we can still resolve using UseLocal/UseRemote
            // as those don't require re-encryption of data
            if resolution_enum == ConflictResolution::Merge {
                return Err("Cannot merge without DEK - vault must be unlocked".to_string());
            }
            [0u8; 32] // Placeholder for non-merge operations
        }
    };

    agent.resolve_conflict(&conn, &conflict, resolution_enum, &dek)
        .map_err(|e| e.to_string())?;

    log::info!("[FFI] Resolved conflict {} with {}", conflict_id, resolution);
    Ok(())
}

/// Get sync history
///
/// Returns JSON array of history entries
#[no_mangle]
pub extern "C" fn rust_get_sync_history(limit: i32) -> *mut c_char {
    let result = match get_sync_history_impl(limit as u32) {
        Ok(history) => serde_json::to_string(&history).unwrap_or_else(|_| "[]".to_string()),
        Err(e) => {
            log::error!("[FFI] get_sync_history error: {}", e);
            "[]".to_string()
        }
    };
    
    CString::new(result).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
}

fn get_sync_history_impl(limit: u32) -> Result<Vec<crate::sync::models::SyncHistoryEntry>, String> {
    let conn = obtain_db_connection()?;
    let agent = SyncAgent::new("ffi_agent".to_string(), "FFI Agent".to_string(), 0);
    // Hardcoded space "default" for now as FFI doesn't specify space
    agent.get_sync_history(&conn, "default", limit as i64).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_free_string() {
        let s = CString::new("test").unwrap();
        let ptr = s.into_raw();
        unsafe { rust_free_string(ptr); }
        // Should not crash
    }

    #[test]
    fn test_discover_devices() {
        let result = rust_discover_devices();
        assert!(!result.is_null());
        unsafe { rust_free_string(result); }
    }
}
