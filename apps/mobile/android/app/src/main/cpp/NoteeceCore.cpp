#include "NoteeceCore.h"
#include <android/log.h>
#include <jni.h>
#include <string>
#include <cstring>

// Rust FFI declarations
extern "C" {
    // Core lifecycle
    void* rust_init_core(const char* db_path);
    void rust_shutdown_core(void* handle);
    
    // Sync operations
    char* rust_discover_devices();
    char* rust_initiate_key_exchange(const char* device_id);
    char* rust_process_sync_packet(const char* data);
    char* rust_generate_handshake();
    char* rust_get_sync_progress(const char* device_id);
    
    // Memory management
    void rust_free_string(char* ptr);
}

#define LOG_TAG "NoteeceCore"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace com {
namespace noteece {

NoteeceCore::NoteeceCore() : rust_agent(nullptr), is_initialized(false) {
    LOGI("NoteeceCore created");
}

NoteeceCore::~NoteeceCore() {
    shutdown();
}

bool NoteeceCore::initialize(const std::string& db_path) {
    if (is_initialized) {
        LOGI("Already initialized");
        return true;
    }
    
    rust_agent = rust_init_core(db_path.c_str());
    if (rust_agent != nullptr) {
        is_initialized = true;
        LOGI("NoteeceCore initialized with db: %s", db_path.c_str());
        return true;
    }
    
    LOGE("Failed to initialize Rust core");
    return false;
}

void NoteeceCore::shutdown() {
    if (rust_agent != nullptr) {
        rust_shutdown_core(rust_agent);
        rust_agent = nullptr;
        is_initialized = false;
        LOGI("NoteeceCore shutdown complete");
    }
}

std::string NoteeceCore::process_sync_packet(const std::string& data) {
    if (!is_initialized) {
        return R"({"error": "core_not_initialized"})";
    }
    
    char* result = rust_process_sync_packet(data.c_str());
    if (result == nullptr) {
        return R"({"error": "null_response"})";
    }
    
    std::string response(result);
    rust_free_string(result);
    return response;
}

std::string NoteeceCore::generate_handshake() {
    if (!is_initialized) {
        return "";
    }
    
    char* result = rust_generate_handshake();
    if (result == nullptr) {
        return "";
    }
    
    std::string handshake(result);
    rust_free_string(result);
    LOGI("Generated handshake: %zu bytes", handshake.length());
    return handshake;
}

std::string NoteeceCore::discover_devices() {
    char* result = rust_discover_devices();
    if (result == nullptr) {
        return "[]";
    }
    
    std::string devices(result);
    rust_free_string(result);
    return devices;
}

std::string NoteeceCore::initiate_key_exchange(const std::string& device_id) {
    char* result = rust_initiate_key_exchange(device_id.c_str());
    if (result == nullptr) {
        return R"({"error": "key_exchange_failed"})";
    }
    
    std::string response(result);
    rust_free_string(result);
    return response;
}

std::string NoteeceCore::get_sync_progress(const std::string& device_id) {
    char* result = rust_get_sync_progress(device_id.c_str());
    if (result == nullptr) {
        return R"({"progress": 0, "phase": "unknown"})";
    }
    
    std::string progress(result);
    rust_free_string(result);
    return progress;
}

// JNI Bridge for React Native JSI
extern "C" {

static NoteeceCore* g_core = nullptr;

JNIEXPORT jboolean JNICALL
Java_com_noteece_NoteeceCoreModule_nativeInit(JNIEnv* env, jobject thiz, jstring db_path) {
    const char* path = env->GetStringUTFChars(db_path, nullptr);
    
    if (g_core == nullptr) {
        g_core = new NoteeceCore();
    }
    
    bool result = g_core->initialize(std::string(path));
    env->ReleaseStringUTFChars(db_path, path);
    return result ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_com_noteece_NoteeceCoreModule_nativeShutdown(JNIEnv* env, jobject thiz) {
    if (g_core != nullptr) {
        g_core->shutdown();
        delete g_core;
        g_core = nullptr;
    }
}

JNIEXPORT jstring JNICALL
Java_com_noteece_NoteeceCoreModule_nativeProcessSyncPacket(JNIEnv* env, jobject thiz, jstring data) {
    if (g_core == nullptr) {
        return env->NewStringUTF(R"({"error": "core_not_initialized"})");
    }
    
    const char* packet = env->GetStringUTFChars(data, nullptr);
    std::string result = g_core->process_sync_packet(std::string(packet));
    env->ReleaseStringUTFChars(data, packet);
    return env->NewStringUTF(result.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_noteece_NoteeceCoreModule_nativeGenerateHandshake(JNIEnv* env, jobject thiz) {
    if (g_core == nullptr) {
        return env->NewStringUTF("");
    }
    return env->NewStringUTF(g_core->generate_handshake().c_str());
}

JNIEXPORT jstring JNICALL
Java_com_noteece_NoteeceCoreModule_nativeDiscoverDevices(JNIEnv* env, jobject thiz) {
    if (g_core == nullptr) {
        return env->NewStringUTF("[]");
    }
    return env->NewStringUTF(g_core->discover_devices().c_str());
}

JNIEXPORT jstring JNICALL
Java_com_noteece_NoteeceCoreModule_nativeInitiateKeyExchange(JNIEnv* env, jobject thiz, jstring device_id) {
    if (g_core == nullptr) {
        return env->NewStringUTF(R"({"error": "core_not_initialized"})");
    }
    
    const char* id = env->GetStringUTFChars(device_id, nullptr);
    std::string result = g_core->initiate_key_exchange(std::string(id));
    env->ReleaseStringUTFChars(device_id, id);
    return env->NewStringUTF(result.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_noteece_NoteeceCoreModule_nativeGetSyncProgress(JNIEnv* env, jobject thiz, jstring device_id) {
    if (g_core == nullptr) {
        return env->NewStringUTF(R"({"progress": 0})");
    }
    
    const char* id = env->GetStringUTFChars(device_id, nullptr);
    std::string result = g_core->get_sync_progress(std::string(id));
    env->ReleaseStringUTFChars(device_id, id);
    return env->NewStringUTF(result.c_str());
}

} // extern "C"

} // namespace noteece
} // namespace com
