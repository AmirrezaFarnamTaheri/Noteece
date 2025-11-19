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

### 2.1. Persistent Test Failures due to Zustand Store

- **Status:** **Open**
- **Affected Files:** Multiple test suites, including `Dashboard.test.tsx`, `UserManagement.test.tsx`, `SyncStatus.test.tsx`, and `useActiveSpace.test.tsx`.
- **Description:** The desktop frontend test suite is suffering from cascading failures due to a lack of test isolation. The root cause is the shared state of the Zustand store, which is persisted to `localStorage`.
- **Investigation:** Several attempts were made to fix this issue:
    1.  **`persist` middleware:** The `persist` middleware was added to the Zustand store to fix a failure in `useActiveSpace.test.tsx`. This caused a cascade of new failures in other tests.
    2.  **Store Reset:** A `clearStorage` function was added to the store and called in `beforeEach` blocks in the failing tests. This did not resolve the issue and led to a different set of failures.
    3.  **Conditional `persist`:** The `persist` middleware was conditionally disabled in the test environment. This also did not resolve the issue.
- **Next Steps:** The tests need to be refactored to properly isolate the Zustand store. This will likely require creating a new store instance for each test, or using a mocking strategy that completely isolates the store. Due to the complexity of this issue, and the time already spent, this is being deferred to focus on other parts of the repository.

### 2.2. `dateUtils.test.ts` Failure

- **Status:** **Resolved**
- **Description:** The `formatRelativeTime` test in `dateUtils.test.ts` was failing due to a logic error in the test itself.
- **Resolution:** The test was corrected to assert the correct output for a date that is only a few hours in the past.

### 2.3. Persistent Linting Issues

- **Status:** **Open**
- **Affected Files:** `apps/desktop/src/components/__tests__/UserManagement.qa-fixes.test.tsx`
- **Description:** The `lint` script is failing with persistent `typescript-eslint` warnings related to unsafe `any` assignments.
- **Investigation:** Several attempts were made to fix these issues by adding explicit types, but the warnings persist. This is likely due to a complex type inference issue that is not easily resolved.
- **Next Steps:** This issue is being deferred to focus on other parts of the repository.

---

## 3. `mobile` Frontend Test Failures

### 3.1. Jest Setup Configuration Error

- **Status:** **Resolved**
- **Description:** The entire test suite for the mobile app was failing to run due to a configuration error in the Jest environment.
- **Resolution:** The `expo-share-menu`, `AppState`, and `Linking` native modules were mocked in the Jest setup, which resolved the issue.

### 3.2. `SyncManager.test.tsx` Failure

- **Status:** **Open**
- **Affected Files:** `apps/mobile/src/__tests__/components/SyncManager.test.tsx`
- **Description:** The test suite for the `SyncManager` component is failing. The error is `TypeError: Cannot read properties of undefined (reading 'discoverDevices')` and `expect(jest.fn()).toHaveBeenCalled()`.
- **Investigation:** Several attempts were made to fix this issue:
    1.  **Incomplete Mock:** The initial mock for `SyncClient` was incomplete, which was causing the `TypeError`.
    2.  **`act` and `waitFor`:** The test was refactored to use `act` and `waitFor` to handle asynchronous rendering, but this did not resolve the issue.
    3.  **`mockClear`:** `mockClear` was used to reset the mock before the test assertion, but this also did not resolve the issue.
- **Next Steps:** The test needs to be refactored to correctly handle the asynchronous nature of the `SyncManager` component. Due to the complexity of this issue, and the time already spent, this is being deferred to focus on other parts of the repository.

### 3.3. `social-security.test.ts` Failure

- **Status:** **Open**
- **Affected Files:** `apps/mobile/src/lib/__tests__/social-security.test.ts`
- **Description:** The test suite for `social-security` is failing because it is testing functions that no longer exist in the implementation.
- **Next Steps:** The test suite has been disabled. The tests need to be rewritten or removed to reflect the current implementation.
