# Noteece

![Build Status](https://img.shields.io/github/actions/workflow/status/noteece/noteece/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-purple.svg)

**Noteece** is a comprehensive, local-first workspace for your second brain. It combines encrypted note-taking, project management, and personal growth tracking into a single, beautiful application.

## 📚 Documentation

Detailed documentation is available in the **[Wiki](docs/wiki/00_Home.md)**.

- **[Architecture](docs/wiki/01_Architecture/01_Overview.md)**: System design, database, and sync protocol.
- **[Features](docs/wiki/02_Features/01_Notes_and_Knowledge.md)**: Guides for Notes, Projects, Habits, and more.
- **[Development](docs/wiki/03_Development/01_Setup.md)**: Setup, testing, and contribution guides.
- **[User Guide](docs/wiki/04_User_Guide/01_Getting_Started.md)**: Getting started and workflows.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Rust (Stable)
- pnpm

### Build & Run (Desktop)
```bash
# Install dependencies
pnpm install

# Run Desktop App (Dev Mode)
cd apps/desktop
pnpm dev:tauri
```

## ✨ Key Features

- **🔒 Private by Default:** AES-256 encryption at rest. Zero-knowledge architecture.
- **⚡ Local-First:** Works offline. Syncs peer-to-peer over WiFi.
- **📝 Markdown Centric:** First-class writing experience with backlinks and tags.
- **📊 Integrated Workflow:** Tasks, Projects, Habits, and Goals in one place.
- **📱 Mobile Companion:** React Native app for iOS and Android.
 - **🌐 Multi-Language:** Support for English, Spanish, French, German, Japanese, Chinese, and Farsi.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
