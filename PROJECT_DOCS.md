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
| [04. Daily Workflows](docs/project_docs/04_User_Guide/04_Daily_Workflows.md) | Recommended daily routines  |
| [05. Tips and Tricks](docs/project_docs/04_User_Guide/05_Tips_and_Tricks.md) | Power user techniques       |

---

## Security

Security is a core principle of Noteece:

- **Zero-Knowledge Architecture (desktop):** Encryption keys never leave your device. **Not yet true on mobile** — the React-Native data store is currently unencrypted at rest (`apps/mobile/src/lib/database.ts:585`); see [`STATUS.md`](STATUS.md).
- **Encryption at rest (desktop):** SQLCipher (AES-256) for the database, XChaCha20-Poly1305 for content. Mobile at-rest encryption is **not** implemented on the shipping React-Native path.
- **Key Derivation:** Vault keys are derived with **PBKDF2-HMAC-SHA512** (256k iterations, `packages/core-rs/src/crypto.rs:28`). **Argon2id** is used for password *authentication* hashing (`packages/core-rs/src/auth.rs:90-93`) and to wrap the mobile vault DEK.
- **P2P Sync (prototype):** Direct device-to-device transfer currently uses cleartext `ws://` and treats the peer as authenticated after ECDH without verifying a stable peer identity. A network attacker can therefore perform a man-in-the-middle attack. This path is **not production-safe** until authenticated transport, certificate/key verification, and a peer-identity binding are implemented. The optional internet relay is also a prototype and has separate deployment-hardening requirements.
- **Open Source:** AGPL-3.0 licensed, fully auditable

> Current security posture is documented in
> [`docs/audit_reports/FORENSIC_AUDIT_V2_2026-07-26.md`](docs/audit_reports/FORENSIC_AUDIT_V2_2026-07-26.md).
> The project is **not production ready**.

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
| Backend Modules     | ~160 (approximate) |
| React Components    | 120+     |
| Supported Platforms | 5        |
| Languages           | 7        |
| Widgets             | 8+       |

> No test-coverage figure is quoted here because no repository-wide coverage
> gate covers every package; `packages/ui` and `packages/types` still have no tests.

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

_Noteece Project Documentation - last reviewed 2026-07-29_