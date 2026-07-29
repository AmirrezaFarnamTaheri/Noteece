# EXECUTIVE FORENSIC ASSESSMENT REPORT

**Repository:** Noteece (`amirrezafarnamtaheri/noteece`)
**Scope:** Full monorepo — `packages/core-rs`, `packages/relay-server`, `apps/desktop`, `apps/mobile`, `packages/*`, CI/CD, installers, legal/security docs.
**Method:** Non-sampled forensic sweep. Parallel evidence passes across Rust crypto/core, secondary-module deep sweep, relay server, mobile (RN + Kotlin + Prime), CI/supply-chain, and desktop/TS/AI — with **independent re-verification of every load-bearing claim** cited below (each such claim was reproduced directly against the source).
**Date:** 2026-07-26
**Evidence tiers:** T1 = directly observed (file:line, reproduced), T2 = inference from T1, T3 = necessary assumption, T4 = unknown/inaccessible.

> This report supersedes the "Production Ready" conclusion of `docs/audit_reports/EXECUTIVE_SUMMARY.md` (Feb 2024). Multiple claims in that audit, in `STATUS.md`/`NEXT_STEPS.md`, and in the mobile `SECURITY.md` are directly contradicted by the current code (see §6). This audit records verified findings only; **no application code was modified.**

---

## 1. Executive Summary & Health Index

- **Overall System Health Rating:** **4.0 / 10**
  - The desktop cryptographic core is genuinely strong (correct AEAD, SQLCipher-at-rest, sound RNG, DEK zeroized-on-drop, real crypto tests), and the injection posture and test breadth are above average. That keeps the floor off the ground.
  - But four headline problems dominate: (1) the **desktop app's own front door is broken** — the vault create/unlock screen invokes command names the backend does not register, so the shipped app cannot open a vault; (2) the mobile app's **primary data store is unencrypted at rest**, nullifying the "zero-knowledge" claim on that platform; (3) the Android "Prime" feature **harvests third parties' private messages** from E2EE apps with no consent and no working redaction, landing them in that same plaintext store; and (4) pervasive **frontend↔backend command-name drift** leaves 30+ invoked commands (and the entire AI and auth subsystems) unimplemented, with several live Dashboard widgets **fabricating realistic data** to hide the failures. Multiple High/Medium correctness, deployment, and path-handling defects compound these.
- **Critical Risk Profile:**
  1. **Correctness (Critical) — Desktop app cannot open a vault.** The root route `VaultManagement` invokes `create_vault`/`unlock_vault`; the backend registers only `create_vault_cmd`/`unlock_vault_cmd`. Both handlers swallow the rejection into `logger.error` with no UI feedback, so `navigate('/main')` never fires — the shipped desktop app is stuck on the vault screen (`VaultManagement.tsx:14,23` vs `main.rs:64-65`).
  2. **Security (Critical) — Mobile data is plaintext at rest.** The React-Native data layer opens `expo-sqlite` with no key; the elaborate Argon2id/ChaCha20 vault only decrypts a DEK that is **never wired to the database**. The vault is a UI gate, not at-rest encryption. `apps/mobile/SECURITY.md`'s "DEK → encrypts all user data / zero-knowledge" is false on mobile.
  3. **Legal / privacy (Critical) — Prime "Sovereign Interception."** The Android sideload flavor reads the on-screen text of a 30+ app allowlist including Signal/WhatsApp/Telegram and dating apps, explicitly "bypassing SSL pinning by reading decrypted text at the view layer." The documented redaction / "exclude private messages" controls are **not implemented** in the mobile path, and there is **no consent surface** for the counterparties whose content is captured. Captured content is also written to logcat in plaintext.
  4. **Trust / integrity (Medium-High) — Fabricated data shown as real.** Live Dashboard widgets substitute `Math.random()` finances, fake XP/streaks, and hashes-as-progress when their (missing) backend commands reject, with no error indication.
- **Strategic ROI Horizon (top 3 high-leverage moves):**
  1. **Add a CI IPC-contract check** that diffs every frontend `invoke('x')` name against the Rust `generate_handler!` registry and fails the build on a mismatch — this single gate catches the Critical vault-entry break, the dead AI backend, and the 30+ ghost commands at once. Pair it with a real Tauri-driver E2E that opens a vault (the mocked-`invoke` Jest suite cannot catch this class).
  2. **Make mobile at-rest encryption real** (wire the DEK via a SQLCipher-capable driver such as `op-sqlite`, or encrypt payloads before insert), and **make a governance decision on Prime** — implement redaction + explicit multi-party consent, or remove interception of E2EE/dating apps.
  3. **Add automated supply-chain scanning** (`cargo audit`, Dependabot/`pnpm audit`, CodeQL); treat the relay server and mobile P2P sync as pre-alpha until authenticated, TLS/verified, and rate-limited.

---

## 2. Corpus Accounting & Coverage Matrix

| Resource Category | Items Discovered | Reviewed | Status / Blind Spots |
| :--- | :--- | :--- | :--- |
| Rust source (`.rs`) | 237 files | Hot paths 100% (crypto, vault, sync, relay, FFI, blob, search, LLM, social, db, collaboration, plugin, import, crdt) | Non-security modules sampled |
| Desktop TS/TSX | ~283 files | AI, IPC surface, editor, logger, CSP 100% | UI widgets sampled |
| Mobile (RN + Kotlin) | 7 `.kt` + RN app | Vault, DB, sync, backup, Prime path 100% | — |
| Tauri commands | **155** registered (`main.rs:63+`) | Registration + AI/collab subset verified | Per-command authz not exhaustively traced |
| Relay server | 192 LOC + `core-rs/sync/relay.rs` (583) | 100% | — |
| CI/CD workflows | 3 (`ci`, `build-binaries`, `release`) | 100% | — |
| Installers | `install.sh/.ps1/.bat` | 100% | — |
| Tests | 53 Rust + 50 desktop + 16 mobile + e2e | Inventoried | `packages/ui` & `packages/types`: **0 tests**; no CI coverage gate |
| Committed secrets | full-repo regex sweep | 100% | **None found** (placeholders/test fixtures only) |

---

## 3. Structural Findings & Technical Debt

### [FINDING-01] — Mobile primary data store is unencrypted at rest; the DEK never encrypts user data

- **Description:** On mobile, the vault's decrypted DEK is never applied to the database. The React-Native SQLite layer opens a plain, unkeyed database, so all notes, tasks, health/calendar data, social posts, and Prime-captured content are stored in cleartext. The vault UI is a navigation gate, not at-rest protection.
- **Evidence Anchor (T1, reproduced):** `apps/mobile/src/lib/database.ts:585` — `db = await SQLite.openDatabaseAsync('noteece.db');` via `expo-sqlite` (`database.ts:1`), with **no `PRAGMA key`, no key parameter, and no `dek` reference anywhere in the file** (grep of `dek`/`DEK` in `database.ts` → none). The DEK lives only in `apps/mobile/src/store/vault.ts` / `vault-utils.ts`. `apps/mobile/SECURITY.md` claims "DEK → Encrypts all user data," "Zero-knowledge architecture," and "Defense in depth: multiple layers of encryption."
- **Root Cause:** `expo-sqlite` provides no SQLCipher support; the architecture that assumed encrypted-at-rest (the Rust FFI/JSI path in `core-rs`, which *does* use SQLCipher) was never the path the RN app actually persists through. `docs/audit_reports/AUDIT_ROADMAP.md` itself flags this ("Mobile App (Expo) likely stores data in Plaintext due to lack of SQLCipher support") — it was identified but not remediated on the shipping path.
- **Impact Matrix:**
  - *Technical & Security:* device theft / ADB pull / filesystem access yields all user data in cleartext, including intercepted third-party messages. The entire mobile threat model collapses to "OS sandbox only."
  - *Operational & Reliability:* the DEK decryption work is pure overhead with no protective effect.
  - *Scalability & Business:* directly falsifies the product's central "private/zero-knowledge" promise on mobile and the `PRIVACY.md` assertions.
- **Peer Benchmark:** Standard Notes / Obsidian-mobile encrypt payloads before persistence; RN apps needing encrypted-at-rest use `op-sqlite` (SQLCipher) or field-level encryption — never plain `expo-sqlite` for secret data.
- **Metrics:** Severity: **Critical** | Effort: **L** | ROI: **10x Transformational**
- **Remediation & Validation:** either migrate mobile persistence to a SQLCipher-capable driver keyed with the DEK, or encrypt sensitive columns with the existing `core-rs` AEAD before insert. Validation: a "file inspection" test (already envisioned in `AUDIT_ROADMAP.md` Phase 6) that opens `noteece.db` without the key and asserts note content is not recoverable as plaintext.

### [FINDING-02] — Prime "Sovereign Interception" captures third-party private messages with no consent and no working redaction

- **Description:** The Android `sideload` build ships an `AccessibilityService` that reads the entire on-screen UI tree of a 30+ app allowlist (E2EE messengers + dating apps) and ingests all text. In 1:1 chats this captures the **other party's** name and message body — a person who never consented — plus any on-screen OTPs/passwords.
- **Evidence Anchor (T1, reproduced):**
  - Full-tree scrape → JNI ingest: `apps/mobile/android/app/src/sideload/java/com/noteece/services/NoteeceAccessibilityService.kt:149-164` (`scanScreen`/`traverseNode`, depth 10; `RustBridge.ingest(rawText)` at `:156-160`).
  - Allowlist includes Signal `org.thoughtcrime.securesms`, WhatsApp, Telegram, Discord, Slack, Snapchat, and Tinder/Bumble/Hinge/OkCupid/Match: `NoteeceAccessibilityService.kt:45-94`; mirrored in `res/xml/accessibility_service_config.xml:3`.
  - Dedicated private-message extractors: `packages/core-rs/src/social/processing/extractors/messaging.rs:100-140` (`extract_chat_message` → `author_display_name` + `content_text`), wired for WhatsApp/Signal at `stream_processor.rs:222-230`.
  - Explicit E2EE bypass by design: `docs/project_docs/01_Architecture/08_Prime_Interception.md:71` — *"Bypasses SSL pinning by reading decrypted text at the view layer."*
  - Advertised protections absent from the capture path: `redactEmails/redactPhoneNumbers/excludePrivateMessages` appear only in docs and the **desktop** config, never in the mobile Rust pipeline; `packages/core-rs/src/llm/pii.rs:10` `redact_pii` exists but is **not called** during capture (and is itself weak — see FINDING-15).
  - No consent/notice surface (repo-wide search of `apps/mobile/**` for `consent`/`agree`/`acknowledge` → none). Capture starts silently on tile tap (`SocialDock.tsx:245-258`).
  - Local plaintext leak: `NoteeceAccessibilityService.kt:160` logs captured text to logcat.
  - Store-review evasion by design: capture code isolated in the `sideload` flavor distributed via GitHub Releases specifically because "Play Store prohibits accessibility abuse" (`08_Prime_Interception.md:212-226,271`; `app/build.gradle:110-121`).
- **Root Cause:** the feature was designed around a privacy narrative the mobile implementation never realized; protective controls live on the wrong side of the FFI boundary. Captured content lands in the plaintext store of FINDING-01.
- **Impact Matrix:** *Security:* on-device decrypted content from hardened messengers, plaintext in logcat and DB. *Business/Legal:* exposure under wiretap/interception statutes and GDPR/CCPA (third-party data, no lawful basis, no consent); near-certain ToS violations of every targeted platform; app-store/"stalkerware" enforcement risk.
- **Peer Benchmark:** legitimate on-device automation never exfiltrates *counterparties'* private-message content; accessibility use is scoped to the user's own input.
- **Metrics:** Severity: **Critical** | Effort: **L** | ROI: **10x Transformational (risk removal)**
- **Remediation & Validation:** remove E2EE-messenger and dating packages from `allowedPackages`, or implement `redact_pii` in the capture path + an explicit logged consent gate before first capture + strip the plaintext logcat write. Validation: instrumented test that with `excludePrivateMessages=true` no `extract_chat_message` output reaches `latest_candidate`, and that logcat carries no captured text.

### [FINDING-03] — Relay server: unauthenticated mailbox drain (message theft + delivery denial)

- **Description:** `GET /fetch?device_id=X` returns **and removes** every queued message for device `X` with no authentication; auth is entirely stubbed.
- **Evidence Anchor (T1, reproduced):** handler `packages/relay-server/src/lib.rs:69-76`; drain `packages/core-rs/src/sync/relay.rs:246-247` (`queue.drain(..count)`). Auth stub: `register_device` returns `Ok(())` so the "token" is JSON `null` (`lib.rs:34-35` vs `relay.rs:148-152`); `/send` reads then discards the header (`lib.rs:48-52`); `/fetch`,`/pending`,`/stats` take no auth. Signature field/`InvalidSignature` variant exist but no `sign()`/`verify()` code does (`relay.rs:67,94,39`).
- **Root Cause:** the bearer-token and signature capabilities were never implemented.
- **Impact Matrix:** *Security:* confidentiality break + silent desync/data-loss + sender spoofing (arbitrary `from_device` accepted). *Business:* the relay is unsafe to expose publicly as-is.
- **Peer Benchmark:** any store-and-forward relay (Signal sealed-sender) authenticates the fetcher against the registered identity key before releasing a mailbox.
- **Metrics:** Severity: **Critical (prototype; not yet client-wired — T3)** | Effort: **M** | ROI: **High**
- **Remediation & Validation:** issue a real capability token bound to the registered key; require proof-of-ownership on `/fetch`/`/pending`; implement+enforce envelope signature verification. Add a negative test: fetching device B's queue with device A's credentials must return 401/403. (Current `test_register_device` asserts only that a `token` key *exists*, masking the null.)

### [FINDING-04] — Systemic frontend↔backend command-name drift: broken vault entry (Critical) + 30+ ghost commands + dead AI/auth subsystems

- **Description:** The desktop frontend and Rust command registry have drifted pervasively. The most severe instance bricks the app's entry screen; 30+ other invoked commands have no registered handler; and the entire AI backend module is uncompiled.
- **Evidence Anchor (T1, independently reproduced):**
  - **Critical — vault entry:** `apps/desktop/src/components/VaultManagement.tsx:14,23` invokes `create_vault`/`unlock_vault`; `main.rs:64-65` registers only `create_vault_cmd`/`unlock_vault_cmd`. `VaultManagement` is the `/` root route (`App.tsx:66-67`); the `catch` only calls `logger.error` (`VaultManagement.tsx:17,26`) with no UI surface, so on the always-rejecting invoke `navigate('/main')` never runs.
  - **AI backend uncompiled:** no `mod ai` in `commands/mod.rs`; zero AI command names in `generate_handler!`; `reqwest` absent from `src-tauri/Cargo.toml`; `rag_query_cmd`/`get_rag_stats_cmd` defined nowhere. Frontend still calls them: `AISettings.tsx:75`, `ChatWithVault.tsx:88`, `LocalAI.tsx:111`.
  - **Ghost commands (live routes):** `process_ocr_cmd` (`OcrManager.tsx:107`; backend is `queue_ocr_cmd`), `sync_with_device_cmd` (`SyncStatusRefactored.tsx:146`), `record_insight_feedback_cmd` (`Foresight.tsx:95,147`), plus ~25 more Dashboard/social/recipe/travel commands invoked with names (or missing `_cmd` suffixes) that are not in the 155-command registry.
  - **Dead auth subsystem:** `components/auth/*`, `services/auth.ts`, `hooks/useSessionRefresh.ts` have zero non-test importers; `App.tsx` routes `/` straight to `VaultManagement`, so the username/password/session/RBAC UI is unreachable.
- **Root Cause:** command names maintained by hand on both sides of the IPC boundary with no contract check; the Jest suite mocks `invoke` as a bare `jest.fn()`, so name mismatches pass every test.
- **Impact Matrix:** *Reliability:* the shipped desktop app cannot open a vault (total loss of function); numerous features error at runtime; ~6,000 lines of unreachable code ship in the bundle. *Business:* README's headline "🤖 AI Integration" and "secure login" do not exist at runtime.
- **Peer Benchmark:** Tauri projects generate or lint `invoke` names against `generate_handler!` to prevent exactly this drift.
- **Metrics:** Severity: **Critical** | Effort: **S** (rename/register) + **S** (CI gate) | ROI: **10x Transformational**
- **Remediation & Validation:** rename the vault calls to `_cmd` and surface errors in the UI; register/implement or delete the ghost commands and the `ai.rs`/auth trees; add a CI step diffing frontend `invoke` strings against the registry, and a Tauri-driver E2E that actually opens a vault.

### [FINDING-05] — Vault password change re-wraps the DEK without AAD → permanent lockout / data loss

- **Description:** The mobile password-change path re-encrypts the DEK with **no AEAD associated data**, but the unlock path decrypts **requiring** AAD `'vault:dek:v1'`. After any password change, the next unlock fails the Poly1305 tag check every time — the vault becomes permanently unopenable.
- **Evidence Anchor (T1, reproduced):** change path — `apps/mobile/src/lib/vault-utils.ts:99` `changeVaultPassword` → `encryptDek` (`:56`) → `:66` `cipher.encrypt(dek)` (no AAD). Unlock path — `apps/mobile/src/store/vault.ts:269` `unlockVault` → `decryptDek` (`:217`) → `:240` `cipher.decrypt(encrypted, aad)` with `aad = 'vault:dek:v1'` (`:231`). Wrap side in `vault.ts:209` uses the same AAD; `vault-utils.ts` does not.
- **Root Cause:** two divergent copies of the DEK wrap/unwrap primitive (`vault.ts` and `vault-utils.ts`) drifted; only one carries the AAD.
- **Impact Matrix:** *Reliability:* deterministic, unrecoverable data loss on a routine user action (password change), compounded because biometric enrollment is wiped during the change.
- **Peer Benchmark:** a single shared, tested crypto primitive; AEAD AAD is part of the ciphertext contract and must match on both sides.
- **Metrics:** Severity: **High** | Effort: **S** | ROI: **High**
- **Remediation & Validation:** unify on one `encryptDek/decryptDek` implementation with the AAD; add a round-trip test: `changeVaultPassword` then `unlockVault` with the new password must succeed.

### [FINDING-06] — Android release builds signed with the checked-in debug keystore; `allowBackup=true`

- **Description:** Release APKs are signed with the well-known Android debug key, and full app backup is enabled, exposing vault metadata to offline attack.
- **Evidence Anchor (T1, reproduced):** `apps/mobile/android/app/build.gradle` — `release { signingConfig signingConfigs.debug }` (with an in-file comment admitting "In production, you need to generate your own keystore"); `debug` keystore password is `android`. `apps/mobile/android/app/src/main/AndroidManifest.xml:23` — `android:allowBackup="true"`. Vault metadata (wrapped DEK, password hash, both salts) is in unencrypted AsyncStorage (`vault.ts:407`), so it is included in ADB/cloud backups.
- **Root Cause:** default RN template configuration never hardened for release.
- **Impact Matrix:** *Security:* anyone can build an update-compatible signed APK (no authenticity); a pulled backup enables offline Argon2id cracking of the vault password, which — combined with FINDING-01 — yields all data. *Business:* contradicts `SECURITY.md` "Cloud backup compromise: protected."
- **Peer Benchmark:** production Android apps use a protected release keystore and set `allowBackup=false` (or a strict backup rules set) for secret-bearing apps.
- **Metrics:** Severity: **High** | Effort: **S** | ROI: **High**
- **Remediation & Validation:** generate and secure a release keystore (CI already decodes `ANDROID_KEYSTORE_BASE64` in `release.yml` — point Gradle at it); set `allowBackup=false` or exclude vault storage via backup rules. Validation: `apksigner verify --print-certs` shows a non-debug signer; backup excludes AsyncStorage vault keys.

### [FINDING-07] — Panic on untrusted scraped content: UTF-8 byte-slice in the accessibility ingest hot path

- **Description:** The social stream processor byte-slices untrusted scraped text at a fixed offset, which panics whenever byte 100 falls mid-multibyte-character (emoji, CJK, Cyrillic, accented Latin — routine content). The panic propagates across the JNI boundary from `RustBridge.ingest`.
- **Evidence Anchor (T1, reproduced):** `packages/core-rs/src/social/stream_processor.rs:108` — `&post.content_text[..post.content_text.len().min(100)]`; `content_text` is untrusted accessibility-captured text; ingest path is `jni.rs:21-47` → `processor.ingest`. Related JNI panic: `jni.rs:78` `.expect("Couldn't create java string!")` on attacker-controlled content.
- **Root Cause:** byte indexing used where character/`char_indices` boundaries are required on non-ASCII input.
- **Impact Matrix:** *Reliability:* deterministic crash of the capture pipeline (and potential process abort across FFI) on common content; DoS of the Prime feature.
- **Peer Benchmark:** Rust idiom is `s.char_indices().nth(n)` or `s.chars().take(n)`, never raw byte-range slicing on untrusted text.
- **Metrics:** Severity: **High** | Effort: **S** | ROI: **Medium**
- **Remediation & Validation:** slice on char boundaries; return `Result` across the JNI boundary instead of `expect`. Validation: property test feeding multibyte strings of every length to `ingest` without panic.

### [FINDING-08] — Hardcoded, globally-shared KDF salt fallback for legacy mobile vaults (Rust FFI path)

- **Description:** On the Rust FFI/SQLCipher mobile path, a legacy DB lacking a salt file derives its key from a constant, source-visible salt, defeating per-device salt uniqueness; and a salt-write failure is ignored, yielding an unrecoverable key.
- **Evidence Anchor (T1, reproduced):** `packages/core-rs/src/mobile_ffi.rs:611-612` — `return b"salt_should_be_stored_in_header".to_vec();`. Salt-write failure logged and ignored at `:617`. Key held for process lifetime in a plain `Vec<u8>` (`GLOBAL_KEY`, `:18-21,660-662`) with no zeroization; `rust_unlock_vault` (`:627-669`) has no attempt counter / rate limit (offline guessing via a `#[no_mangle]` entry).
- **Root Cause:** placeholder salt from early development never fully retired.
- **Impact Matrix:** *Security:* precomputation/rainbow-table attacks against legacy vaults on this path; deleting the `.salt` sidecar forces the known salt.
- **Metrics:** Severity: **High** | Effort: **M** | ROI: **High**
- **Remediation & Validation:** transparently re-key legacy DBs with a fresh random salt on unlock; fail closed if the salt cannot be persisted; add unlock rate limiting. Validation: two legacy DBs with identical passwords must yield distinct on-disk key material post-migration.

### [FINDING-09] — Relay server DoS surface: unbounded queues, no rate limiting, plaintext HTTP, dead cleanup

- **Evidence Anchor (T1, reproduced):** unbounded registration & queue creation (accepts sends to unregistered recipients) `relay.rs:148-160,191-197,212`; per-device cap 100 but unbounded queue count `relay.rs:27`; plaintext HTTP on `0.0.0.0:3000`, no TLS `packages/relay-server/src/main.rs:8-11`; no rate-limit/timeout/body-limit middleware; size check covers only `ciphertext`, not `nonce`/`ephemeral_pubkey`/`signature` `relay.rs:108-113`; client-controlled `timestamp` defeats expiry `relay.rs:99-105`; `cleanup_expired` defined but never scheduled `relay.rs:270-288`.
- **Root Cause:** explicit development prototype (`relay.rs:123-124`: "In-memory relay server (for development/testing) … Production would use a distributed store").
- **Metrics:** Severity: **High (prototype)** | Effort: **M–L** | ROI: **High**
- **Remediation:** reject sends to unregistered recipients; global device/byte ceilings; `tower_governor` rate limiting + `TimeoutLayer` + explicit `DefaultBodyLimit`; TLS; server-side receipt timestamps (`_received_at` exists at `relay.rs:120`); schedule `cleanup_expired`.

### [FINDING-10] — Mobile P2P sync is an unauthenticated MITM by construction

- **Description:** Mobile sync performs X25519 ECDH over cleartext `ws://` and marks the peer authenticated immediately after computing the shared secret, with no identity verification (no PIN/SAS, no cert pinning, no signature over the handshake). The per-delta "signature" is an HMAC keyed with the *session* key, so a MITM who completed the handshake can forge it.
- **Evidence Anchor (T1):** `apps/mobile/src/lib/sync/sync-client.ts:186-260` (`peerAuthenticated = true` post-handshake), `:797` (`signDelta` HMAC with session key). Protocol types carry no auth token/MAC on the request and an *optional* integrity hash on deltas: `packages/core-rs/src/sync/mobile_sync/protocol/types.rs:104-126,154-178` (`data_hash: Option<String>`, no `deny_unknown_fields`, unbounded `Vec`/`HashMap` fields). Pairing PIN is an unbounded `String` with no attempt counter (`types.rs:241-254`).
- **Root Cause:** authentication deferred behind a "simulated pending WebSocket" narrative while the transport went live.
- **Impact Matrix:** *Security:* any LAN attacker can intercept/inject arbitrary sync entities; brute-forceable 6-digit pairing PIN with no rate-limit surface.
- **Metrics:** Severity: **High** | Effort: **M** | ROI: **High**
- **Remediation:** authenticate the handshake (SAS/short-auth-string or signed identity key), pin/verify peers, bound all deserialized collections (`deny_unknown_fields` + size caps), enforce a required per-delta MAC, and add PIN attempt limits.

### [FINDING-11] — No supply-chain scanning; installers pipe remote scripts into privileged shells; insecure generated defaults

- **Evidence Anchor (T1, reproduced):** `.github/` has only `workflows/` — no `dependabot.yml`, no CodeQL, no `cargo audit`/`pnpm audit`. Installers: `install.sh:262` (`curl … nodesource … | sudo -E bash -`), `:277` (rustup piped to `sh`), `:335` (`rm -rf … pnpm-lock.yaml`); `install.ps1:140-143` (`Set-ExecutionPolicy Bypass` + `iex (DownloadString(chocolatey))`, requires Admin); `install.bat:159-161` same. Insecure generated env `install.sh:375-376` (`NOTEECE_DEV_MODE=true`/`NOTEECE_ENABLE_HTTPS=false`). Broad CI grant `release.yml:24-25` (`permissions: contents: write`, workflow-wide). Unpinned Rust toolchain (`dtolnay/rust-toolchain@stable`); no `.nvmrc`/`rust-toolchain.toml`.
- **Metrics:** Severity: **High** | Effort: **S** (scanners) / **M** (installers) | ROI: **High**
- **Remediation:** add CodeQL + Dependabot + `cargo/pnpm audit`; scope `release.yml` write to the release job; checksum/GPG-verify downloaded installers; drop the lockfile-deletion step; default generated HTTPS to `true`.

### [FINDING-12] — Selector anti-tamper verification is bypassable (empty signing key; SHA-256-of-empty allowlisted)

- **Description:** The module that verifies scraper selector configs has signature verification permanently disabled (empty Ed25519 key) and falls back to a hash allowlist whose first entry is the SHA-256 of the empty string — so a tampered config serving empty selectors verifies as "known good."
- **Evidence Anchor (T1, reproduced):** `packages/core-rs/src/social/selector_verification.rs:12` `const SELECTOR_PUBLIC_KEY: &[u8] = &[];`; `:18` allowlist entry `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` = `sha256("")` (confirmed by direct computation); allowlist check at `:96`. Fetch path `reqwest::blocking::get` with no timeout/redirect limit (`:166`) and unbounded body read before verification (`:169-171`).
- **Root Cause:** placeholder key/hashes shipped ("This key should be generated … during the build process").
- **Metrics:** Severity: **Medium** | Effort: **S–M** | ROI: **Medium**
- **Remediation:** embed a real Ed25519 verification key at build time and require signatures; remove the empty-input hash; add timeout/size caps and verify before persisting.

### [FINDING-13] — SQLCipher `kdf_iter` set via `format!` with the error discarded; PRAGMA statements string-interpolated

- **Description:** The vault's KDF iteration count is applied through a `format!`-built PRAGMA whose result is discarded, so if SQLCipher rejects it the DB silently keeps default KDF strength; all pragmas are built by string interpolation from a `Deserialize` config struct (a latent injection template).
- **Evidence Anchor (T1, reproduced):** `packages/core-rs/src/db/pragma_tuning.rs:227-253` interpolates `cfg.journal_mode`/`synchronous`/… into PRAGMA SQL; `:258` `let _ = conn.execute_batch(&format!("PRAGMA kdf_iter = {};", kdf_iter));` (error dropped). Mobile/low-power profiles lower `kdf_iter` to 128000/64000 (`:106,118`).
- **Root Cause:** convenience string-building for pragmas; `PragmaConfig` values are numeric/enum today (limiting exploitability — T3 on reachability), but the pattern is unsafe and the swallowed `kdf_iter` error masks a real security downgrade.
- **Metrics:** Severity: **Medium** | Effort: **S** | ROI: **Medium**
- **Remediation:** validate/whitelist pragma values against fixed enums; surface (do not discard) the `kdf_iter` result; document the mobile iteration trade-off or raise the floor.

### [FINDING-14] — No key zeroization; raw ECDH output used as a key without HKDF

- **Evidence Anchor (T1, reproduced):** no `zeroize` dependency in `packages/core-rs/Cargo.toml` (only transitive in `Cargo.lock`; a README example); `GLOBAL_KEY` held for process lifetime (`mobile_ffi.rs:18-21,660-662`). Raw X25519 output stored/used as `[u8;32]` without HKDF: `sync/mobile_sync/protocol/handler.rs:158-164`, `sync/ecdh.rs:62-64`, `crypto/ecdh.rs:22-23` (contrast blob keys, which *do* use HKDF at `blob.rs:24`).
- **Root Cause:** roadmap action "Implement Zeroize" (`AUDIT_ROADMAP.md`) never completed; HKDF applied to blobs but not the sync handshake.
- **Metrics:** Severity: **Medium** | Effort: **S–M** | ROI: **Medium**
- **Remediation:** add `zeroize`/`Zeroizing` for key buffers; run every DH secret through HKDF with a protocol-specific `info`.

### [FINDING-15] — LLM PII redactor is incomplete and untested; permissive Tauri surface; Gemini key in URL

- **Description (bundled Medium/Low items):**
  - **PII gate gaps** — `packages/core-rs/src/llm/pii.rs` misses SSNs, addresses, DOBs, IBANs, **API keys / bearer tokens / private-key blocks**, JWTs, IPv6; CC check has no Luhn and only matches 16-digit 4-4-4-4; no tests. This is the gate before text reaches third-party LLMs. (T1)
  - **Tauri surface** — `apps/desktop/src-tauri/tauri.conf.json:16-19` `fs.all:true` scoped over `$DOWNLOAD/$DOCUMENT`; CSP `script-src 'self' 'unsafe-eval'` (`:82-83`). Mitigated by `allowlist.all:false` and no `shell.execute`. (T1)
  - **Gemini key in URL query** — `apps/desktop/src-tauri/src/commands/ai.rs:181-190` and `core-rs/src/llm/providers/gemini.rs:8` (`?key=`); `get_ai_config_cmd` returns the raw key to the frontend (`ai.rs:198-245`). Mitigated by SQLCipher-at-rest on desktop + masked input + logger redaction. (T1)
- **Metrics:** Severity: **Medium/Low** | Effort: **S each** | ROI: **Medium**
- **Remediation:** expand + test the PII redactor (add secret/token patterns, Luhn); narrow Tauri `fs` scope and drop `unsafe-eval`; move the Gemini key to the `x-goog-api-key` header and return a "configured" boolean instead of the raw key.

### [FINDING-16] — Desktop path/temp-file handling and client-only RBAC

- **Description (bundled Medium items, all T1-reproduced):**
  - **Backup path traversal** — `create/restore/delete/get_backup_details` accept a client `backup_id` that becomes a filesystem path with no traversal guard: `packages/core-rs/src/social/backup.rs:106,154,236` — `self.backup_dir.join(format!("{}.json.enc", backup_id))`. A `backup_id` of `../../x` escapes `backups/` for read/write/delete.
  - **Import arbitrary path** — `AdvancedImport.tsx:46` is a free-text absolute-path field flowing unvalidated to `import_from_obsidian_cmd`/`import_from_notion_cmd` (`commands/import.rs`); no canonicalization/scope check (bounded by local-first/self-directed use, but an unbounded-path sink at the boundary).
  - **OCR plaintext in shared temp** — `commands/ocr.rs:76-93` decrypts a blob and `fs::write`s it to `std::env::temp_dir()/noteece_ocr_<id>.png` (world-readable, predictable name, cleaned only on the happy path) — plaintext leakage of an encrypted asset plus a TOCTOU/symlink target.
  - **Client-only RBAC** — the mutating RBAC commands enforce no server-side authorization: `commands/collaboration.rs` calls `update_user_role(..., "system")` and `grant_permission(&conn, "default", ...)` with hardcoded actors and never invokes `check_permission`; the only guard is a disabled `<Select>` option in the UI. Any code that can `invoke` escalates privileges. (Bounded today because the whole auth UI is dead — FINDING-04 — but the commands are registered and reachable.)
- **Metrics:** Severity: **Medium** | Effort: **S each** | ROI: **Medium**
- **Remediation:** validate `backup_id` against `^[A-Za-z0-9_-]+$`; drive imports through the Tauri dialog plugin + canonicalize in Rust; use `tempfile::NamedTempFile` in a restricted dir for OCR; enforce authz in Rust against the current session before RBAC mutations.

### [FINDING-17] — Live Dashboard widgets fabricate realistic data instead of surfacing failure

- **Description:** When their (missing/rejecting) backend commands fail, several shipping Dashboard widgets render plausible fabricated data with no error state, so users cannot distinguish an outage from real figures.
- **Evidence Anchor (T1, reproduced):** `widgets/FinanceSnapshotWidget.tsx:64-65` — `income: Math.random()*200…`, `expenses: Math.random()*150…` (plus hardcoded net totals); `widgets/GamificationWidget.tsx:95-109` (fake XP/level/streak); `ProjectTimeline.tsx` and `components/TemporalGraph.tsx:265-275` render hashes of the record ID as "% complete"/node coordinates; `MainLayout.tsx:301-306` hardcodes a green "Sync Active" badge; `SpacedRepetition.tsx:148-156` shows a "Card Created!" toast with no backend call. Data-correctness bug: `modes/FinanceMode.tsx:94` renders cent amounts with `.toFixed(2)` and no `/100` → every total is 100× real.
- **Impact Matrix:** *Trust/Integrity:* financial and health figures shown to the user are fiction; masks the FINDING-04 command failures. *Reliability:* silent-failure culture (14 components `catch`→`logger.error` with no UI; 8 have no error handling and hang on "Loading…").
- **Metrics:** Severity: **Medium-High** | Effort: **M** | ROI: **High (trust)**
- **Remediation:** render explicit empty/error states; never substitute fabricated numbers; fix the FinanceMode cent scaling.

### [FINDING-18] — Correctness debt flagged for verification (lower confidence, T2/T3)

The secondary sweep surfaced additional defects that are plausible from the code but whose runtime reachability depends on schema/version state and was not fully reproduced here — listed so they are not lost, and to be confirmed with targeted tests:
- Migration hazards in `packages/core-rs/src/db/migrations.rs`: a `STORED` generated column added via `ALTER TABLE` (`:771`) (SQLite disallows adding STORED generated columns), a migration block missing its `schema_version` insert (`:495-527`), and `row.get(0).unwrap_or(0)` treating a version-read error as "version 0" (`:24`).
- `materialized_views.rs` column-name mismatches vs. the real `task`/`habit` schema (`:285,:296,:305`) whose errors are swallowed by `.unwrap_or(0)`.
- `sync/conflict_resolver.rs`: unbounded recursion on peer-controlled JSON (`merge_json_objects`, `:255`), LWW keyed on unauthenticated peer `timestamp` (`:131`), and merged entities not joining vector clocks (`:203-219`) → potential conflict re-loops.
- `import.rs` zip handling without per-entry/total decompressed caps (`:66-72`) (zip-bomb) and a weak `sanitize_filename` (`:502-509`).
- `plugin.rs` `NoteecePlugin` hands third-party code a raw `&Connection` with no sandbox/capability model (`:9-30`) — matches the still-open `NEXT_STEPS.md` "WASM Host" item.
- **Validation:** add tests that run migrations against a populated DB, exercise `refresh_dashboard_stats` on the production schema, feed hostile deltas/zip archives, and fuzz the conflict merger.

---

## 4. Peer Benchmarking & Parallel Analysis

- **Reference Systems:** Standard Notes / Obsidian (E2EE local-first), Signal (authenticated store-and-forward + SAS pairing), Tauri hardening guidance, RustCrypto/dalek handshake conventions (Noise/X3DH), `op-sqlite` (RN SQLCipher).
- **What Noteece does well (T1 positives, reproduced):**
  - **Desktop AEAD content crypto is correct:** XChaCha20-Poly1305 with fresh 192-bit `OsRng` nonces (no reuse), DEK wrapped under a PBKDF2 KEK via AES-KW/RFC 3394, SQLCipher v4 at rest (`vault.rs:29-56`). CSPRNG throughout — **no weak RNG found**. Real negative crypto tests (`crypto_tests.rs`, `binary_encryption_tests.rs`) incl. nonce-uniqueness and tamper cases. Mobile vault *primitives* (Argon2id t=3/m=64MB/p=4, ChaCha20-Poly1305, constant-time compare, DEK zeroization) are appropriate — the defect is that they protect only the DEK, not the data (FINDING-01).
  - **Injection posture (desktop) is good:** no `dangerouslySetInnerHTML`/`eval` in app code; Lexical structured editor (no markdown→HTML sink); `automation-dsl` is a capability-sandboxed AST interpreter (fixed function/action allowlists), not an eval sink — though it is currently unwired (imported by no app). Several RN modules validate well (`music-security.ts` URL allowlist, `sync-client.ts upsertEntity` per-table column allowlists + parameterized queries, `nfc-triggers.ts`).
  - **Hygiene:** frontend logger redacts secrets; **no live secrets committed**; lockfiles committed with `--frozen-lockfile`; substantive test suites (53 Rust / 50 desktop / 16 mobile + Playwright e2e).
- **Historical Pitfalls mirrored here:** plaintext-at-rest behind an encryption UI (FINDING-01), accessibility scraping of E2EE apps via a store-evading sideload (FINDING-02), and unauthenticated LAN sync (FINDING-10) are exactly the patterns that draw breach disclosure and app-store/regulatory action. All are present and must be gated before release.
- **Portability Targets:** `op-sqlite`/SQLCipher for RN at-rest; Signal-style SAS pairing + fetch authentication for sync/relay; Tauri narrowed `fs` scope + `unsafe-eval`-free CSP; generated/linted IPC contract; `zeroize` + HKDF-on-DH from the dalek ecosystem.

---

## 5. Prioritized Transformation Roadmap

- **Phase 1 — Immediate Stabilization (block any release):**
  1. Fix the broken vault entry (rename to `_cmd`, surface errors) and add the IPC-contract CI gate + a vault-opening E2E; register/delete the ghost AI/auth commands (FINDING-04).
  2. Encrypt mobile data at rest — wire the DEK to persistence (FINDING-01).
  3. Governance + engineering decision on Prime interception; implement redaction + consent or remove E2EE/dating capture; strip plaintext logcat (FINDING-02).
  4. Fix the vault AAD lockout (FINDING-05) and the UTF-8 ingest panic (FINDING-07); stop widgets fabricating data + fix FinanceMode 100× bug (FINDING-17).
  5. Real Android release signing + `allowBackup=false` (FINDING-06); guard backup/import paths + OCR temp files (FINDING-16).
  6. Mark `relay-server` and mobile P2P sync pre-alpha; do not expose (FINDING-03/09/10). Correct the false `SECURITY.md`/`STATUS.md`/`EXECUTIVE_SUMMARY.md` claims (§6).
- **Phase 2 — High-Leverage Upgrades:**
  1. Relay + sync authentication, TLS/verification, rate limits, bounded deserialization (FINDING-03/09/10).
  2. Legacy mobile salt migration + unlock rate limiting (FINDING-08).
  3. CodeQL + Dependabot + `cargo/pnpm audit`; harden installers; scope workflow permissions (FINDING-11).
  4. Selector verification with a real key (FINDING-12); pragma/kdf_iter hardening (FINDING-13); `zeroize` + HKDF (FINDING-14); PII redactor + Tauri CSP/fs + Gemini header (FINDING-15).
- **Phase 3 — Strategic Modernization (10x):**
  1. Compile-time/CI IPC-contract generation so `invoke` names and `generate_handler!` cannot diverge.
  2. Capability-sandboxed plugin host (WASM) — the open `NEXT_STEPS.md` item, before any third-party plugin ships.
  3. Fuzz untrusted parsers (`ical`, `gray_matter`, import/zip, conflict merger); upgrade the outdated network stack (`reqwest 0.11`, `tokio-tungstenite 0.20`); add tests for `packages/ui`/`packages/types` (currently zero) and a CI coverage gate (today `continue-on-error` + warning-only).

---

## 6. Contradiction & Drift Search (Phase 4 Cross-Check)

| # | Claim (source) | Reality (T1 evidence) | Type |
| :--- | :--- | :--- | :--- |
| 1 | "DEK → encrypts all user data" / "zero-knowledge" / "multiple layers of encryption" (`apps/mobile/SECURITY.md`) | Mobile RN DB is plaintext `expo-sqlite`; DEK never wired to it (`database.ts:585`) | Spec ↔ Impl (Critical) |
| 2 | "Production Ready" / "stable, secure" (`EXECUTIVE_SUMMARY.md`) | Plaintext mobile at rest + Prime legal exposure + broken AI backend + unauth relay/sync | Spec ↔ Impl |
| 3 | "Argon2id (KDF)" for encryption (`EXECUTIVE_SUMMARY.md`) | Desktop encryption key uses **PBKDF2-HMAC-SHA512** (`crypto.rs:28`, `vault.rs`); Argon2 only for password-**auth** hashing (`auth.rs:90-93`) | Doc ↔ Code |
| 4 | "No Accounts or Servers … data never passes through a central server" (`docs/security/PRIVACY.md`) | Repo ships a plaintext-HTTP `relay-server`; PRIVACY.md & TERMS.md are `[NEEDS LEGAL REVIEW]` placeholders | Doc ↔ Code |
| 5 | Prime "redact / exclude private messages / review before saving" (`08_Prime_Interception.md`) | None implemented in the mobile capture path; `onNoteAnchored` has no consumer | Spec ↔ Impl |
| 6 | `SECURITY.md`: HKDF-SHA256, ECDH P-256, "cloud backup compromise protected" | Code uses X25519 + ad-hoc HMAC KDF; `allowBackup=true` + plaintext AsyncStorage vault metadata | Doc ↔ Code |
| 7 | "Removed unsafe `unwrap()` in core-rs critical paths" (`ISSUES.md`) | Network/deserialization paths are indeed safe, **but** the accessibility-ingest path panics (`stream_processor.rs:108`, `jni.rs:78`) | Doc ↔ Code (partial) |
| 8 | Roadmap "Implement Zeroize", "Tighten Desktop CSP" (`AUDIT_ROADMAP.md`) | `zeroize` absent; CSP still `unsafe-eval` | Plan ↔ Impl |
| 9 | `STATUS.md` "Last Updated 2024-05-22"; `EXECUTIVE_SUMMARY.md` Feb 2024 | Code carries 2025-12 changelog entries — status docs stale | Doc drift |

---

## Appendix A — Evidence-Tier Summary of Negative (No-Issue) Checks

- Weak RNG: **not found** (all `OsRng`/`thread_rng`/`rand::random` CSPRNG) — T1.
- Nonce reuse: **not found** (random 192-bit XChaCha nonces) — T1.
- `unwrap()` panic on untrusted **network/deserialization** input in `core-rs`: **not found** (LLM providers, sync handler, CalDAV use `map_err`/`try_from`) — T1. *Caveat:* the accessibility-**ingest** path is not clean — see FINDING-07.
- Committed live secrets (`AKIA`/`sk-`/`ghp_`/PEM): **not found** (placeholders/test fixtures only) — T1.
- `dangerouslySetInnerHTML` / `eval` / `new Function` in desktop app code: **not found** — T1.
- SQL injection in the current desktop search path: **not found** (parameter binding) — T1. *Caveat:* `pragma_tuning.rs` uses `format!`-built PRAGMA (FINDING-13); `TaskQueryBuilder` (`task/query.rs`) is an unsafe-by-construction but **dead/unused** builder.

## Appendix B — Assumptions & Unknowns

- **T3:** the `relay-server` is not yet reachable from shipping clients (the Rust `RelayClient` is unreferenced by apps); its findings are pre-integration but fully implemented and testable.
- **T3:** `PragmaConfig` values reaching `pragma_tuning.rs` are internally-generated enums/numbers today, limiting the injection reachability of FINDING-13 (the swallowed `kdf_iter` error is the live half).
- **T4:** the root `legal/` directory was out of the security scope and not audited; whether any user-facing Prime consent/disclaimer exists there is unverified. The outdated `reqwest 0.11`/`tokio-tungstenite 0.20` trees were assessed by version, not by running `cargo audit` (no network scan performed).
- **T2/T3:** FINDING-16 items are code-evident but their runtime reachability depends on DB/version state and were not fully reproduced; they are listed for targeted verification, not asserted as confirmed live faults.

---

_Audit conducted 2026-07-26. Findings are reproducible from the cited `file:line` anchors on the audited commit. This document records observations only; no application code was modified._
