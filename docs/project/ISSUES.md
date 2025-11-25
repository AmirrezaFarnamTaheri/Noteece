# Known Issues

_Last Updated: 2025-11-25 (v1.0.0)_

This document tracks persistent, hard-to-debug issues in the codebase. Each issue includes status, description, impact, and workaround information.

---

## 1. `core-rs` Backend Issues

### 1.1. FTS5 Feature Conflict with SQLCipher

- **Status:** **Mitigated**
- **Severity:** Low (fallback available)
- **Description:** There is a persistent build failure in the `core-rs` crate when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled simultaneously.
- **Root Cause:** The FTS5 extension requires specific compilation flags that conflict with SQLCipher's OpenSSL vendoring.
- **Resolution:** A hybrid search engine was implemented in `search.rs`. The application now checks for the existence of the FTS5 table at runtime. If FTS5 is unavailable, it automatically falls back to standard `LIKE` queries against decrypted content.
- **Impact:** Search functionality is always available; FTS5's advanced features (stemming, ranking) may be unavailable in some builds.

### 1.2. Task Sync Timestamp Limitation

- **Status:** **Resolved** (v0.9.0)
- **Description:** The `task` and `project` tables in V1 schema lacked an `updated_at` column, limiting conflict detection.
- **Resolution:** Migration V15 added `updated_at` column to both tables. The sync agent now uses this for robust conflict detection.

---

## 2. `desktop` Frontend/Tauri Issues

### 2.1. `javascriptcore-rs-sys` Build Failure on Ubuntu 24.04

- **Status:** **Open**
- **Severity:** Medium (platform-specific)
- **Description:** The `cargo check` or build process for `apps/desktop/src-tauri` fails on Ubuntu 24.04 (Noble) with:
  ```
  pkg-config error: The system library 'javascriptcoregtk-4.0' required by crate 'javascriptcore-rs-sys' was not found.
  ```
- **Root Cause:** Ubuntu 24.04 removed `libjavascriptcoregtk-4.0-dev` in favor of 4.1. The `javascriptcore-rs-sys` crate (dependency of Tauri v1 via `wry`) requires version 4.0.
- **Workaround:**
  - Build on Ubuntu 22.04 LTS
  - Use Docker/Podman container with 22.04 base
  - Use GitHub Actions CI (builds on ubuntu-22.04)
- **Tracking:** Awaiting Tauri v2 stable which supports WebKit 4.1

### 2.2. React Router Future Flag Warnings

- **Status:** **Resolved** (v1.0.0)
- **Description:** Console warnings about React Router v7 future flags (`v7_startTransition`, `v7_relativeSplatPath`).
- **Resolution:** App.tsx now uses `createMemoryRouter` with future flags enabled.

---

## 3. `mobile` Frontend Issues

### 3.1. Jest Worker Process Force Exit

- **Status:** **Open (Non-blocking)**
- **Severity:** Low (tests still pass)
- **Description:** Mobile tests sometimes fail with "A worker process has failed to exit gracefully". This is typically caused by open handles (timers, async operations) not being cleaned up properly.
- **Impact:** Test execution completes, but exit code may be non-zero. Coverage reports are still generated.
- **Workaround:** Use `--forceExit` flag in Jest commands (already configured in CI).

### 3.2. React Native `act(...)` Warnings

- **Status:** **Open (Non-blocking)**
- **Severity:** Low (cosmetic)
- **Description:** Tests emit warnings about updates not being wrapped in `act(...)`.
- **Impact:** These are common in React Native testing with async hooks and do not indicate functional failure.
- **Future:** Will be addressed with testing-library updates.

### 3.3. Font Loading on First Launch

- **Status:** **Open**
- **Severity:** Low (UX polish)
- **Description:** Custom fonts (Inter family) may flash system fonts briefly on first app launch.
- **Workaround:** Splash screen covers most of this. Future fix: pre-bundle fonts in app binary.

---

## 4. CI/CD Issues

### 4.1. iOS Signing in CI

- **Status:** **Open**
- **Severity:** Medium (manual workaround)
- **Description:** iOS builds require signing certificates that aren't available in public CI.
- **Workaround:** iOS builds produce simulator-only archives. Production builds require:
  - Apple Developer account
  - EAS Build (recommended) or local Xcode
  - Certificates and provisioning profiles
- **Documentation:** See `apps/mobile/DEPLOYMENT_GUIDE.md`

### 4.2. Android Keystore in CI

- **Status:** **Mitigated**
- **Description:** Android release builds require a keystore for signing.
- **Resolution:** CI workflow checks for `ANDROID_KEYSTORE_BASE64` secret. If absent, builds unsigned APK.
- **Production:** Store keystore as base64-encoded secret in GitHub repository settings.

---

## 5. Resolved Issues Archive

### 5.1. Sync Schema Mismatch (v0.9.0)

- **Status:** **Resolved**
- **Description:** `sync_agent.rs` used plural table names (`notes`, `tasks`) while schema used singular.
- **Resolution:** Fixed table names; added `sync_logic_tests.rs` for verification.

### 5.2. Transaction Safety in Cascading Deletes (v0.9.0)

- **Status:** **Resolved**
- **Description:** Potential orphaned records when deleting projects.
- **Resolution:** `delete_project` now executes in transaction with proper cascade.

### 5.3. Sync Conflict Space Context (v0.9.0)

- **Status:** **Resolved**
- **Description:** `SyncConflict` struct lacked `space_id`, causing NOT NULL violations.
- **Resolution:** Added `space_id` to `SyncConflict` and `SyncDelta`.

### 5.4. Project Monolith Refactor (v0.9.0)

- **Status:** **Resolved**
- **Description:** `project.rs` was too large and mixed concerns.
- **Resolution:** Refactored into `project/mod.rs`, `models.rs`, and `db.rs`.

### 5.5. Sync History Panic (v0.9.0)

- **Status:** **Resolved**
- **Description:** Panic with "Invalid column type Null" on empty sync history.
- **Resolution:** Wrapped `MAX(sync_time)` result in `Option<i64>`.

### 5.6. Personal Modes Implementation (v0.8.0)

- **Status:** **Resolved**
- **Description:** Health, Finance, Travel modes were placeholders.
- **Resolution:** Implemented `personal_modes.rs` and frontend components.

---

## 6. Reporting New Issues

When reporting a new issue, please include:

1. **Environment:**
   - OS and version
   - Noteece version
   - Node.js / Rust versions
   - npm/pnpm version

2. **Steps to Reproduce:**
   - Minimal reproduction steps
   - Expected vs actual behavior

3. **Logs:**
   - Console output
   - Error messages
   - Screenshots if applicable

4. **Category:**
   - Backend (`core-rs`)
   - Desktop (`apps/desktop`)
   - Mobile (`apps/mobile`)
   - CI/CD
   - Documentation

---

*For security vulnerabilities, please see [SECURITY.md](SECURITY.md) for responsible disclosure.*
