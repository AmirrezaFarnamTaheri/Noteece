# Phase 6: Validation & Verification Report

**Status:** Continuous
**Goal:** 100% Confidence. Testing is not an afterthought; it is the acceptance criteria.

## Overview
We move beyond unit tests to "Torture Testing" and Security Validation.

## 6.1 Automated Testing Strategy

### 6.1.1 Fuzz Testing (`proptest`)
*   **Target:** Sync Engine (`core-rs/sync`).
*   **Scenario:**
    *   Generate random `SyncDelta` streams.
    *   Simulate network partitions, message reordering, and dropped packets.
    *   **Invariant:** `A.merge(B).merge(C) == A.merge(C).merge(B)` (Convergence).

### 6.1.2 Security Regression Tests
*   **Timing Attack Test:**
    *   **Setup:** Measure response time of `AuthService::authenticate` for:
        1.  Unknown User.
        2.  Known User + Wrong Password.
    *   **Pass:** Delta < 50ms (standard deviation).
*   **Mobile Encryption Test:**
    *   **Setup:**
        1.  Run Mobile App in Emulator.
        2.  Create a note "SECRET_PAYLOAD".
        3.  Pull the `.db` file via `adb pull`.
        4.  Run `strings noteece.db | grep SECRET_PAYLOAD`.
    *   **Pass:** grep returns NOTHING.
    *   **Fail:** grep finds the string (Plaintext at Rest).

### 6.1.3 End-to-End (E2E)
*   **Desktop:** Playwright.
    *   **Flow:** Install -> Create Vault -> Create Note -> Restart App -> Verify Persistence.
*   **Mobile:** Maestro.
    *   **Flow:** Install -> Scan QR (Sync) -> Verify Data appears.

## 6.2 Manual Torture Tests
*   **Zombie Task:**
    *   Delete a task on A. Update it on B. Sync. Ensure it stays deleted (or resurrects properly based on LWW).
*   **Time Traveler:**
    *   Set Device A clock to 2020. Set Device B to 2025. Edit same note. Sync. Verify behavior matches defined conflict resolution strategy.
*   **Zip Bomb:**
    *   Import a "Zip Bomb" (42.zip). App must fail gracefully (Error message), not crash or hang system.

### Security Verification
*   **Mobile Encryption:** Run `grep` on simulator filesystem to verify encryption.
    *   *Method:* Create a note with unique string "SECRET_PAYLOAD", find `.sqlite` file, run `grep "SECRET_PAYLOAD"`. Should return empty.
*   **Timing Attack:** Measure `authenticate` latency delta.
    *   *Method:* Loop 1000 times: `authenticate("valid_user", "wrong_pass")` vs `authenticate("invalid_user", "wrong_pass")`.

## Phase 6 Checklist
- [ ] Implement "Zombie Task" integration test.
- [ ] Implement "Time Traveler" integration test.
- [ ] Verify Background/Foreground DB stability on Android.
- [ ] Benchmark v4->v5 migration.
- [ ] Run `cargo-fuzz` on `process_sync_packet`.
- [ ] Perform Mobile Encryption Verification (grep).
- [ ] Run Auth Timing Harness.
- [ ] **Fuzz:** Implement Property-Based Tests for Sync.
- [ ] **Security:** Implement "Mobile File Inspection" test script.
- [ ] **Security:** Implement Auth Timing benchmark.
- [ ] **E2E:** Set up Playwright/Maestro pipelines.
- [ ] **Perf:** Benchmark Migration v4->v5 with 10k notes.
