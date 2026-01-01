# Phase 5: Expansion (New Features) Report

**Status:** Future
**Goal:** Reach feature completeness and expand the ecosystem.

## Overview
This phase defines the roadmap for features that are currently stubs or planned.

## 5.1 Cloud Relay (Blind Relay)
*   **Concept:** A "dumb" server that forwards encrypted blobs between devices when P2P is unavailable (e.g., different networks).
*   **Requirement:** Zero Knowledge. The server must NOT see plaintext.
*   **Protocol:**
    *   POST `/inbox/{deviceId}`: Auth via ephemeral token. Body = Encrypted Blob.
    *   GET `/inbox/{deviceId}`: Long-poll.
*   **Implementation:** Rust (Axum/Tokio). Deployable on cheap VPS or Edge Functions.

## 5.2 Plugin System (`packages/core-rs/src/plugin.rs`)
*   **Status:** Scaffolding exists (`NoteecePlugin` trait).
*   **Architecture:** WebAssembly (WASM) based.
*   **Security:**
    *   **Sandboxing:** Plugins must run in a restricted runtime (e.g., `wasmtime`).
    *   **Permissions:** Manifest-based permissions (e.g., `read:notes`, `network:google.com`).
    *   **Fuel Metering:** Prevent infinite loops via instruction counting.
*   **Host Functions:** Define the API exposed to plugins (`get_note`, `save_note`, `http_request`).

## 5.3 Local AI (RAG)
*   **Status:** `llm/` module exists but is basic.
*   **Expansion:**
    *   **Model:** Integrate `candle` or `ort` (ONNX Runtime) for running quantized LLMs (e.g., Llama-3-8B-Int4) locally.
    *   **Memory:** Ensure models are loaded on-demand and unloaded immediately to save RAM.
    *   **RAG:** Vector Database is needed.
        *   **Choice:** SQLite `vss` extension OR simple in-memory vector search (HNSW) for small vaults.

## 5.4 Collaboration (Multi-User)
*   **Concept:** Shared Spaces.
*   **Challenges:** Key Management.
*   **Architecture:**
    *   **Space Key:** A symmetric key for the Space, encrypted with each member's Public Key.
    *   **ACL:** `rbac` tables exist. Need to enforce them in the Sync logic.

## Phase 5 Checklist
- [ ] **Relay:** Design "Blind Relay" API spec.
- [ ] **Plugin:** Prototype WASM host with `wasmtime`.
- [ ] **AI:** Benchmark `candle` vs `ort` for on-device inference.
- [ ] **Collab:** Implement Space Key distribution protocol.
