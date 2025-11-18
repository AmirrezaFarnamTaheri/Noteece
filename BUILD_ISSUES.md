# Known Build & Environment Issues

This document tracks persistent build, dependency, and environment issues that have proven difficult to resolve and may require deeper investigation or a specific environment setup.

## 1. FTS5 Feature Resolution Failure in Cargo Workspace

- **Symptom**: `cargo build` and `cargo test` fail with the error `package `core-rs` depends on `rusqlite` with feature `fts5` but `rusqlite` does not have that feature`. This occurs even when the `fts5` feature is correctly added to `rusqlite` in all `Cargo.toml` files within the workspace.

- **Impact**: The inability to enable the `fts5` feature means that the application will crash at runtime on a fresh database when migrations attempt to create FTS5 virtual tables. This is a critical startup failure.

- **Troubleshooting Steps Attempted**:
  - Added the `fts5` feature to `rusqlite` in `packages/core-rs/Cargo.toml`.
  - Added the `fts5` feature to `rusqlite` in `apps/desktop/src-tauri/Cargo.toml` to resolve workspace conflicts.
  - Deleted `Cargo.lock` and rebuilt the project to force dependency re-resolution.
  - Searched for updated versions of `rusqlite`.

- **Hypothesis**: This is a complex issue within the Cargo workspace and its interaction with the `rusqlite` crate's features. The `bundled-sqlcipher` feature may be interfering with the `fts5` feature in a non-obvious way. The error message from Cargo appears to be misleading.

- **Next Steps**: A developer with deep knowledge of the Rust build system and this project's specific workspace configuration needs to investigate this issue. It is currently blocking the implementation of a permanent fix for the FTS5-related startup crash.
