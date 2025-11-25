# Noteece

![Build Status](https://img.shields.io/github/actions/workflow/status/noteece/noteece/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.1.0-purple.svg)

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
- **🤖 AI Integration:** Multiple LLM providers (Ollama, OpenAI, Claude, Gemini) with cost tracking.
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

All capture happens **on-device** using the Accessibility Service - no cloud required.

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
│   ├── core-rs/     # Rust core library
│   ├── types/       # Shared TypeScript types
│   ├── ui/          # Shared UI components
│   └── editor/      # Lexical editor wrapper
└── docs/            # Documentation
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

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
