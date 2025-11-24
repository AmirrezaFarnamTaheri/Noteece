#include "NoteeceCore.h"
#include <iostream>
#include <cstdlib>

// Define the external Rust functions manually
extern "C" {
    void init_sync_agent_ffi(const char* db_path, const char* device_id);
    char* process_sync_packet_ffi(const char* data);
    char* generate_handshake_ffi();
    void free_string_ffi(char* s);
}

namespace com {
namespace noteece {

NoteeceCore::NoteeceCore() {
    // TODO: In the production release, this path must be passed from the Java Context via JSI
    // to support different build flavors (store/sideload) and dynamic storage paths.
    // For this Beta release, we hardcode the standard internal storage path for the main package.
    const char* default_db_path = "/data/data/com.noteece.app/files/noteece.db";
    const char* default_device_id = "android_device_main";

    // Initialize the Rust Global Agent
    init_sync_agent_ffi(default_db_path, default_device_id);

    rust_agent = nullptr;
}

NoteeceCore::~NoteeceCore() {
    // Clean up
}

std::string NoteeceCore::process_sync_packet(const std::string& data) {
    char* result_ptr = process_sync_packet_ffi(data.c_str());

    if (result_ptr == nullptr) {
        return "{\"error\": \"Rust processing failed\"}";
    }

    std::string result(result_ptr);
    free_string_ffi(result_ptr);

    return result;
}

std::string NoteeceCore::generate_handshake() {
    char* result_ptr = generate_handshake_ffi();

    if (result_ptr == nullptr) {
        return "{\"error\": \"Handshake generation failed\"}";
    }

    std::string result(result_ptr);
    free_string_ffi(result_ptr);

    return result;
}

}
}
