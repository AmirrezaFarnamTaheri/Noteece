# Phase 1: Core Backend Audit Report (`packages/core-rs`)

**Status:** Critical Issues Identified
**Goal:** Ensure mathematical correctness, data integrity, and absolute security in the Rust backend.

## Overview
The `core-rs` crate is the brain of the application. It handles encryption, synchronization, and data storage. Our deep dive has revealed significant gaps in security and consistency that must be addressed before V1 release.

## 1.1 Core Security & Cryptography

### Encryption at Rest (Critical Gap)
*   **Observation:** The Mobile App (via `mobile_ffi.rs`) uses `rusqlite` to open the database but provides no mechanism to unlock it with a key.
*   **Implication:** If the Mobile App works today, it implies the database on the phone is **Plaintext**.
*   **Risk:** Loss of "End-to-End Encryption" promise. If the user loses their phone, data is accessible.
*   **Action:**
    *   Implement `rust_unlock_vault(password)` in FFI.
    *   Ensure `expo-sqlite` (or replacement) on the UI side supports SQLCipher or switch to a pure-Rust JSI access model where UI *only* talks to Rust, and Rust holds the DB connection.

### Timing Attacks in Authentication
*   **File:** `packages/core-rs/src/auth.rs`
*   **Observation:** `authenticate` returns early with `InvalidCredentials` if the user is not found (database lookup speed ~1ms). If the user is found, it proceeds to `Argon2::verify_password` (~500ms).
*   **Risk:** An attacker can enumerate valid usernames by measuring response time.
*   **Fix:** Implement a "Fake Verify" path. If user is not found, run a dummy Argon2 verification against a constant hash to equalize timing.

### Memory Protection (Zeroize)
*   **File:** `packages/core-rs/src/crypto.rs`
*   **Observation:** Keys (`DEK`, `KEK`, `SessionToken`) are stored in standard `Vec<u8>` or arrays. They are not cleared from memory on drop.
*   **Risk:** Keys remain in RAM after use. A core dump or debugger could extract them.
*   **Fix:** Implement `Zeroize` trait for all structs holding sensitive key material.

### Randomness
*   **Observation:** `generate_dek` uses `rand::random()` (ThreadRng). While usually seeded securely, explicit use of `OsRng` (as done in `encrypt_string`) is preferred for cryptographic keys to ensure direct OS entropy source.

---

## 1.2 Data Persistence (`db/`)

### Transaction Boundaries
*   **File:** `packages/core-rs/src/sync/engine.rs`
*   **Observation:** `apply_deltas` correctly uses a transaction.
*   **File:** `packages/core-rs/src/note.rs` -> `create_note`
*   **Observation:** Inserts into `note` and `fts_note` in separate statements.
*   **Risk:** If the second insert fails (e.g., FTS5 error), the database is left in an inconsistent state (note exists but is unsearchable).
*   **Fix:** Wrap all multi-table operations (Note+FTS, Project+Milestone) in explicit transactions.

### Performance - Hashing
*   **File:** `packages/core-rs/src/sync/engine.rs` -> `compute_entity_hashes`
*   **Observation:** `SELECT id, modified_at FROM note`.
*   **Analysis:** This is an O(N) operation on every sync manifest generation. For 10,000 notes, this scans the index.
*   **Optimization:** Implement a `Merkle Tree` or `Hash Chain` updated on every write, allowing O(1) checking if nothing changed, or O(log N) to find differences.

---

## 1.3 The Synchronization Engine (`sync/`)

### Vector Clocks (Major Architectural Gap)
*   **File:** `packages/core-rs/src/sync/vector_clock.rs` / `engine.rs`
*   **Observation:** `get_vector_clock` constructs a clock based on `MAX(sync_time)`.
*   **Analysis:** This is a **Hybrid Clock** relying on physical timestamps, not a true **Logical Vector Clock**.
*   **Risk:** Clock skew between devices (e.g., User sets phone time back 1 day) will break conflict detection (`local_ts > last_sync`).
*   **Fix:** Implement true Logical Clocks (Lamport counters) incremented on every edit. Persist these counters in `note_headers` or similar.

### Conflict Resolution Heuristics
*   **File:** `packages/core-rs/src/sync/engine.rs` -> `smart_merge_entity`
*   **Task:** "Longer title wins".
    *   *Critique:* Simple but annoying. If I correct a typo (shortening title), the remote stale version (longer) might win.
*   **Note:** Concatenation.
    *   *Critique:* Safe, but creates cleanup work for the user.
*   **Recommendation:** Move to **CRDTs** (Conflict-free Replicated Data Types) for Tasks (e.g., `LWW-Element-Set` for status) and `Yjs`/`Automerge` concepts for Notes (text editing).

### Sync Protocol
*   **File:** `packages/core-rs/src/sync/p2p.rs`
*   **Observation:** `register_device` trusts any device that connects?
*   **Check:** `trusted` field exists but defaults to `false`. However, `start_sync` might process deltas from untrusted devices?
*   **Audit:** Verify `process_sync_packet` checks `trusted == true` before applying any database changes.

---

## 1.4 API & FFI Boundaries

### FFI Safety (`mobile_ffi.rs`)
*   **Observation:** `rust_init` takes a path string.
*   **Safety:** No validation that the path is within the app's sandbox.
*   **String Handling:** Uses `CStr` and `CString`. Looks correct, but ensure `rust_free_string` is called by the consumer (Kotlin/Swift) to avoid leaks.

## Phase 1 Checklist
- [ ] **CRITICAL:** Implement Encryption at Rest for Mobile (SQLCipher integration).
- [ ] **CRITICAL:** Fix Timing Attack in `AuthService`.
- [ ] **HIGH:** Implement `Zeroize` for key material.
- [ ] **HIGH:** Transition Sync Engine to true Logical Vector Clocks.
- [ ] **MEDIUM:** Wrap all multi-write DB operations in transactions.
- [ ] **MEDIUM:** Optimize Sync Manifest generation (Merkle Tree?).
- [ ] **LOW:** Refine Task merge heuristic (LWW on timestamp preferred over string length).
