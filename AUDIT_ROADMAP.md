# 🗺️ The Ultimate Noteece Audit & Execution Roadmap

**Status:** Definitive Execution Plan
**Goal:** Production Release v1.0.0
**Scope:** Every File. Every Line. Every Interaction.

This document is the **Single Source of Truth** for the final polish of the Noteece ecosystem. It is designed to be executed linearly, ensuring no layer is built upon a shaky foundation.

---

## 🏗️ Phase 0: Environment & Foundation
**Goal:** Ensure the build system is deterministic and secure.

### 0.1 Dependency Audit
*   **Rust (`Cargo.toml`):**
    *   [ ] `rusqlite`: Verify feature `bundled-sqlcipher-vendored-openssl` uses the correct OpenSSL version.
    *   [ ] `gray_matter`: Check pinned to `0.2.2` (critical for frontmatter parsing).
    *   [ ] `jni`: Ensure optional dependency is correctly gated for Android builds.
*   **Mobile (`apps/mobile/package.json`):**
    *   [ ] `expo-file-system`: Audit version compatibility with `expo-sqlite` for JSI access.
    *   [ ] `react-native-reanimated`: Verify version `3.x` setup in `babel.config.js`.

### 0.2 Toolchain Verification
*   **Android:**
    *   [ ] Verify NDK version matches `android/build.gradle`.
    *   [ ] Check `local.properties` (not committed) points to valid SDK path.
*   **Desktop:**
    *   [ ] Verify `tauri-cli` version matches `package.json`.
    *   [ ] Check `libwebkit2gtk` headers availability on Linux CI runners.

---

## 🔬 Phase 1: The Core Backend Audit (`packages/core-rs`)
**Goal:** Mathematical correctness and absolute robustness.

### 1.1 Core Security & Cryptography
*   **Encryption (`crypto.rs`, `crypto/`):**
    *   [ ] `derive_key(password, salt)`: Verify Argon2id parameters (Memory=64MB, Iterations=3).
    *   [ ] `wrap_dek(dek, kek)` / `unwrap_dek(...)`: Audit for leakage of raw DEK.
    *   [ ] `encrypt_string(...)`: Verify `XChaCha20Poly1305` nonce generation is unique per write.
*   **Authentication (`auth.rs`):**
    *   [ ] `validate_session(token)`: Check for timing attacks in token comparison (use constant-time compare).
    *   [ ] `change_password(...)`: Verify atomicity—does it re-encrypt the Master Key *and* update the user record in one transaction?

### 1.2 Data Persistence (`db/`)
*   **Schema & Migrations (`db/migrations.rs`):**
    *   [ ] `migrate(conn)`: Audit *all* migrations (v1 to v21).
        *   *Check:* Are `CREATE TABLE` statements using `IF NOT EXISTS`?
        *   *Check:* Do index creations fail silently?
    *   [ ] **Test:** Run migrations on a fresh DB vs an existing v1 DB.
*   **Tuning (`db/pragma_tuning.rs`):**
    *   [ ] `optimize(conn)`: Verify `WAL` checkpointing behavior.
    *   [ ] `apply(conn)`: Check `synchronous=NORMAL` setting (safe for WAL, risky for DELETE).

### 1.3 The Synchronization Engine (`sync/`)
*   **Pairing (`sync/ecdh.rs`, `sync/tofu.rs`):**
    *   [ ] `initiate_pairing()`: Verify ephemeral key generation.
    *   [ ] `verify_device()`: Audit Trust-On-First-Use (TOFU) logic. Does it reject unknown devices?
*   **Logic & State (`sync/engine.rs`, `sync/vector_clock.rs`):**
    *   [ ] `VectorClock`: Verify causal ordering logic. Test scenarios with 3+ devices (A->B, B->C, A->C).
    *   [ ] `DeltaApplier`: Verify atomicity. If applying a delta fails, does the transaction rollback?
*   **Networking (`sync/p2p.rs`):**
    *   [ ] `mdns`: Audit service advertising timeouts. Does it stop advertising when sync is disabled?
    *   [ ] `websocket`: Verify handshake timeout (prevent hanging connections).

---

## 🖥️ Phase 2: The Frontend Audit (`apps/desktop` & `apps/mobile`)
**Goal:** Unbreakable UI state and fluid user experience.

### 2.1 Desktop Experience (`apps/desktop`)
*   **Core Components:**
    *   [ ] **`Dashboard.tsx`:** Audit `useQueries` hook. Is `staleTime` set correctly to prevent infinite refetches?
    *   [ ] **`NoteEditor.tsx`:** Verify `Lexical` state synchronization. Does `onChange` debounce correctly before saving?
*   **Complex Visualizations:**
    *   [ ] **`TaskBoard.tsx`:** Audit `dnd-kit` collision detection. Do items "snap" back if dropped on invalid targets?
    *   [ ] **`TemporalGraph.tsx`:** Check WebGL context loss handling. Does it recover if the tab is backgrounded?

### 2.2 Mobile Experience (`apps/mobile`)
*   **Screens:**
    *   [ ] **`SocialHub.tsx`:** Audit `FlashList` recycling. Are keys unique and stable?
    *   [ ] **`Capture`:** Verify "Share Intent" parsing. Does it handle text sharing from *any* app?
*   **Native Modules (JSI):**
    *   [ ] **`lib/jsi/sync-bridge.ts`:** Verify strict type checking. Does passing `null` crash the C++ layer?
    *   [ ] **`lib/database.ts`:** Check for database locking. Does it close connections when the app is backgrounded?

---

## 🌉 Phase 3: Cross-Platform Harmonization
**Goal:** One Logic, Two Faces.

*   [ ] **Logic Parity:** Ensure `apps/mobile` JSI calls (e.g., `get_all_notes`) match `apps/desktop` Tauri commands exactly.
*   [ ] **Theme Consistency:** Match colors (`theme.ts`) and typography. Use "Design Tokens" where possible.
*   [ ] **Asset Audit:** Verify icons/images are optimized (WebP) and identical across platforms.

---

## 💎 Phase 4: Refinement & Modernization
**Goal:** Polish to a mirror shine.

*   **Backend:**
    *   [ ] **Performance:** Implement `SearchCache` (LRU) for frequent FTS queries.
    *   [ ] **Optimization:** Refactor `social` extraction to reduce memory allocations (zero-copy parsing).
*   **Frontend (UI/UX):**
    *   [ ] **Glassmorphism:** Apply backdrop-filter to Sidebar, Modals, and Cards.
    *   [ ] **Transitions:** Implement `framer-motion` (Desktop) and `Reanimated` (Mobile) shared element transitions.

---

## 🚀 Phase 5: Expansion (New Features)
**Goal:** Feature completeness.

*   [ ] **Cloud Relay:** Implement `BlindRelayServer` for encrypted internet sync (Rust/Axum).
*   [ ] **Plugin System:** Finalize `NoteecePlugin` trait and integration with WASM runtime (`wasmer`).
*   [ ] **Smart Tags:** Implement NLP-based auto-tagging in `ai/intelligence.rs`.

---

## 🛡️ Phase 6: Validation & Verification
**Goal:** 100% Confidence.

*   **Automated Testing:**
    *   [ ] **Rust:** `cargo test` (Unit), `proptest` (Sync Logic), `criterion` (Benchmarks).
    *   [ ] **Desktop:** Playwright E2E tests for "Golden Path" (Install -> Create -> Sync).
    *   [ ] **Mobile:** Jest unit tests and Maestro UI flows.
*   **Manual Testing:**
    *   [ ] **Sync Torture Test:** 3 devices, partial network, conflicting edits.
    *   [ ] **Migration Test:** Upgrade from v1 database to vCurrent.

---

## 📚 Phase 7: Documentation & Release
**Goal:** Public readiness.

*   **The Wiki (`docs/wiki/`):**
    *   [ ] `01_Architecture`: Detailed diagrams of Sync/Encryption logic.
    *   [ ] `02_User_Guide`: "Getting Started", "Sync Setup", "Keyboard Shortcuts".
*   **Build Artifacts:**
    *   [ ] **Desktop:** Signed EXE (Win), DMG (Mac), AppImage (Linux).
    *   [ ] **Mobile:** Signed APK (Universal) and AAB (Store).

---

## ⚠️ Execution Order
1.  **Phase 0 & 1** (Core) MUST be completed first.
2.  **Phase 2 & 3** (Frontend) run in parallel after Phase 1.
3.  **Phase 4** (Refinement) is iterative.
4.  **Phase 5** (New Features) starts only after Core is stable.
5.  **Phase 6** (Validation) runs continuously.
