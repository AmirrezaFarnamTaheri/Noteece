# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Mobile Schema:** Aligned `Task` status (`todo` -> `next`) and priority (string -> int) with the core database schema to prevent data corruption.
- **Desktop Schema:** Updated Task Board columns to map `To Do` to `next` status, matching the database.
- **Mobile Search:** Added missing Full-Text Search (FTS) triggers in mobile database migration (v6) to keep search index in sync with notes.
- **Mobile Sync:** Fixed FFI `register_device` to correctly set `DeviceType` and ensured `rust_start_sync` checks for initialized agent.
- **P2P Security:** Added connection limit (Semaphore) to prevent DoS, and improved handshake to extract client keys for mutual auth.
- **Mobile Migrations:** Wrapped database migrations in transactions to prevent race conditions and partial failures.
- **Privacy:** Enhanced backup scrubbing to remove `refresh_token`, `client_secret` and other sensitive fields.
- **Discovery:** Added `device_type` support to `DiscoveredDevice` in P2P discovery protocol.
- **Desktop:** Fixed Journal timezone issue using local date format.
- **Safety:** Replaced unsafe `unwrap()` calls in critical backend paths (`search.rs`, `collaboration.rs`, `blob.rs`, `selector_verification.rs`) with safe `expect()` or error handling.
- **Desktop UI:** Replaced placeholder UI in Habits page with a functional creation modal.
- **Desktop API:** Fixed `any` return type in `getDashboardStats` for better type safety.
- **Mobile Linting:** Resolved remaining ESLint warnings in `more.tsx` and `sync-bridge.ts`.
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
- **Mobile Notes:** Added a dedicated **Notes Screen** (`apps/mobile/app/(tabs)/notes.tsx`) with search, tagging, and sorting.
- **Desktop Features:** Fully implemented **Journal** (Daily Notes) and **Habits** pages, replacing placeholders.
- **Visualizations:** Added a **Temporal Graph** (Deterministic Layout) and **Tags Cloud** connected to real backend data.
- **Backend Safety:** Implemented strict state machine validation for Project status transitions.
- **Safety:** Replaced unsafe `unwrap()` calls in `srs.rs`, `versioning.rs`, and `tag.rs` with proper error propagation.
- **Linting:** Resolved over 100 ESLint warnings in the Desktop and Mobile applications, improving code quality and type safety.

## [1.1.0] - 2024-05-20

### Added
- Initial release of Noteece with core features.
