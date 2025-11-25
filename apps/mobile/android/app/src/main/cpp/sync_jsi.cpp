/**
 * JSI Bridge for Rust Sync Operations
 * 
 * This C++ file provides the JSI bindings to the Rust core sync functions.
 */

#include <jni.h>
#include <jsi/jsi.h>
#include <ReactCommon/CallInvokerHolder.h>
#include <react/jni/ReadableNativeMap.h>
#include <fbjni/fbjni.h>
#include <string>
#include <memory>
#include <vector>

using namespace facebook;

// Rust FFI declarations
extern "C" {
    // Device discovery
    char* rust_discover_devices();
    void rust_register_device(const char* device_json);
    
    // Key exchange
    char* rust_initiate_key_exchange(const char* device_id);
    void rust_complete_key_exchange(const char* device_id, const char* peer_public_key);
    
    // Sync operations
    void rust_start_sync(const char* device_id);
    void rust_cancel_sync(const char* device_id);
    char* rust_get_sync_progress(const char* device_id);
    
    // Conflict resolution
    char* rust_get_conflicts();
    void rust_resolve_conflict(const char* conflict_id, const char* resolution);
    
    // History
    char* rust_get_sync_history(int limit);
    
    // Memory management
    void rust_free_string(char* ptr);
}

// Helper to convert Rust string to JSI string and free memory
jsi::String rustToJSIString(jsi::Runtime& runtime, char* rustStr) {
    if (rustStr == nullptr) {
        return jsi::String::createFromUtf8(runtime, "");
    }
    std::string str(rustStr);
    rust_free_string(rustStr);
    return jsi::String::createFromUtf8(runtime, str);
}

// Install JSI bindings
void installSyncJSI(jsi::Runtime& runtime, std::shared_ptr<react::CallInvoker> jsCallInvoker) {
    auto syncModule = jsi::Object(runtime);
    
    // discoverDevices()
    auto discoverDevices = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "discoverDevices"),
        0,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            char* result = rust_discover_devices();
            return rustToJSIString(runtime, result);
        }
    );
    syncModule.setProperty(runtime, "discoverDevices", std::move(discoverDevices));
    
    // registerDevice(deviceJson)
    auto registerDevice = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "registerDevice"),
        1,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(runtime, "registerDevice requires a string argument");
            }
            std::string deviceJson = args[0].asString(runtime).utf8(runtime);
            rust_register_device(deviceJson.c_str());
            return jsi::Value::undefined();
        }
    );
    syncModule.setProperty(runtime, "registerDevice", std::move(registerDevice));
    
    // initiateKeyExchange(deviceId)
    auto initiateKeyExchange = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "initiateKeyExchange"),
        1,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(runtime, "initiateKeyExchange requires a device ID");
            }
            std::string deviceId = args[0].asString(runtime).utf8(runtime);
            char* result = rust_initiate_key_exchange(deviceId.c_str());
            return rustToJSIString(runtime, result);
        }
    );
    syncModule.setProperty(runtime, "initiateKeyExchange", std::move(initiateKeyExchange));
    
    // completeKeyExchange(deviceId, peerPublicKey)
    auto completeKeyExchange = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "completeKeyExchange"),
        2,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isString() || !args[1].isString()) {
                throw jsi::JSError(runtime, "completeKeyExchange requires deviceId and peerPublicKey");
            }
            std::string deviceId = args[0].asString(runtime).utf8(runtime);
            std::string peerPublicKey = args[1].asString(runtime).utf8(runtime);
            rust_complete_key_exchange(deviceId.c_str(), peerPublicKey.c_str());
            return jsi::Value::undefined();
        }
    );
    syncModule.setProperty(runtime, "completeKeyExchange", std::move(completeKeyExchange));
    
    // startSync(deviceId)
    auto startSync = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "startSync"),
        1,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(runtime, "startSync requires a device ID");
            }
            std::string deviceId = args[0].asString(runtime).utf8(runtime);
            rust_start_sync(deviceId.c_str());
            return jsi::Value::undefined();
        }
    );
    syncModule.setProperty(runtime, "startSync", std::move(startSync));
    
    // cancelSync(deviceId)
    auto cancelSync = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "cancelSync"),
        1,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(runtime, "cancelSync requires a device ID");
            }
            std::string deviceId = args[0].asString(runtime).utf8(runtime);
            rust_cancel_sync(deviceId.c_str());
            return jsi::Value::undefined();
        }
    );
    syncModule.setProperty(runtime, "cancelSync", std::move(cancelSync));
    
    // getSyncProgress(deviceId)
    auto getSyncProgress = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "getSyncProgress"),
        1,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 1 || !args[0].isString()) {
                throw jsi::JSError(runtime, "getSyncProgress requires a device ID");
            }
            std::string deviceId = args[0].asString(runtime).utf8(runtime);
            char* result = rust_get_sync_progress(deviceId.c_str());
            return rustToJSIString(runtime, result);
        }
    );
    syncModule.setProperty(runtime, "getSyncProgress", std::move(getSyncProgress));
    
    // getConflicts()
    auto getConflicts = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "getConflicts"),
        0,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            char* result = rust_get_conflicts();
            return rustToJSIString(runtime, result);
        }
    );
    syncModule.setProperty(runtime, "getConflicts", std::move(getConflicts));
    
    // resolveConflict(conflictId, resolution)
    auto resolveConflict = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "resolveConflict"),
        2,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            if (count < 2 || !args[0].isString() || !args[1].isString()) {
                throw jsi::JSError(runtime, "resolveConflict requires conflictId and resolution");
            }
            std::string conflictId = args[0].asString(runtime).utf8(runtime);
            std::string resolution = args[1].asString(runtime).utf8(runtime);
            rust_resolve_conflict(conflictId.c_str(), resolution.c_str());
            return jsi::Value::undefined();
        }
    );
    syncModule.setProperty(runtime, "resolveConflict", std::move(resolveConflict));
    
    // getSyncHistory(limit)
    auto getSyncHistory = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "getSyncHistory"),
        1,
        [](jsi::Runtime& runtime, const jsi::Value& thisVal, const jsi::Value* args, size_t count) -> jsi::Value {
            int limit = 20;
            if (count >= 1 && args[0].isNumber()) {
                limit = static_cast<int>(args[0].asNumber());
            }
            char* result = rust_get_sync_history(limit);
            return rustToJSIString(runtime, result);
        }
    );
    syncModule.setProperty(runtime, "getSyncHistory", std::move(getSyncHistory));
    
    // Install on global object
    runtime.global().setProperty(runtime, "__SyncJSI", std::move(syncModule));
}

