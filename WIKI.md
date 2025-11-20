# Noteece Wiki

Welcome to the Noteece project wiki. This document serves as a comprehensive guide to the project's architecture, features, and development workflows.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Development Guide](#development-guide)
5. [Sync Protocol](#sync-protocol)
6. [Security](#security)
7. [Database Schema](#database-schema)

---

## 1. Project Overview

**Noteece** is a local-first, end-to-end encrypted workspace designed for speed-of-thought productivity. It combines note-taking, task management, and personal data aggregation (Health, Music, Social) into a single, private vault.

### Key Principles
*   **Local-First:** Your data lives on your device. The network is optional.
*   **Privacy-Centric:** All data is encrypted at rest (SQLCipher) and in transit (TLS + End-to-End encryption for sync).
*   **Speed:** Optimized for rapid capture and retrieval.
*   **Ownership:** You own your data. Export to Markdown/JSON at any time.

---

## 2. Architecture

Noteece follows a **monorepo** structure using Rust for the core logic and TypeScript/React for the frontend.

### Directory Structure
*   `apps/desktop`: Tauri v1 application (React + Mantine).
*   `apps/mobile`: Expo/React Native application.
*   `packages/core-rs`: Shared Rust backend library (Business logic, DB, Crypto, Sync).
*   `packages/types`: Shared TypeScript definitions.
*   `packages/ui`: Shared UI components (WIP).

### Technology Stack
*   **Backend:** Rust, Rusqlite (SQLCipher), Tokio, Hyper.
*   **Frontend (Desktop):** React, Vite, Mantine, Zustand, React Query.
*   **Frontend (Mobile):** React Native, Expo, Tamagui/NativeBase (transitioning).
*   **Database:** SQLite (encrypted via SQLCipher).
*   **Sync:** Custom P2P protocol over WebSocket/mDNS.

---

## 3. Core Features

### 📝 Note-Taking
*   Markdown-based editor with rich text support.
*   Backlinking (`[[Link]]`) and graph view.
*   Tagging and full-text search (FTS5).

### ✅ Task Management
*   GTD-inspired workflow (Inbox, Next, Waiting, Done).
*   Project hierarchy with milestones and dependencies.
*   Kanban board view.

### ❤️ Health Hub
*   Track metrics (Steps, Sleep, Mood, etc.).
*   Visualize trends over time.
*   Sync with mobile health data (planned).

### 🎵 Music Hub
*   Manage local library (Tracks, Playlists).
*   Smart playlists based on criteria.
*   Listen history and analytics.

### 🌐 Social Hub
*   Aggregated timeline from multiple platforms (Twitter/X, Mastodon, etc.).
*   Local-only storage of posts.
*   Auto-categorization and focus modes.

---

## 4. Development Guide

### Prerequisites
*   Node.js (v18+) & pnpm.
*   Rust (stable).
*   System dependencies (see `BUILD.md`).

### Setup
```bash
pnpm install
```

### Running Desktop
```bash
pnpm dev:desktop
# or
cd apps/desktop && pnpm dev:tauri
```

### Running Mobile
```bash
cd apps/mobile && pnpm start
```

### Running Tests
```bash
# Backend
cd packages/core-rs && cargo test

# Frontend
pnpm test
```

---

## 5. Sync Protocol

Noteece uses a custom peer-to-peer sync protocol designed for local networks.

1.  **Discovery:** Devices find each other using mDNS (`_noteece-sync._tcp`).
2.  **Handshake:** ECDH key exchange establishes a secure session.
3.  **Authentication:** Devices authenticate using a shared vault password (derived key).
4.  **Synchronization:**
    *   **Vector Clocks** track causality.
    *   **Merkle Trees** (simplified) detect data divergence.
    *   **Deltas** (encrypted changesets) are exchanged to converge states.

---

## 6. Security

*   **Encryption at Rest:** The SQLite database is encrypted using SQLCipher (256-bit AES).
*   **Key Derivation:** Argon2id is used to derive the Data Encryption Key (DEK) from the user's master password.
*   **Zero-Knowledge:** The server (if one exists for relay) sees only encrypted blobs.

---

## 7. Database Schema

The schema is versioned and managed via migrations in `packages/core-rs/src/db.rs`.

### Key Tables
*   `space`: Logical containers for data.
*   `note`: Markdown content.
*   `task`: Actionable items.
*   `social_account` / `social_post`: Social media data.
*   `health_metric`: Health data points.
*   `track` / `playlist`: Music library.

For the full schema definition, refer to `packages/core-rs/src/db.rs` or `apps/mobile/src/lib/database.ts`.
