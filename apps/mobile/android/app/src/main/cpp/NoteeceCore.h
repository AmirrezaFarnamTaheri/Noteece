#ifndef NOTEECE_CORE_H
#define NOTEECE_CORE_H

#include <string>

namespace com {
namespace noteece {

/**
 * NoteeceCore - C++ bridge to Rust core library
 * 
 * Provides high-performance sync operations via JSI
 */
class NoteeceCore {
public:
    NoteeceCore();
    ~NoteeceCore();
    
    /**
     * Initialize the core with database path
     * @param db_path Path to SQLite database
     * @return true if initialization successful
     */
    bool initialize(const std::string& db_path);
    
    /**
     * Shutdown and cleanup resources
     */
    void shutdown();
    
    /**
     * Process an incoming sync packet
     * @param data Encrypted packet data (JSON)
     * @return Response packet (JSON)
     */
    std::string process_sync_packet(const std::string& data);
    
    /**
     * Generate handshake packet for key exchange
     * @return Handshake packet with ephemeral public key
     */
    std::string generate_handshake();
    
    /**
     * Discover devices on local network via mDNS
     * @return JSON array of discovered devices
     */
    std::string discover_devices();
    
    /**
     * Initiate ECDH key exchange with peer
     * @param device_id Target device identifier
     * @return Key exchange result (JSON)
     */
    std::string initiate_key_exchange(const std::string& device_id);
    
    /**
     * Get current sync progress with device
     * @param device_id Target device identifier
     * @return Progress info (JSON)
     */
    std::string get_sync_progress(const std::string& device_id);
    
    /**
     * Check if core is initialized
     */
    bool isInitialized() const { return is_initialized; }

private:
    void* rust_agent;
    bool is_initialized;
};

} // namespace noteece
} // namespace com

#endif // NOTEECE_CORE_H
