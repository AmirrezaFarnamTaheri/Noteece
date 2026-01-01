# Phase 3: Cross-Platform Harmonization Report

**Status:** Ready for Execution
**Goal:** Guarantee that logic, data, and design behave identically across Desktop (Tauri) and Mobile (React Native).

## 3.1 Data Schema Divergence

### Task Model
*   **Desktop:** `status` IN ('inbox', 'next', 'in_progress', 'waiting', 'done', 'cancelled').
*   **Mobile:** Often simplified to `todo` / `done`.
*   **Risk:** If Mobile writes `status='todo'`, Sync fails due to CHECK constraint.
*   **Action:** Align `apps/mobile/src/types/index.ts` with Rust constraints.

### Time Entry
*   **Desktop:** `duration_seconds` (Rust `chrono`).
*   **Mobile:** JS `Date` math.
*   **Risk:** Timezone offset bugs causing duration mismatch.
*   **Fix:** Send `started_at` and `ended_at` to backend; let Rust compute duration.

### JSON Serialization
*   **Audit:** Check struct field names.
*   **Finding:** `Note` uses `content_md` in Rust, often `content` in JS.
*   **Fix:** Use `#[serde(rename = "content")]` in Rust to enforce consistency.

## 3.2 The Encryption Gap (Deep Dive)
*   **Desktop:** `rusqlite` + `SQLCipher` (Encrypted).
*   **Mobile:** `expo-sqlite` (Plaintext).
*   **Impact:** Mobile is the security weak link. Direct DB transfer is impossible.
*   **Fix:** Mobile must adopt a SQLCipher-compatible layer (`op-sqlite`).

## 3.3 Feature Parity

### Sync Conflicts
*   **Desktop:** Detailed `SyncConflict` UI.
*   **Mobile:** Summary only.
*   **Action:** Expose `nativeResolveConflict` via JSI for Mobile.

### Social Media
*   **Desktop:** `WebView` cookie capture.
*   **Mobile:** Needs hidden `WebView` or Login Flow to capture `session_id`.

## 3.4 Visual & Design System

### Design Tokens
*   **Problem:** Hardcoded colors.
*   **Fix:** Create `packages/ui/tokens.ts` as Single Source of Truth.

### Accessibility
*   **Contrast:** "Deep Obsidian" theme must pass WCAG AA.
*   **Touch:** Mobile targets min 44x44pt.

## Phase 3 Checklist
- [ ] **CRITICAL:** Harmonize Database Encryption.
- [ ] Align `Task` status enums.
- [ ] Verify Timezone/Duration logic.
- [ ] Implement Mobile Cookie Capture.
- [ ] Standardize Design Tokens.
