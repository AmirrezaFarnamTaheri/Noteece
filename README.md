# Noteece

> **Local-first, End-to-End Encrypted Life OS**

Noteece is a private, offline-first workspace that combines note-taking, project management, and personal tracking into a single, encrypted vault. It runs on your desktop and syncs directly to your mobile devices without a central server.

## Core Philosophy

1.  **Local-First**: Your data lives on your device. No cloud account required.
2.  **End-to-End Encrypted**: All content is encrypted at rest using SQLCipher (XChaCha20-Poly1305).
3.  **Ownership**: You own your keys and your database. Export to Markdown/JSON at any time.
4.  **Connectivity**: Optional peer-to-peer sync over local network (mDNS/WebSockets) or via encrypted relays.

## Architecture

The project is a monorepo containing:

*   `packages/core-rs`: The brain of the operation. A Rust library handling the encrypted SQLite database, business logic, sync protocol, and cryptography.
*   `apps/desktop`: A Tauri v1 application (Rust + React/TypeScript) that wraps `core-rs`.
*   `apps/mobile`: A React Native (Expo) application that will eventually bind to `core-rs` (currently in progress via JSI or HTTP bridge).
*   `packages/types`: Shared TypeScript definitions for frontend-backend consistency.

## Features

*   **Notes**: Markdown-based editor with backlinking (`[[wiki-style]]`), tagging, and full-text search.
*   **Projects**: Kanban boards, Gantt-like timelines, risk tracking, and milestone management.
*   **Tasks**: GTD-style task manager with recurring tasks, priority queues, and project associations.
*   **Personal Modes**: Dedicated tracking for Health (metrics, goals), Finance (transactions), and Travel (itineraries).
*   **Social Media Suite**: Plan, draft, and archive content for social platforms locally.
*   **Sync**: Encrypted, conflict-free sync between devices using Vector Clocks and Merkle Trees (in progress).

## Getting Started

### Prerequisites

*   **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
*   **Node.js**: v18+ (via `nvm` or `voltag`)
*   **pnpm**: `npm install -g pnpm`
*   **System Libs** (Ubuntu/Debian):
    ```bash
    sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
    ```

### Installation

1.  **Clone**:
    ```bash
    git clone https://github.com/yourusername/noteece.git
    cd noteece
    ```

2.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

3.  **Run Desktop App**:
    ```bash
    cd apps/desktop
    pnpm tauri dev
    ```

4.  **Run Mobile App**:
    ```bash
    cd apps/mobile
    pnpm start
    ```

## Development Status

*   [x] **Core Database**: Encrypted SQLite with SQLCipher.
*   [x] **Auth**: PBKDF2/Argon2 key derivation.
*   [x] **Notes/Tasks/Projects**: Full CRUD and linking.
*   [x] **Search**: Hybrid FTS5 + LIKE search for encrypted content.
*   [x] **Sync (Beta)**: Local P2P discovery and basic delta syncing.
*   [x] **Personal Modes**: Health tracking implemented.
*   [ ] **Mobile Bridge**: Full JSI binding for `core-rs` on mobile (currently using mock/partial implementation).

See [ISSUES.md](./ISSUES.md) for known bugs and [PROGRESS.md](./PROGRESS.md) for roadmap.

## License

AGPL-3.0
