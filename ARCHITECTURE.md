# Noteece Architecture

This document describes the current architecture of the Noteece application. It serves as the single source of truth, superseding any historical or archived design documents.

## Core Principles

- **Local-First:** All user data is stored and managed on the user's local device. The application is fully functional offline.
- **End-to-End Encryption (E2EE):** User data is encrypted at rest on the device and in transit during sync operations. The encryption keys are managed by the user, ensuring a zero-knowledge system where no central server can access the content.
- **Markdown-Centric:** Notes and other content are primarily stored and edited in Markdown, ensuring data portability and longevity.

## High-Level Components

The Noteece ecosystem consists of three main components:

1.  **Rust Core (`packages/core-rs`):** A shared library that contains all the core business logic, including:
    - Database management (via SQLCipher-encrypted SQLite).
    - Data models and application state.
    - Sync engine logic (conflict resolution, history tracking).
    - Import/export functionality.
    - Full-text search indexing (FTS5).

2.  **Desktop Application (`apps/desktop`):** A Tauri-based application for Windows, macOS, and Linux.
    - Uses React and TypeScript for the frontend UI.
    - Communicates with the Rust core via Tauri's command bridge.
    - Manages the main database file and user preferences.

3.  **Mobile Application (`apps/mobile`):** An Expo-based application for iOS and Android.
    - Uses React Native for the UI.
    - Interacts with its own local, encrypted SQLite database.
    - Implements a subset of the core logic for mobile-specific use cases.

## Sync Architecture

- **Peer-to-Peer (P2P):** Sync occurs directly between a user's devices over a local network (Wi-Fi). There is **no central server** involved in the sync process.
- **Discovery:** Devices are discovered on the local network using mDNS (Bonjour).
- **Transport:** Data is transferred over a secure channel established via a direct TCP connection, with all traffic encrypted.
- **State:** The sync protocol is designed to be stateless where possible, relying on delta-based updates and a robust conflict resolution mechanism to merge changes.

## Data Storage

- **Database:** A single, encrypted SQLite database file (`vault.db`) per user "vault".
- **Encryption:** The database is encrypted using SQLCipher. A Data Encryption Key (DEK), derived from the user's password, is held in memory only while the application is unlocked.
- **Blobs/Attachments:** Larger binary files (images, PDFs) are stored in a separate blob store, with each blob individually encrypted.
