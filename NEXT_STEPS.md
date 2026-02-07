# Next Steps & Roadmap

This document outlines the immediate and near-term goals for the Noteece project.

## 1. Performance Tuning

- [x] **Database Indexing:** Added `idx_note_space_mod` and `idx_note_space_trashed` (Migration v21).
- [x] **Query Optimization:** Review slow queries in `search.rs` and `graph.rs` on large datasets (10k+ notes).
- [x] **FTS Tuning:** Optimized FTS indexes and added conflict resolution indexes (Migration v22).

## 2. Cloud Relay (Optional)

- [x] **Interface Definition:** Created `packages/core-rs/src/sync/relay.rs` with `RelayClient` trait.
- [x] **Implementation:** Built standalone relay server `packages/relay-server` (Rust/Axum).
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

- [x] **Backend Finalization:** Added comprehensive tests for critical paths.
- [x] **Frontend Polish:** Improved sync status and conflict UI.
- [x] **Documentation:** Updated status and roadmap.
