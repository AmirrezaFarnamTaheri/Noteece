#pragma once

#include <memory>
#include <string>
#include "rust/cxx.h"

namespace com {
namespace noteece {

// This would typically be generated or defined by the CXX bridge
struct SyncAgent;

class NoteeceCore {
public:
    NoteeceCore();
    ~NoteeceCore();

    // Example methods exposing Rust functionality
    std::string process_sync_packet(const std::string& data);
    std::string generate_handshake();

private:
    // Opaque pointer to the Rust object
    // In a real implementation, this would hold the Box<SyncAgent>
    void* rust_agent;
};

}
}
