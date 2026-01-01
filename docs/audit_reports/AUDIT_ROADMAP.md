# 🗺️ The Ultimate Noteece Audit & Execution Roadmap

**Status:** Definitive Execution Plan (Expanded & Enriched)
**Goal:** Production Release v1.0.0
**Scope:** Every File. Every Line. Every Interaction.

This document is the **Single Source of Truth** for the final polish of the Noteece ecosystem. It is designed to be executed linearly, ensuring no layer is built upon a shaky foundation.

**Recent Audit Findings (CRITICAL):**
1.  **Mobile Encryption at Rest:** The Mobile App uses `expo-sqlite` (plaintext) while Core uses `sqlcipher`. This is a critical security breach.
2.  **Timing Attack:** Authentication logic allows username enumeration via timing analysis.
3.  **Sync Logic:** Relies on Hybrid Clocks (prone to skew) instead of Logical Vector Clocks.

---

## 🏗️ Phase 0: Environment & Foundation
**Goal:** Ensure the build system is deterministic, secure, and reproducible.

### 0.1 Dependency Audit & Security
*   **Rust (`Cargo.toml`):**
    *   [ ] `rusqlite`: Resolve Diamond Dependency on OpenSSL (Native-TLS vs Bundled).
    *   [ ] `gray_matter`: Ensure pinned to `=0.2.2`.
    *   [ ] `jni`: Strict conditional compilation (`target_os = "android"`).
    *   [ ] `audit`: Run `cargo audit` and resolve all RUSTSEC advisories.
*   **Mobile (`apps/mobile/package.json`):**
    *   [ ] **CRITICAL:** Verify `expo-sqlite` binary capability. Switch to `op-sqlite` or custom build if SQLCipher is missing.
    *   [ ] `permissions`: Audit `app.json` plugins (`expo-location`) for auto-injected permissions.

---

## 🔬 Phase 1: The Core Backend Audit (`packages/core-rs`)
**Goal:** Mathematical correctness, data integrity, and absolute security.

### 1.1 Core Security & Cryptography
*   **Encryption:**
    *   [ ] **CRITICAL:** Implement `rust_unlock_vault` FFI to key the mobile database connection.
    *   [ ] **CRITICAL:** Fix Timing Attack in `AuthService` (Dummy Verify).
    *   [ ] `Zeroize`: Implement memory protection for `DEK` and `KEK` structs.
*   **Import Safety:**
    *   [ ] `ZipBomb`: Implement strict file size limits and ratio checks.

### 1.2 Data Persistence (`db/`)
*   **Transactions:**
    *   [ ] Wrap multi-table inserts (Note + FTS) in atomic transactions.
*   **Performance:**
    *   [ ] Optimize `compute_entity_hashes` (currently O(N)). Consider Merkle Tree.

### 1.3 The Synchronization Engine (`sync/`)
*   **Concurrency:**
    *   [ ] **CRITICAL:** Replace Hybrid Clock with true Logical Vector Clock (Lamport).
*   **Protocol:**
    *   [ ] Enforce `trusted` check on all incoming sync packets.

---

## 🖥️ Phase 2: The Frontend Audit (`apps/desktop` & `apps/mobile`)
**Goal:** Unbreakable UI state, fluid performance, and mobile stability.

### 2.1 Desktop Experience (`apps/desktop`)
*   **Security:**
    *   [ ] **CRITICAL:** Tighten CSP. Remove `unsafe-inline` and `unsafe-eval`.
    *   [ ] Protect DEK in memory (`state.rs`).
*   **State:**
    *   [ ] Validate persisted `activeSpaceId` on hydration.

### 2.2 Mobile Experience (`apps/mobile`)
*   **Security:**
    *   [ ] **CRITICAL:** Implement SQLCipher support.
*   **Stability:**
    *   [ ] Wrap JSI calls in Rust `catch_unwind` to prevent VM crashes.

---

## 🌉 Phase 3: Cross-Platform Harmonization
**Goal:** One Logic, Two Faces. Total feature and data parity.

*   [ ] **Schema Parity:**
    *   Automate verification of Mobile Migrations vs Rust Migrations.
*   **Design System:**
    *   Unify Icons (Tabler vs Material).
    *   Shared Design Tokens.

---

## 💎 Phase 4: Refinement & Modernization
**Goal:** Optimization and Polish.

*   [ ] **Backend:** Add `idx_note_space_mod` index.
*   [ ] **Frontend:** Implement strict Virtualization for Note Lists.

---

## 🚀 Phase 5: Expansion (New Features)
**Goal:** Feature completeness.

*   [ ] **Cloud Relay:** Design "Blind Relay" protocol.
*   [ ] **Plugin System:** Prototype WASM host.

---

## 🛡️ Phase 6: Validation & Verification
**Goal:** 100% Confidence.

*   [ ] **Security Test:** Run "Grep Test" on Mobile Simulator filesystem to prove encryption.
*   [ ] **Security Test:** Run "Timing Attack" harness on Auth.
*   [ ] **Sync Test:** "Time Traveler" scenario (Clock Skew).

---

## 📚 Phase 7: Documentation & Release
**Goal:** Public readiness.

*   [ ] **Docs:** Create Encryption Hierarchy and Sync Protocol diagrams.
*   [ ] **Legal:** Publish Privacy Policy (No Cloud Promise).
*   [ ] **Release:** Generate SBOM.

---

## ⚠️ Execution Order
1.  **Phase 0 & 1** (Core Security & Env) MUST be completed first. **Mobile Encryption** is a blocker for Release.
2.  **Phase 2** (Frontend Security) runs in parallel.
3.  **Phase 6** (Verification) must validate the Security fixes immediately.
