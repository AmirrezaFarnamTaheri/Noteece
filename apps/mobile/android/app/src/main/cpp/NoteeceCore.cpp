#include "NoteeceCore.h"
#include <iostream>

// Include the generated C++ header from the Rust CXX bridge
// #include "packages/core-rs/src/lib.rs.h"

namespace com {
namespace noteece {

NoteeceCore::NoteeceCore() {
    // In a real implementation:
    // rust_agent = com::noteece::ffi::new_agent("db_path").into_raw();
    rust_agent = nullptr;
}

NoteeceCore::~NoteeceCore() {
    // Clean up
}

std::string NoteeceCore::process_sync_packet(const std::string& data) {
    // Delegate to Rust
    // return com::noteece::ffi::process_packet(data);
    return "{ \"status\": \"mocked_response\" }";
}

std::string NoteeceCore::generate_handshake() {
    // Delegate to Rust
    return "mocked_handshake_packet";
}

}
}
