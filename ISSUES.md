# Known Issues

_Last Updated: 2025-11-20_

This document tracks persistent, hard-to-debug issues in the codebase.

---

## 1. `core-rs` Backend Issues

### 1.1. FTS5 Feature Conflict with SQLCipher

- **Status:** **Mitigated**
- **Description:** There is a persistent build failure in the `core-rs` crate when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled.
- **Resolution:** A hybrid search engine was implemented in `search.rs`. The application now checks for the existence of the FTS5 table at runtime. If FTS5 is unavailable (due to build config), it automatically falls back to standard `LIKE` queries against the database content (which is transparently decrypted by SQLCipher at the connection level). This ensures search functionality is always available to the user.

### 1.2. Task Sync Timestamp Limitation

- **Status:** **Resolved**
- **Description:** The `task` and `project` tables in V1 schema lacked an `updated_at` or `modified_at` column. This limited the sync agent's ability to detect conflicts reliably for these entities.
- **Resolution:** Migration V15 was added to `db.rs` which introduces `updated_at` column to both `task` and `project` tables. The `sync_agent.rs` logic was updated to utilize this column for robust conflict detection.

---

## 2. `desktop` Frontend/Tauri Issues

### 2.1. `javascriptcore-rs-sys` Build Failure on Ubuntu 24.04

- **Status:** **Open**
- **Description:** The `cargo check` or build process for `apps/desktop/src-tauri` fails on Ubuntu 24.04 (Noble) with `pkg-config` error: `The system library 'javascriptcoregtk-4.0' required by crate 'javascriptcore-rs-sys' was not found.`
- **Cause:** Ubuntu 24.04 has removed `libjavascriptcoregtk-4.0-dev` in favor of `4.1`. The `javascriptcore-rs-sys` crate (dependency of `tauri` v1 via `wry`) strictly requires version 4.0.
- **Workaround:** Building on an older LTS (e.g., 22.04) or using a container with older libraries is required until `tauri` dependencies are updated to support WebKit 4.1 on this OS version.

### 2.2. React Router Future Flag Warnings

- **Status:** **Open (Non-blocking)**
- **Description:** `console.warn` outputs regarding React Router v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`) appear during tests.
- **Action:** These are deprecation warnings for a future upgrade and do not affect current functionality.

---

## 3. `mobile` Frontend Issues

### 3.1. Jest Worker Process Force Exit

- **Status:** **Open (Non-blocking)**
- **Description:** Mobile tests sometimes fail with "A worker process has failed to exit gracefully". This is typically caused by open handles (timers, async operations) not being cleaned up properly in the test environment.
- **Impact:** Test execution completes, but the exit code is non-zero. Coverage reports are still generated. This does not affect the stability of the built application.

### 3.2. React Native `act(...)` Warnings

- **Status:** **Open (Non-blocking)**
- **Description:** Tests emit warnings about updates to state not being wrapped in `act(...)`.
- **Action:** These are common in React Native testing with async hooks and do not indicate a functional failure. Future refactoring should wrap these updates explicitly.

---

## 4. Resolved Issues

### 4.1. Sync Schema Mismatch (Resolved)

- **Status:** **Resolved**
- **Description:** The `sync_agent.rs` was using plural table names (`notes`, `tasks`) while the database schema used singular (`note`, `task`). This caused sync to fail silently or panic.
- **Resolution:** Fixed `sync_agent.rs` to use singular table names. Added `sync_logic_tests.rs` to verify conflict resolution works against the correct schema.

### 4.2. Transaction Safety in Cascading Deletes (Resolved)

- **Status:** **Resolved**
- **Description:** Potential for orphaned records when deleting projects.
- **Resolution:** The `delete_project` function now executes within a strict transaction, manually removing related milestones, risks, and dependencies, and nullifying foreign keys in tasks and time entries before removing the project itself. Verified by `robustness_tests.rs`.

### 4.3. Sync Conflict Space Context (Resolved)

- **Status:** **Resolved**
- **Description:** The `SyncConflict` struct lacked `space_id`, causing `NOT NULL` constraint violations in the `sync_conflict` table during inserts.
- **Resolution:** Added `space_id` to `SyncConflict` and `SyncDelta`. Updated `sync_agent.rs` to populate this field from the database or incoming delta during conflict detection, ensuring it is persisted correctly.

### 4.4. Project Monolith Refactor (Resolved)

- **Status:** **Resolved**
- **Description:** `project.rs` was growing too large and mixing struct definitions with database logic.
- **Resolution:** Refactored into `packages/core-rs/src/project/mod.rs`, `models.rs`, and `db.rs` for better separation of concerns.

### 4.5. Sync History Panic (Resolved)

- **Status:** **Resolved**
- **Description:** `sync_logic_tests.rs` was panicking with "Invalid column type Null" when checking sync history on an empty table.
- **Resolution:** Updated `sync/history.rs` to safely handle `MAX(sync_time)` returning `NULL` by wrapping the result in `Option<i64>`.

### 4.6. Personal Modes Implementation (Resolved)

- **Status:** **Resolved**
- **Description:** Features for Health, Finance, and Travel modes were planned but unimplemented or placeholders.
- **Resolution:** Implemented `personal_modes.rs` backend logic and `HealthMode.tsx` frontend component with real database integration.
