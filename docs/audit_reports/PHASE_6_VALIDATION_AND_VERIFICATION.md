# Phase 6: Validation & Verification Audit

**Status:** Testing Gaps Identified
**Goal:** 100% Confidence. Prove it works.

## Overview
We cannot rely on "it compiles". The audit reveals a lack of adversarial testing, particularly for the Sync Engine and Security modules.

## 6.1 Security Testing (Adversarial)
*   **Timing Attack Test:**
    *   **Goal:** Prove `AuthService::authenticate` is constant-time.
    *   **Method:** Write a harness that measures `authenticate` duration for "User Found + Wrong Password" vs "User Not Found".
    *   **Pass Criteria:** Difference must be statistically insignificant (< 5% variance).
*   **Mobile Encryption Verification:**
    *   **Goal:** Prove Mobile DB is encrypted.
    *   **Method:**
        1.  Run Mobile App in Simulator.
        2.  Create a note "SECRET_PAYLOAD_123".
        3.  Locate the `.sqlite` file on the host filesystem.
        4.  Run `strings note.db | grep SECRET_PAYLOAD_123`.
    *   **Pass Criteria:** Grep returns nothing.
*   **Memory Dump Analysis:**
    *   **Goal:** Prove DEK is not lingering.
    *   **Method:** Run `procdump` (Windows) or `gcore` (Linux) on the running Desktop process. Search dump for the DEK hex string.

## 6.2 Sync Engine Verification
*   **Torture Test 1: The Partition:**
    *   **Setup:** Two devices (A, B).
    *   **Action:** Cut network. Modify Note X on A. Modify Note X on B. Reconnect.
    *   **Expectation:** Conflict detected. "Smart Merge" or "Conflict Copy" created. No data lost.
*   **Torture Test 2: The Time Traveler:**
    *   **Setup:** Device A clock is set to 2025. Device B is 2024.
    *   **Action:** Sync.
    *   **Expectation:** Logic should rely on Vector Clocks/Counters, NOT physical time. If physical time is used, ensure it handles "future" updates gracefully.
*   **Torture Test 3: The Zip Bomb (Import):**
    *   **Setup:** Import a 10KB zip that expands to 10GB.
    *   **Expectation:** Import fails gracefully with "Quota Exceeded". App does not crash.

## 6.3 Automated Testing Strategy
*   **Unit Tests:** Increase coverage for `core-rs/src/sync/conflict.rs`.
*   **Integration Tests:**
    *   Use `TestContext` pattern in Rust to spin up ephemeral DBs.
    *   Test full sync flow: `Init -> Create -> Sync -> Verify`.
*   **E2E (Desktop):** Playwright tests for the "Golden Path" (Onboarding -> Create Note -> Search).

## Phase 6 Checklist
- [ ] **CRITICAL:** Perform Mobile Encryption verification (grep test).
- [ ] **HIGH:** Write Timing Attack harness.
- [ ] **HIGH:** Implement "Time Traveler" sync test.
- [ ] **MEDIUM:** Add Zip Bomb protection test.
- [ ] **MEDIUM:** Set up Playwright for Desktop.
