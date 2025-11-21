## Unreleased

### Added
- **Cross-Platform Build Pipeline**: Added GitHub Actions workflow `release.yml` to build and release binaries for Windows, macOS, and Linux (desktop), and structure for iOS/Android (mobile).
- **Backend Hardening**: Improved error handling and robustness in `core-rs` by removing unsafe `unwrap()` calls in `music.rs`, `health.rs`, `tag.rs`, `space.rs`, `personal_modes.rs`, `crdt.rs`, `sync/mobile_sync.rs`, and `sync_agent.rs`.
- **Sync Robustness**: Implemented conflict persistence in `sync_agent.rs`. Conflicts detected during sync are now saved to the database for manual resolution, preventing data loss.
- **Sync API Completion**: Added missing API methods `getAllSyncTasks` and `getSyncStats` to `api.ts` and wired them to backend commands.
- **Robustness Tests**: Added `robustness_tests.rs` and `sync_logic_tests.rs` to verify error handling and sync conflict resolution logic.

### Fixed
- **Sync Schema Mismatch**: Fixed `sync_agent.rs` to use correct singular table names (`note`, `task`, `project`) matching the database schema, resolving a critical sync failure where local changes were not detected.
- **Linter Warnings**: Resolved numerous Rust compiler warnings (unused variables, dead code) in `core-rs`.
- **Type Safety**: Updated `packages/types` and `api.ts` to include `DeviceInfo` and `DiscoveredDevice` types, improving frontend type safety for sync features.
- **CRDT Tests**: Fixed type mismatch errors in `crdt_tests.rs`.

### Changed
- **Sync Logic**: `apply_deltas` now explicitly checks for conflicts before applying changes, ensuring local data is not blindly overwritten by older or conflicting remote data.
