# Noteece

**Noteece** is a local-first, end-to-end encrypted, Markdown-centric workspace designed for privacy, productivity, and personal growth.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Status](https://img.shields.io/badge/status-production_ready-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-violet)

## Overview

Noteece combines the best of note-taking, project management, and personal growth tracking into a single, private application. Your data lives on your device, encrypted and secure.

### Key Features

- **📝 Knowledge Management:** Markdown editor with backlinks, tags, and full-text search (with FTS5 fallback support).
- **🚀 Project Hub:** comprehensive project management with Milestones, Risks, and Kanban boards.
- **⏱️ Time Tracking:** Built-in manual and timer-based time tracking linked to projects and tasks.
- **🌱 Personal Growth:** Track habits, set goals, and perform weekly reviews.
- **📱 Mobile Companion:** Sync your data securely via P2P to your mobile device.
- **🔒 Privacy First:** Local-first architecture with SQLCipher encryption. No cloud, no tracking.
- **🎨 Modern UI:** Revolutionary "Deep Obsidian" aesthetic with glassmorphism and smooth interactions.

## Getting Started

### Prerequisites

- Node.js (v18+) & pnpm
- Rust (stable)
- System dependencies (see [WIKI.md](./WIKI.md))

### Installation

```bash
git clone https://github.com/yourusername/noteece.git
cd noteece
pnpm install
```

### Running the Desktop App

```bash
cd apps/desktop
pnpm dev:tauri
```

### Running the Mobile App

```bash
cd apps/mobile
pnpm start
```

## Documentation

For detailed information, please refer to the **[Wiki](./WIKI.md)**.

- **[User Guide](./USER_GUIDE.md)**
- **[Developer Guide](./DEVELOPER_GUIDE.md)**
- **[Architecture](./ARCHITECTURE.md)**
- **[Security](./SECURITY.md)**
- **[Issues](./ISSUES.md)** - Current known issues and workarounds.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
