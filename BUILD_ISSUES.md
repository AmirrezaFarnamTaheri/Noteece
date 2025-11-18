## 1. `rusqlite` `fts5` Feature Resolution Failure (RESOLVED)

- **Status:** **Fixed**
- **Resolution:** The `fts5` feature has been explicitly enabled in `packages/core-rs/Cargo.toml`. The bundled SQLCipher build now correctly includes the `SQLITE_ENABLE_FTS5` flag.

- **Context:** previously, build commands failed when `fts5` was enabled due to a dependency resolution conflict. This forced a temporary workaround where `fts5` was disabled, causing runtime crashes on fresh databases.

- **Verification:**
- `cargo build` passes with `fts5` enabled.
- Migrations creating `VIRTUAL TABLE ... USING fts5` succeed on fresh installs.
