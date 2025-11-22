# Noteece Architecture

This document describes the current architecture of the Noteece application. It serves as the single source of truth, superseding any historical or archived design documents.

## Core Principles

- **Local-First:** All user data is stored and managed on the user's local device. The application is fully functional offline.
- **End-to-End Encryption (E2EE):** User data is encrypted at rest on the device and in transit during sync operations. The encryption keys are managed by the user, ensuring a zero-knowledge system where no central server can access the content.
- **Markdown-Centric:** Notes and other content are primarily stored and edited in Markdown, ensuring data portability and longevity.
- **Sovereign Interception (Prime):** The mobile experience operates as a meta-layer over the OS, capturing and enriching content from other apps ("Active Interception") rather than just consuming it.

## High-Level Components

The Noteece ecosystem consists of three main components:

1.  **Rust Core (`packages/core-rs`):** A shared library that contains all the core business logic, including:
    - Database management (via SQLCipher-encrypted SQLite).
    - Data models and application state.
    - Sync engine logic (conflict resolution, history tracking).
    - Import/export functionality.
    - Full-text search indexing (FTS5).
    - **Heuristic Engine (`social/stream_processor.rs`):** A pattern-matching system for unstructured text capture.

2.  **Desktop Application (`apps/desktop`):** A Tauri-based application for Windows, macOS, and Linux.
    - Uses React and TypeScript for the frontend UI.
    - Communicates with the Rust core via Tauri's command bridge.
    - **Command Layer (`commands.rs`):** A dedicated Rust module that wraps core logic into robust, error-handling Tauri commands (suffixed with `_cmd`), ensuring consistent API surface and thread safety.

3.  **Mobile Application (`apps/mobile`):** An Expo/React Native application for Android/iOS with two build flavors:
    - **Store Flavor:** Standard P2P companion app compliant with Google Play policies.
    - **Sideload (Prime) Flavor:** The "Cyborg-Life OS" with deep system integration (Accessibility Services, Overlay HUD).

## Mobile "Prime" Architecture (Tri-Layer)

Noteece Prime utilizes a unique "Tri-Layer" architecture to wrap the Android OS:

1.  **Layer 1: The Hub (Launcher):**
    - `SocialDock.tsx` acts as a launcher for social apps.
    - It triggers a `START_SESSION` event, waking up the recording engine before launching the target app.

2.  **Layer 2: The Eyes (Sensor):**
    - `NoteeceAccessibilityService.kt` (Kotlin) reads the raw UI tree from the screen buffer.
    - Bypasses SSL Pinning by reading decrypted text directly from the GPU/View layer.
    - Streams text to the Rust Core via a Zero-Copy JNI Bridge (`mobile_injector` feature).

3.  **Layer 3: The Wrapper (Interface):**
    - `OverlayService.kt` draws a system-wide floating HUD ("The Green Dot").
    - Provides the **"Anchor"** action: Tapping the dot commits the current screen buffer (analyzed by Rust heuristics) to the encrypted vault as a saved Note.

## Sync Architecture

- **Peer-to-Peer (P2P):** Sync occurs directly between a user's devices over a local network (Wi-Fi). There is **no central server**.
- **Discovery:** Devices are discovered on the local network using mDNS (Bonjour).
- **Transport:** Data is transferred over a secure channel established via a direct TCP connection, with all traffic encrypted.
- **Split-Brain Protection:** The sync engine uses both Vector Clocks and "Last Successful Sync" timestamps to detect and handle true concurrent modifications, preventing data loss.

## Data Storage

- **Database:** A single, encrypted SQLite database file (`vault.db`) per user "vault".
- **Encryption:** The database is encrypted using SQLCipher. A Data Encryption Key (DEK), derived from the user's password, is held in memory only while the application is unlocked.
- **Blobs/Attachments:** Larger binary files (images, PDFs) are stored in a separate blob store, with each blob individually encrypted.
