# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Sync Protocol:** Fixed a build failure in `mobile_sync.rs` by correctly using the public `pair_device` API in tests.
- **Search:** Resolved a critical runtime panic in FTS search by fixing a table alias mismatch (`fts_note` vs `f`).
- **Social Processing:** Added missing logic to extract Discord handles in `misc.rs`.
- **Mobile Settings:** Fixed a bug where updating nested settings (like theme) would overwrite the entire object instead of merging.
- **Mobile UI:** Improved type safety in `SharedContentBanner` and added validation to `SaveFilterModal`.
- **Mobile Theme:** Unified dark mode colors in `ThemeContext` to use consistent `obsidianColors`.
- **Backend:** Audited `sync/engine.rs` and `sync/p2p.rs` for race conditions and proper error propagation.

### Added
- **Documentation:** Added `STATUS.md` to track project state.
- **UI/UX Overhaul:** Significantly enhanced the Desktop Dashboard with polished widgets for Music, Health, and Social.
- **Music Widget:** Implemented a new glassmorphism design with visualizers and "disconnected" state handling.
- **Health Widget:** Added robust visualization for health metrics with empty state handling and proper unit formatting.
- **Mobile Polish:** Enhanced `HealthHub` and `MusicHub` screens with better error handling, loading states, and data seeding for demo purposes.
- **Safety:** Replaced unsafe `unwrap()` calls in `srs.rs` and `versioning.rs` with proper error propagation.
- **Linting:** Resolved over 100 ESLint warnings in the Desktop and Mobile applications, improving code quality and type safety.

## [1.1.0] - 2024-05-20

### Added
- Initial release of Noteece with core features.
