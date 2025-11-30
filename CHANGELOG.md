# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Granular logging infrastructure throughout the `core-rs` crate (sync, auth, project, note, import, backup).
- Frontend logging wrapper in `apps/desktop` for tracing API calls.
- `ts-jest-mock-import-meta` to support `import.meta` in Jest tests.

### Fixed
- Desktop Jest configuration to correctly handle ESM and `import.meta`.
- Fixed React Native VirtualizedList component testing issues.
- Resolved numerous Rust clippy warnings (unused variables, deprecated functions, etc.).
- Fixed database queries in `correlation` module to match schema (removed non-existent columns).
- Addressed `react-beautiful-dnd` type import issues in Desktop.

## [1.1.0] - 2024-05-20

### Added
- Initial release of Noteece with core features.
