# Mobile Sync Architecture

## Overview

The mobile sync system enables **offline-first, end-to-end encrypted synchronization** between Noteece desktop and mobile apps, creating a seamless "Life OS" experience across devices.

## Core Principles

1. **Offline-First**: Mobile app functions fully without connectivity
2. **Local-First**: Data lives primarily on device; sync is peer-to-peer
3. **Zero-Server**: No cloud servers; sync via local network or optional self-hosted relay
4. **End-to-End Encrypted**: All sync data is encrypted; relay servers cannot read content
5. **Conflict-Aware**: CRDT-based merge with user resolution for conflicts

## Architecture Overview

```
┌──────────────────┐                    ┌──────────────────┐
│  Mobile Device   │                    │  Desktop Device  │
│                  │                    │                  │
│  ┌────────────┐  │                    │  ┌────────────┐  │
│  │   SQLite   │  │◄──Encrypted Sync──┤  │   SQLite   │  │
│  │   Vault    │  │                    │  │   Vault    │  │
│  └────────────┘  │                    │  └────────────┘  │
│                  │                    │                  │
│  ┌────────────┐  │                    │  ┌────────────┐  │
│  │ Sync Agent │  │                    │  │ Sync Agent │  │
│  └────────────┘  │                    │  └────────────┘  │
└─────────┬────────┘                    └─────────┬────────┘
          │                                       │
          │       ┌───────────────────┐          │
          └──────►│  Optional Relay   │◄─────────┘
                  │  (Self-Hosted)    │
                  └───────────────────┘
```

## Sync Protocol

### 1. Connection Methods

#### A. Local Network Sync (Primary)
- Uses **mDNS/Bonjour** for device discovery
- Direct WebSocket connection over local WiFi
- Zero latency, maximum bandwidth
- No internet required

#### B. Relay Sync (Fallback)
- Optional self-hosted relay server
- Uses **WebRTC** for P2P connection through relay
- Relay cannot decrypt data
- For when devices aren't on same network

### 2. Sync Protocol Flow

```
Mobile                          Desktop
  │                               │
  ├──► Discover Devices ──────────┤
  │      (mDNS broadcast)         │
  │                               │
  │◄─── Device Response ──────────┤
  │      (device_id, public_key)  │
  │                               │
  ├──► Request Sync ──────────────┤
  │      (last_sync_timestamp)    │
  │                               │
  │◄─── Sync Manifest ────────────┤
  │      (changes since timestamp)│
  │                               │
  ├──► Pull Changes ──────────────┤
  │      (batch requests)         │
  │                               │
  │◄─── Encrypted Deltas ─────────┤
  │      (CRDT operations)        │
  │                               │
  ├──── Apply & Merge ────────────┤
  │      (local merge, conflict detect)
  │                               │
  ├──► Push Changes ──────────────┤
  │      (local deltas)           │
  │                               │
  │◄─── Ack & Conflicts ──────────┤
  │      (applied, conflicts)     │
  │                               │
  ├──── Resolve Conflicts ────────┤
  │      (if any)                 │
  │                               │
  └──► Sync Complete ─────────────┘
```

### 3. Data Structures

#### Sync Manifest
```rust
pub struct SyncManifest {
    pub device_id: String,
    pub since_timestamp: i64,
    pub changes: Vec<ChangeEntry>,
    pub total_size: u64,
}

pub struct ChangeEntry {
    pub entity_type: EntityType,
    pub entity_id: String,
    pub operation: Operation,
    pub timestamp: i64,
    pub dependency_chain: Vec<String>,
}

pub enum EntityType {
    Note,
    Task,
    Project,
    TimeEntry,
    HealthMetric,
    Transaction,
    CalDAVMapping,
}

pub enum Operation {
    Create,
    Update,
    Delete,
}
```

#### Sync Delta (Encrypted)
```rust
pub struct SyncDelta {
    pub change_id: String,
    pub entity_type: EntityType,
    pub entity_id: String,
    pub operation: Operation,
    pub encrypted_payload: Vec<u8>,  // Encrypted with shared key
    pub crdt_vector_clock: HashMap<String, u64>,
    pub signature: Vec<u8>,  // HMAC for integrity
}
```

### 4. Conflict Resolution

Noteece uses **CRDT** (Conflict-free Replicated Data Types) for automatic merge:

```rust
pub enum ConflictResolution {
    AutoMerged,           // CRDT successfully merged
    RequiresUser {        // User must choose
        options: Vec<ConflictOption>
    },
}

pub struct ConflictOption {
    pub source_device: String,
    pub timestamp: i64,
    pub preview: String,
}
```

**Auto-Merge Rules:**
- **Last-Write-Wins**: For scalar fields (title, status, priority)
- **Set Union**: For tags, links
- **Operational Transform**: For rich text content (Lexical state)

**User Resolution Required:**
- Conflicting structural changes (e.g., task moved to different projects)
- Large text divergences (> 30% diff)

### 5. Encryption

```rust
pub struct SyncEncryption {
    // Vault KEK (from password)
    vault_kek: [u8; 32],

    // Device-specific sync key (derived from KEK)
    device_sync_key: [u8; 32],

    // Per-session ephemeral key (ECDH)
    session_key: [u8; 32],
}
```

**Encryption Flow:**
1. Each device derives `device_sync_key` from vault KEK
2. Devices exchange public keys (ECDH) to create `session_key`
3. All sync deltas encrypted with `session_key` (ChaCha20-Poly1305)
4. Session key rotates every 1000 messages or 1 hour

## Mobile App Architecture

### 1. Fused Reality Today View

```
┌────────────────────────────────────────┐
│          Today: Nov 6, 2025            │
├────────────────────────────────────────┤
│  08:00 - 09:00  [CalDAV] Team Standup  │ ◄─ External calendar
│  09:00 - 10:00  [Task] Finish PR #123  │ ◄─ Internal task
│  10:30          [SRS] 5 cards due      │ ◄─ Spaced repetition
│  11:00 - 12:00  [CalDAV] Client Call   │ ◄─ External calendar
│  14:00          [Task] Review designs  │ ◄─ Internal task
│  15:00 - 16:00  [Block] Deep Work      │ ◄─ Foresight suggestion
└────────────────────────────────────────┘
```

**Data Sources:**
- CalDAV events (synced from `caldav_event_mapping` table)
- Task due dates (from `task` table)
- SRS due cards (from `knowledge_card` table)
- Foresight suggestions (from `insight` table)

### 2. Quick Capture

```rust
pub struct QuickCapture {
    pub capture_type: CaptureType,
    pub content: String,
    pub location: Option<Location>,
    pub audio: Option<AudioBlob>,
    pub photos: Vec<ImageBlob>,
}

pub enum CaptureType {
    Thought,           // → Create note in Inbox
    Task,              // → Create task
    HealthMetric,      // → Log health data
    Expense,           // → Log transaction
}
```

**Implementation:**
- iOS: Share Extension + Siri Shortcuts
- Android: Quick Tile + Voice Assistant integration
- Offline captures queued, synced when connection available

### 3. Location-Based Reminders

```sql
CREATE TABLE location_trigger (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    location_type TEXT NOT NULL,  -- 'arrive', 'leave'
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_id) REFERENCES task(id) ON DELETE CASCADE
);
```

**Geofencing:**
- Uses native iOS/Android geofencing APIs
- Triggers local notification when entering/exiting radius
- Works offline (no server required)

### 4. NFC/QR Triggers

```sql
CREATE TABLE nfc_trigger (
    id TEXT PRIMARY KEY,
    tag_id TEXT NOT NULL UNIQUE,
    action_type TEXT NOT NULL,  -- 'start_time', 'log_habit', 'open_note'
    parameters TEXT NOT NULL,    -- JSON parameters
    created_at INTEGER NOT NULL
);
```

**Use Cases:**
- Tap NFC tag on desk → Start "Deep Work" time entry
- Tap NFC at gym → Log workout (open HealthMode)
- Scan QR on whiteboard → Capture photo → OCR → Create note

## Sync Database Schema Additions

```sql
-- Track sync state per device
CREATE TABLE sync_state (
    device_id TEXT PRIMARY KEY,
    device_name TEXT NOT NULL,
    last_sync_timestamp INTEGER NOT NULL,
    last_sync_direction TEXT NOT NULL,  -- 'pull', 'push', 'bidirectional'
    total_synced_entities INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Track individual entity sync status
CREATE TABLE entity_sync_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    operation TEXT NOT NULL,  -- 'create', 'update', 'delete'
    synced_at INTEGER NOT NULL,
    vector_clock TEXT NOT NULL,  -- JSON of CRDT vector clock
    FOREIGN KEY (device_id) REFERENCES sync_state(device_id)
);

CREATE INDEX idx_entity_sync_log_entity ON entity_sync_log(entity_type, entity_id);
CREATE INDEX idx_entity_sync_log_device ON entity_sync_log(device_id, synced_at);

-- Track conflicts
CREATE TABLE sync_conflict (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    device_a TEXT NOT NULL,
    device_b TEXT NOT NULL,
    conflict_data TEXT NOT NULL,  -- JSON with both versions
    resolved INTEGER NOT NULL DEFAULT 0,
    resolved_at INTEGER,
    resolution_strategy TEXT,  -- 'manual', 'auto_merge', 'device_a_wins', etc.
    created_at INTEGER NOT NULL
);
```

## Implementation Phases

### Phase 1: Foundation (High Priority)
1. **Sync Agent Module**
   - Create `packages/core-rs/src/sync_agent.rs`
   - Implement connection manager (mDNS + WebSocket)
   - Add encryption layer (ChaCha20-Poly1305 + ECDH)

2. **Sync Database**
   - Add sync tables to schema
   - Implement sync state tracking
   - Add vector clock to all entities

3. **Desktop Sync Server**
   - Tauri command to start sync server
   - WebSocket server on local network
   - mDNS advertisement

### Phase 2: Mobile App Core (High Priority)
1. **React Native Setup**
   - Initialize `apps/mobile` with Expo
   - Add SQLite (expo-sqlite)
   - Add crypto (expo-crypto)

2. **Mobile Sync Client**
   - Implement sync protocol client
   - Add background sync (iOS: Background Fetch, Android: WorkManager)
   - Handle offline queue

3. **Fused Today View**
   - Build unified timeline UI
   - Integrate CalDAV events
   - Add task/SRS card display

### Phase 3: Advanced Mobile Features (Medium Priority)
1. **Quick Capture**
   - iOS Share Extension
   - Android Quick Tile
   - Voice integration (Siri Shortcuts, Google Assistant)

2. **Location Features**
   - Geofencing setup
   - Location-based task reminders
   - Background location handling

3. **NFC/QR Triggers**
   - NFC tag reading (iOS Core NFC, Android NFC)
   - QR code scanning
   - Action execution engine

### Phase 4: Relay Server (Low Priority)
1. **Optional Self-Hosted Relay**
   - Rust WebSocket relay server
   - WebRTC signaling
   - Deploy guide for self-hosting

## Security Considerations

1. **Zero-Knowledge Architecture**
   - Relay servers never see plaintext
   - Session keys never stored on relay
   - Perfect forward secrecy (ephemeral keys)

2. **Device Trust**
   - First sync requires physical proximity (local network)
   - New devices must be approved on existing device
   - Device revocation supported

3. **Data Integrity**
   - HMAC signatures on all sync deltas
   - Tamper detection
   - Automatic rollback on corruption

## Performance Optimizations

1. **Incremental Sync**
   - Only sync changed entities
   - Use timestamps + vector clocks for efficiency
   - Batch small changes into single message

2. **Compression**
   - zstd compression on sync payloads
   - ~70% size reduction for text content

3. **Smart Scheduling**
   - Sync on WiFi by default
   - Option for cellular (user configurable)
   - Background sync when charging

4. **Local Caching**
   - Cache frequently accessed entities
   - Pre-load today's timeline on app open
   - Image/blob lazy loading

## Testing Strategy

1. **Unit Tests**
   - Sync protocol state machine
   - CRDT merge logic
   - Encryption/decryption

2. **Integration Tests**
   - End-to-end sync between mock devices
   - Conflict resolution scenarios
   - Network interruption handling

3. **Device Testing**
   - iOS (iPhone, iPad)
   - Android (phone, tablet)
   - Desktop (macOS, Windows, Linux)

## User Experience

### First-Time Setup
```
1. Install mobile app
2. Create/unlock vault (same password as desktop)
3. Mobile discovers desktop via mDNS
4. Approve pairing on desktop
5. Initial sync (show progress bar)
6. Ready to use offline!
```

### Daily Usage
```
- Open app → See today's fused timeline
- Add quick capture → Syncs in background
- Tap NFC tag → Log activity instantly
- Arrive at location → Get task reminder
- No connectivity? → Works perfectly offline
- Return home → Auto-sync when on WiFi
```

---

**Next Steps:**
1. Create `sync_agent.rs` module structure
2. Implement mDNS device discovery
3. Build sync protocol state machine
4. Add sync database tables
5. Test local network sync between two desktops
6. Port to React Native mobile app
