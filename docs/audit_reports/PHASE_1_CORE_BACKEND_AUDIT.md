# Phase 1: The Core Backend Audit Report (`packages/core-rs`)

**Status:** Critical Issues Identified
**Goal:** Verify the mathematical correctness, security properties, and logical robustness of the `packages/core-rs` library.

## 1.1 Synchronization Logic (`sync/engine.rs`)

### Concurrency & Locks
*   **Struct:** `SyncAgent`
*   **Threading:** The `SyncAgent` relies on `&Connection` being passed in.
*   **Risk:** `rusqlite::Connection` is not thread-safe. `apply_deltas` takes `&mut Connection`, forcing single-threaded access.
*   **Audit Finding:** Good for safety, but potential UI blocker.
*   **Action:** Ensure `apply_deltas` is run in `spawn_blocking` to avoid freezing the main thread.

### Conflict Detection & Resolution
*   **Function:** `detect_conflict`
*   **Logic:** Checks `local_ts > last_sync` AND `remote_delta.timestamp > last_sync`.
*   **Vulnerability:** Clock Skew. If `last_sync` is based on local time, and `remote_delta.timestamp` is from a device with a clock 1 year in the future, it might falsely trigger (or miss) conflict logic.
*   **Deep Dive - Vector Clocks:**
    *   **Current State:** Code uses a "Hybrid Clock" (Map of DeviceID -> Max Timestamp). This relies on physical time.
    *   **Dead Code:** A `sync_vector_clock` table is created in `db_init.rs` but appears unused by the engine.
    *   **Fix:** Implement **Vector Clocks** (Lamport Timestamps) fully. Increment logical counters on every write and persist to `sync_vector_clock`.
*   **Smart Merge (`smart_merge_entity`):**
    *   **Task Merge:** "Longer title wins".
        *   **Flaw:** Heuristic, not deterministic CRDT.
        *   **Fix:** Implement Last Write Wins (LWW) based on logical timestamp.
    *   **Note Merge:** Concatenates content.
        *   **Flaw:** Duplicates content on every sync cycle if unresolved.
        *   **Fix:** Store conflict as a "Conflict Copy" (e.g., `Note (Conflict)`) or use strict 3-way merge.

### Deep Dive: Ambiguous Protocol Definitions
*   **Observation:**
    *   `sync/engine.rs` uses `models::SyncDelta` (Plaintext `data`).
    *   `sync/mobile_sync.rs` uses `protocol::types::SyncDelta` (Encrypted `encrypted_data`).
*   **Risk:** Split-Brain Logic. Two competing definitions of the sync data structure exist.
*   **Fix:** Consolidate to a single `SyncDelta` definition that supports End-to-End Encryption (Layer 2) or explicit SQLCipher-based replication.

### Deep Dive: Sync Schema Mismatch
*   **Observation:** `db_init.rs` defines `sync_state` with `last_seen`. Mobile code often references `last_sync_timestamp`.
*   **Risk:** If Mobile reads this table directly via FFI, it may crash or read garbage.
*   **Fix:** Ensure strict schema alignment between Rust struct `DeviceInfo` and Mobile TS interface.

## 1.2 Data Persistence (`db/migrations.rs`)

### Migration Safety
*   **Function:** `migrate`
*   **Audit Finding (Version 5):** `tags` migration logic assumes comma-separated strings.
    *   **Risk:** Data corruption if a tag contains a comma.
    *   **Fix:** Write a dedicated unit test for this migration block using a mock DB with dirty data.

### FTS Triggers (Version 20)
*   **Logic:** `CREATE TRIGGER task_ai ... INSERT INTO fts_task`.
*   **Performance:** Triggers add overhead to every write.
*   **Fix:** For bulk operations (Import), consider temporarily dropping triggers and rebuilding the FTS index at the end.

## 1.3 Authentication & Security (`auth.rs`)

### Timing Attacks
*   **Original Audit:** `Argon2::default().verify_password(...)` is constant-time.
*   **Deep Dive Re-evaluation:** `authenticate` returns early with `InvalidCredentials` if the user is not found (~1ms). If found, it runs Argon2 (~500ms).
*   **Risk:** **Vulnerability.** An attacker can enumerate valid usernames by measuring response time.
*   **Fix:** Implement a "Fake Verify" path. If user is not found, run a dummy Argon2 verification against a constant hash to equalize timing.

### Session Management
*   **Function:** `validate_session`
*   **Query:** `SELECT ... FROM sessions WHERE token = ?`.
*   **Performance:** `token` is indexed (`idx_sessions_token`). Fast.

### Mobile Encryption at Rest (Critical)
*   **Observation:** Mobile App (`apps/mobile`) via FFI uses `rusqlite` to open the DB but provides no keying mechanism.
*   **Risk:** The database on the phone is **Plaintext**.
*   **Action:** Implement `rust_unlock_vault(password)` in FFI and ensure Mobile UI uses a SQLCipher-capable library.

### Memory Protection
*   **Observation:** Keys (`DEK`, `KEK`) are stored in standard `Vec<u8>`.
*   **Risk:** Memory dumping reveals keys.
*   **Fix:** Implement `Zeroize` trait for all key structs.

## 1.4 Social Media Suite (`social/stream_processor.rs`)

### Data Ingestion
*   **Struct:** `StreamProcessor`
*   **Buffer:** Uses `VecDeque` with fixed capacity (30 lines).
*   **Privacy Guarantee:**
    *   **Finding:** The processor ingests raw accessibility text (highly sensitive).
    *   **Audit Requirement:** Implement a "Local Processing Guarantee" (LPG). Code must technically prevent this stream from being networked.
*   **Deduplication:** Uses Bloom Filter.
    *   **Risk:** Probabilistic false positives (missing posts).
    *   **Persistence:** Ensure Bloom Filter is cleared on session end to prevent saturation.
    *   **Fix:** Monitor false positive rate or switch to deterministic CAS hash for long-term storage.
*   **Platform Detection:**
    *   **Logic:** Simple substring checks.
    *   **Fix:** Use specific selectors (package ID) from Android Accessibility event.

## 1.5 Search Module (`search/mod.rs`)

### Query Parsing
*   **Function:** `search_notes`
*   **SQL Injection:** Uses `params.push(...)`. Safe.
*   **FTS Syntax:** Uses `MATCH ?`.
    *   **Risk:** Syntax errors if user types special chars (`*`, `"`).
    *   **Fix:** Sanitize user input (escape quotes, handle operators) before binding.

## 1.6 Task & Calendar Modules (`task`, `calendar`)

### Recurrence Logic
*   **Function:** `handle_recurrence`
*   **Risk:** `due_at = None` crashes recurrence logic.
*   **Fix:** Require `due_at` for recurring tasks.

### Calendar Data Loss
*   **Import:** `import_ics` ignores `DTSTART`/`DTEND`.
    *   **Bug:** Imported tasks are undated.
*   **Export:** `export_ics` hardcodes timestamp to `19970714...`.
*   **Fix:** Map `DTSTART` to `due_at`. Use `Task.id` as persistent UID.

## 1.7 Import & Export (`import.rs`)

### Zip Bomb & Encryption Layering
*   **Zip Bomb:** `import_from_notion` reads full files into RAM.
    *   **Fix:** Limit read size (10MB) and check compression ratio.
*   **Encryption Confusion:**
    *   `create_note` writes plaintext (Layer 1 encryption only).
    *   `export_to_zip` tries to `decrypt_string` (expecting Layer 2).
    *   **Result:** Export fails.
    *   **Fix:** Standardize on Layer 1 (SQLCipher) or consistently implement Layer 2.

## 1.8 Goals, Habits, Health (`goals.rs`, `habits.rs`, `health.rs`)

### Data Integrity
*   **Goals:** Logic is sound (`update_goal_progress`).
*   **Habits:** `complete_habit` streak logic needs Timezone Awareness.
    *   **Risk:** Users crossing timezone boundaries break streaks.
*   **Health:** `create_health_metric` inserts raw float.
    *   **Fix:** Add min/max validation constraints.

## 1.9 Note Versioning & Blobs (`versioning.rs`, `blob.rs`)

### Blob Storage (`blob.rs`)
*   **Chunking:** 4KB chunks. Encryption `XChaCha20Poly1305`.
*   **Audit Finding:** Content-Addressed Storage (CAS).
    *   **Risk:** `retrieve_blob` accumulates chunks in RAM. OOM risk for large files.
    *   **Fix:** Implement streaming retrieval (`Iterator`).

### Versioning (`versioning.rs`)
*   **Format:** `zstd` compressed raw bytes.
*   **Limit:** `create_snapshot` does not prune.
    *   **Risk:** Infinite growth of history folder.
    *   **Fix:** Implement a "retention policy" (keep last 10, or 1 per day for 30 days).

## 1.10 Business Logic Algorithms

### SRS Scheduler Precision (`srs.rs`)
*   **Bug:** `Duration::days(stability as i64)` truncates fractional days.
*   **Risk:** Cumulative scheduling drift (under-scheduling).
*   **Fix:** Use `Duration::seconds()` for precision.

### Backup Integrity (`backup.rs`)
*   **Observation:** Zips live `noteece.db`.
*   **Risk:** Corruption (Torn pages).
*   **Fix:** Use `VACUUM INTO 'backup.db'` to snapshot before zipping.

### Graph Indexer (`backlink.rs`)
*   **Observation:** `update_links` exists but is disconnected.
*   **Fix:** Call `update_links` in `note.rs`.

## Phase 1 Checklist
- [ ] **CRITICAL:** Implement Mobile Encryption (SQLCipher).
- [ ] **CRITICAL:** Fix Auth Timing Attack (Dummy Verify).
- [ ] **CRITICAL:** Fix Backup Integrity (VACUUM INTO).
- [ ] **CRITICAL:** Wire up Link Indexer.
- [ ] **CRITICAL:** Fix Calendar Import/Export.
- [ ] **HIGH:** Implement Vector Clocks (Use unused DB table).
- [ ] **HIGH:** Fix Zip Bomb vulnerability.
- [ ] **HIGH:** Fix SRS Scheduler Math.
- [ ] **MEDIUM:** Sanitize Search Queries.
- [ ] **MEDIUM:** Verify Thread safety (`spawn_blocking`).
- [ ] **MEDIUM:** Implement Versioning Retention Policy.
- [ ] **MEDIUM:** Streaming Blob Retrieval.
- [ ] **MEDIUM:** Resolve Sync Schema Mismatch.

---

## Technical Appendix: Implementation Guides

### A.1 Secure Mobile FFI (`rust_unlock_vault`)
To resolve the "Plaintext Mobile DB" issue, the FFI must support keying.

```rust
// packages/core-rs/src/mobile_ffi.rs

static ref DB_KEY: Mutex<Option<String>> = Mutex::new(None);

#[no_mangle]
pub unsafe extern "C" fn rust_unlock_vault(password: *const c_char) -> bool {
    let c_str = CStr::from_ptr(password);
    if let Ok(pass) = c_str.to_str() {
        // 1. Derive Key from Password + Salt
        let salt = b"salt_should_be_stored_in_header";
        let key = derive_key(pass, salt);

        // 2. Try to open DB
        let path = DB_PATH.lock().unwrap().clone().unwrap();
        let mut conn = Connection::open(path).unwrap();

        // 3. Apply Key (SQLCipher PRAGMA)
        match conn.pragma_update(None, "key", &key) {
            Ok(_) => {
                // 4. Verify by reading scalar
                if conn.query_row("SELECT count(*) FROM sqlite_master", [], |_| Ok(())).is_ok() {
                    *DB_KEY.lock().unwrap() = Some(key);
                    return true;
                }
            }
            Err(_) => return false,
        }
    }
    false
}
```

### A.2 Vector Clock Definition
Replace the Hybrid Clock with this structure.

```rust
// packages/core-rs/src/sync/vector_clock.rs

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct VectorClock {
    // Map<DeviceID, Counter>
    pub clocks: HashMap<String, u64>,
}

impl VectorClock {
    pub fn increment(&mut self, device_id: &str) {
        let counter = self.clocks.entry(device_id.to_string()).or_insert(0);
        *counter += 1;
    }
}
```

### A.3 Constant-Time Auth (Dummy Verify)
Prevent timing attacks by normalizing execution time for invalid users.

```rust
// packages/core-rs/src/auth.rs

pub fn authenticate(...) -> Result<Session, AuthError> {
    let start = Instant::now();
    let user_opt = get_user_by_username(username);

    let (stored_hash, user_id) = match user_opt {
        Some(u) => (u.password_hash, u.id),
        None => {
            // DUMMY: Hash of "password" (Pre-computed)
            ("$argon2id$v=19$m=4096,t=3,p=1$ZHVtbXlzYWx0$...", "dummy_id".to_string())
        }
    };

    // Always run verify - this consumes the ~500ms
    let verify_result = Argon2::default().verify_password(password.as_bytes(), &stored_hash);

    if user_opt.is_none() {
        return Err(AuthError::InvalidCredentials);
    }

    verify_result.map(|_| create_session(user_id))
}
```
