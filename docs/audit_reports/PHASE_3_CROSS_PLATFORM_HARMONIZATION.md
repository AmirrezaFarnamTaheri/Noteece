# Phase 3: Cross-Platform Harmonization Report

**Status:** In Progress
**Goal:** Achieve total feature and data parity between Desktop (Rust/Tauri) and Mobile (React Native/Rust-JSI). One Logic, Two Faces.

## Overview
Noteece promises a seamless experience across devices. Currently, there are significant divergences in data security and implementation details that threaten this promise.

## 3.1 Critical Parity Gaps

### 3.1.1 Encryption at Rest (The "Split Brain" Problem)
*   **Desktop:** Uses `rusqlite` + `sqlcipher` (Bundled OpenSSL). The DB file is fully encrypted.
*   **Mobile:** Uses `expo-sqlite` (Standard SQLite). The DB file is likely plaintext.
*   **Conflict:**
    *   If a user copies their `noteece.db` from Desktop to Mobile (manual sync/backup restore), Mobile **cannot open it** (it expects plaintext, gets ciphertext).
    *   If Mobile creates the DB, it is plaintext.
*   **Harmonization Strategy:**
    *   Mobile **MUST** adopt SQLCipher.
    *   The JSI Bridge must support passing the encryption key to the Rust layer.
    *   `packages/core-rs` must standardize on a single crypto provider (Ring/RustCrypto) to avoid OpenSSL linking issues on Android.

### 3.1.2 Schema & Data Types
*   **Task Status:**
    *   **Desktop:** Rust `CHECK` constraint: `inbox, next, in_progress, waiting, done, cancelled`.
    *   **Mobile:** TypeScript definitions must match exactly.
    *   **Finding:** Mobile migration v4->v5 maps `todo` -> `next`. Ensure UI dropdowns match the Rust Enum.
*   **Timestamps:**
    *   **Desktop:** Uses `i64` (Unix Timestamp).
    *   **Mobile:** JS uses `Date` (ms precision).
    *   **Check:** Ensure all `i64` timestamps from Rust are treated as **Seconds** (not milliseconds) in JS, or standardized to Milliseconds everywhere. `chrono::Utc::now().timestamp()` returns Seconds. JS `Date.now()` returns Milliseconds.
    *   **Risk:** Dates appearing as "1970" or "50,000 AD".

## 3.2 Feature Gaps

### 3.2.1 Sync Capability
*   **Desktop:** Can host P2P Server and initiate Sync.
*   **Mobile:**
    *   **Discovery:** Can discover peers (mDNS).
    *   **Conflict Resolution:** UI for resolving conflicts is limited compared to Desktop.
    *   **Action:** Expose `resolve_conflict` via JSI (already present in FFI, needs UI wiring).

### 3.2.2 Social Media Suite
*   **Desktop:** Uses `webview` injection (`universal.js`) to scrape cookies and posts.
*   **Mobile:**
    *   **Gap:** WebView scraping on mobile is harder (OS restrictions, background execution).
    *   **Strategy:** "Cookie Capture" mode. User logs in via embedded WebView, app captures cookie, passes to Rust. Rust runs the scraper (if possible) or Mobile relies on Desktop for heavy scraping.

## 3.3 Design System Harmonization
*   **Tokens:**
    *   **Action:** Create a shared `packages/design-tokens` (JSON/TS) package.
    *   **Content:** Colors (Deep Obsidian palette), Spacing, Typography.
    *   **Usage:** Desktop imports for Tailwind config. Mobile imports for Styled Components/Unistyles.
*   **Accessibility:**
    *   **Check:** Verify WCAG AA Contrast compliance on both platforms.
    *   **Mobile:** Ensure minimal touch target size (44x44pt).

## Phase 3 Checklist
- [ ] **Critical:** Implement SQLCipher on Mobile to match Desktop.
- [ ] **Schema:** Verify `Task` status enum parity in `packages/types`.
- [ ] **Data:** Standardize Timestamp precision (Seconds vs Milliseconds) in `packages/core-rs` serialization.
- [ ] **Social:** Define Mobile Social Strategy (Scrape vs View-Only).
- [ ] **UI:** Extract Design Tokens to shared package.
