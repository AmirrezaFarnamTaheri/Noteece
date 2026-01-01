# Phase 2: Frontend Audit Report (`apps/desktop` & `apps/mobile`)

**Status:** Significant Improvements Required
**Goal:** Unbreakable UI state, fluid performance, and mobile stability.

## Overview
Phase 2 focuses on the user-facing applications. The audit reveals security weaknesses in the Desktop configuration and a fundamental encryption gap in the Mobile architecture.

## 2.1 Desktop Experience (`apps/desktop`)

### Security Configuration
*   **File:** `src-tauri/tauri.conf.json`
*   **Finding:** CSP `script-src` includes `'unsafe-inline'` and `'unsafe-eval'`.
*   **Risk:** Critical XSS vulnerability. If a malicious note (imported or synced) contains `<script>`, it could execute code.
*   **Fix:**
    *   Remove `'unsafe-eval'`.
    *   Remove `'unsafe-inline'` and use Nonces or Hashes for allowed scripts.
    *   Move all inline event handlers (e.g., `onclick="..."`) to external React event bindings.
*   **Finding:** `connect-src https://*`.
*   **Risk:** Data exfiltration. An attacker (via XSS) could send vault data to any server.
*   **Fix:** Whitelist only specific domains if needed (e.g., for link previews), or proxy them through the Rust backend.

### State Management (`store.ts`)
*   **Finding:** `activeSpaceId` is persisted via `zustand/persist`.
*   **Scenario:** User deletes a Space on Device A. Syncs to Device B. Device B's UI tries to load `activeSpaceId` (which no longer exists).
*   **Result:** UI crash or blank screen ("Space not found").
*   **Fix:** Add a `hydrate` callback to validate `activeSpaceId` against the actual list of spaces in the DB upon load. If missing, reset to default.

### Memory Safety
*   **File:** `src-tauri/src/state.rs`
*   **Finding:** `DbConnection` holds `dek: Mutex<Option<Vec<u8>>>`.
*   **Risk:** The Data Encryption Key exists in process memory.
*   **Fix:** Use `secrecy` crate or `Zeroize` to protect this memory region. Ensure it is explicitly zeroed on Lock Screen or App Suspend.

---

## 2.2 Mobile Experience (`apps/mobile`)

### Data Privacy & Encryption (Critical)
*   **File:** `apps/mobile/src/lib/database.ts`
*   **Finding:** Uses `expo-sqlite` to open the database.
*   **Deep Dive:** `expo-sqlite` does not natively support SQLCipher encrypted databases.
*   **Implication:**
    *   **Scenario A:** Mobile app uses a plaintext database. This breaks the "End-to-End Encrypted" security model.
    *   **Scenario B:** Mobile app fails to open the encrypted DB synced from Desktop.
*   **Action:** Verify if `op-sqlite` (which supports SQLCipher) or a custom native module is required. The entire mobile storage security model needs a review.

### Permissions & Privacy
*   **File:** `app.json`
*   **Finding:** Plugins (`expo-location`, `expo-camera`) are included.
*   **Risk:** These plugins add permissions to the manifest.
*   **Action:**
    *   **Least Privilege:** If "Geo-tagging Tasks" is not a V1 feature, remove `expo-location`.
    *   **Runtime Check:** Ensure permissions are only requested when the user explicitly triggers the feature.

### JSI Bridge Stability
*   **File:** `apps/mobile/src/lib/sync/sync-bridge.ts`
*   **Finding:** `syncBridge.init` is called.
*   **Risk:** If the Rust JSI module panics (e.g., on unwrap), it crashes the entire App (VM exit).
*   **Fix:**
    *   Ensure `packages/core-rs` catches ALL panics at the FFI boundary (`std::panic::catch_unwind`).
    *   Return error codes to JS instead of crashing.

### Performance
*   **Component:** `SocialFeed` / `TaskBoard`
*   **Finding:** Usage of standard `<Image>` vs `expo-image`.
*   **Impact:** Poor memory management on long lists (FlashList).
*   **Fix:** Enforce `expo-image` for all user content to leverage disk caching and downsampling.

## Phase 2 Checklist
- [ ] **CRITICAL:** Fix Mobile Database Encryption (Replace `expo-sqlite`?).
- [ ] **HIGH:** Tighten Desktop CSP (Remove `unsafe-inline`).
- [ ] **HIGH:** Implement State Hydration Validation (Zustand).
- [ ] **HIGH:** Secure DEK in Desktop Memory.
- [ ] **MEDIUM:** Remove unused Expo Plugins (Location/Camera).
- [ ] **MEDIUM:** Wrap JSI calls in Panic Catchers (Rust side).
