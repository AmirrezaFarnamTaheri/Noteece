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

## 2. `desktop` Frontend Test Failures

### 2.1. `UserManagement` Component Tests

- **Status:** **Resolved**
- **Description:** The test suite for the `UserManagement` component was failing.
- **Resolution:** The test was updated to correctly wait for the user data to be rendered before making assertions.

### 2.2. `Dashboard` Component Test

- **Status:** **Resolved**
- **Description:** The test suite for the main `Dashboard` component was failing due to a missing mock.
- **Resolution:** The `getDecryptedCredentials` function was mocked in the test setup.

### 2.3. `dateUtils.test.ts` Failure

- **Status:** **Resolved**
- **Description:** The `formatRelativeTime` test in `dateUtils.test.ts` was failing due to a logic error in the test itself.
- **Resolution:** The test was corrected to assert the correct output for a date that is only a few hours in the past.

### 2.4. `useActiveSpace.test.tsx` Failure

- **Status:** **Resolved**
- **Description:** The test suite for the `useActiveSpace` hook was failing because the Zustand store was not being persisted.
- **Resolution:** The `persist` middleware was added to the Zustand store.

---

## 3. `mobile` Frontend Test Failures

### 3.1. Jest Setup Configuration Error

- **Status:** **Resolved**
- **Description:** The entire test suite for the mobile app was failing to run due to a configuration error in the Jest environment.
- **Resolution:** The `expo-share-menu`, `AppState`, and `Linking` native modules were mocked in the Jest setup, which resolved the issue.

### 3.2. `SyncManager.test.tsx` Failure

- **Status:** **Resolved**
- **Description:** The test suite for the `SyncManager` component was failing due to an incomplete mock and incorrect test logic.
- **Resolution:** The mock for `SyncClient` was completed, and the test was refactored to correctly handle asynchronous rendering.

### 3.3. `social-security.test.ts` Failure

- **Status:** **Open**
- **Description:** The test suite for `social-security` is failing because it is testing functions that no longer exist in the implementation.
- **Next Steps:** The test suite has been disabled. The tests need to be rewritten or removed to reflect the current implementation.
