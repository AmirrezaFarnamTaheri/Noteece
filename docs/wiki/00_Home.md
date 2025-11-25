# Noteece Wiki

Welcome to the official documentation for **Noteece** - a local-first, end-to-end encrypted workspace for your second brain.

**Version:** 1.1.0  
**Author:** Amirreza "Farnam" Taheri  
**License:** AGPL-3.0

---

## Quick Links

| Topic | Description |
|-------|-------------|
| [Getting Started](04_User_Guide/01_Getting_Started.md) | First steps for new users |
| [Dashboard Guide](04_User_Guide/02_Dashboard.md) | Customize your workspace |
| [Settings Guide](04_User_Guide/03_Settings.md) | Configure Noteece |
| [Architecture](01_Architecture/01_Overview.md) | Technical deep-dive |
| [Development Setup](03_Development/01_Setup.md) | Contributor guide |

---

## Architecture

Understanding the system.

| Document | Description |
|----------|-------------|
| [01. System Overview](01_Architecture/01_Overview.md) | The monorepo, Tauri, and Rust core |
| [02. Database & Schema](01_Architecture/02_Database.md) | SQLite, SQLCipher, and table definitions |
| [03. Sync Protocol](01_Architecture/03_Sync_Protocol.md) | P2P sync, encryption, and discovery |
| [04. Security Model](01_Architecture/04_Security.md) | Threat model and encryption |
| [05. Vector Clocks](01_Architecture/05_Vector_Clocks.md) | Distributed conflict resolution |
| [06. Search Engine](01_Architecture/06_Search_Engine.md) | FTS5 + hybrid fallback |
| [07. LLM Integration](01_Architecture/07_LLM_Integration.md) | AI provider architecture |
| [08. Prime Interception](01_Architecture/08_Prime_Interception.md) | Mobile content capture |

## Features

User guides and functional specifications.

| Document | Description |
|----------|-------------|
| [01. Notes & Knowledge](02_Features/01_Notes_and_Knowledge.md) | Markdown editor, backlinks, tags |
| [02. Project Hub](02_Features/02_Project_Hub.md) | Projects, milestones, kanban |
| [03. Personal Growth](02_Features/03_Personal_Growth.md) | Habits, goals, health metrics |
| [04. Social Suite](02_Features/04_Social_Suite.md) | Social media aggregation |
| [05. Automation](02_Features/05_Automation.md) | Workflow automation |
| [06. Import & Export](02_Features/06_Import_Export.md) | Data portability |
| [07. Keyboard Shortcuts](02_Features/07_Shortcuts.md) | Power user productivity |
| [08. Advanced Search](02_Features/08_Advanced_Search.md) | Full-text search and filters |
| [09. AI Assistant](02_Features/09_AI_Assistant.md) | Local and cloud AI features |

## Development

Guides for contributors.

| Document | Description |
|----------|-------------|
| [01. Setup Guide](03_Development/01_Setup.md) | Development environment |
| [02. Testing Strategy](03_Development/02_Testing.md) | Unit, integration, E2E testing |
| [03. Release Process](03_Development/03_Release_Process.md) | Versioning and CI/CD |
| [04. Rust Guidelines](03_Development/04_Rust_Guidelines.md) | Rust coding standards |
| [05. Frontend Patterns](03_Development/05_Frontend_Patterns.md) | React and Tauri patterns |
| [06. Mobile Development](03_Development/06_Mobile_Development.md) | Expo and React Native |
| [07. Monorepo Structure](03_Development/07_Monorepo_Structure.md) | Package organization |
| [08. API Reference](03_Development/08_API_Reference.md) | Command and hook APIs |

## User Guide

| Document | Description |
|----------|-------------|
| [01. Getting Started](04_User_Guide/01_Getting_Started.md) | First-time user orientation |
| [02. Dashboard](04_User_Guide/02_Dashboard.md) | Dashboard customization |
| [03. Settings](04_User_Guide/03_Settings.md) | Application settings |

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
|------|----------|-----------|
| en | English | LTR |
| es | Spanish | LTR |
| fr | French | LTR |
| de | German | LTR |
| ja | Japanese | LTR |
| zh | Chinese | LTR |
| fa | Persian | RTL |

## Platforms

| Platform | Application |
|----------|-------------|
| Windows | Desktop (Tauri) |
| macOS | Desktop (Tauri) |
| Linux | Desktop (Tauri) |
| iOS | Mobile (Expo) |
| Android | Mobile (Expo) + Prime |

## Project Statistics

| Metric | Value |
|--------|-------|
| Version | 1.1.0 |
| License | AGPL-3.0 |
| Backend Modules | 150+ |
| React Components | 100+ |
| Test Coverage | 92%+ |
| Supported Platforms | 5 |

---

## Contributing

We welcome contributions! See our [Contributing Guide](../development/CONTRIBUTING.md) for:

- Code of Conduct
- Development setup
- Pull request process
- Coding standards

## Support

- **Issues:** [GitHub Issues](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
- **Discussions:** [GitHub Discussions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions)
- **Security:** See [SECURITY.md](../security/SECURITY.md) for vulnerability reporting

---

## Credits

**Author:** Amirreza "Farnam" Taheri  
**Email:** taherifarnam@gmail.com  
**GitHub:** [@AmirrezaFarnamTaheri](https://github.com/AmirrezaFarnamTaheri)

---

*Noteece Wiki - November 2025*
