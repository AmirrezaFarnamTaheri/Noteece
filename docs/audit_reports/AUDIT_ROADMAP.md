# 🗺️ The Ultimate Noteece Audit & Execution Roadmap

**Status:** Definitive Execution Plan (Restored & Expanded)
**Goal:** Production Release v1.0.0
**Scope:** Every File. Every Line. Every Interaction.

This document is the **Single Source of Truth** for the final polish of the Noteece ecosystem. It is designed to be executed linearly, ensuring no layer is built upon a shaky foundation.

**Recent Audit Findings (CRITICAL):**
1.  **Mobile Encryption at Rest Breach:** Mobile App uses `expo-sqlite` (plaintext) while Core uses `sqlcipher`.
2.  **Authentication Timing Vulnerability:** Side-channel in `AuthService`.
3.  **Backup Integrity:** Live zipping of SQLite DB risks corruption.
4.  **Sync Logic:** Hybrid Clocks (wall time) prone to skew; Ambiguous Protocol definitions.

---

## 🏗️ Phase 0: Environment & Foundation
**Goal:** Ensure the build system is deterministic, secure, and reproducible.

### 0.1 Dependency Audit & Security
*   **Rust (`Cargo.toml`):**
    *   [ ] `rusqlite`: Verify `bundled-sqlcipher-vendored-openssl` links correctly against OpenSSL 3.x+ to avoid legacy vulnerabilities.
    *   [ ] **CRITICAL:** Resolve "Diamond Dependency" on OpenSSL (Native-TLS vs Bundled).
    *   [ ] `gray_matter`: Ensure pinned to `=0.2.2` to prevent breaking frontmatter parsing changes.
    *   [ ] `jni`: Strict conditional compilation (`target_os = "android"`) to prevent symbol pollution in desktop binaries.
    *   [ ] `audit`: Run `cargo audit` and resolve all RUSTSEC advisories.
    *   [ ] `sbom`: Generate Software Bill of Materials using `cargo-sbom` or `syft`.
*   **Mobile (`apps/mobile/package.json`):**
    *   [ ] `expo-file-system`: Verify exact version match with `expo-sqlite` for consistent JSI filesystem access.
    *   [ ] **CRITICAL:** Verify `expo-sqlite` binary capability (Plaintext vs SQLCipher). Switch to `op-sqlite` if needed.
    *   [ ] `react-native-reanimated`: Confirm version matches the Expo SDK recommendation (avoiding binary mismatches).
    *   [ ] `pnpm`: Validate lockfile consistency (`pnpm install --frozen-lockfile`) in CI.
    *   [ ] `permissions`: Audit `app.json` / `AndroidManifest.xml` to remove unused permissions (e.g., LOCATION, CAMERA).

### 0.2 Toolchain & CI Verification
*   **Android:**
    *   [ ] NDK: Verify version (e.g., `25.2.9519653`) in `android/build.gradle`.
    *   [ ] JDK: Enforce JDK 17 (Zulu/Corretto) in CI pipelines.
    *   [ ] Gradle: Optimize JVM args (`-Xmx2g`) to prevent CI OOM kills.
*   **Desktop:**
    *   [ ] Tauri: Match CLI version with `package.json`.
    *   [ ] Linux: Verify `libwebkit2gtk-4.1-dev` presence on Ubuntu 24.04+ runners.
    *   [ ] Windows: Ensure MSVC v143 toolchain is used (not MinGW).

---

## 🔬 Phase 1: The Core Backend Audit (`packages/core-rs`)
**Goal:** Mathematical correctness, data integrity, and absolute security.

### 1.1 Core Security & Cryptography
*   **Encryption (`crypto.rs`, `auth.rs`):**
    *   [ ] **CRITICAL:** Implement `rust_unlock_vault` FFI.
    *   [ ] `derive_key`: Transition from PBKDF2 (256k) to Argon2id for new vaults (Security vs Mobile Perf balance).
    *   [ ] `Zeroize`: Implement `Zeroize` trait on all structs holding keys (`MasterKey`, `SessionToken`, `DEK`).
    *   [ ] `random`: Verify `OsRng` usage for nonces and salts (specifically on Android via `getrandom`).
    *   [ ] **CRITICAL:** Fix Auth Timing Attack (Dummy Verify).
*   **Import Safety (`import.rs`):**
    *   [ ] `ZipBomb`: Implement strict file size limits (e.g., 10MB/file) and decompression ratio checks.
    *   [ ] `PathTraversal`: Verify `file.enclosed_name()` is used correctly for all archive extractions.

### 1.2 Data Persistence (`db/`)
*   **Schema & Migrations (`migrations.rs`):**
    *   [ ] `migrate`: Verify atomicity of complex migrations (v5 tags, v20 FTS triggers).
    *   [ ] `performance`: Audit `CREATE TRIGGER` overhead on bulk operations.
    *   [ ] `foreign_keys`: Ensure `PRAGMA foreign_keys = ON` is executed on every connection open.
    *   [ ] **CRITICAL:** Fix Backup Integrity (VACUUM INTO).
*   **Tuning (`pragma_tuning.rs`):**
    *   [ ] `WAL`: Verify `PRAGMA journal_mode=WAL` is active on *both* Rust and Mobile-JS connections.
    *   [ ] `mmap`: Configure `mmap_size` for optimal read performance.

### 1.3 The Synchronization Engine (`sync/`)
*   **Concurrency & State:**
    *   [ ] **CRITICAL:** Replace Hybrid Clock with Vector Clocks.
    *   [ ] **CRITICAL:** Consolidate Ambiguous Protocol (`SyncDelta`).
    *   [ ] `Threads`: Ensure `apply_deltas` runs in `spawn_blocking` to avoid UI freezes.
*   **Protocol (`p2p.rs`):**
    *   [ ] `Handshake`: Verify state machine (must complete handshake before accepting deltas).
    *   [ ] `DoS`: Limit JSON recursion depth and message payload size (max 5MB).

### 1.4 Business Logic
*   [ ] **CRITICAL:** Wire up Link Indexer (`update_links`).
*   [ ] **CRITICAL:** Fix Calendar Import/Export (Timestamps).
*   [ ] **HIGH:** Fix SRS Scheduler Math (Integer truncation).
*   [ ] **MEDIUM:** Implement Versioning Retention Policy.

---

## 🖥️ Phase 2: The Frontend Audit (`apps/desktop` & `apps/mobile`)
**Goal:** Unbreakable UI state, fluid performance, and mobile stability.

### 2.1 Desktop Experience (`apps/desktop`)
*   **State Management:**
    *   [ ] `Zustand`: Implement `onRehydrateStorage` check to purge invalid `activeSpaceId`.
    *   [ ] `ReactQuery`: Configure `retry: false` for 404s, `refetchOnWindowFocus: false` for heavy queries.
*   **Performance:**
    *   [ ] `TaskBoard`: Audit `dnd-kit` collision detection and `React.memo` on Task Cards.
    *   [ ] `Virtualization`: Verify `react-window` is used for lists > 50 items.
*   **Security:**
    *   [ ] **HIGH:** Tighten CSP (Remove `unsafe-inline`).
    *   [ ] **HIGH:** Secure DEK in memory.

### 2.2 Mobile Experience (`apps/mobile`)
*   **Stability:**
    *   [ ] `Migration`: Paginate the v4->v5 tag migration to prevent OOM on large vaults.
    *   [ ] `Concurrency`: Explicitly enable WAL mode in `Expo SQLite` initialization.
*   **Security:**
    *   [ ] **CRITICAL:** Fix Mobile Encryption (Replace `expo-sqlite`?).
*   **Performance:**
    *   [ ] `FlashList`: Verify `estimatedItemSize` accuracy.
    *   [ ] `Images`: Replace `<Image>` with `expo-image` (memory/disk caching) in Social Feed.
    *   [ ] `Reanimated`: Audit shared value updates (run on UI thread).
*   **Interaction:**
    *   [ ] `TouchTargets`: Ensure all interactive elements are min 44x44pt.

---

## 🌉 Phase 3: Cross-Platform Harmonization
**Goal:** One Logic, Two Faces. Total feature and data parity.

*   [ ] **Schema Parity:**
    *   Align `Task` status enums (`todo` vs `next`, etc.) in `types/index.ts` vs Rust `CHECK` constraints.
    *   Standardize `TimeEntry` duration calculation (Mobile vs Desktop).
*   **Feature Gap:**
    *   Expose `resolve_conflict` via JSI for Mobile users.
    *   Implement `WebView` cookie capture on Mobile for Social Accounts.
*   **Design System:**
    *   Create shared Design Tokens (JSON) for Colors/Typography.
    *   Verify WCAG AA Contrast compliance.

---

## 💎 Phase 4: Refinement & Modernization
**Goal:** Optimization and Polish.

*   **Backend Optimization:**
    *   [ ] **HIGH:** Fix Cartesian Product query (`get_projects`).
    *   [ ] **HIGH:** Add `idx_note_space_mod`.
    *   [ ] `SQL`: Add missing indices (e.g., `idx_task_project_status`). Remove redundant ones.
    *   [ ] `Memory`: Optimize `apply_deltas` to deserialize into Structs (not `serde_json::Value`).
    *   [ ] `Search`: Enable `trigram` tokenizer for FTS5 if fuzzy search is poor.
*   **Frontend Polish:**
    *   [ ] `CSS`: Use `transform` / `opacity` for animations (avoid layout thrashing).
    *   [ ] `Glassmorphism`: Optimize `backdrop-filter` usage (disable on low-power mode).

---

## 🚀 Phase 5: Expansion (New Features)
**Goal:** Feature completeness.

*   [ ] **Cloud Relay:**
    *   Implement "Blind Relay" protocol (Server sees only encrypted blobs).
    *   Enforce TTL (24h) and Rate Limiting.
*   **Plugin System:**
    *   Finalize `NoteecePlugin` trait and `HostFunctions` (Sandboxed API).
    *   Implement WASM loader with "Fuel" metering (prevent infinite loops).
*   **Local AI:**
    *   Integrate quantized models (`candle` / `ort`) for RAG.
    *   Ensure models are unloaded from RAM immediately after inference.

---

## 🛡️ Phase 6: Validation & Verification
**Goal:** 100% Confidence.

*   **Automated Testing:**
    *   [ ] `Proptest`: Fuzz the Sync Engine (Network Partitions, Reordering).
    *   [ ] `Playwright`: E2E tests for Golden Path (Install -> Sync).
    *   [ ] `Maestro`: Mobile UI flows (Background/Foreground persistence).
*   **Torture Tests:**
    *   [ ] **Zombie Task:** Verify deletion propagation against stale updates.
    *   [ ] **Time Traveler:** Verify Sync behavior with significant clock skew.
    *   [ ] **Zip Bomb:** Verify Import resilience against 2GB+ files.
    *   [ ] **Migration:** Benchmark v4->v5 migration with 10k notes (< 5s target).
    *   [ ] **Security:** Mobile Grep Test (Encryption Verify).
    *   [ ] **Security:** Auth Timing Harness.

---

## 📚 Phase 7: Documentation & Release
**Goal:** Public readiness.

*   **Documentation:**
    *   [ ] `Wiki`: Architecture diagrams (Sync, Encryption), User Guide.
    *   [ ] `Legal`: Privacy Policy, Terms (if using Relay).
*   **Release Artifacts:**
    *   [ ] `Signing`: EV Cert (Windows), Notarization (macOS), Keystore (Android).
    *   [ ] `SBOM`: Generate Software Bill of Materials.
    *   [ ] `Checksums`: Publish SHA256 hashes of all binaries.

---

## ⚠️ Execution Order
1.  **Phase 0 & 1** (Core) MUST be completed first.
2.  **Phase 2 & 3** (Frontend) run in parallel after Phase 1.
3.  **Phase 4** (Refinement) is iterative.
4.  **Phase 5** (New Features) starts only after Core is stable.
5.  **Phase 6** (Validation) runs continuously.
