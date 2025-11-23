# Rust Guidelines (`core-rs`)

## Philosophy

The `core-rs` crate is the bedrock of the application. It must be **reliable**, **performant**, and **secure**.

## Code Style

- **Formatter:** Always run `cargo fmt` before committing.
- **Linter:** Maintain a clean `cargo clippy` output. No warnings allowed in CI.

## Error Handling

**Do NOT panic.**
- Avoid `unwrap()` and `expect()` in production code.
- Use the `Result<T, E>` type for all fallible operations.
- Propagate errors using the `?` operator.
- Use `thiserror` for defining domain-specific error enums.

```rust
// Bad
fn get_note(id: &str) -> Note {
    db.query(...).unwrap()
}

// Good
fn get_note(id: &str) -> Result<Note, AppError> {
    let note = db.query(...).map_err(AppError::Database)?;
    Ok(note)
}
```

## Database Access

- **Connection Pooling:** Always use the `r2d2` connection pool passed via the `State`. Do not create ad-hoc connections.
- **Transactions:** Use transactions for multi-step operations (e.g., `delete_project`).
- **Parameters:** ALWAYS use parameterized queries (`?1`, `?2`) to prevent SQL injection.

## Async/Await

- The core logic is primarily synchronous (SQLite is synchronous).
- However, for the **Sync Agent** and **Network** layers, we use `tokio`.
- Be careful bridging sync/async worlds. Use `tokio::task::spawn_blocking` for heavy DB operations called from async contexts.

## Logging

- Use the `log` crate macros: `info!`, `warn!`, `error!`, `debug!`, `trace!`.
- Structure logs with context: `info!("[sync] Starting sync with device {}", device_id);`.
