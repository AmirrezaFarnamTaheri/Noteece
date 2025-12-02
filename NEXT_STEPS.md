# Next Steps & Roadmap

This document outlines the immediate and near-term goals for the Noteece project.

## 1. Performance Tuning
- [x] **Database Indexing:** Added `idx_note_space_mod` and `idx_note_space_trashed` (Migration v21).
- [ ] **Query Optimization:** Review slow queries in `search.rs` and `graph.rs` on large datasets (10k+ notes).
- [ ] **FTS Tuning:** Experiment with `trigram` tokenizer for better fuzzy search support.

## 2. Cloud Relay (Optional)
- [x] **Interface Definition:** Created `packages/core-rs/src/sync/relay.rs` with `RelayClient` trait.
- [ ] **Implementation:** Build a standalone relay server (Rust/Axum) that implements the `BlindRelayServer` logic.
- [ ] **Client Integration:** Connect the desktop/mobile sync agents to the relay for internet sync.

## 3. Plugin System
- [x] **API Design:** Defined `NoteecePlugin` trait in `packages/core-rs/src/plugin.rs`.
- [ ] **WASM Host:** Integrate `wasmer` or `wasmtime` to run untrusted plugins safely.
- [ ] **Event Hooks:** Add hooks for `on_note_save`, `on_task_complete`, etc.

## 4. Feature Polish
- [ ] **Blob Sync Chunking:** Implement robust chunking for large file sync.
- [ ] **Conflict Resolution UI:** A dedicated UI to resolve "Manual" conflicts (currently falls back to keeping both).
