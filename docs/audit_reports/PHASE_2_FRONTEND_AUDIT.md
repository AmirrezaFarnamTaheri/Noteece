# Phase 2: Frontend Audit Report (`apps/desktop` & `apps/mobile`)

**Status:** In Progress
**Goal:** Deliver an unbreakable UI state, fluid performance, and mobile stability.

## Overview
This phase audits the user-facing applications. The Desktop app (Tauri/React) and Mobile app (Expo/React Native) share logic but have distinct security and performance profiles.

## 2.1 Desktop Experience (`apps/desktop`)

### 2.1.1 Security (Tauri & Web)
*   **CSP (Content Security Policy):**
    *   **Finding:** `tauri.conf.json` enables `unsafe-inline` and `unsafe-eval` for scripts. `connect-src` allows `https://*`.
    *   **Risk:**
        *   `unsafe-inline`: Allows XSS if any markdown/content is improperly sanitized.
        *   `unsafe-eval`: Increases attack surface.
        *   `https://*`: Allows exfiltration of data to arbitrary servers if an XSS is achieved.
    *   **Action:** Tighten CSP. Remove `unsafe-eval` if possible. Whitelist specific `connect-src` domains if known (e.g., specific social APIs). Use Nonces for inline scripts.
*   **DEK Protection:**
    *   **Finding:** The Data Encryption Key (DEK) is held in memory in the `DbConnection` struct.
    *   **Risk:** No protection against memory dumping.
    *   **Action:** Although `Zeroize` is a Rust-side fix, the Frontend should ensure it calls `shutdown_clear_keys_cmd` explicitly on app exit/logout to trigger the cleanup.

### 2.1.2 State Management (`store.ts`)
*   **Persistence:**
    *   **Finding:** `activeSpaceId` is persisted via `zustand/persist`.
    *   **Risk:** If the Space is deleted remotely or via another device, the app might try to load a non-existent space on startup, leading to a white screen or crash.
    *   **Fix:** Implement `onRehydrateStorage` check: Validate `activeSpaceId` against the fetched list of Spaces. If invalid, reset to default/null.
*   **Zustand Reset:**
    *   **Finding:** `clearStorage` is implemented.
    *   **Check:** Ensure it is called on Logout. Ensure it clears sensitive data (though DEK is in Rust).

### 2.1.3 Performance
*   **TaskBoard:**
    *   **Audit:** Check `dnd-kit` collision detection algorithms. Heavy lists can cause lag during drag operations. Use `pointerWithin` or `rectIntersection` carefully.
    *   **Memoization:** Verify `TaskCard` is wrapped in `React.memo`. Frequent updates to one task shouldn't re-render the whole board.
*   **Virtualization:**
    *   **Finding:** Lists > 50 items (Notes, Tasks) should be virtualized.
    *   **Action:** Verify usage of `react-window` or `react-virtuoso`.

## 2.2 Mobile Experience (`apps/mobile`)

### 2.2.1 Data Security (Critical)
*   **Encryption at Rest:**
    *   **Finding:** App uses standard `expo-sqlite`. `database.ts` opens the DB without a key.
    *   **Risk:** The database file is likely Plaintext on the device filesystem.
    *   **Action:** Migrate to `op-sqlite` or a custom `expo-sqlite` build with SQLCipher support. Ensure the `DEK` is used to key the database connection.
*   **JSI Bridge:**
    *   **Finding:** `rust_init` in `mobile_ffi.rs` takes a path but no key.
    *   **Action:** The Bridge must be updated to accept a key or handle unlocking to support an encrypted DB.

### 2.2.2 Stability & Permissions
*   **Permission Bloat:**
    *   **Finding:** `expo-location` and `expo-camera` plugins inject permissions even if unused.
    *   **Action:** Remove these plugins if "Attachments" and "Location Triggers" are not implemented. If implemented, wrap them in run-time permission checks.
*   **Migrations:**
    *   **Finding:** v4->v5 migration reads *all* tags into memory (`oldTags` array).
    *   **Risk:** OOM (Out of Memory) crash on vaults with thousands of tagged notes.
    *   **Fix:** Paginate the read/write operation for migration.

### 2.2.3 Performance
*   **FlashList:**
    *   **Check:** Verify `estimatedItemSize` is accurate. Incorrect size causes scroll jumps.
*   **Images:**
    *   **Finding:** Social Feed uses images.
    *   **Action:** Replace `<Image>` with `expo-image` for memory management and disk caching.

## 2.3 Feature Flags
*   **Requirement:** Unimplemented features (e.g., "Cloud Relay", "Voice Memos") must be hidden.
*   **Action:** Implement a `FeatureFlag` context/provider. Wrap "Beta" features in checks. Ensure "Coming Soon" UI is used or the entry point is hidden.

## Phase 2 Checklist
- [ ] **Desktop:** Tighten CSP (remove `unsafe-eval`, restrict `connect-src`).
- [ ] **Desktop:** Implement `onRehydrateStorage` validation for `activeSpaceId`.
- [ ] **Mobile:** **CRITICAL:** Switch to Encrypted SQLite (SQLCipher).
- [ ] **Mobile:** Paginate database migrations.
- [ ] **Mobile:** Remove unused Expo plugins/permissions.
- [ ] **Both:** Audit `FeatureFlag` usage for incomplete features.
