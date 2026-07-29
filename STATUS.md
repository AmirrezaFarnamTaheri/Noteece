# Project Status

**Version:** 1.1.0 (all manifests: `package.json`, `apps/mobile/package.json`, `apps/desktop/src-tauri/tauri.conf.json`, `packages/core-rs/Cargo.toml`)

## Current State: **Pre-release — NOT production ready**

The most recent independent assessment, [`docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md`](docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md), rates the
system **4.0 / 10** and explicitly blocks release. Earlier "Stable Release
Candidate" and "Production Ready" claims in this repo were not supported by the
code and have been retracted. That forensic audit is the canonical statement of
project health; this file is a summary of it plus what has landed since.

The desktop cryptographic core is genuinely solid (correct XChaCha20-Poly1305
AEAD, SQLCipher at rest, CSPRNG throughout, real negative crypto tests). The
blocking problems are elsewhere: mobile at-rest encryption, the Prime capture
feature's legal exposure, and frontend↔backend IPC command drift.

### 🟢 Implemented (feature-complete on the desktop path)

- **Core Architecture:** `core-rs` library with SQLCipher-encrypted SQLite, JSI bridge, substantial Rust test suite.
- **Desktop App:** Tauri + React application.
  - **Modules:** Notes, Tasks, Projects, Health, Music, Social, Journal, Habits.
  - **Visualizations:** Temporal Knowledge Graph, Tag Cloud.
  - **Sync:** Local P2P sync using mDNS/TCP with vector clocks.
  - **Conflict Resolution:** UI for resolving data conflicts with diff viewer.
- **Mobile App:** Expo + React Native application with native JSI bridge.
  - **Modules:** Notes, Capture, Today, Social Hub.
  - **Sync:** Unified SyncBridge prioritizing JSI with TypeScript fallback.
- **Social Capture (Prime):** Android "Sideload" flavor with accessibility-service stream processing — see the Critical issue below before shipping this.
- **CI/CD:** Workflows for building native binaries (APK, DMG, MSI, AppImage, Deb), plus a security scanning workflow (`.github/workflows/security.yml`) and `dependabot.yml`.

### 🟡 Recently fixed on this branch (not yet released)

- Desktop vault create/unlock IPC command-name break (the app could not open a vault).
- Mobile vault password-change AAD mismatch that caused permanent lockout.
- UTF-8 byte-slice panic in the accessibility ingest path.
- `packages/relay-server` bearer-token authentication on `/fetch` and `/pending`.
- Backup path-traversal guard.
- Removal of fabricated widget data (`Math.random()` finance/XP figures).
- FinanceMode 100× currency scaling bug.
- Android `allowBackup=false`.
- CI security scanning.

### 🔴 Known Issues / Limitations

**Critical (release blockers, from the forensic audit):**

- **Mobile data is plaintext at rest.** The React-Native layer opens `expo-sqlite`
  with no key (`apps/mobile/src/lib/database.ts:585`); the decrypted DEK is never
  wired to the database. The mobile vault is a navigation gate, not at-rest
  encryption. The "zero-knowledge" claim does not hold on mobile. (FINDING-01)
- **Prime "Sovereign Interception" captures third parties' private messages.**
  The Android sideload accessibility service scrapes a 30+ app allowlist including
  Signal/WhatsApp/Telegram and dating apps, with no consent surface and no working
  redaction, and logs captured text to logcat. Legal/privacy exposure. (FINDING-02)
- **Desktop AI backend is unregistered.** `apps/desktop/src-tauri/src/commands/ai.rs`
  has no `mod ai;` in `commands/mod.rs` and no entry in `main.rs`'s
  `generate_handler!`, so no AI command compiles into the binary. The frontend
  still invokes `rag_query_cmd` / AI commands that do not exist. (FINDING-04)
- **~30 further ghost IPC commands** are invoked by live routes with no registered
  handler; the desktop auth subsystem is unreachable dead code. (FINDING-04)

**High:**

- Mobile P2P sync handshake is unauthenticated over cleartext `ws://` (MITM by construction). (FINDING-10)
- Relay server remains a prototype: plaintext HTTP, unbounded queues, no rate limiting, no scheduled cleanup. Bearer auth now exists, but do not expose it publicly. (FINDING-09)
- Hardcoded KDF salt fallback for legacy mobile vaults on the Rust FFI path. (FINDING-08)
- Android release builds are signed with the checked-in debug keystore. (FINDING-06)

**Platform:**

- **Ubuntu 24.04 Build:** Desktop build requires `libwebkit2gtk-4.0-dev`, deprecated in Ubuntu 24.04. Use Ubuntu 22.04 LTS.
- **iOS Background Sync:** Limited by OS constraints; requires app foregrounding for full sync.

**Testing:** `packages/ui` and `packages/types` have zero tests, and there is no
CI coverage gate. Any specific coverage percentage quoted elsewhere in this repo
is unsourced.

## Next Steps (Roadmap)

Release is blocked until the Critical items above are resolved. Beyond those:

1. **Cloud Relay:** `packages/relay-server` exists (Rust/Axum) and now requires a bearer capability token to drain a mailbox. Still outstanding: TLS, rate limiting, bounded queues, and wiring desktop/mobile sync agents to it.
2. **Plugin API:** Stabilize the `NoteecePlugin` trait and run untrusted plugins in a WASM sandbox — today the trait hands plugins a raw `&Connection`.
3. **Multi-User Collaboration:** Expand RBAC and real-time collaboration; RBAC is currently client-side only and unenforced in Rust.

---

_Last Updated: 2026-07-26_
