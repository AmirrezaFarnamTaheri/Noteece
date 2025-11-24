# Monorepo Structure

Noteece is organized as a monorepo using `pnpm` workspaces and Cargo workspaces. This structure allows us to share code and manage dependencies efficiently across the Rust backend, Desktop frontend, and Mobile application.

## Directory Layout

```
.
├── apps/
│   ├── desktop/          # Tauri + React Desktop Application
│   └── mobile/           # Expo + React Native Mobile Application
├── packages/
│   ├── core-rs/          # Shared Rust Library (Business Logic, DB, Sync)
│   ├── types/            # Shared TypeScript Types
│   └── ui/               # Shared UI Components (React)
├── docs/                 # Documentation
├── scripts/              # Build and utility scripts
├── Cargo.toml            # Rust Workspace Configuration
└── package.json          # Root Node.js Configuration
```

## Packages

### `packages/core-rs`
This is the heart of the application. It is a pure Rust crate that contains:
- **Database Layer**: SQLite management, schema, and migrations (`src/db`).
- **Business Logic**: All feature logic (Tasks, Projects, Notes, etc.).
- **Sync Engine**: The P2P synchronization protocol (`src/sync`).
- **Search**: FTS5-based search engine.
- **Encryption**: Application-level encryption logic.

This crate is compiled into the Desktop app via Tauri and exposed to Android via JNI (though the current mobile app uses a TypeScript sync client).

### `packages/types`
Contains TypeScript definitions that mirror the Rust data structures. This ensures type safety across the full stack. When Rust structs change, these types must be updated (or auto-generated).

### `packages/ui`
A shared React component library used by both `apps/desktop` and potentially web views. It uses Mantine for the base design system.

## Apps

### `apps/desktop`
The primary desktop client.
- **Tech Stack**: Tauri (Rust), React (TypeScript), Vite, Mantine, Tailwind CSS.
- **State Management**: Zustand.
- **Communication**: Calls `core-rs` functions via Tauri Commands defined in `src-tauri/src/commands.rs`.

### `apps/mobile`
The mobile client (iOS/Android).
- **Tech Stack**: React Native (Expo).
- **Database**: Local SQLite (via Expo SQLite).
- **Sync**: Implements a TypeScript-based sync client compatible with the Rust Sync Protocol.

## Build System

- **Rust**: Standard `cargo` workflow. Run `cargo test` in `packages/core-rs` to test the backend.
- **Node**: Managed by `pnpm`.
    - `pnpm install`: Installs dependencies for all apps/packages.
    - `pnpm build`: Builds all apps.
    - `pnpm dev:tauri`: Starts the desktop dev environment.
