# Known Build & Environment Issues

This document tracks persistent build, dependency, and environment issues that have proven difficult to resolve and may require deeper investigation or a specific environment setup.

## 1. `rusqlite` `fts5` Feature Resolution Failure

- **Symptom:** The `cargo build`, `cargo check`, and `cargo test` commands consistently fail in the `packages/core-rs` workspace with an error indicating that the `fts5` feature for the `rusqlite` crate cannot be found, even when it is explicitly added to the `Cargo.toml`. The error message is:
  ```
  error: failed to select a version for `rusqlite`.
  ...
  package `core-rs` depends on `rusqlite` with feature `fts5` but `rusqlite` does not have that feature.
  ```

- **Impact:**
  - This build failure completely blocks the execution of all Rust unit and integration tests.
  - As a temporary workaround, the `fts5` feature has been removed from `Cargo.toml`. This unblocks the CI/CD pipeline but means the application will crash at runtime on first launch when the database migration attempts to create a `VIRTUAL TABLE` using `fts5`.

- **Troubleshooting Steps Attempted:**
  - **`cargo clean`**: This had no effect.
  - **Deleting `Cargo.lock`**: Deleting the root lockfile and attempting to regenerate it with `cargo check` resulted in the same feature resolution error.

- **Hypothesis:** This is likely an issue with the local Cargo cache on the development machine or a subtle misconfiguration in the workspace's dependency graph that `cargo` is unable to resolve correctly. It requires further investigation to determine the root cause.

- **Required Action:** A developer must investigate the Cargo build environment to resolve this feature resolution failure and re-enable the `fts5` feature in `packages/core-rs/Cargo.toml`.
