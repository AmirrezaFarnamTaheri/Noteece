# Noteece

![Build Status](https://img.shields.io/github/actions/workflow/status/AmirrezaFarnamTaheri/Noteece/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-1.1.0-purple.svg)

**Noteece** is a comprehensive, local-first workspace for your second brain. It combines encrypted note-taking, project management, and personal growth tracking into a single, beautiful application.

## 📚 Documentation

The full documentation set lives in **[docs/project_docs/](docs/project_docs/00_Home.md)**. Supplementary concept and glossary pages are in the **[Encyclopedia](docs/wiki/WIKI.md)**.

- **[Getting Started](docs/project_docs/04_User_Guide/01_Getting_Started.md)**: First steps for new users
- **[Architecture](docs/project_docs/01_Architecture/01_Overview.md)**: System design and security model
- **[Features](docs/project_docs/02_Features/01_Notes_and_Knowledge.md)**: Detailed feature guides
- **[Development](docs/project_docs/03_Development/01_Setup.md)**: Contributor guide and setup

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

- **🔒 Private by Default (Desktop):** The desktop vault is encrypted at rest with SQLCipher (AES-256-CBC + HMAC-SHA512) and note content is sealed with XChaCha20-Poly1305; keys never leave your device. **Note:** the mobile app currently stores its local database unencrypted (see `apps/mobile/src/lib/database.ts`) — rely on device-level full-disk encryption there.
- **⚡ Local-First:** Works offline. Syncs peer-to-peer over WiFi.
- **📝 Markdown Centric:** First-class writing experience with backlinks and tags.
- **📊 Integrated Workflow:** Tasks, Projects, Habits, and Goals in one place.
- **📱 Mobile Companion:** React Native app for iOS and Android.
- **🌐 Multi-Language:** Support for English, Spanish, French, German, Japanese, Chinese, and Farsi.
- **🤖 AI Integration:** Multiple LLM providers (Ollama, OpenAI, Claude, Gemini) with cost tracking.
- **🔮 Prime Mode (sideload):** Android "Cyborg-Life OS" with 30+ platform content capture. Opt-in only, and subject to the legal caveats below.

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

> **⚠️ Legal and consent notice.** Sovereign Interception reads on-screen content from third-party apps, which includes messages, posts, and profiles authored by **other people** who have not consented to being recorded. Depending on your jurisdiction this may implicate wiretapping/interception laws, two-party consent rules, data-protection law (e.g. GDPR — you become a controller of other people's personal data), and the terms of service of the captured apps. Prime is distributed as a sideload flavor and is **not** available through app stores. You are solely responsible for determining whether your use is lawful, for obtaining any consent required, and for safeguarding and deleting captured third-party data. Do not enable Prime to monitor another person's device or communications without their knowledge.

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
│   ├── automation-dsl/  # Automation rule language
│   ├── core-rs/         # Rust core library
│   ├── locale/          # i18n message catalogs
│   ├── modes/           # Workspace mode definitions
│   ├── relay-server/    # Blind relay for internet sync
│   ├── types/           # Shared TypeScript types
│   └── ui/              # Shared UI components
└── docs/                # Documentation
```

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](docs/development/CONTRIBUTING.md) and the [Code Review Guide](docs/development/CODE_REVIEW_GUIDE.md).

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
