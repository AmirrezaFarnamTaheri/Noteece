# Noteece Documentation Index

**Version:** 1.1.0
**Author:** Amirreza "Farnam" Taheri
**Last Updated:** July 2026

---

## Quick Navigation

| Category            | Description       | Location                                                                     |
| ------------------- | ----------------- | ---------------------------------------------------------------------------- |
| **Getting Started** | New user guide    | [Getting Started](project_docs/04_User_Guide/01_Getting_Started.md)          |
| **Architecture**    | System design     | [Architecture Overview](project_docs/01_Architecture/01_Overview.md)         |
| **Features**        | Feature guides    | [Notes & Knowledge](project_docs/02_Features/01_Notes_and_Knowledge.md)      |
| **Development**     | Contributor guide | [Development Setup](project_docs/03_Development/01_Setup.md)                 |
| **Security**        | Security model    | [Security](security/SECURITY.md)                                             |
| **Encyclopedia**    | Concepts/glossary | [Wiki](wiki/WIKI.md)                                                         |

---

## Documentation Structure

```
docs/
├── DOCUMENTATION_INDEX.md  # This file
│
├── project_docs/           # PRIMARY documentation set (39 files)
│   ├── 00_Home.md
│   ├── 01_Architecture/    # 12 numbered docs + ISSUES_RESOLVED.md
│   ├── 02_Features/        # 12 feature docs
│   ├── 03_Development/     # 8 development docs
│   └── 04_User_Guide/      # 5 user guides
│
├── architecture/           # Standalone architecture documents
│   ├── ARCHITECTURE.md
│   ├── FORESIGHT_2.0_ARCHITECTURE.md
│   ├── MOBILE_SYNC_ARCHITECTURE.md
│   └── README.md
│
├── development/            # Developer resources
│   ├── CONTRIBUTING.md
│   ├── DEVELOPER_GUIDE.md
│   ├── CODE_REVIEW_GUIDE.md
│   ├── TESTING_STRATEGY.md
│   ├── TEST_COVERAGE.md
│   ├── LINT_QUICK_REFERENCE.md
│   └── README.md
│
├── user/                   # End-user documentation
│   ├── QUICK_START.md
│   ├── INSTALLATION.md
│   ├── INSTALLATION_SCRIPTS.md
│   ├── SIMPLE_INSTALLATION_GUIDE.md
│   ├── USER_GUIDE.md
│   ├── EXPORTING.md
│   ├── RESTORING.md
│   └── README.md
│
├── security/               # Security and legal documentation
│   ├── SECURITY.md
│   ├── SECURITY_AUDIT.md
│   ├── PRIVACY.md
│   ├── TERMS.md
│   ├── LEGAL_REVIEW_CHECKLIST.md
│   ├── LICENSE_REVIEW.md
│   └── README.md
│
├── project/                # Project management
│   ├── BUILD.md
│   ├── CHANGELOG.md
│   ├── ISSUES.md
│   ├── NEXT_STEPS.md
│   ├── PLAN.md
│   ├── PROGRESS.md
│   └── STATUS.md
│
├── audit_reports/          # Forensic audit (2026-07-26) and phase reports
│   ├── FORENSIC_AUDIT_2026-07-26.md
│   ├── AUDIT_ROADMAP.md
│   └── PHASE_0..PHASE_7 reports
│
├── reports/archive/        # Historical status reports
│
├── archive/                # Superseded social-media-suite documents
│
└── wiki/                   # Encyclopedia: concepts and glossary
    ├── WIKI.md
    ├── 01_Concepts/        # 5 concept pages
    ├── 02_Glossary/        # Term glossary
    ├── 01_Architecture/    # Stale forks (see project_docs for current)
    └── 03_Development/     # Ad-hoc engineering notes
```

> **Note:** `docs/wiki/01_Architecture/` contains five older forks (04, 05, 06, 08, 10) of
> architecture pages that are superseded by `docs/project_docs/01_Architecture/`. Treat
> `project_docs/` as the source of truth.

---

## Primary Documentation (`project_docs/`)

### 01. Architecture (12 Documents)

| Document                                                                        | Description                            |
| ------------------------------------------------------------------------------- | -------------------------------------- |
| [01. Overview](project_docs/01_Architecture/01_Overview.md)                     | System architecture and components     |
| [02. Database](project_docs/01_Architecture/02_Database.md)                     | SQLite schema and SQLCipher encryption |
| [03. Sync Protocol](project_docs/01_Architecture/03_Sync_Protocol.md)           | P2P sync and conflict resolution       |
| [04. Security](project_docs/01_Architecture/04_Security.md)                     | Threat model and encryption            |
| [05. Vector Clocks](project_docs/01_Architecture/05_Vector_Clocks.md)           | Distributed conflict detection         |
| [06. Search Engine](project_docs/01_Architecture/06_Search_Engine.md)           | FTS5 and hybrid search                 |
| [07. LLM Integration](project_docs/01_Architecture/07_LLM_Integration.md)       | AI provider architecture               |
| [08. Prime Interception](project_docs/01_Architecture/08_Prime_Interception.md) | Mobile content capture                 |
| [09. Security Hardening](project_docs/01_Architecture/09_Security_Hardening.md) | Hardening measures                     |
| [10. Sync Architecture](project_docs/01_Architecture/10_Sync_Architecture.md)   | P2P sync deep dive                     |
| [11. Blind Relay](project_docs/01_Architecture/11_Blind_Relay.md)               | Internet sync without cloud trust      |
| [12. TOFU](project_docs/01_Architecture/12_TOFU.md)                             | Trust On First Use authentication      |
| [Issues Resolved](project_docs/01_Architecture/ISSUES_RESOLVED.md)              | Architectural decisions log            |

### 02. Features (12 Documents)

| Document                                                                | Description                         |
| ----------------------------------------------------------------------- | ----------------------------------- |
| [01. Notes & Knowledge](project_docs/02_Features/01_Notes_and_Knowledge.md) | Note-taking features             |
| [02. Project Hub](project_docs/02_Features/02_Project_Hub.md)           | Project management                  |
| [03. Personal Growth](project_docs/02_Features/03_Personal_Growth.md)   | Habits, goals, health               |
| [04. Social Suite](project_docs/02_Features/04_Social_Suite.md)         | Social media aggregation            |
| [05. Automation](project_docs/02_Features/05_Automation.md)             | Workflow automation                 |
| [06. Import/Export](project_docs/02_Features/06_Import_Export.md)       | Data portability                    |
| [07. Shortcuts](project_docs/02_Features/07_Shortcuts.md)               | Keyboard shortcuts                  |
| [08. Advanced Search](project_docs/02_Features/08_Advanced_Search.md)   | Search capabilities                 |
| [09. AI Assistant](project_docs/02_Features/09_AI_Assistant.md)         | AI-powered features                 |
| [10. Widgets](project_docs/02_Features/10_Widgets.md)                   | Life Balance, Gamification, Finance |
| [11. AI RAG & Chat](project_docs/02_Features/11_AI_RAG.md)              | Chat with your vault                |
| [12. Temporal Analysis](project_docs/02_Features/12_Temporal_Analysis.md) | Correlations and pattern detection |

### 03. Development (8 Documents)

| Document                                                                     | Description             |
| ---------------------------------------------------------------------------- | ----------------------- |
| [01. Setup](project_docs/03_Development/01_Setup.md)                         | Development environment |
| [02. Testing](project_docs/03_Development/02_Testing.md)                     | Testing strategy        |
| [03. Release](project_docs/03_Development/03_Release_Process.md)             | Release process         |
| [04. Rust Guidelines](project_docs/03_Development/04_Rust_Guidelines.md)     | Rust coding standards   |
| [05. Frontend Patterns](project_docs/03_Development/05_Frontend_Patterns.md) | React patterns          |
| [06. Mobile](project_docs/03_Development/06_Mobile_Development.md)           | Mobile development      |
| [07. Monorepo](project_docs/03_Development/07_Monorepo_Structure.md)         | Package organization    |
| [08. API Reference](project_docs/03_Development/08_API_Reference.md)         | Command and hook APIs   |

### 04. User Guide (5 Documents)

| Document                                                                 | Description                |
| ------------------------------------------------------------------------ | -------------------------- |
| [01. Getting Started](project_docs/04_User_Guide/01_Getting_Started.md)  | First-time user guide      |
| [02. Dashboard](project_docs/04_User_Guide/02_Dashboard.md)              | Dashboard customization    |
| [03. Settings](project_docs/04_User_Guide/03_Settings.md)                | Application settings       |
| [04. Daily Workflows](project_docs/04_User_Guide/04_Daily_Workflows.md)  | Recommended daily routines |
| [05. Tips and Tricks](project_docs/04_User_Guide/05_Tips_and_Tricks.md)  | Power user techniques      |

---

## Encyclopedia (`wiki/`)

| Document                                                | Description                        |
| ------------------------------------------------------- | ---------------------------------- |
| [Wiki Home](wiki/WIKI.md)                               | Encyclopedia entry point           |
| [Local-First Software](wiki/01_Concepts/01_Local_First.md) | Local-first design philosophy   |
| [End-to-End Encryption](wiki/01_Concepts/02_E2EE.md)    | E2EE primer                        |
| [CRDTs](wiki/01_Concepts/03_CRDTs.md)                   | Conflict-free replicated data types |
| [Zettelkasten](wiki/01_Concepts/04_Zettelkasten.md)     | Zettelkasten method                |
| [PARA](wiki/01_Concepts/05_PARA.md)                     | PARA organisation method           |
| [Glossary](wiki/02_Glossary/01_Terms.md)                | Terminology reference              |

### Engineering Notes (`wiki/03_Development/`)

- [E2E Testing](wiki/03_Development/E2E_Testing.md)
- [Mobile Coverage](wiki/03_Development/Mobile_Coverage.md)
- [Security Audit](wiki/03_Development/Security_Audit.md)
- [Ubuntu 24.04 Build Fix](wiki/03_Development/Ubuntu_24_04_Build_Fix.md)

---

## Key Documents

### For New Users

1. [Quick Start](user/QUICK_START.md)
2. [Installation Guide](user/INSTALLATION.md)
3. [User Guide](user/USER_GUIDE.md)

### For Developers

1. [Contributing Guide](development/CONTRIBUTING.md)
2. [Developer Guide](development/DEVELOPER_GUIDE.md)
3. [Testing Strategy](development/TESTING_STRATEGY.md)
4. [Code Review Guide](development/CODE_REVIEW_GUIDE.md)

### For Security Review

1. [Security Model](security/SECURITY.md)
2. [Privacy Policy](security/PRIVACY.md)
3. [Security Audit](security/SECURITY_AUDIT.md)
4. [Legal Review Checklist](security/LEGAL_REVIEW_CHECKLIST.md)

### Audit and History

1. [Forensic Audit 2026-07-26](audit_reports/FORENSIC_AUDIT_2026-07-26.md)
2. [Audit Roadmap](audit_reports/AUDIT_ROADMAP.md)
3. [Archived Development Reports](reports/archive/ARCHIVED_DEVELOPMENT_REPORTS.md)
4. [Implementation Status](reports/archive/IMPLEMENTATION_STATUS.md)
5. [Code Quality Report](reports/archive/CODE_QUALITY_REPORT.md)
6. [Final Project Completion Report](reports/archive/FINAL_PROJECT_COMPLETION_REPORT.md)

---

## Project Stats

| Metric              | Value                               |
| ------------------- | ----------------------------------- |
| Version             | 1.1.0                               |
| License             | AGPL-3.0                            |
| Platforms           | Windows, macOS, Linux, iOS, Android |
| Languages           | 7 supported                         |
| `project_docs` pages | 39                                  |

---

## Credits

**Author:** Amirreza "Farnam" Taheri
**Email:** taherifarnam@gmail.com
**GitHub:** [@AmirrezaFarnamTaheri](https://github.com/AmirrezaFarnamTaheri)

---

_Documentation index for Noteece v1.1.0_
