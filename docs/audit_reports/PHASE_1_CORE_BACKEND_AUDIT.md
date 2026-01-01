# Phase 1: Core Backend Audit Report (`packages/core-rs`)

**Status:** In Progress
**Goal:** Ensure mathematical correctness, data integrity, and absolute security of the Rust core.

## Overview
The `packages/core-rs` crate is the brain of Noteece. It handles encryption, synchronization, and data storage. A failure here is catastrophic (data loss or leak). This audit dives into the deepest implementation details.

## 1.1 Core Security & Cryptography

### 1.1.1 Authentication & Key Derivation (`auth.rs`, `crypto.rs`)
*   **Password Hashing:**
    *   **Current:** `Argon2id` is used for password verification. `PBKDF2-HMAC-SHA512` (256k iterations) is used for Database Key (KEK) derivation.
    *   **Finding (Timing Attack):** `AuthService::authenticate` returns `InvalidCredentials` immediately if the user is not found, but takes ~500ms (Argon2 verify) if the password is wrong.
    *   **Risk:** Allows username enumeration via timing analysis.
    *   **Fix:** Implement a "dummy verify" path. If user not found, perform a dummy Argon2 verification on a fake hash to equalize timing.
*   **Key Management in Memory:**
    *   **Finding:** Keys (`DEK`, `KEK`, `SessionToken`) are stored as `Vec<u8>` or `String` and are dropped normally.
    *   **Risk:** Memory dump or swap file analysis could reveal keys.
    *   **Fix:** Implement `Zeroize` trait for all structs holding sensitive data. Ensure keys are overwritten with zeros on drop.
*   **Encryption at Rest (Mobile Gap):**
    *   **Finding:** `note.rs` inserts `content_md` directly into the database. It relies on SQLCipher for encryption.
    *   **Critical Risk:** If the Mobile App (using `expo-sqlite`) opens this DB without SQLCipher support, it creates a **Plaintext** database. The `mobile_ffi.rs` bridge does not appear to pass a key to `rusqlite::Connection::open`.
    *   **Action:** Verify Mobile DB stack immediately. If unencrypted, this violates the "End-to-End Encrypted" promise.

### 1.1.2 Import Safety (`import.rs`)
*   **Zip Bombs:**
    *   **Risk:** Malicious exports could crash the app or fill the disk.
    *   **Fix:** Implement strict file size limits (e.g., 100MB max per file) and a global expansion ratio check (e.g., max 10x compression ratio) during unzip.
*   **Path Traversal:**
    *   **Check:** Verify `file.enclosed_name()` is used. Ensure extracted paths do not contain `..` or resolve outside the target directory.

## 1.2 Data Persistence (`db/`)

### 1.2.1 Schema & Migrations
*   **Atomicity:**
    *   **Finding:** `migrate` function checks version and applies updates.
    *   **Check:** Ensure *all* steps of a migration version are wrapped in a *single* transaction. If step 2 fails, step 1 must roll back.
*   **Foreign Keys:**
    *   **Finding:** SQLite does not enforce FKs by default.
    *   **Action:** Verify `PRAGMA foreign_keys = ON;` is executed on *every* new connection (in `DbConnection` setup or connection pool factory).

### 1.2.2 Performance
*   **Hashing:**
    *   **Finding:** `SyncAgent::compute_entity_hashes` performs a full table scan (`SELECT id, modified_at FROM note`) to generate the Merkle/Hash tree.
    *   **Risk:** O(N) operation on every sync. For 10k+ notes, this causes noticeable lag.
    *   **Fix:** Maintain a pre-computed `merkle_tree` or `manifest_hash` in a separate table, updated via Triggers on Insert/Update/Delete.

## 1.3 The Synchronization Engine (`sync/`)

### 1.3.1 Concurrency & Conflict Detection
*   **Vector Clocks (Critical Gap):**
    *   **Finding:** `engine.rs` uses Wall Clock Time (`local_ts > last_sync`) for conflict detection. `vector_clock` map is present but derived from `sync_history` (Hybrid Clock), not a true Logical Clock carried with Deltas.
    *   **Risk:** Clock skew between devices leads to false conflicts or lost updates (Last Write Wins based on skewed clock).
    *   **Action:** Implement true Vector Clocks (Lamport Timestamps) attached to every `SyncDelta` and persisted in `entity_metadata`.
*   **Merge Heuristics:**
    *   **Task:** Uses "Longer Title Wins".
    *   **Risk:** User corrects a typo (shortening title) -> Remote longer title overwrites it.
    *   **Fix:** Use Timestamp/Logical Clock for field-level LWW (Last Write Wins).
    *   **Note:** "Concat" strategy for notes is safe but poor UX. Consider `diff-match-patch` text merging.

### 1.3.2 Protocol (`p2p.rs`)
*   **State Machine:**
    *   **Check:** Verify `Handshake` -> `Auth` -> `Sync` state transitions are enforced. A peer sending `SyncDelta` before `Handshake` should be dropped.
*   **DoS Protection:**
    *   **Risk:** `serde_json` recursion limit. A deeply nested JSON payload could stack overflow the sync thread.
    *   **Fix:** Configure `serde_json` recursion limit and enforce max payload size (e.g., 5MB).

## 1.4 API Surface (FFI)
*   **Safety:**
    *   `mobile_ffi.rs` uses `unsafe` pointers (`*const c_char`).
    *   **Check:** Ensure all pointers are checked for NULL. Ensure strings are valid UTF-8. Ensure `CString` memory is freed correctly (`rust_free_string`).
    *   **Thread Safety:** The `GLOBAL_P2P` and `DB_PATH` are `Mutex` protected, which is good.

## Phase 1 Checklist
- [ ] **Security:** Implement "dummy verify" for Auth timing attack mitigation.
- [ ] **Security:** Implement `Zeroize` for `DEK`, `KEK`, and `SessionToken`.
- [ ] **Mobile:** Confirm/Fix Encryption at Rest architecture.
- [ ] **Sync:** Replace Wall Clock conflict detection with Logical/Vector Clocks.
- [ ] **Sync:** Replace "Longer Title Wins" with Field-Level LWW.
- [ ] **DB:** Verify `PRAGMA foreign_keys = ON` on connection pool.
- [ ] **Perf:** Optimize `compute_entity_hashes` (avoid full scan).
