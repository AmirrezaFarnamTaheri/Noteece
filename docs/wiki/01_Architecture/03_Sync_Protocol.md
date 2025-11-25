# P2P Synchronization Protocol

## 1. Philosophy

Noteece Sync is designed to be **serverless**, **private**, and **resilient**. It allows two devices (e.g., Desktop and Mobile) to synchronize data directly over a local network (WiFi) without an intermediary cloud server.

## 2. Discovery

Devices discover each other using **mDNS** (Multicast DNS).

- **Service Type:** `_noteece-sync._tcp.local.`
- **TXT Records:**
  - `id`: Device ULID.
  - `name`: User-friendly name (e.g., "Jules' MacBook").
  - `port`: The TCP port listening for sync connections.

## 3. Handshake & Security

### Phase 1: Pairing (Authenticated Key Exchange)

Performed once to establish trust.

1.  **QR Code Generation (Desktop):**
    - `Payload = { public_key_A, ip_address, port, random_pin }`
2.  **Scan & Connect (Mobile):**
    - Mobile parses QR, connects to `ip:port`.
    - Sends `ClientHello { public_key_B }`.
3.  **Shared Secret:**
    - Both derive shared secret using **ECDH** (X25519).
    - `Shared_Key = ECDH(Priv_A, Pub_B) == ECDH(Priv_B, Pub_A)`
4.  **Verification:**
    - Mobile sends `Hash(Shared_Key + PIN)`.
    - Desktop verifies hash. If valid, trust is established.
    - Both store the other's Public Key as "Trusted".

### Phase 2: Session (Transport Encryption)

Performed on every sync connection.

1.  **Connection:** Initiator connects to Listener.
2.  **Handshake:**
    - `Initiator -> Listener`: `Handshake { device_id, nonce }`
    - `Listener`: Looks up stored Public Key for `device_id`.
    - `Listener -> Initiator`: `HandshakeResponse { encrypted_challenge }`
3.  **Transport:**
    - All subsequent packets are encrypted using **ChaCha20Poly1305** with an ephemeral session key.

## 4. Sync Logic: The "Delta" Approach

Noteece uses a state-based synchronization model.

### Packet Structure

All messages are serialized as JSON (for simplicity) inside the encrypted tunnel.

```json
{
  "type": "SyncRequest",
  "space_id": "01HD...",
  "vector_clock": {
    "device_A": 105,
    "device_B": 98
  }
}
```

### The Workflow

1.  **Vector Clock Exchange:**
    - Device A sends its `VectorClock` for the Space.
    - Device B compares with its own.

2.  **Delta Calculation:**
    - If `A` has missed updates from `B`:
      - `B` queries its `audit_log` or `updated_at` columns.
      - Selects entities where `updated_at > last_sync_time(A)`.
      - Bundles them into a `SyncDelta`.

3.  **Delta Application:**
    - `A` receives `SyncDelta`.
    - **Conflict Check:** For each entity, check if `local_updated_at > last_sync_time`.
      - **No Conflict:** Apply update (Overwrite local).
      - **Conflict:**
        - Insert into `sync_conflict` table.
        - Do NOT overwrite local data.
        - Notify user.

### Conflict Resolution Strategy

When a conflict is detected (concurrent edits on different devices), Noteece adopts a "Safety First" approach:

1.  **Detection:**
    - Calculated by comparing the incoming `vector_clock` with the local `vector_clock` for the specific entity ID.
    - If the incoming clock is neither strictly greater nor strictly less than the local clock, a concurrent edit has occurred.

2.  **Quarantine:**
    - The incoming payload is **not** applied to the active table.
    - Instead, it is serialized and stored in the `sync_conflict` table with `status = 'pending'`.

3.  **Resolution:**
    - **Manual:** The user is presented with a diff UI (Local vs. Remote) and must choose one or merge content manually.
    - **Last-Write-Wins (Fallback):** For non-critical data (e.g., read status), the system may auto-resolve based on the wall-clock timestamp (`updated_at`), but this is strictly opt-in per entity type.

4.  **Acknowledgment:**
    - `A` sends `SyncAck`.
    - `B` updates its `sync_history` to reflect that `A` is now up to date.

## 5. Mobile Implementation

Since the Mobile app runs in a JavaScript environment (React Native) without the Rust core, the sync protocol is re-implemented in TypeScript (`sync-client.ts`).

- **Crypto:** Uses `expo-crypto` for ECDH and hashing.
- **Storage:** Uses `expo-sqlite` to read/write the local mirror database.
- **Networking:** Uses `react-native-tcp-socket` (or equivalent polyfill) to establish the TCP connection.

## 6. Future Roadmap

- **Relay Servers:** Optional, encrypted relay servers for syncing across different networks (Internet sync).
- **Blob Sync:** Optimization for transferring large attachments in chunks. Currently, only metadata is synced; blobs must be transferred separately (not yet implemented).
