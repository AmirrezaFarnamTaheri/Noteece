# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Backend Robustness:** Implemented a dedicated `commands.rs` layer in the desktop app to explicitly wrap all Rust core functions. This ensures consistent error handling (mapping DbErrors to user-friendly strings) and thread-safety (managing mutex locks centrally) before passing data to the frontend.
- **Integration Tests:** Added `auth_integration_test.rs` to verify the authentication flow end-to-end at the backend level.
- **Zen Mode:** A distraction-free writing mode that hides the sidebar and header, allowing users to focus solely on their content.
- **Audit Logging:** A comprehensive backend system that logs critical user actions (login, data modification) to a tamper-evident `audit_log` table for security and accountability.
- **Mobile App Feature Consolidation:** Implemented real database storage for **Health Hub** and **Music Hub** in the mobile app, replacing all temporary mock data.
- **Backend Sync Expansion:** Updated `core-rs` sync agent to support `HealthMetric`, `Track`, `Playlist`, and `CalendarEvent` entities, enabling full sync capability for new mobile features.
- **Music Schema:** Added comprehensive database tables for music tracks and playlists, including support for smart playlists.
- **Health Schema:** Added database tables for tracking health metrics with support for units and notes.

### Changed

- **Backend Architecture:** Refactored `AuthService` in `core-rs` to be stateless, accepting a database connection reference instead of owning a mutex. This resolves a critical architectural conflict with the Tauri state management system.
- **Tauri Command API:** Standardized all Tauri commands to use the `_cmd` suffix (e.g., `create_note` -> `create_note_cmd`) in the Rust backend, matching the expectations of the React frontend and resolving a persistent "command not found" split-brain issue.
- **Mobile Database Schema:** Updated mobile SQLite schema (v4) to include `track` and `playlist` tables, aligning it with the backend schema.
- **Refactoring:** Removed unused mocks from the desktop application (`apps/desktop/src/mocks/tauri.ts`) to clean up the codebase.
- **Core Library:** Refactored `core-rs` to expose dedicated `health` and `music` modules for better code organization.

### Fixed

- **False Alarm in QA Report:** Investigated and confirmed that the `invitedBy` TODO mentioned in QA reports was already resolved in the codebase.
- **Backend Test Suite:** Fixed a critical security vulnerability in the OCR module and resolved a panic in the analytics module. The backend test suite now passes completely.
- **Mobile Test Suite:** Resolved a Jest setup issue that was preventing the mobile test suite from running.
- **Linting Issues:** Fixed a large number of linting errors and warnings across the entire codebase.

### Changed

- **Build Configuration:** Temporarily disabled the `fts5` feature to resolve a build conflict with SQLCipher. Full-text search is currently disabled.
- **Test Infrastructure:** Refactored the mobile test suite to correctly mock native modules.

### Changed

- **Project Documentation Overhaul:** Replaced outdated and misleading documentation with a new, accurate `ARCHITECTURE.md` and `STATUS.md`. The `README.md` has been rewritten to reflect the project's true beta status.
- **Core Identity System:** Replaced the hard-coded `"system_user"` placeholder with a persistent, unique user ID generated and stored in the vault. This is a critical step towards multi-device sync.
- **Database Schema Refinement:** The `task` table's `completed_at` column now correctly uses `NULL` for incomplete tasks instead of `0`. A migration has been added for existing data.
- **Sync Port Configuration:** The hardcoded sync port has been removed. The application now uses the configurable port from the database settings.

### Added

- **Local Network Device Discovery:** Implemented the first phase of P2P sync, allowing devices to discover each other on a local network using mDNS.

### Removed

- **Obsolete Documentation:** Archived old design documents that no longer reflect the current architecture.
- **Misleading Tests:** Deleted "fake" performance and extractor test suites that provided no real value and created a false sense of coverage.

### Fixed

- **Build Stability:** Enabled the `fts5` feature for `rusqlite` to resolve a critical startup crash on new vaults. The corresponding build documentation has been updated.
- **Security:** Patched a critical security flaw in the sync conflict resolution command to ensure the Data Encryption Key (DEK) is handled securely.
- **Mobile App Hygiene:** Removed unnecessary permissions from the mobile app's manifest and hid unimplemented features from the UI.
- **Core Logic:** Improved the robustness of the action item parser for meeting notes.

## [1.0.0] - 2025-11-17

... (previous entries remain)
