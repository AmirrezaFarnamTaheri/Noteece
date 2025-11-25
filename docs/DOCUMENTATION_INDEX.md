# Noteece Documentation Index

**Version:** 1.1.0  
**Author:** Amirreza "Farnam" Taheri  
**Last Updated:** November 2025

---

## Quick Navigation

| Category            | Description       | Location                                                          |
| ------------------- | ----------------- | ----------------------------------------------------------------- |
| **Getting Started** | New user guide    | [Wiki: Getting Started](wiki/04_User_Guide/01_Getting_Started.md) |
| **Architecture**    | System design     | [Wiki: Architecture](wiki/01_Architecture/01_Overview.md)         |
| **Features**        | Feature guides    | [Wiki: Features](wiki/02_Features/01_Notes_and_Knowledge.md)      |
| **Development**     | Contributor guide | [Wiki: Development](wiki/03_Development/01_Setup.md)              |
| **Security**        | Security model    | [Security](security/SECURITY.md)                                  |

---

## Documentation Structure

```
docs/
├── architecture/           # System architecture documents
│   ├── ARCHITECTURE.md
│   ├── FORESIGHT_2.0_ARCHITECTURE.md
│   └── MOBILE_SYNC_ARCHITECTURE.md
│
├── development/            # Developer resources
│   ├── CONTRIBUTING.md
│   ├── DEVELOPER_GUIDE.md
│   ├── TEST_COVERAGE.md
│   └── TESTING_STRATEGY.md
│
├── project/                # Project management
│   ├── CHANGELOG.md
│   ├── ISSUES.md
│   ├── PLAN.md
│   ├── STATUS.md
│   └── PROGRESS.md
│
├── reports/                # Status reports
│   ├── FINAL_PROJECT_COMPLETION_REPORT.md
│   ├── CODE_QUALITY_REPORT.md
│   └── IMPLEMENTATION_STATUS.md
│
├── security/               # Security documentation
│   ├── SECURITY.md
│   ├── PRIVACY.md
│   └── SECURITY_AUDIT.md
│
├── user/                   # End-user documentation
│   ├── USER_GUIDE.md
│   ├── INSTALLATION.md
│   └── QUICK_START.md
│
└── wiki/                   # Comprehensive wiki
    ├── 00_Home.md
    ├── 01_Architecture/    # 8 architecture docs
    ├── 02_Features/        # 9 feature docs
    ├── 03_Development/     # 7 development docs
    └── 04_User_Guide/      # User guides
```

---

## Wiki Contents

### 01. Architecture (8 Documents)

| Document                                                                | Description                            |
| ----------------------------------------------------------------------- | -------------------------------------- |
| [01. Overview](wiki/01_Architecture/01_Overview.md)                     | System architecture and components     |
| [02. Database](wiki/01_Architecture/02_Database.md)                     | SQLite schema and SQLCipher encryption |
| [03. Sync Protocol](wiki/01_Architecture/03_Sync_Protocol.md)           | P2P sync and conflict resolution       |
| [04. Security](wiki/01_Architecture/04_Security.md)                     | Threat model and encryption            |
| [05. Vector Clocks](wiki/01_Architecture/05_Vector_Clocks.md)           | Distributed conflict detection         |
| [06. Search Engine](wiki/01_Architecture/06_Search_Engine.md)           | FTS5 and hybrid search                 |
| [07. LLM Integration](wiki/01_Architecture/07_LLM_Integration.md)       | AI provider architecture               |
| [08. Prime Interception](wiki/01_Architecture/08_Prime_Interception.md) | Mobile content capture                 |

### 02. Features (9 Documents)

| Document                                                            | Description              |
| ------------------------------------------------------------------- | ------------------------ |
| [01. Notes & Knowledge](wiki/02_Features/01_Notes_and_Knowledge.md) | Note-taking features     |
| [02. Project Hub](wiki/02_Features/02_Project_Hub.md)               | Project management       |
| [03. Personal Growth](wiki/02_Features/03_Personal_Growth.md)       | Habits, goals, health    |
| [04. Social Suite](wiki/02_Features/04_Social_Suite.md)             | Social media aggregation |
| [05. Automation](wiki/02_Features/05_Automation.md)                 | Workflow automation      |
| [06. Import/Export](wiki/02_Features/06_Import_Export.md)           | Data portability         |
| [07. Shortcuts](wiki/02_Features/07_Shortcuts.md)                   | Keyboard shortcuts       |
| [08. Advanced Search](wiki/02_Features/08_Advanced_Search.md)       | Search capabilities      |
| [09. AI Assistant](wiki/02_Features/09_AI_Assistant.md)             | AI-powered features      |

### 03. Development (7 Documents)

| Document                                                             | Description             |
| -------------------------------------------------------------------- | ----------------------- |
| [01. Setup](wiki/03_Development/01_Setup.md)                         | Development environment |
| [02. Testing](wiki/03_Development/02_Testing.md)                     | Testing strategy        |
| [03. Release](wiki/03_Development/03_Release_Process.md)             | Release process         |
| [04. Rust Guidelines](wiki/03_Development/04_Rust_Guidelines.md)     | Rust coding standards   |
| [05. Frontend Patterns](wiki/03_Development/05_Frontend_Patterns.md) | React patterns          |
| [06. Mobile](wiki/03_Development/06_Mobile_Development.md)           | Mobile development      |
| [07. Monorepo](wiki/03_Development/07_Monorepo_Structure.md)         | Package organization    |

### 04. User Guide

| Document                                                        | Description           |
| --------------------------------------------------------------- | --------------------- |
| [01. Getting Started](wiki/04_User_Guide/01_Getting_Started.md) | First-time user guide |

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

### For Security Review

1. [Security Model](security/SECURITY.md)
2. [Privacy Policy](security/PRIVACY.md)
3. [Security Audit](security/SECURITY_AUDIT.md)

---

## Project Stats

| Metric        | Value                               |
| ------------- | ----------------------------------- |
| Version       | 1.1.0                               |
| License       | AGPL-3.0                            |
| Platforms     | Windows, macOS, Linux, iOS, Android |
| Languages     | 7 supported                         |
| Wiki Docs     | 25+ pages                           |
| Test Coverage | 90%+                                |

---

## Credits

**Author:** Amirreza "Farnam" Taheri  
**Email:** taherifarnam@gmail.com  
**GitHub:** [@AmirrezaFarnamTaheri](https://github.com/AmirrezaFarnamTaheri)

---

_Documentation index for Noteece v1.1.0_
