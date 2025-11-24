use crate::social::stream_processor::StreamProcessor;
use lazy_static::lazy_static;
use std::sync::Mutex;

#[cfg(feature = "android")]
use jni::objects::{JClass, JString};
#[cfg(feature = "android")]
use jni::sys::jstring;
#[cfg(feature = "android")]
use jni::JNIEnv;

lazy_static! {
    static ref PROCESSOR: Mutex<StreamProcessor> = Mutex::new(StreamProcessor::new());
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_ingest(
    mut env: JNIEnv,
    _class: JClass,
    text: JString,
) {
    let input: String = match env.get_string(&text) {
        Ok(s) => s.into(),
        Err(e) => {
            log::error!("Failed to get java string: {:?}", e);
            return;
        }
    };

    let mut processor = match PROCESSOR.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            log::warn!("Mutex poisoned, recovering...");
            let mut guard = poisoned.into_inner();
            guard.reset();
            guard
        }
    };

    processor.ingest(&input);
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_anchorLatest(
    mut env: JNIEnv,
    _class: JClass,
) -> jstring {
    let processor = match PROCESSOR.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            log::warn!("Mutex poisoned (read), recovering...");
            let mut guard = poisoned.into_inner();
            // If poisoned, state might be corrupted, but we can try to return what we have or reset
            // Just returning empty if reset
            guard.reset();
            guard
        }
    };

    let candidate = processor.get_latest_candidate();

    // Convert candidate to JSON or simple string representation
    let output = match candidate {
        Some(post) => serde_json::to_string(&post).unwrap_or_else(|_| "{}".to_string()),
        None => "{}".to_string(),
    };

    let output_ptr = env
        .new_string(output)
        .expect("Couldn't create java string!");
    output_ptr.into_raw()
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_reset(
    _env: JNIEnv,
    _class: JClass,
) {
    let mut processor = match PROCESSOR.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            log::warn!("Mutex poisoned during reset, recovering...");
            poisoned.into_inner()
        }
    };
    processor.reset();
}
