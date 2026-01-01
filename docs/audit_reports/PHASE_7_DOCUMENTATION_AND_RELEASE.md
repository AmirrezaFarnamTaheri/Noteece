# Phase 7: Documentation & Release Audit

**Status:** Incomplete
**Goal:** Public readiness. If it isn't documented, it doesn't exist.

## Overview
The audit reveals that while internal developer documentation is growing, user-facing and security documentation is lagging.

## 7.1 Technical Documentation
*   **Architecture Diagrams:**
    *   **Missing:** "Sync Protocol Sequence Diagram" (Handshake -> Delta Exchange -> Conflict).
    *   **Missing:** "Encryption Key Hierarchy" (Master Key -> KEK -> DEK -> Content).
    *   **Action:** Create MermaidJS diagrams in `docs/wiki/Architecture/`.
*   **API Reference:**
    *   **Missing:** JSI Bridge API documentation.
    *   **Action:** Document the FFI boundary methods in `packages/core-rs/src/mobile_ffi.rs`.

## 7.2 User Documentation
*   **Security Whitepaper:**
    *   **Requirement:** Users trust us with their life's work. We need a "How it Works" security page.
    *   **Content:** Explain Argon2, XChaCha20-Poly1305, and the Local-First model. Explicitly state the "No Cloud" guarantee.
*   **Troubleshooting Guide:**
    *   **Scenario:** "Sync isn't working".
    *   **Content:** Step-by-step debug (Check firewall, check version, check clock).

## 7.3 Release Artifacts
*   **SBOM (Software Bill of Materials):**
    *   **Requirement:** Generate a machine-readable list of all dependencies.
    *   **Tool:** `cargo-sbom` and `syft`.
*   **Signing & Notarization:**
    *   **Windows:** EV Certificate (prevents SmartScreen warning).
    *   **macOS:** Notarization (required to run on modern macOS).
    *   **Android:** Play Store Signing Key.
*   **Reproducible Builds:**
    *   **Goal:** Anyone can build the source and get the exact same binary hash.
    *   **Action:** Pin all toolchains (Phase 0) and document the exact build environment (Docker).

## Phase 7 Checklist
- [ ] Create Encryption Hierarchy Diagram.
- [ ] Create Sync Protocol Sequence Diagram.
- [ ] Write "Security Whitepaper" (draft in `docs/security/`).
- [ ] Generate SBOM for v1.0.0.
- [ ] Verify macOS Notarization pipeline.
