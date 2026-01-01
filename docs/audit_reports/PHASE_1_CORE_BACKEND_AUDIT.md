# Phase 1: The Core Backend Audit Report

**Status:** Ready for Execution
**Goal:** Verify the mathematical correctness, security properties, and logical robustness of the `packages/core-rs` library.

## 1.1 Synchronization Logic (`sync/engine.rs`)

### Concurrency & Locks
*   **Struct:** `SyncAgent`
*   **Threading:** The `SyncAgent` does *not* appear to hold internal state locks (Mutex/RwLock). It relies on `&Connection` being passed in.
*   **Risk:** `rusqlite::Connection` is not thread-safe.
*   **Audit Finding:** `apply_deltas` takes `&mut Connection`. This forces single-threaded access, which is good for safety but potentially blocks the UI if the transaction is long.
*   **Action:** Ensure `apply_deltas` is run in a separate thread (e.g. `tauri::async_runtime::spawn_blocking`).

### Conflict Detection & Resolution
*   **Function:** `detect_conflict`
*   **Logic:**
    *   It currently checks `local_ts > last_sync` AND `remote_delta.timestamp > last_sync`.
    *   **Vulnerability:** Clock Skew. If `last_sync` is based on local time, and `remote_delta.timestamp` is from a device with a clock 1 year in the future, it might falsely trigger (or miss) conflict logic.
    *   **Fix:** **Vector Clocks**.
        *   Implement a `VectorClock` struct (Map<DeviceID, Counter>).
        *   Increment local counter on every write.
        *   Send Vector Clock with every `SyncDelta`.
        *   Conflict exists if `RemoteVC` is neither dominant nor subordinate to `LocalVC` (Concurrent).
*   **Smart Merge (`smart_merge_entity`):**
    *   **Task Merge:**
        *   Logic: `merged["title"] = remote["title"]` if remote is longer.
        *   **Flaw:** "Longer title wins" is a heuristic, not a CRDT.
        *   **Fix:** Implement **Last Write Wins (LWW)** based on a logical timestamp (or wall clock with drift correction) for the *field* level, or manual resolution.
    *   **Note Merge:**
        *   Logic: Concatenates content with `--- MERGED REMOTE CONTENT ---`.
        *   **Flaw:** This duplicates content on every sync cycle if the conflict isn't resolved immediately.
        *   **Fix:** Store the conflict as a "Conflict Copy" (e.g., `Note Title (Conflict 2023-10-27)`) instead of merging inline.

## 1.2 Data Persistence (`db/migrations.rs`)

### Migration Safety
*   **Function:** `migrate`
*   **Pattern:** Checks `current_version` and applies batches.
*   **Audit Finding (Version 5):**
    *   Logic: `SELECT ... FROM task` -> `DROP TABLE task` -> `ALTER TABLE task_new RENAME`.
    *   **Risk:** If `task_new` creation fails (e.g. OOM), the transaction rolls back. Safe.
    *   **Risk:** `tags` migration logic is complex (string splitting). It assumes tags are comma-separated. If a tag contains a comma, data is corrupted.
    *   **Fix:** Write a dedicated unit test for this migration block using a mock DB with dirty data.

### FTS Triggers (Version 20)
*   **Logic:** `CREATE TRIGGER task_ai ... INSERT INTO fts_task`.
*   **Performance:** Triggers add overhead to every write.
*   **Audit:** Check if bulk imports disable triggers? No. Bulk import of 10k tasks will be 2x slower due to FTS updates.
*   **Fix:** For bulk operations (Import), consider temporarily dropping triggers and rebuilding the FTS index at the end.

## 1.3 Authentication (`auth.rs`)

### Timing Attacks
*   **Function:** `authenticate`
*   **Code:** `Argon2::default().verify_password(...)`.
*   **Finding:** `argon2` crate handles constant-time comparison. This is safe.
*   **Token Gen:** `rand::thread_rng().fill(...)`. Safe.

### Session Management
*   **Function:** `validate_session`
*   **Query:** `SELECT ... FROM sessions WHERE token = ?`.
*   **Performance:** `token` is indexed (`idx_sessions_token`). Fast.

## 1.4 Social Media Suite (`social/stream_processor.rs`)

### Data Ingestion
*   **Struct:** `StreamProcessor`
*   **Buffer:** Uses `VecDeque` with fixed capacity (30 lines).
*   **Deduplication:** `bloomfilter::Bloom` with 0.01 error rate.
    *   **Audit:** Bloom filter is probablistic. 1 in 100 duplicate posts might slip through.
    *   **Risk:** Low. Only results in minor data duplication.
*   **Platform Detection:**
    *   **Logic:** Simple substring checks ("Twitter", "Reddit").
    *   **Risk:** Generic text "I like Reddit" might be misclassified as a Reddit post.
    *   **Fix:** Use specific selectors (package ID from Android Accessibility event) if possible, rather than raw text.
    *   **Persistance:** Ensure the Bloom Filter is cleared on "Session End" or explicitly managed to prevent it from filling up over weeks of uptime.

## 1.5 Search Module (`search/mod.rs`)

### Query Parsing
*   **Function:** `search_notes`
*   **Logic:** Splits query by whitespace. Extracts `tag:value`.
*   **SQL Injection:**
    *   **Audit:** Uses `params.push(...)` for FTS query and tags. Safe.
    *   **FTS Syntax:** Uses `MATCH ?2`.
    *   **Risk:** If user types `title:foo OR title:bar` directly into the search bar, `MATCH` might throw a syntax error if not sanitized/escaped.
    *   **Fix:** Sanitize the user input. Escape quotes `"` and FTS operators `NEAR`, `OR`, `AND` unless explicitly supported.

## 1.6 Task & Calendar Modules (`task`, `calendar`)

### Recurrence Logic (`task/db.rs`)
*   **Function:** `handle_recurrence`
*   **Logic:** Checks for `parent_task_id` to prevent infinite loops. Parses `RRULE`.
*   **Flaw:** Uses `dt.timestamp() > current_due`.
*   **Risk:** Timezone handling. If `current_due` is UTC timestamp but `RRULE` is floating (no TZ), shifts might occur.
*   **Edge Case:** If `due_at` is `None`, defaults to `now`. A task without a due date cannot logically recur "Weekly".
*   **Fix:** Require `due_at` for recurrence.

### ICS Export (`calendar.rs`)
*   **Logic:** `calendar.add_event(event)`.
*   **Audit:** Generates a new ULID for every export event (`Event::new(ulid::Ulid::new().to_string(), ...)`).
*   **Risk:** Importing this ICS into Google Calendar repeatedly will create duplicates because the UID changes every time.
*   **Fix:** Use the `Task.id` as the persistent UID for the ICS event.

## 1.7 Import & Export (`import.rs`)

### Zip Bomb & Path Traversal
*   **Function:** `import_from_notion` / `import_from_obsidian`
*   **Audit:** `WalkDir` for Obsidian. `ZipArchive` for Notion.
*   **Path Traversal:** `file.enclosed_name()` is used. Safe.
*   **Resource Exhaustion:** `file.read_to_string(&mut content)` reads entire files into RAM.
    *   **Risk:** DoS via large file.
    *   **Fix:** Limit read size (e.g. `take(10MB)`) and check zip header size.

### Decryption Safety
*   **Function:** `export_to_json`
*   **Logic:** Iterates notes, calls `decrypt_string`.
*   **Failure Mode:** If decryption fails, it logs a warning and clears content. Safe.

## 1.8 Goals, Habits, Health (`goals.rs`, `habits.rs`, `health.rs`)

### Data Integrity
*   **Goals:** `update_goal_progress` checks `current >= target`. Logic is sound.
*   **Habits:** `complete_habit` logic for streaks (`diff <= 7` for weekly).
    *   **Risk:** Timezone boundary issues. `chrono::DateTime::from_timestamp(..., 0)` assumes UTC. A user completing a habit at 1AM Tuesday (UTC) might be Monday (local).
    *   **Fix:** Store timezone offset with habit logs or normalize to "User Day".
*   **Health:** `create_health_metric` inserts raw float values.
    *   **Risk:** No validation on `value` (e.g., negative heart rate).
    *   **Fix:** Add `min/max` constraints based on `metric_type`.

## 1.9 Note Versioning & Blobs (`versioning.rs`, `blob.rs`)

### Blob Storage (`blob.rs`)
*   **Chunking:** 4KB chunks.
*   **Encryption:** `XChaCha20Poly1305` per chunk.
*   **Key Derivation:** `HKDF(MasterKey, Hash(Chunk))`.
*   **Audit Finding:** This is **Content-Addressed Storage** (CAS).
    *   **Good:** Automatic deduplication of identical chunks (e.g., common images, headers).
    *   **Risk:** `retrieve_chunk` decrypts into memory `Vec<u8>`. For a 50MB file, `retrieve_blob` accumulates all chunks in RAM.
    *   **Fix:** Implement streaming retrieval (`Iterator<Item = Result<Vec<u8>>>`) to avoid OOM on large attachments.

### Versioning (`versioning.rs`)
*   **Format:** `zstd` compressed raw bytes.
*   **Naming:** ULID filenames.
*   **Limit:** `create_snapshot` does *not* prune old snapshots.
    *   **Risk:** Infinite growth of history folder.
    *   **Fix:** Implement a "retention policy" (keep last 10, or 1 per day for 30 days) in `create_snapshot`.

## Phase 1 Checklist
- [ ] Refactor `smart_merge_entity` for Task Titles (Timestamp LWW instead of Length).
- [ ] Verify `apply_deltas` is never called on the UI thread.
- [ ] Implement Vector Clock logic for `detect_conflict`.
- [ ] Test migration v5 with tags containing commas.
- [ ] Implement FTS query sanitization in `search_notes`.
- [ ] Verify `StreamProcessor` bloom filter lifecycle.
- [ ] Fix `handle_recurrence` to handle `due_at = None`.
- [ ] Fix `export_ics` to use stable UIDs.
- [ ] Add strict file size limit (10MB) to `import_from_notion`.
- [ ] Add timezone awareness to Habit Streak calculation.
- [ ] Implement retention policy for Note Snapshots.
- [ ] Refactor `retrieve_blob` to return a Stream/Iterator.
