# Next Steps & Roadmap

This document outlines the immediate and near-term goals for the Noteece project.

_Last reviewed: 2026-07-26. Version 1.1.0._

> **Release is blocked.** Sections 1–4 below describe feature work, but none of it
> is releasable until the Critical findings in
> [`docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md`](docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md)
> are resolved. [`STATUS.md`](STATUS.md) is the canonical project status; this file
> previously contradicted it by describing the project as feature-complete.

## 0. Release Blockers (Phase 1 — must precede any release)

- [ ] **Mobile at-rest encryption:** wire the DEK to persistence (SQLCipher-capable driver, or encrypt payloads before insert). Today `apps/mobile/src/lib/database.ts:585` opens an unkeyed database.
- [ ] **Prime interception governance:** implement redaction plus an explicit consent gate, or remove E2EE-messenger and dating packages from the capture allowlist; strip the plaintext logcat write.
- [ ] **Register or delete the desktop AI backend:** `commands/ai.rs` has no `mod ai;` and no `generate_handler!` entry, so no AI command exists at runtime while the frontend still invokes them.
- [ ] **IPC contract CI gate:** diff every frontend `invoke('x')` name against the Rust command registry and fail the build on a mismatch; add a Tauri-driver E2E that actually opens a vault. This catches the ~30 remaining ghost commands.
- [ ] **Android release signing:** stop signing release builds with the checked-in debug keystore.

## 1. Performance Tuning

- [x] **Database Indexing:** Added `idx_note_space_mod` and `idx_note_space_trashed` (Migration v21).
- [x] **Query Optimization:** Review slow queries in `search.rs` and `graph.rs` on large datasets (10k+ notes).
- [x] **FTS Tuning:** Optimized FTS indexes and added conflict resolution indexes (Migration v22).

## 2. Cloud Relay (Optional)

- [x] **Interface Definition:** Created `packages/core-rs/src/sync/relay.rs` with `RelayClient` trait.
- [x] **Implementation:** Built standalone relay server `packages/relay-server` (Rust/Axum).
- [x] **Authentication:** Bearer capability tokens issued at registration and required on `/fetch` and `/pending`.
- [ ] **Hardening (blocks exposure):** TLS, rate limiting, bounded queues, scheduled expiry cleanup, envelope signature verification, reject sends to unregistered recipients.
- [ ] **Client Integration:** Connect the desktop/mobile sync agents to the relay for internet sync.

## 3. Plugin System

- [x] **API Design:** Defined `NoteecePlugin` trait in `packages/core-rs/src/plugin.rs`.
- [x] **Validation:** Added plugin registry tests `packages/core-rs/tests/plugin_tests.rs`.
- [ ] **WASM Host:** Integrate `wasmer` or `wasmtime` to run untrusted plugins safely.
- [ ] **Event Hooks:** Add hooks for `on_note_save`, `on_task_complete`, etc.

## 4. Feature Polish

- [x] **Blob Sync Chunking:** Implemented robust chunking logic in backend (`blob.rs`).
- [x] **Conflict Resolution UI:** Implemented a dedicated UI with diff viewer for resolving sync conflicts.

## 5. Release Candidate Tasks

The project is **not** a release candidate — see Section 0 and [`STATUS.md`](STATUS.md).

- [~] **Backend Finalization:** Substantial Rust test suite exists (53 Rust + 50 desktop + 16 mobile + Playwright e2e), but `packages/ui` and `packages/types` have zero tests and there is no CI coverage gate.
- [x] **Frontend Polish:** Improved sync status and conflict UI.
- [~] **Documentation:** Root status/changelog/issue docs were corrected on 2026-07-26 to match the forensic audit. Still outstanding: `apps/mobile/SECURITY.md` and `docs/security/PRIVACY.md` continue to assert mobile zero-knowledge encryption and "no servers", both contradicted by the code.
