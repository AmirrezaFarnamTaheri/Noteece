# Noteece Project Status

_Last Updated: 2025-11-18_

This document provides a high-level summary of the current project status, feature maturity, and known critical issues. It is the single source of truth for the state of the application.

## Overall Status: `Beta`

The application is in a beta phase. The core functionality is implemented and considered stable for daily use, but some advanced features are still under development or undergoing refinement. Users may encounter bugs, and data formats may change in future updates.

## Feature Maturity

| Feature | Status | Description |
| --- | --- | --- |
| **Core Note-Taking** | `Production` | Creating, editing, and organizing Markdown notes is stable. |
| **Task Management** | `Production` | Task creation, scheduling, and status tracking are stable. |
| **Database & Encryption** | `Production` | The SQLCipher-based encrypted database is stable and secure. |
| **Full-Text Search (FTS5)** | `Beta` | Search is functional but may have performance issues with very large vaults. A known build issue can complicate development. |
| **Local Network Sync** | `Alpha` | The underlying sync logic is robust, but the network transport (discovery, pairing, data transfer) is **not yet implemented**. The UI contains stubs for this feature. |
| **Mobile App (iOS/Android)**| `Beta` | The mobile app supports core note and task management. Feature parity with the desktop app is not yet complete. |
| **Import/Export** | `Beta` | Supports import from Obsidian and Notion, but may not handle all edge cases perfectly. |
| **Backup/Restore** | `Production` | The local backup and restore functionality is stable. |

## Known Critical Issues

1.  **FTS5 Build Failure:** There is a persistent dependency conflict that prevents the `rusqlite` `fts5` feature from being resolved correctly in some environments. This blocks Rust tests from running and complicates the development workflow. **Status: In Progress.**
2.  **Incomplete Sync Implementation:** The UI and documentation refer to a fully functional P2P sync system, but the implementation is currently limited to stubs and mock data. This is the highest priority feature to complete. **Status: Not Started.**
3.  **Placeholder Identity System:** The application uses a hard-coded `"system_user"` for all operations, which prevents true multi-user or multi-device identification. This must be replaced with a proper identity system before sync can be fully implemented. **Status: Not Started.**

For a detailed list of smaller bugs and feature requests, please refer to the project's issue tracker.
