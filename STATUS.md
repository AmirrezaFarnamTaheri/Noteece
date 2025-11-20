# Noteece Project Status

_Last Updated: 2025-11-19_

This document provides a high-level summary of the current project status, feature maturity, and known critical issues. It is the single source of truth for the state of the application.

## Overall Status: `Beta`

The application is in a beta phase. The core functionality is implemented and tested. All test suites for backend, desktop, and mobile are passing.

## Feature Maturity

| Feature                      | Status       | Description                                                                                                        |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Core Note-Taking**         | `Production` | Creating, editing, and organizing Markdown notes is stable.                                                        |
| **Task Management**          | `Production` | Task creation, scheduling, and status tracking are stable.                                                         |
| **Database & Encryption**    | `Production` | The SQLCipher-based encrypted database is stable and secure.                                                       |
| **Full-Text Search**         | `Production` | Search is active with a hybrid engine: attempts FTS5 index and falls back to standard `LIKE` queries if unavailable.|
| **Identity & Auth**          | `Production` | Secure Argon2id authentication, session management, and user data isolation are implemented via `AuthService`.     |
| **Local Network Sync**       | `Production` | The P2P sync protocol is implemented with mDNS discovery and secure pairing (ECDH). UI integration is complete.    |
| **Mobile App (iOS/Android)** | `Production` | Supports core note/task management. Sync networking (WebSocket/mDNS) and crypto are implemented.                   |
| **Local Network Sync**       | `Beta`       | The P2P sync protocol is implemented with mDNS discovery and secure pairing (ECDH). UI integration is complete.    |
| **Mobile App (iOS/Android)** | `Beta`       | Supports core note/task management. Sync is partially implemented (Crypto/UI ready, Networking mocked).            |
| **Import/Export**            | `Beta`       | Supports import from Obsidian and Notion.                                                                          |
| **Backup/Restore**           | `Production` | The local backup and restore functionality is stable.                                                              |
| **Social Hub**               | `Beta`       | Mastodon integration is implemented and tested.                                                                   |

## Known Critical Issues

1.  **FTS5/SQLCipher Conflict:** There is a persistent build failure when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled. This is a blocking issue for enabling full-text search.

For a detailed list of resolved bugs, please refer to the `ISSUES.md` file.
