# Noteece Wiki

Welcome to the **Noteece** Wiki. This documentation serves as the comprehensive guide to the project's architecture, features, workflows, and development guidelines.

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Development Guide](#development-guide)
5. [Security](#security)
6. [Workflows](#workflows)
7. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Introduction

**Noteece** is a local-first, end-to-end encrypted, Markdown-centric workspace designed for privacy and productivity. It combines note-taking, project management, personal growth tracking, and social media aggregation into a single, unified application.

### Core Principles

- **Local-First:** Your data lives on your device. There is no central server.
- **Privacy:** All data is encrypted at rest (SQLCipher) and in transit (P2P Sync).
- **Ownership:** You own your data. Export to JSON, Markdown, or ZIP at any time.
- **Productivity:** Integrated tools for tasks, habits, goals, and knowledge management.

---

## Architecture

Noteece follows a monorepo structure containing a Rust core library and frontend applications.

### High-Level Overview

```mermaid
graph TD
    A[Desktop App (Tauri/React)] --> B[Rust Core (core-rs)]
    C[Mobile App (Expo/React Native)] --> D[SQLite (Expo)]
    B --> E[SQLite (SQLCipher)]
    B --> F[File System]
    C --> G[File System]
```

### Components

1.  **`packages/core-rs` (Rust Core):**
    - The brain of the application.
    - Handles database interactions, encryption, business logic, search (FTS5), and sync protocol.
    - Exposed to Desktop via Tauri commands.
2.  **`apps/desktop` (Desktop App):**
    - Built with **Tauri** (v1) and **React** (TypeScript).
    - UI Toolkit: **Mantine** v7.
    - State Management: **Zustand**.
    - Navigation: **React Router**.
3.  **`apps/mobile` (Mobile App):**
    - Built with **Expo** (React Native).
    - UI Toolkit: Custom components with **Tamagui**-like styling (StyleSheet).
    - Database: `expo-sqlite`.
    - Sync: Implements the same crypto/sync logic as `core-rs` in TypeScript (`sync-client.ts`).

### Database Schema

The database is normalized and managed via migrations (`db.rs`). Key tables include:

- `space`: Workspaces for isolating content.
- `note`: Markdown notes with metadata.
- `project`: Projects with milestones and tasks.
- `task`: Tasks with recurring logic (RRule).
- `goal` / `habit` / `habit_log`: Personal growth tracking.
- `sync_history` / `sync_state`: P2P synchronization logs.
- `audit_log`: Security and activity logging.

---

## Features

### 1. Knowledge Management (Notes)

- **Markdown Editor:** Rich text editing with Markdown support.
- **Backlinks:** Bidirectional linking using `[[WikiLinks]]`.
- **Tags:** Categorize content with `#tags`.
- **Search:** Full-text search (FTS5) with filters (`tag:`, `created:`).
- **Versioning:** Automatic snapshots of note history (compressed with zstd).

### 2. Project Hub

- **Projects:** Manage complex projects with descriptions and deadlines.
- **Milestones:** Break projects into trackable milestones.
- **Tasks:** Kanban board and list views for task management.
- **Burn-down Charts:** Visual progress tracking.

### 3. Personal Growth

- **Habits:** Track daily habits with streaks and consistency scores.
- **Goals:** Set long-term goals (SMART criteria) and link them to projects/tasks.
- **Weekly Review:** Automated wizard to review past week's performance and plan ahead.

### 4. Universal Dashboard

- **Widgets:** Customizable grid of widgets (Calendar, Tasks, Habits, Stats).
- **Focus Mode:** Zen mode for distraction-free work.
- **Foresight:** AI-powered (local heuristics) suggestions for task prioritization.

### 5. Social Media Suite

- **Aggregator:** View posts from multiple platforms (Twitter, Reddit, etc.) in one timeline.
- **Privacy:** Data is scraped locally or fetched via public APIs (no OAuth required for basic view).
- **Analytics:** Local analysis of engagement and trends.

### 6. P2P Sync

- **Local Network:** Sync devices over WiFi using mDNS for discovery.
- **E2EE:** ECDH key exchange and ChaCha20Poly1305 encryption for secure data transfer.
- **Conflict Resolution:** Vector clocks (CRDT-inspired) to handle concurrent edits.

---

## Development Guide

### Prerequisites

- **Node.js** (v18+) & **pnpm**
- **Rust** (latest stable)
- **System Dependencies:**
  - Linux: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.
  - macOS: Xcode Command Line Tools.
  - Windows: C++ Build Tools.

### Setup

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```
2.  **Build Rust Core (Optional check):**
    ```bash
    cd packages/core-rs
    cargo build
    ```

### Running the App

- **Desktop:**
  ```bash
  cd apps/desktop
  pnpm dev:tauri
  ```
- **Mobile:**
  ```bash
  cd apps/mobile
  pnpm start
  ```

### Testing

- **Run All Tests:**
  ```bash
  # From root
  pnpm test:all # If script exists, otherwise:
  cd packages/core-rs && cargo test
  cd apps/desktop && pnpm test
  cd apps/mobile && pnpm test
  ```

### Directory Structure

- `packages/types`: Shared TypeScript definitions.
- `packages/ui`: Shared React components (if applicable).
- `docs/`: Documentation files.
- `scripts/`: Utility scripts.

---

## Security

### Encryption

- **At Rest:** SQLCipher (AES-256-CBC) for SQLite databases.
- **Key Derivation:** Argon2id for user passwords, PBKDF2 for database keys.
- **DEK (Data Encryption Key):** A random 32-byte key encrypts the database; this key is encrypted by the user's password (KEK).

### Authentication

- **Local:** Password-based session management.
- **Biometric:** Mobile app supports FaceID/TouchID via `expo-local-authentication` (mocked in dev).

### Privacy

- **No Telemetry:** The app does not send usage data to cloud servers.
- **Sandboxed:** The Tauri app runs with a strict Content Security Policy (CSP).

For detailed security audits, refer to `SECURITY.md`.

---

## Workflows

### Creating a New Feature

1.  **Plan:** Document the feature in `PLAN.md`.
2.  **Backend:** Implement logic in `packages/core-rs`. Add tests.
3.  **Frontend:** Implement UI in `apps/desktop` or `apps/mobile`. Add tests.
4.  **Verify:** Run full test suite.
5.  **Document:** Update `WIKI.md` and `CHANGELOG.md`.

### Release Process

1.  **Bump Version:** Update `package.json` and `Cargo.toml`.
2.  **Changelog:** Move "Unreleased" changes to new version in `CHANGELOG.md`.
3.  **Tag:** Create a git tag (e.g., `v1.2.0`).
4.  **Build:** Run CI/CD pipeline to generate binaries.

---

## Troubleshooting & FAQ

### "System library not found" on Linux?
Ensure you have installed `libwebkit2gtk-4.0-dev` (or `4.1` if supported by Tauri v2, currently Noteece uses Tauri v1 which requires 4.0). On Ubuntu 24.04, this package is missing; see `ISSUES.md` for workarounds.

### Sync not working?
- Ensure both devices are on the **same WiFi network**.
- Check if firewall allows **UDP port 5353** (mDNS) and the random TCP port used for sync.
- Verify "Background Sync" is enabled in Settings.

### Database locked?
This usually happens during development if multiple processes access the SQLite file. Restart the app.

---

_For more details, explore the code documentation in specific modules or the `docs/` folder._
