# Phase 3: Cross-Platform Harmonization Report

**Status:** Ready for Execution
**Goal:** Guarantee that logic, data, and design behave identically across Desktop (Tauri) and Mobile (React Native), eliminating the "Second-Class Citizen" feel of the mobile app.

## 3.1 Data Schema Divergence

### Task Model
*   **Desktop (Rust `migrations.rs`):**
    *   `status` IN ('inbox', 'next', 'in_progress', 'waiting', 'done', 'cancelled').
*   **Mobile (Code Review):**
    *   Often mobile apps simplify to `todo` / `done`.
    *   **Audit Finding:** `apps/desktop/src/services/api.ts` maps `Task` directly.
    *   **Risk:** If Mobile UI writes `status = 'todo'`, the Rust backend CHECK constraint (`CHECK(status IN...)`) will reject it, causing Sync failure.
    *   **Action:**
        *   Verify `apps/mobile/src/types/index.ts` matches the CHECK constraint exactly.
        *   Audit `TaskForm` on mobile to ensure it only offers valid status options.

### Time Entry
*   **Desktop:** `duration_seconds` (INTEGER).
*   **Mobile:** Often calculates duration on the fly.
*   **Audit:** `createManualTimeEntry` in `api.ts` takes `durationSeconds`.
*   **Parity:** Ensure Mobile sync logic calculates `duration_seconds` before sending to Rust, or Rust handles `ended_at - started_at` calculation.
*   **Proposal:** Deprecate `duration_seconds` in the API and only send `started_at` and `ended_at`. Let the backend compute duration.

### JSON Serialization Mappings
*   **Goal:** 100% consistent JSON shapes.
*   **Audit Target:**
    *   **Rust:** `#[derive(Serialize)]` structs.
    *   **TS:** `interface` definitions.
*   **Specifics:**
    *   `Note`:
        *   Rust: `content_md`
        *   Mobile JS: `content`? `body`?
        *   **Fix:** Force `#[serde(rename = "content")]` in Rust to align with "Content" concept, or update JS to `content_md`.
    *   `Project`:
        *   Rust: `goal_outcome`
        *   Mobile JS: `goal`?
        *   **Fix:** Align to `goal_outcome`.

## 3.2 The Encryption Gap (Deep Dive)
*   **Desktop:** `rusqlite` + `SQLCipher` (Encrypted).
*   **Mobile:** `expo-sqlite` (Plaintext).
*   **Impact:** Mobile is the security weak link. Direct DB transfer is impossible.
*   **Fix:** Mobile must adopt a SQLCipher-compatible layer (`op-sqlite` or custom build).

## 3.3 Feature Parity

### Sync Conflicts
*   **Desktop:** `getSyncConflicts` command returns detailed `SyncConflict` objects.
*   **Mobile:** `nativeGetSyncProgress` returns a summary.
*   **Gap:** Mobile users cannot *resolve* conflicts (choose "Mine" vs "Theirs").
*   **Action:** Expose `nativeResolveConflict` via JSI.
    *   Signature: `nativeResolveConflict(conflictId: string, resolution: "local" | "remote")`.

### Social Media
*   **Desktop:** Can view `WebViewSession` logic (cookies).
*   **Mobile:** Needs native `WebView` to replicate the session capture logic.
*   **Audit:** Does `apps/mobile` have a `SocialLoginScreen` that saves cookies to the `social_account` table?
    *   **Requirement:** Mobile app must implement a hidden `WebView` or a specific Login Flow that extracts `session_id` cookies and injects them into the SQLite `social_account` table (encrypted).

## 3.4 Visual & Design System

### Design Tokens
*   **Problem:** Colors are hardcoded in `theme.ts` (Desktop) and `constants/Colors.ts` (Mobile).
*   **Fix:** Extract a `tokens.json` (or `packages/ui/tokens.ts`):
    *   `primary`: `#...`
    *   `background`: `#050506`
    *   `surface`: `#...`
*   **Typography:**
    *   Desktop: `rem` units.
    *   Mobile: `sp` (Scaleable Pixels).
    *   **Audit:** Verify that `text-base` on Desktop roughly matches `16sp` on Mobile visually.

### Touch Targets & Contrast
*   **Contrast:** Check "Deep Obsidian" theme against WCAG AA.
    *   Dark Gray text on Black background often fails.
    *   **Fix:** Ensure text is at least `#A1A1AA` (Zinc-400) on `#050506`.
*   **Mobile Touch:**
    *   **Audit:** `SocialHub` filter chips.
    *   **Fix:** Ensure `padding` creates a hit slop of 44dp minimum.

## Phase 3 Checklist
- [ ] **CRITICAL:** Harmonize Database Encryption.
- [ ] Add `nativeResolveConflict` to Mobile JSI.
- [ ] Align `Task` status enums across Rust, Desktop TS, and Mobile TS.
- [ ] Verify `TimeEntry` duration calculation logic on Mobile.
- [ ] Implement Mobile WebView cookie capture for Social Accounts.
- [ ] Create `packages/ui/tokens.ts` and refactor both apps to use it.
