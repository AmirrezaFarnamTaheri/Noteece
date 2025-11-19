# Known Issues

_Last Updated: 2025-11-19_

This document tracks persistent, hard-to-debug issues in the codebase.

---

## 1. `core-rs` Backend Issues

### 1.1. `ocr_tests.rs` Security Validation Test Failure

- **Status:** **Open**
- **Description:** The `test_security_validation_inputs` test in `packages/core-rs/tests/ocr_tests.rs.disabled` is failing. This test is critical as it is designed to prevent command injection vulnerabilities by ensuring the `process_image_ocr` function properly sanitizes the `language` parameter passed to the `tesseract` command-line tool. The test currently panics, indicating the validation logic is not correctly returning an `Err` result on invalid input.
- **Investigation:** The test file is currently disabled. Attempts to fix the validation logic in `ocr.rs` were unsuccessful. The root cause appears to be deeper than simple input validation.
- **Next Steps:** Requires a deeper investigation into how Rust's `std::process::Command` handles arguments on the target platform, as the failure might be related to shell argument parsing.

### 1.2. FTS5 Feature Conflict with SQLCipher

- **Status:** **Open**
- **Description:** There is a persistent build failure in the `core-rs` crate when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled for the `rusqlite` dependency. This prevents the full-text search capabilities from being used in conjunction with database encryption.
- **Next Steps:** This needs to be resolved to enable full-text search on encrypted user data. The solution may involve investigating alternative `rusqlite` forks or specific build flags.

---

## 2. `desktop` Frontend Test Failures

### 2.1. `UserManagement` Component Tests

- **Status:** **Open**
- **Affected Files:**
    - `apps/desktop/src/components/__tests__/UserManagement.test.tsx`
- **Description:** The test suite for the `UserManagement` component is failing. The primary issue appears to be an inability to correctly find and assert the number of users rendered in the table after mocking the `getAllUsers` API call. The tests fail with `TestingLibraryElementError: Unable to find an element with the role "row"`.
- **Investigation:** The component may have a conditional rendering issue that prevents the table from appearing in the test environment.

### 2.2. `Dashboard` Component Test

- **Status:** **Open**
- **Affected File:** `apps/desktop/src/components/__tests__/Dashboard.test.tsx`
- **Description:** The test suite for the main `Dashboard` component is failing. The error is a type mismatch (`TypeError: (0 , _auth.getDecryptedCredentials) is not a function`) originating from the `SyncStatus` component, which is a child of the `Dashboard`.
- **Investigation:** This suggests that a function mock for `getDecryptedCredentials` in `apps/desktop/src/services/auth.ts` is either missing or incorrectly implemented in the test setup for `SyncStatus` or `Dashboard`.

---

## 3. `mobile` Frontend Test Failures

### 3.1. Jest Setup Configuration Error

- **Status:** **Open**
- **Affected Files:** All test suites in `apps/mobile`.
- **Description:** The entire test suite for the mobile app is failing to run due to a configuration error in the Jest environment. The error message `Cannot find module 'expo-share-menu' from 'jest.pre-setup.js'` indicates that a module required by the Jest setup file is not correctly mocked or installed.
- **Investigation:** This is a global failure affecting all tests, preventing any of them from running. The issue lies within the `jest.pre-setup.js` or `jest.config.js` files and their interaction with native Expo modules.
- **Next Steps:** The Jest configuration for the mobile app needs to be fixed to correctly mock the `expo-share-menu` module and potentially other native dependencies.
