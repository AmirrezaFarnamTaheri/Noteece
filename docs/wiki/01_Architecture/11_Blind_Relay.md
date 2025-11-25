# Blind Relay Servers

**Status:** ✅ Implemented (v1.1.0)  
**Module:** `packages/core-rs/src/sync/relay.rs`

---

## Overview

Blind Relay Servers enable Noteece devices to synchronize over the internet **without trusting the cloud**. The relay server acts as a store-and-forward mechanism but **never has access to unencrypted data**.

## Architecture

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│  Device A   │                    │   Relay     │                    │  Device B   │
│ (Encrypted) │ ───► E2E Blob ───► │  Server     │ ───► E2E Blob ───► │ (Encrypted) │
└─────────────┘                    │  (Blind)    │                    └─────────────┘
                                   └─────────────┘
                                        │
                                   No plaintext
                                   access ever
```

## Security Model

### What the Relay Sees

| Data | Visible to Relay? |
|------|-------------------|
| Device IDs | ✅ Yes (routing) |
| Encrypted Payload | ✅ Yes (opaque blob) |
| Payload Size | ✅ Yes |
| Timestamps | ✅ Yes |
| Plaintext Content | ❌ Never |
| Encryption Keys | ❌ Never |

### What the Relay Cannot Do

1. **Decrypt messages** - Only devices have the keys
2. **Modify content** - Authenticated encryption detects tampering
3. **Replay attacks** - Nonces prevent replay
4. **Inject messages** - Sender verification via signatures

## Protocol

### Message Types

```rust
pub enum RelayMessage {
    // Device registration
    RegisterDevice { device_id: String, public_key: Vec<u8> },
    
    // Send encrypted packet
    SendPacket { 
        recipient_id: String, 
        sender_id: String, 
        encrypted_payload: Vec<u8> 
    },
    
    // Fetch queued packets
    FetchPackets { device_id: String },
    
    // Notifications
    PacketsAvailable { sender_id: String, count: usize },
    
    // Responses
    Success,
    Error { message: String },
}
```

### Connection Flow

```
1. Device connects to Relay
2. Device sends RegisterDevice with public key
3. Relay stores device in routing table
4. Device sends/receives encrypted packets
5. Offline packets are queued (24h TTL)
```

## Implementation

### Server (`RelayServer`)

```rust
pub struct RelayServer {
    device_connections: Arc<Mutex<HashMap<String, ConnectedDevice>>>,
    message_queue: Arc<Mutex<HashMap<String, Vec<RelayMessage>>>>,
}

impl RelayServer {
    pub async fn start(&self, port: u16) -> Result<(), SyncError>;
}
```

### Client (`RelayClient`)

```rust
pub struct RelayClient {
    device_id: String,
    relay_address: SocketAddr,
    encryption_key: [u8; 32],
}

impl RelayClient {
    pub async fn connect(&mut self) -> Result<(), SyncError>;
    pub async fn send_to(&self, recipient: &str, data: &[u8]) -> Result<(), SyncError>;
    pub async fn receive(&mut self) -> Result<Vec<RelayEnvelope>, SyncError>;
}
```

## Configuration

### Environment Variables

```bash
# Relay server address
NOTEECE_RELAY_URL=wss://relay.noteece.app:443

# Enable relay sync (default: false, uses LAN only)
NOTEECE_RELAY_ENABLED=true

# Relay authentication token (optional)
NOTEECE_RELAY_TOKEN=your_token_here
```

### Desktop (`tauri.conf.json`)

```json
{
  "relay": {
    "enabled": true,
    "url": "wss://relay.noteece.app",
    "fallback_to_lan": true
  }
}
```

## Self-Hosting

You can run your own Blind Relay Server:

```bash
# Build the relay binary
cd packages/core-rs
cargo build --release --bin relay-server

# Run with Docker
docker run -d -p 8443:8443 noteece/relay-server

# Or directly
./target/release/relay-server --port 8443 --tls-cert cert.pem --tls-key key.pem
```

### Requirements

- Publicly accessible IP/domain
- TLS certificate (Let's Encrypt works)
- Minimal resources (relays don't decrypt)

## Rate Limiting

To prevent abuse:

| Limit | Value |
|-------|-------|
| Max packet size | 1 MB |
| Packets per minute | 100 |
| Queue TTL | 24 hours |
| Max queued packets | 1000 |

## Future Enhancements

1. **Onion Routing** - Route through multiple relays
2. **Payment Integration** - Pay-per-use relays
3. **Mesh Network** - Devices can relay for each other
4. **Tor Integration** - Hidden service support

---

*See also: [Sync Architecture](10_Sync_Architecture.md) | [Security Hardening](09_Security_Hardening.md)*

