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

### Encryption Layering Confusion
*   **File:** `packages/core-rs/src/note.rs` vs `packages/core-rs/src/import.rs`
*   **Observation:**
    *   `create_note` inserts `content_md` directly (implying plaintext application data, relying on SQLCipher for disk encryption).
    *   `export_to_zip` calls `decrypt_string` on `content_md` before writing to file.
*   **Conflict:** If `create_note` writes plaintext (Layer 1 encryption only), and `export` tries to decrypt it (expecting Layer 2 encryption), the Export function will **FAIL** or produce garbage.
*   **Fix:** Standardize on one model.
    *   **Option A (Preferred):** Rely on SQLCipher (Layer 1) for all data. Remove `decrypt_string` from Export.
    *   **Option B:** Implement Application-Layer Encryption (Layer 2) consistently in `create_note`/`update_note`.

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

---

## 1.2 Data Persistence (`db/`)

### Backup Integrity (Live Zipping)
*   **File:** `packages/core-rs/src/backup.rs`
*   **Observation:** `create_backup` recursively zips the vault directory, including the live SQLite database file (`noteece.db`).
*   **Risk:** Database Corruption. If the app is writing to the DB while zip is reading it, the backup may contain "torn pages" or partial WAL states, resulting in a corrupt, unrestoreable file.
*   **Fix:** Use `VACUUM INTO` to create a safe snapshot of the DB, then zip the snapshot.

### Disconnected Link Indexer (Dead Code)
*   **File:** `packages/core-rs/src/backlink.rs` vs `note.rs`
*   **Observation:** `update_links` exists to parse `[[links]]` and populate the `link` table.
*   **Bug:** `note.rs` (`create_note`/`update_note`) **NEVER** calls `update_links`.
*   **Result:** The `link` table is permanently empty. The Knowledge Graph will show 0 connections between notes.
*   **Fix:** Call `backlink::update_links` inside the `handle_note_update` hook.

### Transaction Boundaries
*   **File:** `packages/core-rs/src/note.rs` -> `create_note`
*   **Observation:** Inserts into `note` and `fts_note` in separate statements.
*   **Risk:** If the second insert fails (e.g., FTS5 error), the database is left in an inconsistent state (note exists but is unsearchable).
*   **Fix:** Wrap all multi-table operations (Note+FTS, Project+Milestone) in explicit transactions.

### Import Vulnerabilities (Zip Bomb)
*   **File:** `packages/core-rs/src/import.rs`
*   **Observation:** `import_from_notion` iterates `archive.len()` and calls `read_to_string` on entries.
*   **Risk:** A malicious Zip file (Zip Bomb) can contain a small compressed file that expands to gigabytes, causing OOM (Out of Memory) crashes.
*   **Fix:** Implement a `MAX_FILE_SIZE` limit (e.g., 10MB) for imported notes.

### Calendar Data Loss
*   **File:** `packages/core-rs/src/calendar.rs`
*   **Import:** `import_ics` parses `SUMMARY` and `DESCRIPTION` but **ignores** `DTSTART`/`DTEND`. Importing a calendar results in undated tasks.
*   **Export:** `export_ics` hardcodes the event time to "19970714T170000Z".
*   **Fix:** Map ICS `DTSTART` to Task `due_at`. Use real timestamps for export.

---

## 1.3 The Synchronization Engine (`sync/`)

### Ambiguous Protocol Definitions (Split-Brain)
*   **Observation:**
    *   `sync/engine.rs` uses `models::SyncDelta` (Plaintext `data: Option<Vec<u8>>`).
    *   `sync/mobile_sync.rs` uses `protocol::types::SyncDelta` (Encrypted `encrypted_data: Some(Vec<u8>)`).
*   **Risk:** Two competing definitions of the sync data structure exist.
    *   If Desktop uses `engine.rs` (Plaintext Merge), and Mobile uses `mobile_sync.rs` (Encrypted), they cannot talk to each other.
*   **Fix:** Consolidate to a single `SyncDelta` definition that supports End-to-End Encryption (Layer 2) or explicit SQLCipher-based replication.

### Vector Clocks (Major Architectural Gap)
*   **Observation:** `get_vector_clock` constructs a clock based on `MAX(sync_time)`. This is a **Hybrid Clock** relying on physical timestamps.
*   **Risk:** Clock skew breaks conflict detection.
*   **Fix:** Implement true Logical Clocks (Lamport counters).

### Conflict Resolution Heuristics
*   **Observation:** "Longer title wins" (Tasks) and Concatenation (Notes).
*   **Recommendation:** Move to **CRDTs** (LWW-Element-Set, Yjs).

---

## 1.4 Business Logic Algorithms

### SRS Scheduler Precision
*   **File:** `packages/core-rs/src/srs.rs`
*   **Observation:** `next_due` calculation uses `Duration::days(new_stability as i64)`.
*   **Bug:** Casting `f64` stability (e.g., 2.5 days) to `i64` (2 days) causes cumulative scheduling drift. The algorithm systematically under-schedules.
*   **Fix:** Use `Duration::seconds((stability * 86400.0) as i64)`.

## Phase 1 Checklist
- [ ] **CRITICAL:** Implement Encryption at Rest for Mobile.
- [ ] **CRITICAL:** Fix Backup Integrity (VACUUM INTO).
- [ ] **CRITICAL:** Wire up Link Indexer (`update_links`).
- [ ] **CRITICAL:** Fix Calendar Import/Export (Timestamps).
- [ ] **HIGH:** Fix SRS Scheduler Math.
- [ ] **HIGH:** Resolve Encryption Layering Confusion.
- [ ] **HIGH:** Fix Timing Attack in Auth.
