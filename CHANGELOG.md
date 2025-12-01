# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **UI/UX Overhaul:** Significantly enhanced the Desktop Dashboard with polished widgets for Music, Health, and Social.
- **Music Widget:** Implemented a new glassmorphism design with visualizers and "disconnected" state handling.
- **Health Widget:** Added robust visualization for health metrics with empty state handling and proper unit formatting.
- **Mobile Polish:** Enhanced `HealthHub` and `MusicHub` screens with better error handling, loading states, and data seeding for demo purposes.
- **Safety:** Replaced unsafe `unwrap()` calls in `srs.rs` and `versioning.rs` with proper error propagation.
- **Linting:** Resolved over 100 ESLint warnings in the Desktop and Mobile applications, improving code quality and type safety.

### Fixed
- **Mobile Database:** Fixed formatting and potential migration issues in `apps/mobile/src/lib/database.ts`.
- **React Hooks:** Resolved missing dependency warnings in `useEffect` hooks across the mobile app.
- **Object Injection:** Mitigated potential security risks by using safe object access patterns in frontend components.
- **Rust Clippy:** Fixed remaining Rust clippy warnings in `core-rs`.

## [1.1.0] - 2024-05-20

### Added
- Initial release of Noteece with core features.
