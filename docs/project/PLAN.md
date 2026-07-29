# Noteece Project Plan

**Version:** 1.1.0
**Last reviewed:** 2026-07-26

> **Not a status document.** For actual project state see
> [`STATUS.md`](../../STATUS.md) (root) — **pre-release, not production ready** —
> and [`docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md`](../audit_reports/FORENSIC_AUDIT_2026-07-26.md).
> The "Completed ✅" markers below record that feature work was *written*, not
> that it was verified or shipped. Notably, Phase 5 "Production Ready" is **not**
> achieved, and Phase 2's "Encryption: AES-256 at rest, Argon2id key derivation"
> is inaccurate on both counts (see below).

## Completed Phases

### Phase 1: Foundation (Completed ✅)

- [x] Core Rust library architecture
- [x] SQLCipher database encryption
- [x] Tauri desktop application scaffold
- [x] React + TypeScript frontend
- [x] Basic note CRUD operations

### Phase 2: Security Hardening (Completed ✅)

- [x] **Sync Transport:** X25519 ECDH handshake (replaced hardcoded keys)
- [x] **Mobile Storage:** Migrated sensitive flags to SecureStore
- [x] **Accessibility:** Package filtering and screen-off pause in Android service
- [~] **Encryption:** SQLCipher (AES-256) at rest **on desktop only** — the React-Native mobile store is unkeyed (`apps/mobile/src/lib/database.ts:585`). Vault key derivation is **PBKDF2-HMAC-SHA512** (`packages/core-rs/src/crypto.rs:28`), not Argon2id; Argon2id is used for password-auth hashing (`packages/core-rs/src/auth.rs:90-93`) and to wrap the mobile DEK.

### Phase 3: Architecture & Stability (Completed ✅)

- [x] **JNI Safety:** Graceful Mutex poisoning handling in `jni.rs`
- [x] **Database Optimization:** `social_post_archive` and pruning logic
- [x] **JSI Bridge:** C++ scaffolding for direct Rust-JS calls
- [x] **Error Handling:** Removed unsafe `unwrap()` across core modules

### Phase 4: Feature Maturity (Completed ✅)

- [x] **AI Integration:** Created `inference.rs` abstraction for ONNX Runtime
- [x] **Web Scrapers:** Externalized selector config to `socialConfig.js`
- [x] **Full-Text Search:** FTS5 with hybrid fallback
- [x] **CalDAV Sync:** Two-way calendar synchronization
- [x] **Social Suite:** Multi-platform aggregation and analytics

### Phase 5: Release Engineering (NOT complete ❌ — previously mislabelled "Production Ready ✅")

- [x] **Version alignment:** all packages are at 1.1.0. No release has ever been tagged.
- [x] **License Standardization:** AGPL-3.0 throughout
- [x] **CI/CD Pipeline:** Cross-platform builds and releases
- [x] **Test Infrastructure:** Comprehensive mocks for all platforms
- [x] **Documentation:** Complete wiki and user guides

### Phase 6: LLM & Intelligence (Completed ✅)

- [x] **LLM Providers:** Ollama, OpenAI, Claude, Gemini integration
- [x] **Streaming Responses:** Real-time token-by-token output
- [x] **Batch Processing:** Concurrent execution with rate limiting
- [x] **Cost Tracking:** Per-request and aggregate cost monitoring
- [x] **Auto-Retry:** Exponential backoff with circuit breaker
- [x] **Request Prioritization:** Priority queues with aging
- [x] **Response Validation:** JSON, length, content validators
- [x] **Token Counting:** Pre-request estimation with model limits

### Phase 7: Foresight 2.0 (Completed ✅)

- [x] **Correlation Engine:** Cross-module data correlation
- [x] **Health × Workload:** Detect burnout patterns
- [x] **Calendar × Projects:** Conflict detection
- [x] **Time × Productivity:** Progress tracking analysis
- [x] **Actionable Insights:** Automated suggestions

## Current Phase

### Phase 8: Polish & Performance (In Progress 🔄)

- [x] **Component Modularization:** Break down monolithic files
- [ ] **Virtualization:** React-window for large lists
- [ ] **Lazy Loading:** Deferred asset loading
- [ ] **Memory Optimization:** Reduce baseline RAM usage
- [ ] **Bundle Size:** Tree shaking and code splitting
- [ ] **Animation Polish:** Micro-interactions and transitions

## Future Phases

### Phase 9: Advanced Sync (Planned 📋)

- [ ] **Vector Clock Enhancement:** Per-field conflict resolution
- [ ] **Mesh Sync:** Multi-device simultaneous sync
- [ ] **Blind Relay Server:** Encrypted store-and-forward
- [ ] **cr-sqlite Integration:** Row-level CRDTs

### Phase 10: AI & Intelligence (Planned 📋)

- [ ] **On-Device LLM:** Local inference with quantized models
- [ ] **RAG Implementation:** Chat with your vault
- [ ] **Auto-Tagging:** Semantic similarity suggestions
- [ ] **Habit Correlation:** Cross-metric insights

### Phase 11: Collaboration (Planned 📋)

- [ ] **Shared Folders:** Invite-only P2P sharing
- [ ] **Real-Time Editing:** CRDT-based collaborative notes
- [ ] **Team Spaces:** Multi-user project management
- [ ] **Access Control:** Granular permission system

### Phase 12: Ecosystem (Planned 📋)

- [ ] **Plugin System:** WASM-based extensions
- [ ] **Theme Engine:** Community theme marketplace
- [ ] **Public Gardens:** Static site generation
- [ ] **API Server:** Optional self-hosted sync server

## Technical Debt

### High Priority

- [x] Fix FTS5/SQLCipher build conflict (hybrid fallback implemented)
- [ ] Update to Tauri v2 when stable
- [x] Migrate to React Router v7 API (future flags enabled)

### Medium Priority

- [ ] Implement snapshot testing (Playwright/Storybook)
- [ ] Add fuzz testing for parsers
- [ ] Improve mobile offline sync queue

### Low Priority

- [x] Refactor remaining large components (modularized)
- [ ] Add internationalization to desktop app
- [ ] Implement dark mode sync with OS preference

## Metrics & Goals

| Metric           | Current      | Target |
| ---------------- | ------------ | ------ |
| Test Coverage    | not measured | 95%    |
| Lighthouse Score | 88           | 95     |
| Bundle Size      | 10MB         | 8MB    |
| Cold Start       | 1.5s         | 1s     |
| FCP              | 1.2s         | 0.8s   |

Coverage is listed as "not measured" because there is no CI coverage gate and
`packages/ui` / `packages/types` have zero tests. Any percentage previously
quoted here or elsewhere in the docs was unsourced.

## Release Schedule

No release has been tagged. All previously published target dates have lapsed,
and release is currently blocked by the Critical findings in the forensic audit
(see [`NEXT_STEPS.md`](../../NEXT_STEPS.md) §0). The intended ordering is:

| Version | Focus                                    | State                      |
| ------- | ---------------------------------------- | -------------------------- |
| v1.1.0  | Current manifest version                 | Unreleased — blocked       |
| v1.2.0  | Performance & polish                     | Planned                    |
| v1.3.0  | Advanced sync                            | Planned                    |
| v2.0.0  | AI & collaboration                       | Planned                    |

---

_This plan is a living document. Priorities may shift based on user feedback and technical discoveries._
