# Phase 3: Cross-Platform Harmonization Audit

**Status:** Major Discrepancies Found
**Goal:** One Logic, Two Faces. Total feature and data parity between Desktop and Mobile.

## Overview
Noteece promises a unified experience. However, the audit shows the Desktop app (Rust-heavy) and Mobile app (JS-heavy) are drifting apart in critical areas like Encryption and Schema interpretation.

## 3.1 The Encryption Gap
*   **Desktop:** Uses `rusqlite` + `SQLCipher`. Data is encrypted at rest.
*   **Mobile:** Uses `expo-sqlite`. Data is likely plaintext at rest.
*   **Consequence:**
    *   **Security:** Mobile is the "weak link".
    *   **Sync:** Direct file transfer (e.g., via iTunes/USB) of the database is impossible because the formats are incompatible (Encrypted vs Plain). Sync must rely solely on the P2P Delta protocol.
*   **Harmonization Strategy:**
    *   Must adopt a SQLCipher-compatible layer on Mobile (`op-sqlite` or `react-native-quick-sqlite` with encryption support).
    *   The `rust_init` FFI function must accept the vault password to key the connection on the Rust side for JSI.

## 3.2 Schema & Data Parity

### Database Schema
*   **File:** `packages/core-rs/src/db/migrations.rs` (Desktop)
*   **File:** `apps/mobile/src/lib/database.ts` (Mobile)
*   **Audit:**
    *   Mobile `runMigrations` (v5) manually replicates Core `migrations.rs`.
    *   **Risk:** Double maintenance. If Core changes `Task` schema, Mobile *will* break or data loss will occur during sync if Mobile logic isn't updated simultaneously.
*   **Fix:**
    *   **Short Term:** Add a CI check that verifies `schema.sql` (generated from Rust) matches Mobile migration constants.
    *   **Long Term:** Mobile should *only* use Rust for migrations via JSI. The JS side should not run DDL statements.

### Business Logic Divergence
*   **Task Status:**
    *   Mobile maps `todo` -> `next`.
    *   Core `task` table `CHECK` constraint allows `inbox, next, in_progress, waiting, done, cancelled`.
    *   **Gap:** Does Mobile support `inbox` or `waiting`? If not, valid tasks synced from Desktop might break the Mobile UI.
*   **Time Entries:**
    *   Desktop calculates duration using `chrono` (Rust).
    *   Mobile calculates duration using `Date` (JS).
    *   **Risk:** Timezone handling differences could lead to slightly different "Hours Worked" stats.

## 3.3 Design System & UI
*   **Theme:**
    *   Desktop: `apps/desktop/src/theme.ts`
    *   Mobile: `apps/mobile/src/lib/theme.ts`
    *   **Gap:** Colors are manually duplicated.
    *   **Fix:** Extract `packages/ui/tokens.json` (Design Tokens) and generate both TS files from this source.
*   **Icons:**
    *   Desktop: `tabler-icons`.
    *   Mobile: `MaterialCommunityIcons`.
    *   **Gap:** Visual inconsistency. User sees a "Check" icon on Desktop and a different "Check" on Mobile.
    *   **Fix:** Standardize on one set (e.g., `lucide-react` / `lucide-react-native` or `tabler`).

## Phase 3 Checklist
- [ ] **CRITICAL:** Harmonize Database Encryption (Mobile must use SQLCipher).
- [ ] **HIGH:** Move Database Migrations logic to Rust (JSI) to avoid split-brain schema.
- [ ] **MEDIUM:** Shared Design Tokens (JSON Source of Truth).
- [ ] **MEDIUM:** Standardize Icon Set.
- [ ] **LOW:** Verify Timezone math parity (Rust vs JS).
