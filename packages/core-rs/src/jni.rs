use crate::social::stream_processor::StreamProcessor;
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};

#[cfg(feature = "android")]
use jni::objects::{JClass, JString};
#[cfg(feature = "android")]
use jni::sys::jstring;
#[cfg(feature = "android")]
use jni::JNIEnv;

// We use an Arc<Mutex> to allow thread-safe access.
// We handle poisoning by restarting the processor if a panic occurred previously.
lazy_static! {
    static ref PROCESSOR: Arc<Mutex<StreamProcessor>> =
        Arc::new(Mutex::new(StreamProcessor::new()));
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_ingest(
    env: JNIEnv,
    _class: JClass,
    text: JString,
) {
    #[allow(unused_mut)]
    let mut env = env;
    let input: String = match env.get_string(&text) {
        Ok(s) => s.into(),
        Err(e) => {
            log::error!("Failed to get java string: {:?}", e);
            return;
        }
    };

    // Safe lock handling
    let mut processor = match PROCESSOR.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            log::error!("Mutex was poisoned. Resetting processor state.");
            let mut guard = poisoned.into_inner();
            *guard = StreamProcessor::new(); // Completely replace state
            guard
        }
    };

    processor.ingest(&input);
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_anchorLatest(
    env: JNIEnv,
    _class: JClass,
) -> jstring {
    #[allow(unused_mut)]
    let mut env = env;
    let processor = match PROCESSOR.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            log::error!("Mutex was poisoned (read). Resetting processor state.");
            let mut guard = poisoned.into_inner();
            *guard = StreamProcessor::new();
            guard
        }
    };

    let candidate = processor.get_latest_candidate();

    // Convert candidate to JSON or simple string representation
    let output = match candidate {
        Some(post) => serde_json::to_string(&post).unwrap_or_else(|_| "{}".to_string()),
        None => "{}".to_string(),
    };

    // Never panic across the JNI boundary (UB for the Java caller). On failure
    // (e.g. an interior NUL in attacker-influenced content) return a null jstring;
    // the Kotlin side already treats null/empty as "no candidate".
    match env.new_string(output) {
        Ok(s) => s.into_raw(),
        Err(e) => {
            log::error!("Failed to create java string: {:?}", e);
            std::ptr::null_mut()
        }
    }
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_reset(_env: JNIEnv, _class: JClass) {
    let mut processor = match PROCESSOR.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            log::warn!("Mutex poisoned during reset. Recovering.");
            poisoned.into_inner()
        }
    };
    processor.reset();
}
