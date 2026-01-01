# Phase 5: Expansion Report

**Status:** Ready for Execution
**Goal:** Implement differentiating features (`Blind Relay`, `Plugins`, `Local AI`) securely and robustly.

## 5.1 Cloud Relay (Blind Relay Server)

### Protocol Specification
*   **Concept:** "Dumb Pipe". The server stores encrypted blobs addressed by a hash.
*   **Sequence:**
    1.  **Device A (Push):**
        *   Generates `Payload = Encrypt(Data, Key)`.
        *   Generates `BoxID = Hash(PublicKey + "Relay")`.
        *   `POST /box/{BoxID}` with `Payload`.
    2.  **Server:**
        *   Stores `Payload` at `BoxID`.
        *   Sets TTL (e.g., 24 hours).
    3.  **Device B (Pull):**
        *   Derives `BoxID`.
        *   `GET /box/{BoxID}`.
        *   `Decrypt(Payload, Key)`.
*   **Security:**
    *   Server *never* sees `Key`.
    *   Server *never* sees `PublicKey` (only Hash).
    *   **Rate Limiting:** 1GB/day per IP.

## 5.2 Plugin System (`packages/core-rs/src/plugin.rs`)

### WASM Host Functions
*   **API Surface:**
    *   `get_note(id: &str) -> Option<String>`
    *   `create_note(title: &str, content: &str) -> String`
    *   `log(msg: &str)`
*   **Sandboxing:**
    *   **Runtime:** `wasmer` / `wasmtime`.
    *   **Memory:** Limit to 64MB per plugin.
    *   **Fuel:** Meter instructions. Kill if > 1M ops (prevent infinite loops).
    *   **IO:** No network access. No FS access outside the vault.

## 5.3 Local AI & Intelligence

### RAG Pipeline
*   **Embedding Model:** `all-MiniLM-L6-v2` (Quantized).
    *   Small, fast, runs on CPU.
*   **Vector Store:** `sqlite-vss` or a simple in-memory K-D Tree (for < 10k notes).
*   **Inference:**
    *   **Engine:** `ort` (ONNX Runtime).
    *   **Flow:** User Query -> Embed -> Search Vectors -> Retrieve Top 5 Notes -> LLM Context.
*   **Resource Management:**
    *   **Critical:** Unload the model immediately after response generation to free ~500MB RAM.

## 5.4 Advanced Visualizers & Widgets

### Temporal Graph
*   **Feature:** Interactive 2D/3D knowledge graph evolution.
*   **Implementation:** Replace current SVG placeholder with `react-force-graph-2d`.
*   **Data:** Use `get_graph_evolution_cmd` (already audited) to feed the visualizer.

### Rich Widgets
*   **Goal:** Expand Dashboard capabilities.
*   **New Widgets:**
    *   `HabitHeatmap`: GitHub-style contribution graph for habit completions.
    *   `FocusTimer`: Pomodoro timer integrated with Task state (In Progress -> Done).
    *   `SocialTrends`: Sparklines showing engagement metrics from the Social Suite.

## Phase 5 Checklist
- [ ] Implement Blind Relay Server (Rust/Axum).
- [ ] Define `HostFunctions` trait for WASM.
- [ ] Implement `Fuel` metering for plugins.
- [ ] Integrate `ort` for local embeddings.
- [ ] Implement `react-force-graph-2d` visualizer.
- [ ] Build `HabitHeatmap` widget.
