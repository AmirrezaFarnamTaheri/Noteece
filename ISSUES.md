# Issues

_Last reviewed: 2026-07-29. Canonical status: [`STATUS.md`](STATUS.md). Current audit:
[`docs/audit_reports/FORENSIC_AUDIT_V2_2026-07-26.md`](docs/audit_reports/FORENSIC_AUDIT_V2_2026-07-26.md)._

## Open — Critical (release blockers)

- [ ] **Mobile:** Data is stored **unencrypted at rest**. The React-Native layer opens `expo-sqlite` with no key (`apps/mobile/src/lib/database.ts:585`) and the decrypted DEK is never wired to the database. The vault is a navigation gate, not at-rest encryption. (FINDING-01)
- [ ] **Privacy/Legal:** The Android Prime accessibility service captures third parties' private messages from a 30+ app allowlist (Signal, WhatsApp, Telegram, dating apps) with no consent surface and no working redaction. Runtime logging records captured-text length rather than plaintext, but the captured content is still persisted to the unencrypted mobile store. (FINDING-02)
- [ ] **Desktop:** The AI backend does not compile into the binary — `apps/desktop/src-tauri/src/commands/ai.rs` has no `mod ai;` in `commands/mod.rs` and no entry in `main.rs`'s `generate_handler!`. The frontend still invokes AI/RAG commands that do not exist. (FINDING-04)
- [ ] **Desktop:** Additional IPC commands are invoked by live routes with no registered handler; the auth UI subsystem remains unreachable dead code. CI now checks the frontend invoke/registered-command contract, but the underlying missing handlers must still be implemented or removed. (FINDING-04)

## Open — High

- [ ] **Mobile Sync:** The P2P handshake runs over cleartext `ws://` and marks peers authenticated immediately after ECDH, with no identity verification — MITM by construction. (FINDING-10)
- [ ] **Relay Server:** Challenge-response registration, rotating capability tokens, authenticated `/send`/`fetch`/`pending`/`ack`, envelope signatures, registered-recipient checks, per-device and global resource bounds, lease/ack delivery, and scheduled expiry cleanup have landed. Remaining exposure blockers are TLS termination, edge rate limiting/abuse controls, durable state or explicit restart semantics, deployment monitoring, and production operations hardening. Treat the relay as pre-alpha and do not expose it directly to the public internet. (FINDING-09)
- [ ] **Mobile:** Hardcoded, globally-shared KDF salt fallback for legacy vaults on the Rust FFI path (`packages/core-rs/src/mobile_ffi.rs:611-612`). (FINDING-08)
- [ ] **Android:** Release signing supports injected credentials and no longer falls back to the checked-in debug keystore. Production distribution remains blocked until protected signing credentials are configured; otherwise only an unsigned artifact may be produced. (FINDING-06)

## Open — Medium

- [ ] **Core-RS:** No key zeroization (`zeroize` is not a dependency); raw ECDH output used as a key without HKDF on the sync path. (FINDING-14)
- [ ] **Core-RS:** Selector verification now rejects empty/unknown content and pins the reviewed bundled selector bytes by SHA-256. Residual risk: the remote selector-loading path is not wired into a production update flow and no Ed25519 verification key/signing and rotation process is deployed, so remote update authenticity remains an operational gap. (FINDING-12)
- [ ] **Core-RS:** SQLCipher `kdf_iter` is applied via `format!` with the result discarded, silently masking a KDF-strength downgrade. (FINDING-13)
- [ ] **Desktop:** OCR decrypts blobs to a predictable, world-readable path in the shared temp directory; RBAC is enforced only in the UI, not in Rust. (FINDING-16)
- [ ] **Testing:** Desktop and mobile coverage checks exist, and Rust workspace tests run on Linux, macOS, and Windows. `packages/ui` and `packages/types` still have zero tests, and no repository-wide coverage threshold covers every package.

## Resolved

_`[x]` = verified resolved. `[~]` = previously claimed resolved but only partially true._

- [x] **Security:** Desktop session tokens were in localStorage (Moved to `tauri-plugin-store`).
- [x] **Security:** Console logs exposed sensitive data (Replaced with secure `Logger`).
- [x] **Quality:** Mobile app console logs cleaned up and replaced with `Logger`.
- [~] **Quality:** Removed unsafe `unwrap()` calls in **some** Core-RS paths (LLM, CalDAV, DB, sync handler — these are verified clean). **Partially done:** the accessibility-ingest path still panics on untrusted input — `packages/core-rs/src/social/jni.rs:78` uses `.expect()` on attacker-controlled content, and `social/stream_processor.rs:108` byte-sliced untrusted text (that specific slice is fixed on this branch, the `expect` is not). Do not treat core-rs as `unwrap()`-free.
- [x] **Reliability:** Sync engine masked database errors (Fixed error propagation).
- [x] **Mobile:** Race condition in vault unlock (Fixed with mutex).
- [x] **Mobile:** SQL Injection in search (Fixed with parameter binding).
- [x] **Mobile:** Transaction rollback issues in migrations (Fixed).
- [~] **Mobile:** Encryption/Salt issue — **not fixed on the shipping path.** `GLOBAL_KEY` and the salt helper apply only to the Rust FFI/SQLCipher route, which is not how the React-Native app persists data; the RN path (`apps/mobile/src/lib/database.ts:585`) remains unencrypted. That FFI route also still falls back to a hardcoded salt for legacy vaults (`mobile_ffi.rs:611-612`). See the Critical and High sections above.
- [x] **Performance:** Mobile SocialHub list was slow (Migrated to `FlashList`).
- [x] **Performance:** Desktop graph loading was unpaginated (Added pagination).
- [x] **Infrastructure:** CI was slow (Added caching).
- [x] **Testing:** Jest mock configuration for `react-native-zeroconf` and `tauri-plugin-store` (Fixed).
- [x] **i18n:** Missing pluralization in mobile app (Added).

## Pending / Known Limitations

- [ ] **Mobile:** Certificate pinning for P2P sync is documented in `SECURITY.md` but requires a certificate generation and peer-identity strategy for production deployment.
- [ ] **Mobile Test Environment:** Some Jest tests may require `@babel/plugin-transform-private-methods` depending on Node.js version; the current CI configuration passes.
- [ ] **Desktop:** `tauri-plugin-store` mock is memory-only for tests; integration tests require running the binary.

## Backlog

- [ ] **Mobile:** Full offline-first conflict resolution UI (Basic version implemented).
- [ ] **Desktop:** Add visual regression testing for widgets.
