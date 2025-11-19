# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
