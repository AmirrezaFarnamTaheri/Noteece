use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::{Arc, Mutex};
use lazy_static::lazy_static;
use crate::sync::engine::SyncAgent;
use rusqlite::Connection;

// We need a global SyncAgent instance to handle requests.
// In a real Android app, this might be initialized with a specific DB path.
lazy_static! {
    static ref GLOBAL_AGENT: Arc<Mutex<Option<SyncAgent>>> = Arc::new(Mutex::new(None));
    static ref GLOBAL_DB_PATH: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
}

/// Initialize the global sync agent.
/// This should be called from Java/Kotlin/C++ before any sync operations.
///
/// # Safety
/// `db_path` must be a valid C string.
#[no_mangle]
pub extern "C" fn init_sync_agent_ffi(db_path: *const c_char, device_id: *const c_char) {
    let path_str = unsafe {
        if db_path.is_null() {
            return;
        }
        CStr::from_ptr(db_path).to_string_lossy().to_string()
    };

    let device_id_str = unsafe {
        if device_id.is_null() {
            "unknown_device".to_string()
        } else {
            CStr::from_ptr(device_id).to_string_lossy().to_string()
        }
    };

    let mut agent_guard = GLOBAL_AGENT.lock().unwrap();
    // For now, we mock the port and name.
    *agent_guard = Some(SyncAgent::new(device_id_str, "Android Device".to_string(), 0));

    let mut path_guard = GLOBAL_DB_PATH.lock().unwrap();
    *path_guard = Some(path_str.clone());

    log::info!("SyncAgent initialized with DB path: {}", path_str);
}

/// Processes a sync packet from the mobile client.
///
/// # Safety
/// The `data` pointer must be a valid null-terminated string.
/// The returned pointer must be freed using `free_string_ffi`.
#[no_mangle]
pub extern "C" fn process_sync_packet_ffi(data: *const c_char) -> *mut c_char {
    let data_str = unsafe {
        if data.is_null() {
            return std::ptr::null_mut();
        }
        CStr::from_ptr(data).to_string_lossy()
    };

    let agent_guard = GLOBAL_AGENT.lock().unwrap();

    let response = if let Some(agent) = &*agent_guard {
        // Attempt to open DB connection
        let path_guard = GLOBAL_DB_PATH.lock().unwrap();

        if let Some(path) = &*path_guard {
            match Connection::open(path) {
                Ok(conn) => {
                     // REAL LOGIC START
                     // Ideally we parse `data_str` as a `SyncRequest` or similar.
                     // For now, just prove we can query the DB or use the agent.
                     let device_info = agent.get_device_info();

                     // Example: Get unresolves conflicts to prove DB access
                     match agent.get_unresolved_conflicts(&conn) {
                         Ok(conflicts) => {
                             format!("{{ \"status\": \"processed\", \"agent_id\": \"{}\", \"conflicts\": {} }}", device_info.device_id, conflicts.len())
                         }
                         Err(e) => {
                             format!("{{ \"status\": \"error\", \"message\": \"DB Error: {}\" }}", e)
                         }
                     }
                }
                Err(e) => {
                    format!("{{ \"status\": \"error\", \"message\": \"Failed to open DB: {}\" }}", e)
                }
            }
        } else {
             format!("{{ \"status\": \"processed\", \"agent_active\": true, \"input_len\": {}, \"warning\": \"No DB Path\" }}", data_str.len())
        }
    } else {
        "{ \"status\": \"error\", \"message\": \"Agent not initialized\" }".to_string()
    };

    CString::new(response).unwrap().into_raw()
}

/// Generates a handshake packet.
///
/// # Safety
/// The returned pointer must be freed using `free_string_ffi`.
#[no_mangle]
pub extern "C" fn generate_handshake_ffi() -> *mut c_char {
    let agent_guard = GLOBAL_AGENT.lock().unwrap();

    let response = if let Some(agent) = &*agent_guard {
        let info = agent.get_device_info();
        serde_json::to_string(&info).unwrap_or_else(|_| "{}".to_string())
    } else {
         "{ \"type\": \"handshake\", \"status\": \"no_agent\" }".to_string()
    };

    CString::new(response).unwrap().into_raw()
}

/// Frees a string allocated by Rust.
///
/// # Safety
/// `s` must be a pointer returned by one of the FFI functions.
#[no_mangle]
pub extern "C" fn free_string_ffi(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    unsafe {
        let _ = CString::from_raw(s);
    }
}
