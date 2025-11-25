# Changelog

All notable changes to Noteece are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - November 2025

### Added
- **Control Panel Enhanced:** Presets (Minimal, Productivity, Health, Power User), search, quick actions
- **Internationalization:** Full i18n support for desktop app (7 languages)
- **Dark Mode Sync:** OS preference synchronization
- **Local AI Integration:** Ollama provider with chat interface
- **AI Settings:** Complete AI provider configuration UI
- **Social Config Service:** WebView content capture integration
- **JSI Bridge:** High-performance mobile sync via C++/Rust bridge
- **Mobile FFI:** Rust foreign function interface for mobile platforms
- **Health Mode Components:** Modular health tracking panels
- **Spaced Repetition Components:** Review stats and card creation modals
- **LLM Architecture Docs:** Comprehensive LLM integration documentation
- **Prime Architecture Docs:** Sovereign Interception documentation
- **AI Assistant Guide:** Feature guide for AI capabilities

### Changed
- **Test Coverage:** Improved from 85% to 90%+
- **Monolithic Files:** Broken down files over 400 lines
- **Theme Store:** Added OS preference listening and sync
- **Wiki Structure:** Consolidated and cleaned up redundant files
- **Credits:** Updated author information throughout
- **Package Versions:** Updated to 1.1.0 across all packages

### Fixed
- **Control Panel Store:** Fixed widget toggle persistence
- **Theme Initialization:** Fixed initial theme application on load
- **i18n Direction:** Fixed RTL language support for Persian

### Removed
- **Deprecated Files:** Removed old SyncStatus.tsx (replaced by refactored version)
- **Redundant Wiki Files:** Removed duplicate wiki documents
- **Old Reports:** Consolidated archived development reports

---

## [1.0.0] - November 2025

### Added
- **Desktop Application:** Tauri v2 + React production release
- **Mobile Application:** Expo + React Native for iOS/Android
- **Noteece Prime:** Android meta-layer with 30+ platform support
- **Rust Core:** Shared business logic library
- **LLM Integration:** Ollama, OpenAI, Claude, Gemini providers
- **P2P Sync:** Encrypted device-to-device synchronization
- **Full-Text Search:** FTS5 with hybrid fallback
- **OCR Integration:** On-device text extraction
- **Spaced Repetition:** SM-2 algorithm implementation
- **CalDAV Sync:** Two-way calendar synchronization
- **Social Suite:** Multi-platform content aggregation
- **Correlation Engine:** Cross-module insight generation

### Security
- AES-256 encryption at rest (SQLCipher)
- Argon2id key derivation
- ECDH key exchange for sync
- Zero-knowledge architecture

---

## [0.9.0] - October 2025

### Added
- Initial beta release
- Core note-taking functionality
- Basic task management
- Project hub foundation
- Sync infrastructure

---

## Credits

**Author:** Amirreza "Farnam" Taheri  
**Email:** taherifarnam@gmail.com  
**License:** AGPL-3.0

---

*Noteece - Your Second Brain*
