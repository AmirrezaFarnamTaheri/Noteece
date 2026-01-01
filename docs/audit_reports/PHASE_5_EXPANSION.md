# Phase 5: Expansion Report

**Status:** Ready for Execution
**Goal:** Implement differentiating features (`Blind Relay`, `Plugins`, `Local AI`) securely.

## 5.1 Cloud Relay (Blind Relay)
*   **Protocol:** "Dumb Pipe". Server stores encrypted blobs.
*   **Security:** Server never sees keys.
*   **Privacy Requirement:** Social Stream data must be encrypted with User Key before upload.

## 5.2 Plugin System
*   **Architecture:** WASM Sandboxing (`wasmer`).
*   **Safety:** Fuel metering, memory limits (64MB), no IO.

## 5.3 Local AI
*   **Pipeline:** `all-MiniLM-L6-v2` (Embed) -> `sqlite-vss` -> `ort` (Inference).
*   **Resource:** Unload model immediately after use.

## 5.4 Social Intelligence (Deep Dive)
*   **Privacy:** `StreamProcessor` ingests raw accessibility text.
*   **Guarantee:** Implement "Local Processing Guarantee" (LPG). Ensure this stream *never* leaves the device unencrypted.

## 5.5 Advanced Visualizers
*   **Graph:** Interactive 2D/3D evolution.
*   **Widgets:** Habit Heatmap, Focus Timer.

## Phase 5 Checklist
- [ ] Design Blind Relay Protocol.
- [ ] Prototype WASM Host.
- [ ] Integrate `ort` for Local AI.
- [ ] Audit Social Stream network isolation.
