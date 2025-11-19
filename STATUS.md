# Noteece Project Status

_Last Updated: 2025-11-19_

This document provides a high-level summary of the current project status, feature maturity, and known critical issues. It is the single source of truth for the state of the application.

## Overall Status: `Beta`

The application is in a beta phase. The core functionality is implemented, but the project is not yet stable for release due to persistent test failures and a disabled feature.

## Feature Maturity

| Feature                      | Status       | Description                                                                                                        |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Core Note-Taking**         | `Production` | Creating, editing, and organizing Markdown notes is stable.                                                        |
| **Task Management**          | `Production` | Task creation, scheduling, and status tracking are stable.                                                         |
| **Database & Encryption**    | `Production` | The SQLCipher-based encrypted database is stable and secure.                                                       |
| **Full-Text Search (FTS5)**  | `Disabled`   | Search is disabled due to a build conflict with SQLCipher.                                                          |
| **Identity & Auth**          | `Production` | Secure Argon2id authentication, session management, and user data isolation are implemented via `AuthService`.     |
| **Local Network Sync**       | `Beta`       | The P2P sync protocol is implemented with mDNS discovery and secure pairing (ECDH). UI integration is in progress. |
| **Mobile App (iOS/Android)** | `Beta`       | The mobile app supports core note and task management.                                                             |
| **Import/Export**            | `Beta`       | Supports import from Obsidian and Notion.                                                                          |
| **Backup/Restore**           | `Production` | The local backup and restore functionality is stable.                                                              |

## Known Critical Issues

1.  **FTS5/SQLCipher Conflict:** There is a persistent build failure when both the `fts5` and `bundled-sqlcipher-vendored-openssl` features are enabled. This is a blocking issue for enabling full-text search.
2.  **Desktop Test Failures:** The desktop frontend test suite is suffering from cascading failures due to a lack of test isolation in the Zustand store.
3.  **Mobile Test Failures:** The mobile frontend test suite has persistent failures related to mocking native modules.

For a detailed list of smaller bugs and feature requests, please refer to the `ISSUES.md` file.
