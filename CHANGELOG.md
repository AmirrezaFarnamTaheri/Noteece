# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Desktop AI:** Registered all seven AI commands (`check_ollama_connection_cmd`, `list_ollama_models_cmd`, `chat_with_ollama_cmd`, `test_cloud_provider_cmd`, `get_ai_config_cmd`, `save_ai_config_cmd`, `ingest_social_capture_cmd`) and compiled the previously orphaned `commands/ai.rs` module; added reqwest (rustls) to the Tauri shell.
- **Schema:** Added migration v26 creating `ai_config` and `capture_post` tables; capture ingestion now writes to `capture_post` instead of an incompatible `social_post` insert that always failed.
- **Relay:** Device registration now rejects identity conflicts (HTTP 409) instead of silently overwriting; JWT secret fails fast in production when unset; added periodic expiry sweep; removed dead health-check branch; `/metrics` now requires authentication.
- **Crypto:** `unwrap_dek` now returns a zeroizing DEK.
- **Mobile (Prime):** Added missing `RustBridge` so the sideload flavor compiles; captures persist to bounded app-private storage; removed captured-content logging to logcat; session-start intents are rejected from foreign UIDs.
- **Mobile:** Release builds use an env-injected upload keystore when provided (`NOTECEE_UPLOAD_*`); `allowBackup` disabled; versionName aligned to 1.1.0.
- **Automation DSL:** Implemented array literals and logical AND/OR operators documented in the README; tokenizer now reports unknown characters with line/column info instead of silently dropping them.
- **i18n:** Added es/fr/de/ja/zh/fa locale files matching en.json keys; restored package exports.
- **Modes:** Added `modes.json` mirroring the core-rs mode registry so `@noteece/modes` resolves.
- **CI:** Pinned pnpm/action-setup, codeql-action, and TruffleHog to immutable SHAs; CodeQL matrix now analyzes JavaScript/TypeScript and Rust (removed inapplicable C/C++); tarpaulin install failures no longer masked; coverage gate enforceable via the `COVERAGE_MIN` repo variable.
- **Build:** Replaced unresolvable `rev = "v1"` git spec for tauri-plugin-store with a full commit pin.
- **Docs:** Corrected KDF claims (PBKDF2-HMAC-SHA512, not Argon2id) across wiki; fixed README badges, links, and feature claims.
- **Tooling:** `verify_dashboard.py` exits non-zero on missing widgets; `.gitattributes` forces LF for shell scripts; `coverage/` ignored; duplicate prettier config aligned.
- **Relay build:** fixed pre-existing compile errors — axum-extra downgraded to the axum-0.7-compatible 0.9 line; JWT claims extraction marked `#[async_trait]`; register handler destructure removes partial-move error; tower's non-Clone global rate-limit layer replaced with per-device + registration sliding-window limiters (60/s global register, 300/s per device).
- **Core build:** fixed pre-existing compile errors that left core-rs unbuildable — p2p Origin validation moved into the WebSocket handshake callback (`accept_hdr_async`), zip 0.6 `FileOptions` turbofish misuse removed (backup/import), import `enclosed_name` borrow conflict resolved, vault path-validation closure annotated.
- **Export:** JSON/ZIP/dir exports now decrypt application-layer content with the supplied DEK (previously the key parameter was ignored); failed decryption yields empty content instead of aborting.
- **Notes FTS:** removed legacy manual `fts_note` writes from create/update paths — migration v24 triggers own index sync; manual writes collided with triggers (primary-key failures on every note creation through migrated schemas).
- **Desktop UI:** `UniversalDashboardWidget` fallback stats now satisfy the full `DashboardStats` contract; declared missing `i18next`/`react-i18next` dependencies used by four components; removed JSX from a `.ts` test file; dropped invalid `@jest/globals` import in favor of `@types/jest` globals.
- **Lint/format:** core-rs is clippy-clean with `-D warnings` and rustfmt-normalized; logger doctest demoted to illustrative `text` fence.
- **Gates reproduced locally:** desktop ESLint now passes its `--max-warnings 0` gate (auto-fixes applied; unused import, regex escape, negated conditions hand-fixed); mobile `type-check` clean after fixing a wrong sibling import in `vault.test.ts` (`../vault` → `./vault`) and pinning `module: esnext` so intentional dynamic imports type-check; vault store tests converted from dynamic imports to `require` + `jest.resetModules` (Jest CJS cannot run `import()` without ESM VM flags).
- **Windows DX:** desktop lint script dropped the POSIX-only `ESLINT_USE_FLAT_CONFIG=` env prefix (eslint 8 defaults to eslintrc mode, making the prefix both broken on Windows and unnecessary).
- **Tauri lint:** src-tauri is clippy-clean — MSRV aligned to the CI toolchain (1.82), OCR queue commands registered instead of left dead, rate-limit persistence helpers and config accessors annotated with their wiring roadmap.
- **Repo hygiene:** `.gitattributes` normalizes ts/tsx/rs/json/md to LF so prettier/eslint agree across platforms (run `git add --renormalize .` once after pulling).

## [1.1.3] - 2025-12-27

### Fixed

- **Code Duplication:** Removed duplicate `EmptyState` component from `LoadingState.tsx`
- **Dead Code:** Removed unused `isFirst` prop from `TimelineItemCard.tsx`
- **Type Safety:** Added proper TypeScript types to `useTodayTimeline.ts` replacing `any` types

### Changed

- **Accessibility - Mobile:** Enhanced accessibility in `TimelineItemCard`, `DailyBrief`, `BiometricLockScreen`, and `FilterBar` components
- **Accessibility - Desktop:** Added aria-labels to `MusicWidget` and `FocusTimer` components
- **Code Quality:** Replaced index-based React keys with unique identifiers, added progressbar role to LoadingState

## [1.1.2] - 2025-12-27

### Fixed

- **Critical Security:** Fixed zero-initialized DEK vulnerability in `mobile_ffi.rs` - now properly retrieves DEK from vault for conflict resolution
- **Mobile Memory Leaks:** Fixed `SyncManager.tsx` useEffect dependencies causing memory leaks and re-renders
- **Mobile Error Handling:** Added try-catch for JSON.parse in `ErrorBoundary.tsx` to prevent crash when parsing corrupted error logs
- **Mobile Race Conditions:** Fixed filter change race condition in `SocialHub.tsx` with debouncing and initial load tracking
- **Mobile Async:** Fixed fire-and-forget async operation in `app-context.ts` store initialization
- **Desktop Auth:** Added missing await on `clearSessionStorage()` calls in `auth.ts`
- **Timer Logic:** Fixed off-by-one error in `FocusTimer.tsx` timer countdown condition
- **Timestamp Validation:** Added comprehensive timestamp validation in `DateDisplay.tsx` with future date handling
- **Config Alignment:** Fixed version mismatch in `build.config.ts`
- **ESLint Config:** Fixed hardcoded path in `eslintrc.js`, added multiple project references for monorepo support

### Changed

- **UI Button Component:** Complete rewrite of `Button.tsx` with forwardRef, accessibility (aria-disabled, aria-busy), loading states, and proper TypeScript types
- **Automation Runtime:** Replaced console.log in `runtime.ts` with MockLogger interface for better production behavior
- **Accessibility:** Added aria-labels to `FocusTimer.tsx` and `DateDisplay.tsx` components

### Added

- **DEK Retrieval:** New `get_dek_for_space()` function in Rust FFI for secure key management
- **Logger Interface:** MockLogger interface and createConsoleLogger utility for automation DSL testing

## [1.1.1] - 2024-11

### Fixed

- **Critical Security:** Fixed session token storage (localStorage -> secureStore), added rate limiting to auth endpoints, and implemented secure logging to prevent credential leakage.
- **Mobile Reliability:** Fixed critical race conditions in `unlock.tsx` and transaction rollback issues in migrations. Fixed SQL injection vulnerability in search.
- **Mobile Performance:** Migrated `SocialHub` to `FlashList`, optimized `HealthHub` SQL queries, and added memoization to `PostCard`.
- **Infrastructure:** Added `.github/dependabot.yml`, `mobile-ci.yml`, and enabled Rust dependency caching in CI.
- **Desktop Stability:** Added `ErrorBoundary` for dashboard widgets, fixed `TravelMode` state bugs, and optimized `TemporalGraph` pagination.
- **Type Safety:** Resolved generic `any` types in API, fixed `unwrap_or` masking DB errors in Rust backend, and fixed mobile TypeScript warnings.
- **i18n:** Added pluralization support and RTL layout handling to Mobile app.
- **Code Quality:** Removed unreachable code, fixed dead code paths, and added accessibility labels to mobile components.
- **Testing:** Fixed mock configuration for `tauri-plugin-store-api` and mobile `react-native-zeroconf`.
- **Sync:** Fixed `sync_client.ts` fallback logic and added integration tests for sync flow.
- **Privacy:** Enhanced backup scrubbing to remove `refresh_token`, `client_secret` and other sensitive fields.
- **Discovery:** Added `device_type` support to `DiscoveredDevice` in P2P discovery protocol.
- **Desktop:** Fixed Journal timezone issue using local date format.
- **Safety:** Replaced unsafe `unwrap()` calls in critical backend paths (`search.rs`, `collaboration.rs`, `blob.rs`, `selector_verification.rs`) with safe `expect()` or error handling.
- **Desktop UI:** Replaced placeholder UI in Habits page with a functional creation modal.
- **Desktop API:** Fixed `any` return type in `getDashboardStats` for better type safety.
- **Mobile Linting:** Resolved remaining ESLint warnings in `more.tsx` and `sync-bridge.ts`.
- **Sync Protocol:** Fixed a build failure in `mobile_sync.rs` by correctly using the public `pair_device` API in tests.
- **Search:** Resolved a critical runtime panic in FTS search by fixing a table alias mismatch (`fts_note` vs `f`).
- **Social Processing:** Added missing logic to extract Discord handles in `misc.rs`.
- **Mobile Settings:** Fixed a bug where updating nested settings (like theme) would overwrite the entire object instead of merging.
- **Mobile UI:** Improved type safety in `SharedContentBanner` and added validation to `SaveFilterModal`.
- **Mobile Theme:** Unified dark mode colors in `ThemeContext` to use consistent `obsidianColors`.
- **Backend:** Audited `sync/engine.rs` and `sync/p2p.rs` for race conditions and proper error propagation.
- **Safety:** Replaced unsafe `unwrap()` calls in `llm` (PII, Retry, Priority), `caldav`, `logger`, and `mobile_ffi` modules with robust error handling or `expect` with context.
- **Mobile Logging:** Replaced ad-hoc `console` logging with a unified `Logger` service that integrates with Sentry and respects dev/prod environments.
- **Code Quality:** Resolved `clippy` warnings across the `core-rs` crate and ESLint warnings in the mobile app build scripts.

### Added

- **Mobile:** Added `FlashList` for performance. Added secure `Logger`. Added `haptics` manager. Added `react-native-ssl-pinning` (prep).
- **Desktop:** Added `ErrorBoundary` for widgets. Added `tauri-plugin-store` for secure storage.
- **Infrastructure:** Added `dependabot.yml`. Added Mobile CI workflow. Added Rust dependency caching in CI.
- **Documentation:** Added `STATUS.md` to track project state. Updated `SECURITY.md` with mobile pinning guidance.
- **UI/UX Overhaul:** Significantly enhanced the Desktop Dashboard with polished widgets for Music, Health, and Social.
- **Music Widget:** Implemented a new glassmorphism design with visualizers and "disconnected" state handling.
- **Health Widget:** Added robust visualization for health metrics with empty state handling and proper unit formatting.
- **Mobile Polish:** Enhanced `HealthHub` and `MusicHub` screens with better error handling, loading states, and data seeding for demo purposes.
- **Mobile Notes:** Added a dedicated **Notes Screen** (`apps/mobile/app/(tabs)/notes.tsx`) with search, tagging, and sorting.
- **Desktop Features:** Fully implemented **Journal** (Daily Notes) and **Habits** pages, replacing placeholders.
- **Visualizations:** Added a **Temporal Graph** (Deterministic Layout) and **Tags Cloud** connected to real backend data.
- **Backend Safety:** Implemented strict state machine validation for Project status transitions.
- **Safety:** Replaced unsafe `unwrap()` calls in `srs.rs`, `versioning.rs`, and `tag.rs` with proper error propagation.
- **Linting:** Resolved over 100 ESLint warnings in the Desktop and Mobile applications, improving code quality and type safety.

## [1.1.0] - 2024-05-20

### Added

- Initial release of Noteece with core features.
