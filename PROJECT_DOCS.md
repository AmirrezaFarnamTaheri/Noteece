# Noteece Project Documentation

Welcome to the official technical documentation for **Noteece** - a local-first, end-to-end encrypted workspace for your second brain.

For the Encyclopedical Wiki (Concepts, Glossary, Methodology), see [The Noteece Encyclopedia](docs/wiki/WIKI.md).

**Version:** 1.1.0
**Author:** Amirreza "Farnam" Taheri
**License:** AGPL-3.0

---

## Quick Links

| Topic                                                                    | Description               |
| ------------------------------------------------------------------------ | ------------------------- |
| [Getting Started](docs/project_docs/04_User_Guide/01_Getting_Started.md) | First steps for new users |
| [Dashboard Guide](docs/project_docs/04_User_Guide/02_Dashboard.md)       | Customize your workspace  |
| [Settings Guide](docs/project_docs/04_User_Guide/03_Settings.md)         | Configure Noteece         |
| [Architecture](docs/project_docs/01_Architecture/01_Overview.md)         | Technical deep-dive       |
| [Development Setup](docs/project_docs/03_Development/01_Setup.md)        | Contributor guide         |

---

## Architecture

Understanding the system.

| Document                                                                             | Description                              |
| ------------------------------------------------------------------------------------ | ---------------------------------------- |
| [01. System Overview](docs/project_docs/01_Architecture/01_Overview.md)              | The monorepo, Tauri, and Rust core       |
| [02. Database & Schema](docs/project_docs/01_Architecture/02_Database.md)            | SQLite, SQLCipher, and table definitions |
| [03. Sync Protocol](docs/project_docs/01_Architecture/03_Sync_Protocol.md)           | P2P sync, encryption, and discovery      |
| [04. Security Model](docs/project_docs/01_Architecture/04_Security.md)               | Threat model and encryption              |
| [05. Vector Clocks](docs/project_docs/01_Architecture/05_Vector_Clocks.md)           | Distributed conflict resolution          |
| [06. Search Engine](docs/project_docs/01_Architecture/06_Search_Engine.md)           | FTS5 + hybrid fallback                   |
| [07. LLM Integration](docs/project_docs/01_Architecture/07_LLM_Integration.md)       | AI provider architecture                 |
| [08. Prime Interception](docs/project_docs/01_Architecture/08_Prime_Interception.md) | Mobile content capture                   |
| [09. Security Hardening](docs/project_docs/01_Architecture/09_Security_Hardening.md) | Security measures (v1.1.0)               |
| [10. Sync Architecture](docs/project_docs/01_Architecture/10_Sync_Architecture.md)   | P2P sync deep dive                       |
| [11. Blind Relay](docs/project_docs/01_Architecture/11_Blind_Relay.md)               | Internet sync without cloud trust        |
| [12. TOFU Authentication](docs/project_docs/01_Architecture/12_TOFU.md)              | Trust On First Use                       |

## Features

User guides and functional specifications.

| Document                                                                         | Description                         |
| -------------------------------------------------------------------------------- | ----------------------------------- |
| [01. Notes & Knowledge](docs/project_docs/02_Features/01_Notes_and_Knowledge.md) | Markdown editor, backlinks, tags    |
| [02. Project Hub](docs/project_docs/02_Features/02_Project_Hub.md)               | Projects, milestones, kanban        |
| [03. Personal Growth](docs/project_docs/02_Features/03_Personal_Growth.md)       | Habits, goals, health metrics       |
| [04. Social Suite](docs/project_docs/02_Features/04_Social_Suite.md)             | Social media aggregation            |
| [05. Automation](docs/project_docs/02_Features/05_Automation.md)                 | Workflow automation                 |
| [06. Import & Export](docs/project_docs/02_Features/06_Import_Export.md)         | Data portability                    |
| [07. Keyboard Shortcuts](docs/project_docs/02_Features/07_Shortcuts.md)          | Power user productivity             |
| [08. Advanced Search](docs/project_docs/02_Features/08_Advanced_Search.md)       | Full-text search and filters        |
| [09. AI Assistant](docs/project_docs/02_Features/09_AI_Assistant.md)             | Local and cloud AI features         |
| [10. Dashboard Widgets](docs/project_docs/02_Features/10_Widgets.md)             | Life Balance, Gamification, Finance |
| [11. AI RAG & Chat](docs/project_docs/02_Features/11_AI_RAG.md)                  | Chat with your Vault                |
| [12. Temporal Analysis](docs/project_docs/02_Features/12_Temporal_Analysis.md)   | Correlations & Pattern Detection    |

## Development

Guides for contributors.

| Document                                                                            | Description                    |
| ----------------------------------------------------------------------------------- | ------------------------------ |
| [01. Setup Guide](docs/project_docs/03_Development/01_Setup.md)                     | Development environment        |
| [02. Testing Strategy](docs/project_docs/03_Development/02_Testing.md)              | Unit, integration, E2E testing |
| [03. Release Process](docs/project_docs/03_Development/03_Release_Process.md)       | Versioning and CI/CD           |
| [04. Rust Guidelines](docs/project_docs/03_Development/04_Rust_Guidelines.md)       | Rust coding standards          |
| [05. Frontend Patterns](docs/project_docs/03_Development/05_Frontend_Patterns.md)   | React and Tauri patterns       |
| [06. Mobile Development](docs/project_docs/03_Development/06_Mobile_Development.md) | Expo and React Native          |
| [07. Monorepo Structure](docs/project_docs/03_Development/07_Monorepo_Structure.md) | Package organization           |
| [08. API Reference](docs/project_docs/03_Development/08_API_Reference.md)           | Command and hook APIs          |

## User Guide

| Document                                                                     | Description                 |
| ---------------------------------------------------------------------------- | --------------------------- |
| [01. Getting Started](docs/project_docs/04_User_Guide/01_Getting_Started.md) | First-time user orientation |
| [02. Dashboard](docs/project_docs/04_User_Guide/02_Dashboard.md)             | Dashboard customization     |
| [03. Settings](docs/project_docs/04_User_Guide/03_Settings.md)               | Application settings        |

---

## Security

Security is a core principle of Noteece:

- **Zero-Knowledge Architecture:** Encryption keys never leave your devices
- **AES-256 Encryption:** Military-grade encryption at rest
- **Argon2id Key Derivation:** State-of-the-art password hashing
- **P2P Sync:** No central server, direct device-to-device transfer
- **Open Source:** AGPL-3.0 licensed, fully auditable

## Supported Languages

Noteece is available in 7 languages:

| Code | Language | Direction |
| ---- | -------- | --------- |
| en   | English  | LTR       |
| es   | Spanish  | LTR       |
| fr   | French   | LTR       |
| de   | German   | LTR       |
| ja   | Japanese | LTR       |
| zh   | Chinese  | LTR       |
| fa   | Persian  | RTL       |

## Platforms

| Platform | Application           |
| -------- | --------------------- |
| Windows  | Desktop (Tauri)       |
| macOS    | Desktop (Tauri)       |
| Linux    | Desktop (Tauri)       |
| iOS      | Mobile (Expo)         |
| Android  | Mobile (Expo) + Prime |

## Project Statistics

| Metric              | Value    |
| ------------------- | -------- |
| Version             | 1.1.0    |
| License             | AGPL-3.0 |
| Backend Modules     | 160+     |
| React Components    | 120+     |
| Test Coverage       | 92%+     |
| Supported Platforms | 5        |
| Languages           | 7        |
| Widgets             | 8+       |

---

## Contributing

We welcome contributions! See our [Contributing Guide](docs/development/CONTRIBUTING.md) for:

- Code of Conduct
- Development setup
- Pull request process
- Coding standards

## Support

- **Issues:** [GitHub Issues](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions)
- **Security:** See [SECURITY.md](docs/security/SECURITY.md) for vulnerability reporting

---

## Credits

**Author:** Amirreza "Farnam" Taheri
**Email:** taherifarnam@gmail.com
**GitHub:** [@AmirrezaFarnamTaheri](https://github.com/AmirrezaFarnamTaheri)

---

_Noteece Project Documentation - November 2024_
