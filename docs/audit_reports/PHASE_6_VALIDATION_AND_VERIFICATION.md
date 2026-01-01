# Phase 6: Validation & Verification Report

**Status:** Ready for Execution
**Goal:** Prove system stability through aggressive automated testing and structured manual "torture tests".

## 6.1 Sync Logic Tests (`packages/core-rs/tests/sync_logic.rs`)

### Scenario: The "Zombie" Task
*   **Setup:**
    *   Device A: Deletes Task T1.
    *   Device B: Updates Task T1 (Title change).
    *   Sync happens.
*   **Expected Behavior:**
    *   Conflict `UpdateDelete`.
    *   Resolution: User intervention OR strict policy (usually Delete wins in LWW if timestamp is later).
*   **Test:**
    1.  Create T1. Sync.
    2.  Dev A: `delete_task(T1)`.
    3.  Dev B: `update_task(T1, "New Title")`.
    4.  Sync.
    5.  Assert `get_unresolved_conflicts` returns 1.

### Scenario: The "Time Traveler"
*   **Setup:**
    *   Device A: Clock set to 2030. Edits Note N1.
    *   Device B: Clock set to 2024. Edits Note N1.
*   **Expected Behavior:**
    *   LWW Logic: Device A wins.
    *   **Risk:** Device B can *never* overwrite Device A until 2030.
    *   **Test:** Verify "Hybrid Logical Clock" behavior (if implemented) or assert this is a known limitation.

## 6.2 Mobile Integration Tests

### Scenario: Background Sync
*   **Tool:** Maestro.
*   **Flow:**
    1.  Open App.
    2.  Sync 100 notes.
    3.  Background App (Home button).
    4.  Wait 10s.
    5.  Foreground App.
    6.  **Assert:** Database connection is still valid (no "Socket closed").

### Scenario: Large Vault Migration (v4->v5)
*   **Test:**
    1.  Populate DB v4 with 10,000 tasks.
    2.  Launch App.
    3.  Measure Migration Time.
    4.  Assert < 5 seconds.

## 6.3 Security Fuzzing (Deep Dive)

### Input Fuzzing
*   **Target:** `import_from_notion` (Zip Parser) and `process_sync_packet` (JSON Parser).
*   **Tool:** `cargo-fuzz` or `afl`.
*   **Scenarios:**
    *   **Zip Bomb:** A tiny zip expanding to petabytes.
    *   **Path Traversal:** Zip entries named `../../../../etc/passwd`.
    *   **Malformed JSON:** Deeply nested arrays `[[[[...]]]]` to stack overflow the deserializer.
*   **Goal:** Ensure `Result::Err` is returned, not `panic!`.

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
