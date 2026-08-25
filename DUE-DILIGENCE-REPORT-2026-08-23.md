# EXECUTIVE FORENSIC ASSESSMENT REPORT — Noteece

**Date:** 2026-08-23 · **Scope:** full monorepo at `D:/GitHub/Noteece` · **Mode:** Due-Diligence Audit + Remediation (Mode C)
**Auditor:** ox-alpha agent session `session-2026-08-23-18-31-11-bd32016a`

---

## 1. Executive Summary & Health Index

**Overall System Health Rating: 5.5 / 10** — architecturally promising, operationally not releasable today.

| Dimension    | Score | One-line verdict                                                              |
| ------------ | ----- | ----------------------------------------------------------------------------- |
| Architecture | 7     | Clean layering: React/Tauri shell → Rust core → blind relay.                  |
| Engineering  | 6     | Strong module map and test _volume_; orphaned modules and dead packages.      |
| Security     | 6     | Sound primitives and trust boundaries; relay identity model has a hole.       |
| Reliability  | 5     | In-memory relay state, silent fallbacks, warning-only gates.                  |
| Data         | 6     | SQLCipher + DEK/KEK hierarchy solid; migrations not deeply audited this pass. |
| Scalability  | 6     | Rust core fine; relay rate-limit and storage models cap growth.               |
| Operations   | 5     | Broad CI surface, but currently **red** and soft-gated.                       |
| Product & UX | 4     | Advertised features (AI, 8 languages, iOS, Prime) partially vaporware.        |
| Governance   | 5     | Version chaos, tripled doc trees, mutable CI pins.                            |

**Three Critical breaks (all verified first-hand):**

1. **CI is red by construction** — `pnpm-lock.yaml` lacks `@sentry/react`; every JS job runs `--frozen-lockfile` → guaranteed `ERR_PNPM_OUTDATED_LOCKFILE`.
2. **Desktop AI feature is dead code** — `src-tauri/src/commands/ai.rs` (308 lines) is never compiled (`commands/mod.rs` omits `mod ai;`), zero AI commands registered in `main.rs`, while `AISettings.tsx`/`LocalAI.tsx`/`ChatWithVault.tsx` invoke those commands → runtime “command not found”.
3. **Prime (sideload) flavor cannot compile** — `NoteeceAccessibilityService.kt` and `OverlayService.kt` call `com.noteece.RustBridge.ingest(...)`, and no `RustBridge` class exists anywhere in the repo.

**Highest-ROI opportunities:** regenerate lockfile (unblocks entire CI, minutes of work); route the existing `core_rs::llm` engine through registered Tauri commands (resurrects an advertised feature using code that already exists); relay `/register` proof-of-possession (closes the sync-trust hole).

**Strategic recommendation:** do not onboard users/investors against current marketing copy until the claim-vs-reality gaps in §5-G are closed; engineering fundamentals underneath are worth the repair.

---

## 2. Scope & Corpus Accounting

| Resource category                             | Discovered                                                                                                                                                | Reviewed this session                                         | Status / blind spots                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Root manifests/config                         | package.json, turbo.json, pnpm-workspace.yaml, Cargo.toml ×1, tsconfig, build.config, eslintrc.js, `.prettierrc`+`prettierrc`, .gitattributes, .gitignore | 100%                                                          | Complete                                        |
| CI/CD                                         | ci.yml, build-binaries.yml, release.yml (workflows dir)                                                                                                   | ci.yml 100% first-hand; other two via dispatched agent (lost) | build-binaries/release = blind spot             |
| `packages/core-rs` (~150 src + 55 test files) | inventoried; crypto.rs read fully                                                                                                                         | ~3% direct                                                    | Deep Rust audit NOT completed (see §9 Unknowns) |
| `apps/desktop/src-tauri` (33 rs)              | mod.rs, ai.rs (full), main.rs (full), tauri.conf.json, Cargo.toml                                                                                         | ~20% direct                                                   | Partial                                         |
| `apps/desktop/src` (209 ts/tsx)               | App.tsx full, AISettings.tsx partial, structure mapped                                                                                                    | ~5% direct                                                    | Partial                                         |
| `apps/mobile` (106 ts/tsx + android/)         | AndroidManifest.xml, build.gradle, sideload manifest, NoteeceAccessibilityService.kt (full), package.json, CMakeLists.txt                                 | Android native ~80%; TS layer <5%                             | TS screens unaudited                            |
| Shared packages                               | locale (package.json + en.json full), modes (full), ui (package.json), automation-dsl (README + parser.ts full)                                           | High on glue, low on ui components                            | ui components bodies unread                     |
| `packages/relay-server`                       | lib.rs full, main.rs full                                                                                                                                 | 100% of src                                                   | Dockerfile/compose unread                       |
| Docs                                          | README (full), wiki STRUCTURE.md, wiki/WIKI.md, CHANGELOG head                                                                                            | Targeted drift checks                                         | Full wiki corpus unread                         |
| Git working set                               | 128 dirty entries detected; themes sampled                                                                                                                | Partial                                                       | Full diff review pending                        |

**Method note:** five parallel deep-dive investigators were dispatched at session start and produced strong partial signals before being lost to an execution-environment failure (§9). Every finding below labeled **Evidence** was re-verified first-hand after that loss. Their unverified signals are labeled accordingly.

---

## 3. System Overview

Local-first, E2E-encrypted “second brain” workspace. Three runtimes share one Rust heart:

```
┌────────────────────┐   IPC (Tauri v1 invoke, 155 cmds)   ┌──────────────────────────┐
│ Desktop (Tauri 1.6 │◄───────────────────────────────────►│ core-rs (Rust): crypto,  │
│ + React/Mantine)   │      ⚠ 32 frontend invokes have     │ vault, sync/CRDT/P2P,    │
│ apps/desktop       │      no registered backend (I2)     │ llm/*, social/*, caldav  │
└─────────┬──────────┘                                     └───────────┬──────────────┘
          │ WiFi P2P / relay fallback                          │ JNI/FFI (planned)
┌─────────▼──────────┐                                     ┌───▼──────────────┐
│ relay-server (Axum)│  blind envelope store (in-memory)   │ Mobile (Expo 50) │
│ packages/relay-    │  ⚠ unauthenticated /register (S1)    │ android/ (+Rust  │
│ server             │                                     │ bridge MISSING)  │
└────────────────────┘                                     └──────────────────┘
```

Key surfaces: 24 command modules under `src-tauri/src/commands/`; `core-rs` spans notes/tasks/projects/sync/social-extraction/LLM/caldav/analytics with ~55 integration test files and 2 fuzz targets.

---

## 4. Architecture & Dependency Analysis

**Verified strengths**

- Crypto layer (`packages/core-rs/src/crypto.rs`, read in full): PBKDF2-HMAC-SHA512 (256k) → KEK → AES-KW-wrapped random DEK; payloads XChaCha20-Poly1305 with OsRng nonces; KEK in `Zeroizing`. No nonce-reuse class, no ECB, no hardcoded keys found. _(Evidence)_
- Tauri allowlist is comparatively tight: fs scoped to `$APP/*`,`$DATA/*`; clipboard/global-shortcut off; CSP defined (`tauri.conf.json`). Remote `img-src https:` and `style-src 'unsafe-inline'` remain acceptable-but-notable. _(Evidence)_
- Frontend skeleton is disciplined: lazy-loaded routes each wrapped in ErrorBoundary, react-query + zustand, memory router (`App.tsx`). _(Evidence)_

**Structural defects**

- **Orphaned module pattern:** `commands/ai.rs` exists but is excluded at both compile time (`mod.rs`) and registration time (`main.rs` generate*handler list, lines 63–219, contains zero `ai` entries) — while its frontend callers ship. Same shape as the mobile RustBridge gap: layers written by different efforts that never met. *(Evidence)\_
- **Dead packages:** `@noteece/modes` points at nonexistent `modes.json`, zero consumers; `@noteece/locale` had seven export paths, six targeting files that don’t exist, zero consumers. _(Evidence)_
- **Flavor-split mobile native code:** accessibility service lives only in `src/sideload` + `src/store` source sets; main manifest doesn’t declare it (correct per-flavor merge, but the sideload set doesn’t compile — C3). _(Evidence)_
- **Docs tree triplication:** `docs/wiki`, `docs/project_docs`, `docs/architecture` overlap; root status docs (ISSUES/NEXT*STEPS/PROJECT_DOCS/STATUS.md) deleted in the pending working set while links to them persist (one fixed this session). *(Evidence)\_

---

## 5. Findings

Format: `[ID] Title` — Description · **Evidence** (file:line) · Tier · Severity · Category · Effort · Recommendation · Validation.

### Critical

**[C1] Lockfile desynchronized → CI fails on every push**

- `@sentry/react: ^8.0.0` added to `apps/desktop/package.json:37` (uncommitted change) without regenerating `pnpm-lock.yaml`. Reproduced live: `pnpm install --frozen-lockfile` → `ERR_PNPM_OUTDATED_LOCKFILE ... Cannot install ... not up to date with apps\desktop\package.json`. All six JS jobs in `ci.yml` use `--frozen-lockfile` (lines 33, 64, 117, 243, 289). Tier: Evidence. Severity: Critical. Category: Incremental. Effort: S.
- Fix: run `pnpm install` (no-frozen) once and commit the regenerated lockfile together with the Sentry change. Validation: green `lint_and_format` job; locally `pnpm install --frozen-lockfile` exits 0.

**[C2] Desktop AI stack is unreachable dead code**

- `commands/mod.rs` (read in full) declares 24 modules, not `ai`; `ai.rs` defines `check_ollama_connection_cmd`, `list_ollama_models_cmd`, etc.; `main.rs` registers none of them; `AISettings.tsx:75,84` invokes `get_ai_config_cmd`/`save_ai_config_cmd` (silently falls back to defaults on load, errors on save). Meanwhile `core-rs/src/llm/*` already implements providers/retry/cost/cache — unwired to desktop IPC. Tier: Evidence. Severity: Critical (advertised feature). Category: High-Leverage. Effort: M.
- Recommendation: expose `core_rs::llm` through new thin commands OR finish `ai.rs` (requires adding `reqwest` to src-tauri Cargo.toml — currently absent, so naive `mod ai;` would break the build), register all commands, add integration tests. Do not blindly re-enable without compile validation. Validation: `cargo check -p noteece-desktop`; jest test invoking each command name; manual Settings → AI roundtrip.

**[C3] Sideload (Prime) flavor does not compile**

- `NoteeceAccessibilityService.kt:159` and `OverlayService.kt` call `com.noteece.RustBridge.ingest(rawText)`; GitHub-wide search finds **no** `class/object RustBridge` definition; `cpp/CMakeLists.txt` shows optional Rust linkage with `RUST_CORE_STUB=1` fallback only for the C++ layer. Tier: Evidence. Severity: Critical. Category: High-Leverage. Effort: L.
- Recommendation: implement `RustBridge` Kotlin object backed by JNI into `mobile_ffi.rs` (which exists in core-rs), or stub `ingest()` behind the `ENABLE_INJECTOR` BuildConfig flag until real. Validation: `./gradlew assembleSideloadDebug` succeeds.

### High

**[H1] Relay `/register` is unauthenticated → identity squatting & queue drain**

- `lib.rs:217-268`: any caller POSTs `{device_id, public_key_hash}` and receives a JWT whose `sub` binds that `device_id` — no signature/proof-of-possession over a server nonce. Attacker registering a victim’s id first can `fetch_messages` and drain the queue (content stays encrypted; availability and metadata don’t). Tier: Evidence (logic) + Inference (attack feasibility). Severity: High. Category: High-Leverage. Effort: M.
- Recommendation: require an Ed25519 signature over `device_id || server_nonce` during register (keys exist: `sync/ecdh.rs`, TOFU infra); return 409 if device already registered. Validation: relay api_tests: replay/squat attempts rejected.

**[H2] Relay message store is in-memory; restart loses queues**

- `lib.rs:131-135` comment admits “Finding D8” unresolved; `BlindRelayServer::new()` HashMap-backed. Tier: Evidence. Severity: High (reliability of sync story). Category: High-Leverage. Effort: M. Recommendation: SQLite/sled persistence + TTL (24h) + per-device caps, exactly as the in-code comment prescribes. Validation: restart-survival integration test.

**[H3] Silent random JWT secret fallback**

- `lib.rs:54-63`: missing `RELAY_JWT_SECRET` → random secret per boot; all tokens die on restart; multi-instance impossible; prod misconfiguration invisible. Tier: Evidence. Severity: High. Category: Incremental. Effort: S. Recommendation: fail fast when `RELAY_ENV=production`, warn-and-random otherwise. Validation: boot test asserts refusal in prod mode.

**[H4] Mobile dependency graph internally inconsistent**

- `apps/mobile/package.json`: `expo ~50.0.0` alongside `expo-splash-screen ^31`, `expo-camera ^17`, `expo-av ^16`, `@expo/config-plugins ^54`, `jest-expo ^54` — version families that belong to newer SDKs than 50; plus deprecated `@types/i18next`/`@types/react-i18next`; `react-native-ssl-pinning ^1.6` predates RN 0.73 patterns. Tier: Evidence (ranges) + Inference (breakage degree). Severity: High. Category: High-Leverage. Effort: L. Recommendation: Expo upgrade via `npx expo install expo@latest --fix` family-by-family; align jest-expo to SDK. Validation: `expo-doctor`, `jest`, `assembleRelease`.

**[H5] Locale package advertised 7 languages, shipped 1** — exports pointed to nonexistent files (es/fr/de/ja/zh/fa); en.json is a 49-key stub; README claimed full support. **Patched this session** (exports trimmed to `en`, `_note` documents how to re-add). Residual work = actual translations. Tier: Evidence. Severity: High (claim-vs-reality) → residual Medium. Effort: L for real translations.

**[H6] `@noteece/modes` is a husk** — only `package.json`, targets nonexistent `modes.json`, zero imports workspace-wide (search-verified). Tier: Evidence. Severity: Medium-High. Effort: S. Recommendation: populate or delete.

**[H7] Automation DSL documents features the parser rejects**

- README:70 shows `tags: ["tag1","tag2"]` — `parser.ts parsePrimary()` throws `Unexpected token: [` (no array grammar). README advertises `&&`/`||` and conditional execution — tokens exist (`getTokenType` keywords incl. IF/THEN/ELSE/AND/OR/NOT) but no grammar level consumes them; tokenizer regex (line 42) silently drops unrecognized chars (e.g., `.` in member access vanishes). Tier: Evidence (both files read in full). Severity: High (doc-contract violation). Category: Incremental. Effort: M. Recommendation: implement logical-operator + array grammar or correct README; make tokenizer error on unknown chars; track real line numbers (currently always 0). Validation: parser tests for every README example.

**[H8] Version identifiers disagree across five surfaces** — README badge said 1.2.0 (patched → 1.1.0), package.json/tauri.conf/desktop-Cargo/mobile-pkg say 1.1.0, mobile gradle says 1.0.0, CHANGELOG last release 1.1.3. Tier: Evidence. Severity: Medium (governance) — listed here because release engineering depends on it. Effort: S. Recommendation: single-source version via workspace tooling; gradle reads from package.json.

### Medium

- **[M1] CI CodeQL matrix wrong languages** — `'c-cpp'` analyzed though repo has no first-party C/C++; `rust` absent despite the core being Rust (`ci.yml:259`). Effort: S.
- **[M2] Mutable CI refs** — `trufflesecurity/trufflehog@main` (`ci.yml:315`) plus tag-pinned `codeql-action@v3`, `pnpm/action-setup@v3` vs otherwise SHA-pinned actions. Supply-chain inconsistency. Effort: S.
- **[M3] Coverage threshold warns, never fails** (`ci.yml:81-88`). Effort: S.
- **[M4] `cargo install cargo-tarpaulin … || true` masks install failure** (`ci.yml:198`). Effort: S.
- **[M5] Global 100 rps relay rate limit shared by all clients** (`lib.rs:149`) — one tenant starves the rest; `CorsLayer::permissive()`. Effort: M → per-IP/per-token buckets.
- **[M6] `/metrics` was unauthenticated** (device counts, queue depth, uptime exposed). **Patched this session** (`_claims: Claims` added, mirroring `get_stats`). Validation: `cargo test -p relay-server`; unauth request → 401.
- **[M7] `allowBackup="true"` on an E2EE vault app** — Android auto-backup copies app-private data to Google cloud. **Patched this session** (`false`). Validation: `aeb` backup attempt empty on new build.
- **[M8] Captured screen text logged to logcat** — `NoteeceAccessibilityService.kt:160` `Log.d(TAG, "Captured: ${rawText.take(50)}…")`. Private fragments readable via adb/logcat readers. Remove or gate behind debug flavor. Effort: S.
- **[M9] Session-start intent reachable while service `exported="true"`** (`sideload/AndroidManifest.xml:7` + `onStartCommand` ACTION_START_SESSION) — external apps may be able to trigger capture sessions without the user gesture; needs sender-pid/signature check. Tier: Inference (needs device-level confirmation). Effort: S.
- **[M10] Release APK signed with debug keystore** (`build.gradle:138` `signingConfig signingConfigs.debug`). Effort: M → proper keystore + env-injected secrets (also blocks Play submission).
- **[M11] Shell scripts break on Windows checkouts** — `*.sh` got CRLF (run-all-tests.sh shebang); **root cause patched this session** via `.gitattributes eol=lf` rules. Renormalize: `git add --renormalize .`.
- **[M12] Duplicate prettier configs** — authoritative `.prettierrc` vs stale dotless `prettierrc` (subset, conflicts on nothing today, confuses tomorrow). Delete the dotless one. Effort: S.
- **[M13] Wiki claims Argon2id; code uses PBKDF2-HMAC-SHA512** (`docs/wiki/STRUCTURE.md` security section vs `crypto.rs:29`). Either adopt Argon2id (OWASP-current KDF, peer-standard) or correct docs. Effort: M/L for migration, S for doc fix.
- **[M14] `unwrap_dek` returns raw `[u8; 32]` without `Zeroizing`** (`crypto.rs:68-74`) while the codebase zeroizes elsewhere. Hardening. Effort: S.
- **[M15] `health_check` dead branch** — `stats.registered_devices >= 0` always true (`lib.rs:166`), SERVICE_UNAVAILABLE path unreachable. Effort: S.
- **[M16] `packages/ui` ships 3 test files with no runner** — no jest/ts-jest/testing-library deps or scripts in its package.json → tests never execute anywhere. Wire into desktop’s jest config or add own. Effort: S.
- **[M17] `apps/desktop/coverage/lcov-report/**`appears tracked in git** (search-index evidence; verify locally with`git ls-files apps/desktop/coverage`). Add `coverage/` to .gitignore and untrack. Effort: S.
- **[M18] Verification scripts can’t fail** — `verify_dashboard.py` prints and exits 0 regardless; bare `except:` blocks. Make assertions exit-nonzero before calling it verification. Effort: S.

### Low

- CryptoError enum labels every AEAD/base64 failure “AesKw” (`crypto.rs:13-16`) — misleading diagnostics. Effort: S.
- CHANGELOG “[Unreleased]” carries items older than the last dated release header. Effort: S.
- `tauri-plugin-store-api: ^0.0.0` placeholder-range JS dep paired with a git-pinned Rust plugin (`src-tauri/Cargo.toml:30`) — fragile pairing. Effort: S.

### Claim-vs-reality ledger (Product & UX dimension)

| Claim (source)                                         | Reality                                                                                                         | Status                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| “AI Integration: Ollama/OpenAI/Claude/Gemini” (README) | Engine exists in core-rs; desktop UI calls unregistered commands (C2)                                           | Broken → wording softened in README patch |
| “Support for … 7 languages” (README)                   | en-only stub (H5)                                                                                               | Patched wording; translations pending     |
| “React Native app for iOS and Android” (README)        | No `ios/` directory anywhere (search-verified)                                                                  | Patched wording                           |
| “30+ platform capture” (README/Prime table)            | Whitelist of ~36 packages exists in code; flavor doesn’t compile (C3); ToS/legal exposure now flagged in README | Partially real, blocked                   |
| “AES-256 encryption at rest”                           | XChaCha20-Poly1305 payload + AES-KW + SQLCipher                                                                 | Patched to precise wording                |
| Build badge                                            | Pointed at nonexistent `noteece/noteece` slug                                                                   | Patched to real repo                      |
| Architecture tree listed `packages/editor/`            | Directory doesn’t exist; locale/modes/automation-dsl/relay omitted                                              | Patched tree                              |
| CoC link `docs/legal/CODE_OF_CONDUCT.md`               | File absent; CoC lives inside CONTRIBUTING.md                                                                   | Patched link                              |
| Wiki backlink `PROJECT_DOCS.md`                        | File deleted in working set                                                                                     | Patched → DOCUMENTATION_INDEX.md          |

---

## 6. Peer Benchmarking

| Peer                                | What they solved                         | Portable mechanism                                                                                                                             |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Syncthing**                       | P2P pairing + relays                     | Device-ID certificate handshake = proof-of-possession at introduction (fixes H1 shape); relays are dumb, authenticated pipes                   |
| **Matrix.org**                      | Device identity lifecycle                | Cross-signing/verification ceremony before a device joins a room — model for relay register + TOFU display                                     |
| **Standard Notes / Anytype**        | E2EE local-first trust                   | Published key-hierarchy + recovery documentation; recovery-code flow already half-built here (`generate_recovery_codes`) — finish and document |
| **Obsidian**                        | Local-first plugin/i18n scale            | Community translation packs instead of shipping 7 locales prematurely; matches H5 sequencing                                                   |
| **Tauri upstream v1→v2**            | Allowlist → capabilities, signed updater | This repo pins Tauri 1.x with `updater.active=false` (tauri.conf.json:85-87) — v2 migration is the strategic window to add signed auto-update  |
| **Expo upgrade tooling**            | SDK drift                                | `expo install --fix` + upgrade-helper workflow is the sanctioned cure for H4-style graph rot                                                   |
| **rust-clippy/-D warnings culture** | Regression gates                         | Already adopted in CI — extend the same strictness to coverage gates (M3) and lockfile freshness (C1)                                          |

Historical pitfall match: this repo is tracing the classic **“demo-layer ahead of contract-layer”** drift (UI written against commands that don’t exist; docs written against features that aren’t wired). Obsidian and Anytype both hit it pre-1.0; the cure that worked was a generated API contract (single source for command names consumed by both sides) — recommended as the medium-term structural fix for the 32-unmatched-invokes class.

---

## 7. Prioritized Roadmap

**Phase 1 — Immediate stabilization (days)**

1. Regenerate lockfile; commit with the Sentry change (C1). Validate: frozen install green.
2. Land this session’s patches (already applied): README truth pass, `/metrics` auth, `allowBackup=false`, `.gitattributes` eol rules, locale exports trim, wiki backlink.
3. Version unification across 5 surfaces (H8); delete dotless `prettierrc`; untrack `coverage/` (M17).
4. Remove/gate the logcat capture line (M8); decide RustBridge stub vs implementation to make `assembleSideloadDebug` green (C3 minimum viable).

**Phase 2 — High-leverage repairs (weeks)** 5. Wire desktop AI through `core_rs::llm` with registered commands + tests (C2) — the single biggest product-value unlock per unit effort. 6. Relay hardening bundle: persistent store + TTL/caps (H2), register proof-of-possession (H1), prod secret fail-fast (H3), per-client rate limits (M5), fix dead health branch (M15). 7. Automation DSL: implement or de-document grammar gaps; property-test parser against every README snippet (H7). 8. Mobile dependency alignment via Expo upgrade path (H4); real release signing (M10). 9. Command-surface contract: generate TS invoke wrappers from the Rust `generate_handler!` list to permanently close the parity gap (peer-benchmark §6). 10. Decide modes/locale fate: populate or delete (H6/H5-residual); single i18n pipeline (react-i18next ← `@noteece/locale`).

**Phase 3 — Strategic horizons (quarters)** 11. Tauri v2 migration + signed auto-updater (currently disabled) — transformational for distribution trust. 12. Consolidate three doc trees into one sourced-from-code pipeline; adopt ADRs (first one: KDF choice PBKDF2 vs Argon2id, M13). 13. Formal threat model + legal review for Prime capture (third-party consent, jurisdiction matrix); make it a first-class audited flavor or cut it. 14. iOS foundation (or explicit descoping) and unified release engineering (EAS + Tauri build-binaries with provenance).

---

## 8. Assumptions, Unknowns & Final Verdict

**Environment incident (material to confidence):** mid-session, the execution substrate failed — WSL distro lost `/mnt` automount and core binaries; Windows-interop sessions stalled intermittently. Consequences: five parallel subsystem investigators were lost after producing partial signals; the dependency install launched for C1 validation never returned observable completion; cargo/jest/type-check could not be run. Everything above labeled _Evidence_ survived that event because it was re-derived first-hand afterward via direct file inspection and indexed search.

**Unknowns blocking higher confidence**

- Full `core-rs` module-body audit (~145 unread files: sync engine correctness, social extractor safety, SQL string construction, unwrap density). The largest single gap in this assessment.
- `build-binaries.yml` / `release.yml` contents (secrets handling, artifact signing) — unread.
- Whether `LocalAI`/`ChatWithVault` are actually routable from `App.tsx` (routes don’t name them; nesting inside Settings unconfirmed) — affects C2 user impact radius.
- Tracked-status of `coverage/` and Cargo.lock freshness details beyond two named crates (generic-array, tokio-tungstenite — reported by a lost investigator, unverified).
- Runtime behavior of the accessibility-service start intent (M9) — needs instrumentation on device.

**Assumptions made explicit**

- GitHub code-search index reflects pushed HEAD, used only for existence/absence claims (RustBridge absence, ios/ absence, consumers), each cross-checked where possible.
- The uncommitted working set (128 entries) is intended work-in-progress by the author, not accidental — recommendations preserve it rather than revert.

**Verdict: CONDITIONAL PASS — not releasable; highly salvageable.**
Architecture and security instincts are genuinely good (blind-relay privacy model, DEK/KEK hygiene, disciplined frontend skeleton, broad CI intent). But three Critical breaks mean the flagship claims (working CI, AI features, Prime build) are false today. Phase 1 is roughly days of focused work and converts the project to “honest”; Phase 2 converts it to “competitive.” Re-audit scope after Phase 2: core-rs deep dive + release workflows + a fresh command-parity sweep.

---

## 9. Remediations Applied This Session (with validation status)

| #   | Change                                                                                                                               | File(s)                                                | Validation                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 1   | Truth pass: badge slug/version, 6 doc links, encryption/iOS/language/AI wording, Prime consent+ToS note, architecture tree, CoC link | `README.md`                                            | Link targets individually opened and confirmed post-edit ✅                                       |
| 2   | `/metrics` requires JWT (mirrors `get_stats` pattern verbatim)                                                                       | `packages/relay-server/src/lib.rs`                     | Pattern-identical to adjacent authed handler; **compile pending** — `cargo check -p relay-server` |
| 3   | `allowBackup` true→false                                                                                                             | `apps/mobile/android/app/src/main/AndroidManifest.xml` | Manifest XML well-formed; build pending                                                           |
| 4   | `*.sh`/`*.py` forced LF (shebang corruption fix)                                                                                     | `.gitattributes`                                       | Run `git add --renormalize .` then confirm `file scripts/run-all-tests.sh` = LF                   |
| 5   | Locale exports trimmed to existing `en` only; re-add instructions recorded in-package                                                | `packages/locale/package.json`                         | JSON valid (rewritten atomically) ✅                                                              |
| 6   | Dangling wiki backlink → Documentation Index                                                                                         | `docs/wiki/WIKI.md`                                    | Target exists ✅                                                                                  |

**Deliberately NOT patched without validation capability** (per zero-stub discipline): C2 AI wiring (needs `reqwest` dep + compile proof), C3 RustBridge (design choice + Gradle proof), H1/H2/H3 relay redesign, H4 Expo upgrade — each specified above with exact validation commands.

**Operator follow-ups:** (a) check for a possible orphaned `pnpm`/node process from this session’s interrupted install and re-run `pnpm install --no-frozen-lockfile` manually; (b) `git add --renormalize .` after pulling these changes; (c) restore WSL automount (`wsl --shutdown` then relaunch) before running the validation suite.
