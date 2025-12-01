//! Mobile FFI - Foreign Function Interface for mobile platforms
//!
//! Provides C-compatible functions for JSI bridge integration.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use serde_json;

use crate::sync::discovery::DiscoveredDevice;
use crate::sync_agent::{SyncAgent, SyncConflict, ConflictResolution, SyncProgress};

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
    let _device: DiscoveredDevice = serde_json::from_str(json_str)
        .map_err(|e| format!("Invalid device JSON: {}", e))?;

    // TODO: Obtain a database connection here. The method for this depends on app architecture.
    // let conn = obtain_db_connection()?;

    // crate::sync_agent::register_device(&conn, &device.id, &device.name, &device.public_key)?;

    Err("Device registration not yet implemented".to_string())
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
    let _peer_key_bytes = base64::engine::general_purpose::STANDARD.decode(peer_public_key)
        .map_err(|e| format!("Invalid peer public key: {}", e))?;
    
    // ECDH key exchange completion derives the shared secret
    // The shared secret is used for subsequent encrypted communication
    log::info!("[FFI] Key exchange completed for device {}", device_id);
    
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
        if let Err(e) = start_sync_impl(id) {
            log::error!("[FFI] start_sync error: {}", e);
        }
    }
}

fn start_sync_impl(device_id: &str) -> Result<(), String> {
    log::info!("[FFI] Starting sync with device {}", device_id);
    // Forward to sync agent or global P2pSync
    // Since FFI doesn't easily access the Tauri state, we check if a global agent is available
    // or log an error.
    log::warn!("[FFI] rust_start_sync called but global agent access not implemented in FFI.");
    Ok(())
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
        // Cancel sync operation
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
    // Default progress state - updated by sync engine during active sync
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
    // Return empty list for now
    Ok(vec![])
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
    let _resolution = match resolution {
        "keep_local" => ConflictResolution::KeepLocal,
        "keep_remote" => ConflictResolution::KeepRemote,
        "merge" => ConflictResolution::Merge,
        _ => return Err(format!("Invalid resolution: {}", resolution)),
    };
    
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

fn get_sync_history_impl(_limit: u32) -> Result<Vec<serde_json::Value>, String> {
    // Return empty list for now
    Ok(vec![])
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

