# Noteece

![Build Status](https://img.shields.io/github/actions/workflow/status/AmirrezaFarnamTaheri/Noteece/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.1.0-purple.svg)

**Noteece** is a comprehensive, local-first workspace for your second brain. It combines encrypted note-taking, project management, and personal growth tracking into a single, beautiful application.

## 📚 Documentation

The complete documentation is available in the **[Wiki](docs/wiki/WIKI.md)** and the **[Documentation Index](docs/DOCUMENTATION_INDEX.md)**.

- **[Getting Started](docs/wiki/WIKI.md)**: Concepts and glossary for new users
- **[Architecture](docs/architecture/ARCHITECTURE.md)**: System design and security model
- **[Features](docs/wiki/WIKI.md)**: Detailed feature guides and concepts
- **[Development](docs/development/CONTRIBUTING.md)**: Contributor guide, setup, and testing

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

- **🔒 Private by Default:** Encrypted at rest (XChaCha20-Poly1305 payloads, AES-256 key wrapping, SQLCipher database). Zero-knowledge architecture.
- **⚡ Local-First:** Works offline. Syncs peer-to-peer over WiFi.
- **📝 Markdown Centric:** First-class writing experience with backlinks and tags.
- **📊 Integrated Workflow:** Tasks, Projects, Habits, and Goals in one place.
- **📱 Mobile Companion:** React Native app for Android (iOS scaffolding planned).
- **🌐 Multi-Language:** i18n scaffold for English, Spanish, French, German, Japanese, Chinese, and Farsi (English strings shipped; additional locales in progress).
- **🤖 AI Integration:** LLM engine with multiple providers (Ollama, OpenAI, Claude, Gemini) and cost tracking (desktop settings wiring in progress).
- **🔮 Prime Mode:** Android "Cyborg-Life OS" with 30+ platform content capture.

## 🔮 Noteece Prime (Sideload)

The mobile app includes a "Prime" sideload flavor that enables **Sovereign Interception** - capturing content from 30+ platforms including:

| Category  | Platforms                                              |
| --------- | ------------------------------------------------------ |
| Social    | Twitter, Instagram, LinkedIn, Reddit, Facebook, TikTok |
| Messaging | Telegram, Discord, WhatsApp, Signal, Slack             |
| Dating    | Tinder, Bumble, Hinge, OkCupid                         |
| Browsers  | Chrome, Firefox, Brave, Edge                           |
| Media     | YouTube, Twitch, Spotify                               |

All capture happens **on-device** using the Accessibility Service - no cloud required. Prime is a separate sideload flavor: capture sessions start only on explicit user action, and because it reads screen content of third-party apps, users should review those platforms' terms of service and local law before enabling it. See [Privacy](docs/security/PRIVACY.md).

## 🤖 LLM Integration

Full-featured LLM integration with:

- **4 Providers:** Ollama (local), OpenAI, Claude, Gemini
- **Streaming:** Real-time token-by-token responses
- **Batch Processing:** Concurrent requests with rate limiting
- **Cost Tracking:** Per-request and aggregate cost monitoring
- **Auto-Retry:** Exponential backoff with circuit breaker
- **Priority Queues:** Request prioritization with aging

## 🏗️ Architecture

```
noteece/
├── apps/
│   ├── desktop/     # Tauri + React desktop app
│   └── mobile/      # Expo + React Native mobile app
├── packages/
│   ├── core-rs/     # Rust core library (crypto, sync, LLM, social)
│   ├── types/       # Shared TypeScript types
│   ├── ui/          # Shared UI components
│   ├── locale/      # i18n string resources
│   ├── modes/       # Mode system definitions
│   ├── automation-dsl/ # Automation scripting DSL
│   └── relay-server/   # Blind relay for P2P sync fallback
└── docs/            # Documentation
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](docs/development/CONTRIBUTING.md) (includes the Code of Conduct).

## 👤 Author

**Amirreza "Farnam" Taheri**

- Email: [taherifarnam@gmail.com](mailto:taherifarnam@gmail.com)
- GitHub: [@AmirrezaFarnamTaheri](https://github.com/AmirrezaFarnamTaheri)

## 📄 License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Desktop framework
- [Mantine](https://mantine.dev/) - React UI components
- [Expo](https://expo.dev/) - Mobile development platform
- [SQLCipher](https://www.zetetic.net/sqlcipher/) - Database encryption

---

**Created by Amirreza "Farnam" Taheri** | **Built with ❤️ using Rust, Tauri, React, and React Native**
