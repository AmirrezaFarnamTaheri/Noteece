# Next Steps & Roadmap

This document outlines the immediate and near-term goals for the Noteece project.

_Last reviewed: 2026-07-29. Version 1.1.0._

> **Release is blocked.** Sections 1–4 describe ongoing work, but none of it is
> releasable until the Critical findings in
> [`docs/audit_reports/FORENSIC_AUDIT_V2_2026-07-26.md`](docs/audit_reports/FORENSIC_AUDIT_V2_2026-07-26.md)
> are resolved. [`STATUS.md`](STATUS.md) is the canonical project status.

## 0. Release Blockers (must precede any release)

- [ ] **Mobile at-rest encryption:** wire the existing KEK/DEK chain to persistence through a SQLCipher-capable driver or application-level payload encryption. The shipping React-Native path currently opens an unkeyed `expo-sqlite` database.
- [ ] **Prime interception governance:** add a real consent surface and working redaction policy, or remove E2EE-messenger and dating packages from the capture allowlist. Runtime logging now records length rather than plaintext, but captured content is still persisted to the unencrypted mobile store.
- [ ] **Desktop command contract:** implement or remove every command invoked by live frontend routes, including the currently unregistered AI/RAG backend and unreachable auth subsystem.
- [x] **IPC contract CI gate:** CI now compares frontend `invoke(...)` names with the Rust command registry and fails on mismatches. A runtime Tauri-driver E2E that opens a vault remains desirable.
- [~] **Android release signing:** release builds no longer fall back to the checked-in debug keystore and support injected signing credentials. Production distribution remains blocked until protected credentials are configured; otherwise only an unsigned artifact may be produced.
- [ ] **P2P transport identity:** replace cleartext `ws://`, bind ECDH to a verified peer identity, and add authenticated transport/certificate or key verification before treating direct sync as production-safe.

## 1. Performance Tuning

- [x] **Database Indexing:** Added `idx_note_space_mod` and `idx_note_space_trashed` (Migration v21).
- [x] **Query Optimization:** Reviewed slow queries in `search.rs` and `graph.rs` on large datasets.
- [x] **FTS Tuning:** Optimized FTS indexes and added conflict-resolution indexes (Migration v22).

## 2. Cloud Relay (Optional)

- [x] **Interface Definition:** Created `packages/core-rs/src/sync/relay.rs` with the relay client and state-machine APIs.
- [x] **Implementation:** Built the standalone Rust/Axum relay server in `packages/relay-server`.
- [x] **Registration and authentication:** Added server-issued challenges, Ed25519 proof of possession, rotating capability tokens, and bearer authentication for `/send`, `/fetch`, `/pending`, and `/ack`.
- [x] **Message integrity and delivery:** Added envelope-signature verification, registered-recipient checks, duplicate rejection, visibility leases, and explicit acknowledgement.
- [x] **Resource safety:** Added per-device and global queue/message/byte limits, registered-device and registration-challenge caps, request-size limits, and scheduled expiry cleanup.
- [ ] **Exposure hardening:** Add production TLS termination, edge rate limiting and abuse controls, durable state or explicit restart recovery semantics, monitoring, alerting, and operational runbooks before public exposure.
- [ ] **Client integration:** Complete production desktop/mobile integration, migration UX for the incompatible challenge-response registration flow, token re-registration after relay restart, and end-to-end failure recovery.

## 3. Plugin System

- [x] **API Design:** Defined the `NoteecePlugin` trait in `packages/core-rs/src/plugin.rs`.
- [x] **Validation:** Added plugin-registry tests in `packages/core-rs/tests/plugin_tests.rs`.
- [ ] **WASM Host:** Integrate `wasmer` or `wasmtime` to run untrusted plugins safely.
- [ ] **Event Hooks:** Add hooks for `on_note_save`, `on_task_complete`, and related lifecycle events.

## 4. Feature Polish

- [x] **Blob Sync Chunking:** Implemented backend chunking in `blob.rs`.
- [x] **Conflict Resolution UI:** Implemented a dedicated diff-based conflict-resolution view.
- [ ] **Security-sensitive temporary files:** replace predictable/shared OCR plaintext paths with private temporary files and enforce authorisation in Rust rather than only in the UI.
- [ ] **Cryptographic memory/key handling:** add zeroization for sensitive material and derive P2P session keys through an appropriate KDF rather than using raw ECDH output directly.
- [ ] **Selector update operations:** deploy a real signing key, signed update pipeline, rotation process, and production remote-update wiring; the reviewed bundled selector hash remains the current fallback.

## 5. Release Candidate Tasks

The project is **not** a release candidate—see Section 0 and [`STATUS.md`](STATUS.md).

- [~] **Backend finalisation:** Cross-platform Rust checks and relay lifecycle tests are present, but known release-blocking behaviours remain.
- [~] **Test coverage:** Desktop and mobile coverage checks exist and the Rust workspace runs across Linux, macOS, and Windows. `packages/ui` and `packages/types` still have no tests, and no repository-wide threshold covers every package.
- [x] **Frontend data honesty:** Finance, gamification, project progress, and vault flows no longer fabricate success values after backend failures.
- [x] **Documentation reconciliation:** Root security, privacy, status, audit, installation, mobile, and relay documentation now distinguishes implemented controls from residual blockers.
- [ ] **Branch protection:** Configure repository rules so the successful CI and Security contexts are required before merge; workflow files create checks but cannot enforce repository branch-protection policy themselves.
