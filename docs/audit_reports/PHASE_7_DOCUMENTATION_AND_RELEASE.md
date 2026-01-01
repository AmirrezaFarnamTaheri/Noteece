# Phase 7: Documentation & Release Report

**Status:** In Progress
**Goal:** Public readiness. The project is not done until the docs are done.

## Overview
Documentation must be treated as code. It must be versioned, accurate, and comprehensive.

## 7.1 Documentation Structure
*   `PROJECT_DOCS.md`: The Technical Index (for Developers).
*   `docs/wiki/`: The Encyclopedia.
    *   `01_Architecture/`: System Design, Sync Protocol, Encryption Spec.
    *   `02_Features/`: User Guide, Feature explanations.
    *   `03_Development/`: Setup, Contributing, Release Process.
    *   `WIKI.md`: The Index.

## 7.2 Release Artifacts
*   **Signing:**
    *   **Windows:** EV Code Signing Certificate (Required for SmartScreen).
    *   **macOS:** Apple Developer ID + Notarization (Required for Gatekeeper).
    *   **Android:** Upload Key + Play Store Signing.
*   **SBOM (Software Bill of Materials):**
    *   **Action:** Generate SBOM (CycloneDX/SPDX) for every release.
    *   **Tool:** `cargo-sbom`, `syft`.
    *   **Why:** Compliance and supply chain security transparency.
*   **Checksums:**
    *   Publish `SHA256SUMS.txt` alongside binaries.

## 7.3 Legal & Compliance
*   **Privacy Policy:**
    *   Must state: "We do not see your data. It is encrypted on your device."
    *   If using Relay: "Relay server sees only encrypted blobs."
*   **Terms of Service:**
    *   Liability limitations (Software provided "AS IS").

## Phase 7 Checklist
- [ ] **Docs:** Complete Architecture Diagrams (Mermaid.js).
- [ ] **Release:** Automate SBOM generation in GitHub Actions.
- [ ] **Release:** Set up Code Signing secrets in CI.
- [ ] **Legal:** Draft Privacy Policy.
