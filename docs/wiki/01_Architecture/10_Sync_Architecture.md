# Sync Architecture

This document describes Noteece's peer-to-peer synchronization system.

## Overview

Noteece uses a **decentralized, encrypted P2P sync** architecture:

```
┌─────────────┐         ┌─────────────┐
│   Device A  │◄───────►│   Device B  │
│  (Desktop)  │  mDNS   │  (Mobile)   │
│             │  TCP    │             │
│ SQLCipher   │  ECDH   │ SQLCipher   │
└─────────────┘         └─────────────┘
```

## Components

### Discovery (mDNS)

Devices discover each other via multicast DNS:

```rust
// Service name
"_noteece._tcp.local"
```

### Key Exchange (ECDH)

Each sync session uses ephemeral X25519 keys:

```
Device A                    Device B
    │                           │
    ├──── Ephemeral PubKey A ───►
    │                           │
    ◄──── Ephemeral PubKey B ────┤
    │                           │
    │   Shared Secret (ECDH)    │
    ├───────────────────────────┤
    │                           │
    │   Session Key (HKDF)      │
    ├───────────────────────────┤
```

### Transport

Encrypted TCP with ChaCha20-Poly1305:

| Field | Size | Description |
|-------|------|-------------|
| Nonce | 12 bytes | Unique per message |
| Ciphertext | Variable | Encrypted payload |
| Tag | 16 bytes | Authentication tag |

## Conflict Resolution

### Vector Clocks

Each entity carries a vector clock for causal ordering:

```json
{
  "entity_id": "note_123",
  "vector_clock": {
    "device_A": 5,
    "device_B": 3
  }
}
```

### Resolution Strategies

| Strategy | When Used | Behavior |
|----------|-----------|----------|
| Causal Ordering | Causally related | Earlier event wins |
| Last Write Wins | Concurrent scalars | Newer timestamp wins |
| SET UNION Merge | Arrays (tags, lists) | Union of all items |
| Manual | Unresolvable | User prompted |

### Array Merge (SET UNION)

**Before (v1.0.0):** Arrays replaced entirely → data loss

**After (v1.1.0):** Arrays merged with deduplication

```rust
fn merge_arrays(local: &Vec<Value>, remote: &Vec<Value>) -> Vec<Value> {
    let mut result = local.clone();
    let mut seen: HashSet<String> = HashSet::new();
    
    for item in local.iter() {
        seen.insert(item.to_string());
    }
    
    for item in remote.iter() {
        if !seen.contains(&item.to_string()) {
            result.push(item.clone());
        }
    }
    
    result
}
```

## Sync Protocol

### Manifest Exchange

```json
{
  "deviceId": "device_A",
  "sinceTimestamp": 1700000000,
  "changes": [
    {
      "entityType": "note",
      "entityId": "note_123",
      "operation": "update",
      "timestamp": 1700000100,
      "vectorClock": {"device_A": 5}
    }
  ]
}
```

### Delta Transfer

Only changed entities are transferred:

1. Exchange manifests
2. Identify missing/outdated entities
3. Request deltas for specific IDs
4. Apply changes with conflict detection

## JSI Bridge (Mobile)

### Architecture

```
React Native ─── JSI ─── C++ Bridge ─── FFI ─── Rust Core
```

### Benefits

- Unified sync logic in Rust
- No TypeScript crypto reimplementation
- High-performance native execution
- Memory-safe FFI boundary

### C++ Bridge

```cpp
// apps/mobile/android/app/src/main/cpp/NoteeceCore.cpp
std::string NoteeceCore::process_sync_packet(const std::string& data) {
    char* result = rust_process_sync_packet(data.c_str());
    std::string response(result);
    rust_free_string(result);
    return response;
}
```

## Future Roadmap

### Mesh Sync (v1.3.0)

Multi-device simultaneous sync:

```
   Device A
      ▲
     /│\
    / │ \
   /  │  \
  ▼   ▼   ▼
Device B ─ Device C
```

### Blind Relay (v2.0.0)

Internet sync without trusting the cloud:

```
Device A ─► Encrypted Blob ─► Relay Server ─► Device B
                                   │
                              (No access to
                               plaintext)
```

### CRDT Database (v2.0.0)

Moving from entity-level to row-level sync:

- Real-time collaboration
- Finer-grained conflict resolution
- Using cr-sqlite extension

---

*See also: [Sync Protocol](03_Sync_Protocol.md) | [Vector Clocks](05_Vector_Clocks.md)*

