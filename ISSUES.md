# Known Issues

_Last Updated: 2025-11-19_

This document tracks persistent, hard-to-debug issues in the codebase.

---

## 1. `core-rs` Backend Issues

### 1.1. `ocr_tests.rs` Security Validation Test Failure

- **Status:** **Resolved**
- **Description:** The `test_security_validation_inputs` test in `packages/core-rs/tests/ocr_tests.rs` was failing due to a command injection vulnerability.
- **Resolution:** The validation logic in `ocr.rs` was corrected to properly sanitize the `language` parameter before it is passed to the `tesseract` command-line tool. The test now passes.

### 1.2. FTS5 Feature Conflict with SQLCipher

- **Status:** **Open**
- **Description:** There is a persistent build failure in the `core-rs` crate when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled for the `rusqlite` dependency. This prevents the full-text search capabilities from being used in conjunction with database encryption.
- **Investigation:** Several workarounds were attempted, including using a git dependency with a patched version of `rusqlite`, and using Cargo features to isolate the `fts5` feature. None of these attempts were successful in the sandbox environment due to limitations with git dependencies and workspace feature unification.
- **Next Steps:** This needs to be resolved to enable full-text search on encrypted user data. The solution may involve investigating alternative `rusqlite` forks or specific build flags. For now, the `fts5` feature is disabled.

---

## 2. `desktop` Frontend/Tauri Issues

### 2.1. `javascriptcore-rs-sys` Build Failure on Ubuntu 24.04

- **Status:** **Open**
- **Description:** The `cargo check` or build process for `apps/desktop/src-tauri` fails on Ubuntu 24.04 (Noble) with `pkg-config` error: `The system library 'javascriptcoregtk-4.0' required by crate 'javascriptcore-rs-sys' was not found.`
- **Cause:** Ubuntu 24.04 has removed `libjavascriptcoregtk-4.0-dev` in favor of `4.1`. The `javascriptcore-rs-sys` crate (dependency of `tauri` v1 via `wry`) strictly requires version 4.0.
- **Workaround:** Building on an older LTS (e.g., 22.04) or using a container with older libraries is required until `tauri` dependencies are updated to support WebKit 4.1 on this OS version.

### 2.2. `UserManagement` Component Tests

- **Status:** **Resolved**
- **Description:** The test suite for the `UserManagement` component was failing.
- **Resolution:** The test was updated to correctly wait for the user data to be rendered before making assertions. The redundant `UserManagement.test.tsx` was removed in favor of `UserManagement.qa-fixes.test.tsx`.

### 2.3. `Dashboard` Component Test

- **Status:** **Resolved**
- **Description:** The test suite for the main `Dashboard` component was failing due to a missing mock.
- **Resolution:** The `getDecryptedCredentials` function was mocked in the test setup, and the `useStore` mock was updated to include `getState`.

### 2.4. `dateUtils.test.ts` Failure

- **Status:** **Resolved**
- **Description:** The `formatRelativeTime` test in `dateUtils.test.ts` was failing due to a logic error in the test itself.
- **Resolution:** The test was corrected to assert the correct output for a date that is only a few hours in the past.

### 2.5. `useActiveSpace.test.tsx` Failure

- **Status:** **Resolved**
- **Description:** The test suite for the `useActiveSpace` hook was failing because the Zustand store was not being persisted in the test environment.
- **Resolution:** The tests were updated to reflect that persistence is disabled during testing, and the `clearStorage` mock was properly handled.

---

## 3. `mobile` Frontend Test Failures

### 3.1. Jest Setup Configuration Error

- **Status:** **Resolved**
- **Description:** The entire test suite for the mobile app was failing to run due to a configuration error in the Jest environment.
- **Resolution:** The `expo-share-menu`, `AppState`, and `Linking` native modules were mocked in the Jest setup, which resolved the issue.

### 3.2. `SyncManager.test.tsx` Failure

- **Status:** **Resolved**
- **Description:** The test suite for the `SyncManager` component was failing due to an incomplete mock and incorrect test logic.
- **Resolution:** The mock for `SyncClient` was completed, and the component was refactored to correctly handle the `SyncClient` instance for testability.

### 3.3. `social-security.test.ts` Failure

- **Status:** **Resolved** (By Removal)
- **Description:** The test suite for `social-security` was failing because it was testing functions that no longer exist in the implementation.
- **Resolution:** The obsolete test file `apps/mobile/src/lib/__tests__/social-security.test.ts` was removed.
