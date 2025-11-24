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
    let input: String = env
        .get_string(&text)
        .expect("Couldn't get java string!")
        .into();
    let mut processor = PROCESSOR.lock().unwrap();
    processor.ingest(&input);
}

#[cfg(feature = "android")]
#[no_mangle]
pub extern "system" fn Java_com_noteece_RustBridge_anchorLatest(
    mut env: JNIEnv,
    _class: JClass,
) -> jstring {
    let processor = PROCESSOR.lock().unwrap();
    let candidate = processor.get_latest_candidate();

    // Convert candidate to JSON or simple string representation
    let output = match candidate {
        Some(post) => serde_json::to_string(&post).unwrap_or_default(),
        None => "{}".to_string(),
    };

    let output_ptr = env
        .new_string(output)
        .expect("Couldn't create java string!");
    output_ptr.into_raw()
}
