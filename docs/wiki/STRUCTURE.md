# Noteece Wiki Structure

This document outlines the proposed structure for the comprehensive Noteece Wiki (`docs/wiki`), acting as the primary knowledge base for developers, contributors, and power users.

## 📚 01_Architecture
**Goal:** Explain *how* the system works internally.

*   `01_Overview.md`: High-level diagram of `core-rs`, `apps/desktop`, and `apps/mobile`.
*   `02_Synchronization.md`:
    *   **The Protocol:** Detailed sequence diagram of the P2P Handshake.
    *   **Conflict Resolution:** Explain Vector Clocks and Last-Write-Wins (LWW) strategies.
    *   **Data Flow:** How a `SyncDelta` moves from the database to the wire.
*   `03_Security.md`:
    *   **Encryption Model:** XChaCha20Poly1305 and Argon2id usage.
    *   **Key Hierarchy:** DEK (Data Encryption Key) vs KEK (Key Encryption Key).
    *   **Zero-Trust:** How the "Blind Relay" ensures server-side privacy.
*   `04_Database.md`:
    *   **Schema:** ERD (Entity Relationship Diagram) of `note`, `task`, `project`.
    *   **Migrations:** How `packages/core-rs/src/db/migrations.rs` handles versioning.

## 🛠️ 02_Development
**Goal:** Guide new developers from `git clone` to `PR`.

*   `01_Setup.md`:
    *   **Prerequisites:** Rust, Node.js (pnpm), Android Studio, Tauri deps.
    *   **Commands:** `pnpm install`, `cargo build`, `pnpm dev:tauri`.
*   **02_Project_Structure.md**:
    *   Explain the Monorepo layout (`packages/` vs `apps/`).
    *   "Where does the code live?" (e.g., "All business logic is in `core-rs`").
*   `03_Testing.md`:
    *   **Unit Tests:** How to run `cargo test`.
    *   **E2E:** How to run Playwright and Maestro.
    *   **Fuzzing:** How to run the `proptest` suite.
*   `04_Contribution.md`:
    *   Code Style (Prettier, Rustfmt).
    *   Commit Message Convention (Conventional Commits).

## 🚀 03_Features
**Goal:** Deep dive into specific functionalities.

*   `01_Social_Suite.md`:
    *   How the `StreamProcessor` works (Regex, Bloom Filters).
    *   Accessibility Service integration on Android.
*   `02_Knowledge_Graph.md`:
    *   The `TemporalGraph` algorithm.
    *   Backlink detection logic.
*   `03_Local_AI.md`:
    *   RAG (Retrieval Augmented Generation) pipeline.
    *   Embedding models and vector search.

## 📖 04_User_Guide
**Goal:** Help end-users master Noteece.

*   `01_Getting_Started.md`: Installation and Vault creation.
*   `02_Sync_Setup.md`: Pairing devices via QR code.
*   `03_Shortcuts.md`: Keyboard cheatsheet for Desktop.
*   `04_Troubleshooting.md`: "My sync is stuck", "I forgot my password".

## 📦 05_Release
**Goal:** Maintainer procedures.

*   `01_Release_Process.md`:
    *   Versioning strategy (SemVer).
    *   Changelog generation.
    *   Signing artifacts (Windows/Mac/Android).
*   `02_Compliance.md`:
    *   Privacy Policy template.
    *   License attribution.
