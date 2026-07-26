# Issues

_Last reviewed: 2026-07-26. Canonical status: [`STATUS.md`](STATUS.md). Full
findings: [`docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md`](docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md)._

## Open — Critical (release blockers)

- [ ] **Mobile:** Data is stored **unencrypted at rest**. The React-Native layer opens `expo-sqlite` with no key (`apps/mobile/src/lib/database.ts:585`) and the decrypted DEK is never wired to the database. The vault is a navigation gate, not at-rest encryption. (FINDING-01)
- [ ] **Privacy/Legal:** The Android Prime accessibility service captures third parties' private messages from a 30+ app allowlist (Signal, WhatsApp, Telegram, dating apps) with no consent surface and no working redaction, and writes captured text to logcat. (FINDING-02)
- [ ] **Desktop:** The AI backend does not compile into the binary — `apps/desktop/src-tauri/src/commands/ai.rs` has no `mod ai;` in `commands/mod.rs` and no entry in `main.rs`'s `generate_handler!`. The frontend still invokes AI/RAG commands that do not exist. (FINDING-04)
- [ ] **Desktop:** ~30 further IPC commands are invoked by live routes with no registered handler; the entire auth UI subsystem is unreachable dead code. No CI contract check exists between `invoke()` names and `generate_handler!`. (FINDING-04)

## Open — High

- [ ] **Mobile Sync:** The P2P handshake runs over cleartext `ws://` and marks peers authenticated immediately after ECDH, with no identity verification — MITM by construction. (FINDING-10)
- [ ] **Relay Server:** Bearer-token auth has landed, but the server is still plaintext HTTP with unbounded queues, no rate limiting, and no scheduled cleanup. Treat as pre-alpha; do not expose. (FINDING-09)
- [ ] **Mobile:** Hardcoded, globally-shared KDF salt fallback for legacy vaults on the Rust FFI path (`packages/core-rs/src/mobile_ffi.rs:611-612`). (FINDING-08)
- [ ] **Android:** Release builds are signed with the checked-in debug keystore. (FINDING-06)

## Open — Medium

- [ ] **Core-RS:** No key zeroization (`zeroize` is not a dependency); raw ECDH output used as a key without HKDF on the sync path. (FINDING-14)
- [ ] **Core-RS:** Selector anti-tamper verification is bypassable — empty signing key and `sha256("")` in the hash allowlist. (FINDING-12)
- [ ] **Core-RS:** SQLCipher `kdf_iter` is applied via `format!` with the result discarded, silently masking a KDF-strength downgrade. (FINDING-13)
- [ ] **Desktop:** OCR decrypts blobs to a predictable, world-readable path in the shared temp directory; RBAC is enforced only in the UI, not in Rust. (FINDING-16)
- [ ] **Testing:** `packages/ui` and `packages/types` have **zero tests**, and there is no CI coverage gate. Any coverage percentage quoted in this repo's docs is unsourced.

## Resolved

- [x] **Security:** Desktop session tokens were in localStorage (Moved to `tauri-plugin-store`).
- [x] **Security:** Console logs exposed sensitive data (Replaced with secure `Logger`).
- [x] **Quality:** Mobile app console logs cleaned up and replaced with `Logger`.
- [~] **Quality:** Removed unsafe `unwrap()` calls in **some** Core-RS paths (LLM, CalDAV, DB, sync handler — these are verified clean). **Partially done:** the accessibility-ingest path still panics on untrusted input — `packages/core-rs/src/social/jni.rs:78` uses `.expect()` on attacker-controlled content, and `social/stream_processor.rs:108` byte-sliced untrusted text (that specific slice is fixed on this branch, the `expect` is not). Do not treat core-rs as `unwrap()`-free.
- [x] **Reliability:** Sync engine masked database errors (Fixed error propagation).
- [x] **Mobile:** Race condition in vault unlock (Fixed with mutex).
- [x] **Mobile:** SQL Injection in search (Fixed with parameter binding).
- [x] **Mobile:** Transaction rollback issues in migrations (Fixed).
- [x] **Mobile:** Encryption/Salt issue (Fixed with GLOBAL_KEY and salt helper).
- [x] **Performance:** Mobile SocialHub list was slow (Migrated to `FlashList`).
- [x] **Performance:** Desktop graph loading was unpaginated (Added pagination).
- [x] **Infrastructure:** CI was slow (Added caching).
- [x] **Testing:** Jest mock configuration for `react-native-zeroconf` and `tauri-plugin-store` (Fixed).
- [x] **i18n:** Missing pluralization in mobile app (Added).

## Pending / Known Limitations

- [ ] **Mobile:** Certificate pinning for P2P sync is documented in `SECURITY.md` but requires a certificate generation strategy for production deployment.
- [ ] **Mobile Test Environment:** Some jest tests may require `@babel/plugin-transform-private-methods` depending on node version, currently working with provided config.
- [ ] **Desktop:** `tauri-plugin-store` mock is memory-only for tests; integration tests require running binary.

## Backlog

- [ ] **Mobile:** Full offline-first conflict resolution UI (Basic version implemented).
- [ ] **Desktop:** Add visual regression testing for widgets.
