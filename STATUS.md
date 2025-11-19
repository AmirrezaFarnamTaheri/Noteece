# Noteece Project Status

_Last Updated: 2025-11-19_

This document provides a high-level summary of the current project status, feature maturity, and known critical issues. It is the single source of truth for the state of the application.

## Overall Status: `Beta`

The application is in a beta phase. The core functionality is implemented and considered stable for daily use.

## Feature Maturity

| Feature                      | Status       | Description                                                                                                        |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Core Note-Taking**         | `Production` | Creating, editing, and organizing Markdown notes is stable.                                                        |
| **Task Management**          | `Production` | Task creation, scheduling, and status tracking are stable.                                                         |
| **Database & Encryption**    | `Production` | The SQLCipher-based encrypted database is stable and secure.                                                       |
| **Full-Text Search (FTS5)**  | `Production` | Search is fully functional with `fts5` features enabled.                                                           |
| **Identity & Auth**          | `Production` | Secure Argon2id authentication, session management, and user data isolation are implemented via `AuthService`.     |
| **Local Network Sync**       | `Beta`       | The P2P sync protocol is implemented with mDNS discovery and secure pairing (ECDH). UI integration is in progress. |
| **Mobile App (iOS/Android)** | `Beta`       | The mobile app supports core note and task management.                                                             |
| **Import/Export**            | `Beta`       | Supports import from Obsidian and Notion.                                                                          |
| **Backup/Restore**           | `Production` | The local backup and restore functionality is stable.                                                              |

## Known Critical Issues

1. **Mobile Feature Parity:** Advanced features like "Graph View" and "Weekly Review" are currently desktop-only.
2. **Sync UI:** While the sync protocol backend is implemented, the frontend management for pairing devices needs further polish.

For a detailed list of smaller bugs and feature requests, please refer to the project's issue tracker.
