# Architecture Guide

## Overview

Noteece is built as a local-first, privacy-focused application using a modern tech stack. It uses a monorepo structure to manage the shared core logic and platform-specific frontends.

## Tech Stack

### Core (Backend Logic)
- **Language:** Rust 🦀
- **Database:** SQLite with SQLCipher (via `rusqlite`)
- **Encryption:** AES-256-CBC (At Rest), XChaCha20Poly1305 (P2P)
- **Search:** SQLite FTS5
- **Async Runtime:** Tokio

### Desktop App
- **Framework:** Tauri v1
- **Frontend:** React + TypeScript + Vite
- **UI Library:** Mantine v7
- **State Management:** Zustand + TanStack Query
- **Routing:** React Router v6

### Mobile App
- **Framework:** Expo (React Native)
- **UI:** React Native StyleSheet (Tamagui-inspired structure)
- **Database:** `expo-sqlite`
- **Sync Client:** TypeScript implementation of the sync protocol

## Directory Structure

```
/
├── apps/
│   ├── desktop/       # Tauri application
│   └── mobile/        # Expo application
├── packages/
│   ├── core-rs/       # Rust core library (Business Logic)
│   └── types/         # Shared TypeScript definitions
├── docs/              # Documentation
└── scripts/           # Build and utility scripts
```

## Data Flow

1.  **User Action:** User interacts with the React frontend (e.g., creates a note).
2.  **Command Invocation:** Frontend calls `api.ts`, which uses `tauri.invoke` to send a message to the Rust backend.
3.  **Command Handling:** `apps/desktop/src-tauri/src/commands/` receives the command.
4.  **Core Logic:** The command calls a function in `packages/core-rs` (e.g., `note::create_note`).
5.  **Database:** `core-rs` executes a SQL query against the encrypted SQLite database.
6.  **Response:** Data is returned up the stack, serialized to JSON, and displayed in the UI.

## Synchronization Architecture

Noteece uses a custom Peer-to-Peer (P2P) synchronization protocol designed for local networks.

### Key Components
- **Discovery:** mDNS (Multicast DNS) to find devices on the local network.
- **Handshake:** ECDH (Elliptic-curve Diffie–Hellman) key exchange to establish a shared secret session key.
- **Transport:** TCP sockets encrypted with ChaCha20Poly1305.
- **Protocol:** Delta-based synchronization.
    - **Vector Clocks:** Track version history to detect conflicts.
    - **Deltas:** Small changesets (Create, Update, Delete) are transmitted.
    - **Conflict Resolution:**
        - **Last-Write-Wins (LWW):** For simple fields.
        - **Smart Merge:** For text content (append) and lists.
        - **Manual Resolution:** User intervention for unresolvable conflicts.

For more details, see `MOBILE_SYNC_ARCHITECTURE.md`.

## Foresight AI Engine

The "Foresight" engine is a local heuristic system that provides intelligent suggestions without sending data to the cloud.

- **Inputs:** Task due dates, priority, note activity, habit streaks, time of day.
- **Processing:** Local rule-based scoring and simple statistical models.
- **Outputs:** "Focus on this task", "You usually read at this time", "Project X is stagnant".

## Security Architecture

- **Zero-Knowledge:** The user's password derives the Key Encryption Key (KEK). The database is encrypted with a random Data Encryption Key (DEK), which is encrypted by the KEK.
- **Memory Safety:** Rust ensures memory safety in the core.
- **Sandboxing:** The frontend runs in a restricted WebView with strict CSP.

See `SECURITY.md` for a detailed audit.

## Mobile Active Interception (Cyborg-Life OS)

The mobile application features a "Prime" flavor that implements active UI interception for life-logging.

### Architecture
- **Flavors:**
    - `store`: Standard Google Play compliant build. Contains a "stub" accessibility service.
    - `sideload`: The "Prime" build. Contains the real `NoteeceAccessibilityService`.
- **Active Interception:**
    - `NoteeceAccessibilityService.kt`: Listens for scroll events and traverses the UI tree.
    - **JNI Bridge:** Passes raw text strings from Kotlin to Rust via `RustBridge.java`.
    - **Stream Processor (`core-rs`):** A Rust module that uses regex heuristics and a bloom filter to detect and extract social media posts (Tweets, Reddit posts) from the raw accessibility stream.
    - **Bloom Filter:** Prevents duplicate ingestion of the same post during scrolling.
- **Privacy:**
    - Active interception is **opt-in** via a specific "Session Start" intent.
    - All processing happens in-memory within the Rust core.
    - Data is encrypted immediately upon capture.
