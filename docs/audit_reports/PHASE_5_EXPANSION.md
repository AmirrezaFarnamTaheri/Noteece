# Phase 5: Expansion (New Features) Audit

**Status:** Future Planning
**Goal:** Feature completeness and ecosystem growth.

## Overview
Phase 5 defines the trajectory after V1. The audit highlights the infrastructure required to support these features safely.

## 5.1 Cloud Relay (The "Blind" Server)
*   **Concept:** A dumb pipe server that forwards encrypted blobs between devices when P2P is unavailable (different networks).
*   **Audit Requirement:**
    *   **Zero Knowledge:** The Relay MUST NOT possess the KEK or DEK.
    *   **Protocol:** Use Noise Protocol Framework or similar for the transport layer.
    *   **DoS Protection:** Rate limiting (e.g., "Max 1GB transfer/day/IP").
    *   **Ephemeral:** The Relay should not store data longer than 24h.
*   **Social Privacy Integration:**
    *   The `StreamProcessor` output (private social feed) must **NEVER** be sent to the Relay in plaintext. It must be encrypted with the User's Key before leaving the device.

## 5.2 Plugin System (`packages/core-rs/src/plugin.rs`)
*   **Current State:** Trait definition exists.
*   **Security Risk:** Running 3rd party code.
*   **Requirement:**
    *   **Sandboxing:** WASM (WebAssembly) is the only viable path for safe plugins.
    *   **Host Functions:** Define a strict API (`get_note(id)`, `save_note(id)`) that the plugin can call.
    *   **Fuel Metering:** Prevent infinite loops in plugins from freezing the Core.

## 5.3 Local AI (RAG)
*   **Current State:** `llm` module exists but depends on external APIs?
*   **Goal:** Local Inference.
*   **Requirement:**
    *   **Model Management:** Download/Cache quantized models (GGUF format).
    *   **Hardware:** Use `wgpu` or Metal on macOS / Vulkan on Android.
    *   **Context Window:** Smart chunking of notes (Markdown-aware) for the Vector Database.
    *   **Privacy:** Ensure no data leaves the device during inference.

## 5.4 Multi-User / Collaboration (Future)
*   **Current State:** `project_hub` has `assignee` fields.
*   **Gap:** Encryption is currently Single-Key (Shared Vault Password).
*   **Requirement:**
    *   **MLS (Messaging Layer Security):** Move to Group Encryption where each user has their own key, and a Group Key is derived.
    *   **ACLs:** `db` schema needs `owner_id` and `permissions` bitmask on every entity.

## 5.5 Social Intelligence (`social/stream_processor.rs`)
*   **Privacy Guarantee:**
    *   The `StreamProcessor` ingests raw accessibility text (highly sensitive).
    *   **Audit Requirement:** Implement a "Local Processing Guarantee" (LPG) mechanism. Code must technically prevent this stream from being networked.
    *   **Deduplication:** Move from probabilistic Bloom Filter to deterministic Content-Addressable Storage (CAS) hashes for long-term reliability.

## Phase 5 Checklist
- [ ] Define Relay Protocol (Noise).
- [ ] Prototype WASM Plugin Host (using `wasmer` or `wasmtime`).
- [ ] Evaluate `candle` or `burn` for Rust-based Local LLM inference.
- [ ] Design MLS-based Key Management for Multi-User vaults.
- [ ] Audit `StreamProcessor` for network isolation.
