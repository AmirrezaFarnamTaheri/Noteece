# Known Issues

_Last Updated: 2025-11-20_

This document tracks persistent, hard-to-debug issues in the codebase.

---

## 1. `core-rs` Backend Issues

### 1.1. FTS5 Feature Conflict with SQLCipher

- **Status:** **Mitigated**
- **Description:** There is a persistent build failure in the `core-rs` crate when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled.
- **Resolution:** A hybrid search engine was implemented in `search.rs`. The application now checks for the existence of the FTS5 table at runtime. If FTS5 is unavailable (due to build config), it automatically falls back to standard `LIKE` queries against the database content (which is transparently decrypted by SQLCipher at the connection level). This ensures search functionality is always available to the user.

### 1.2. FTS5 Trigger Conflicts (Resolved)

- **Status:** **Resolved**
- **Description:** The FTS5 update trigger ('note_au') caused conflicts with SQLCipher.
- **Resolution:** Triggers were removed. FTS index updates are now handled manually within the application logic (in `create_note` and `update_note_content` functions) to ensure the index remains in sync with the content table.

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
