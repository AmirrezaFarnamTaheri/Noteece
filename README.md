# Noteece

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Status](https://img.shields.io/badge/status-Beta-blue)

A **local-first**, **end-to-end encrypted**, **Markdown-centric** workspace designed for speed-of-thought productivity. Notes, tasks, projects, and knowledge live in a single unified, encrypted vault.

**Core Principles:**

- 🔒 **Privacy First**: End-to-end encryption, offline by default, zero telemetry.
- 📝 **Markdown-Centric**: Write in a familiar, portable format with backlinking.
- 🚀 **Local-First**: All data is stored locally in an encrypted SQLite vault.
- 🔓 **Zero Lock-In**: Full import/export capabilities and open data formats.
- ⚡ **Built for Speed**: Optimized for rapid capture, organization, and retrieval.

## Project Status

Noteece is currently in **`Beta`**. The core functionality is stable, but some advanced features are still under active development. For a detailed breakdown of feature maturity and known issues, please refer to [STATUS.md](STATUS.md).

## Features

### Core Features (Stable)

- **Local-First & E2EE:** Your data is stored locally in a SQLCipher-encrypted vault.
- **Markdown-Centric:** Write in a familiar, portable format, enhanced with backlinking.
- **Unified Data Model:** Notes, tasks, projects, and more all live in the same encrypted vault.
- **Cross-Platform:** Available on all major desktop platforms (Windows, macOS, Linux).
- **Note Management:** Create, edit, and organize notes with support for daily notes, version history, and backlinking.
- **Task & Project Management:** Basic support for tasks and projects, including Kanban-style boards.
- **Full-Text Search:** Fast, encrypted search for your notes and content.
- **Import/Export:** Import from Obsidian and Notion, and export your data to Markdown.
- **Backup/Restore:** Create and restore from local, encrypted backups.

### In-Development Features (Alpha/Beta)

- **Local Network Sync:** Peer-to-peer sync between devices on your local network is under development. The underlying logic is in place, but the network transport is not yet complete.
- **Mobile App (iOS/Android):** A mobile app is available and supports core note-taking and task management, but does not yet have feature parity with the desktop app.
- **Spaced Repetition System (SRS):** A system for creating and reviewing knowledge cards from your notes.
- **Social Media Suite (Beta):** A local-first social media aggregator. This feature is experimental and relies on scraping.

## Quick Start (for Developers)

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)
- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/installation)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Building from Source

```bash
# 1. Clone the repository
git clone https://github.com/AmirrezaFarnamTaheri/noteece.git
cd noteece

# 2. Install dependencies
pnpm install

# 3. Run development build
cd apps/desktop
pnpm dev:tauri
```

## Architecture

Noteece is a monorepo built with a Rust core and TypeScript/React frontend applications. For a detailed overview, please see [ARCHITECTURE.md](ARCHITECTURE.md).

- `apps/desktop`: The Tauri-based desktop application.
- `apps/mobile`: The React Native/Expo mobile application.
- `packages/core-rs`: The shared Rust core that contains all business logic.

## Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide for more information.

## License

GNU General Public License v3.0. See [LICENSE](LICENSE) for full details.
