# Phase 4: Refinement & Modernization Report

**Status:** Planned
**Goal:** Optimization, Code Polish, and Architectural Clean-up.

## Overview
Once correctness (Phase 1) and Security (Phase 0/2) are addressed, we optimize. This phase targets performance bottlenecks and technical debt identified during the deep dive.

## 4.1 Backend Optimization (`packages/core-rs`)

### 4.1.1 Database Tuning
*   **Indexing Strategy:**
    *   **Missing Indices:**
        *   `idx_task_project_status`: For "Get all active tasks in project".
        *   `idx_note_space_mod`: For Sync Manifest generation (`SELECT id, modified_at FROM note WHERE space_id = ?`).
    *   **Redundant Indices:** Audit `db/migrations.rs` for duplicate indices created by automatic tools.
*   **Query Optimization:**
    *   **Sync Manifest:**
        *   **Current:** O(N) scan of `note` table.
        *   **Optimization:** Introduce a `merkle_tree` table or a `last_sync_state` table to reduce scan scope to only modified items since `last_sync_at`.
    *   **Memory:**
        *   **Current:** `apply_deltas` deserializes JSON to `serde_json::Value` then to Structs.
        *   **Refinement:** Deserialize directly to Structs (`ZeroCopy` if possible) to reduce allocation churn.

### 4.1.2 Search Engine (`search/`)
*   **FTS5 Configuration:**
    *   **Current:** `porter unicode61 remove_diacritics 2`.
    *   **Refinement:** Evaluate `trigram` tokenizer for better fuzzy matching (substring search).
    *   **Ranking:** Implement `bm25` ranking function for better relevance sorting.

## 4.2 Frontend Polish (`apps/desktop` & `apps/mobile`)

### 4.2.1 Visual Performance
*   **CSS/Animation:**
    *   **Check:** Ensure animations use `transform` and `opacity` only (GPU accelerated). Avoid animating `width`, `height`, or `top/left` (Layout thrashing).
    *   **Glassmorphism:** `backdrop-filter: blur()` is expensive.
        *   **Optimization:** Disable blur on Low Power Mode or low-end devices. Use a static semi-transparent fallback.

### 4.2.2 Code Hygiene
*   **React Best Practices:**
    *   **Memoization:** Audit `useMemo` and `useCallback` usage in high-frequency components (`TaskBoard`, `GraphView`).
    *   **Bundle Size:** Analyze `dist` output. Tree-shake unused icons from `@tabler/icons-react`.

## 4.3 Rust Code Quality
*   **Error Handling:**
    *   **Audit:** Remove `unwrap()` and `expect()` from `core-rs`. Replace with proper `Result` propagation (`?`).
    *   **Logging:** Ensure structured logging (JSON in production, pretty in dev) via `tracing` crate instead of `log` + `env_logger`.

### SRS Event Sourcing
*   **Observation:** `revision_history_json` duplicates `review_log`.
*   **Fix:** Remove JSON blob. Reconstruct history from logs on-the-fly.

## Phase 4 Checklist
- [ ] **HIGH:** Fix Cartesian Product query.
- [ ] **HIGH:** Add `idx_note_space_mod`.
- [ ] **MEDIUM:** Sanitize Search Queries.
- [ ] **MEDIUM:** Optimize `apply_deltas` memory.
- [ ] **LOW:** Implement Streaming Blobs.
- [ ] **LOW:** CSS Optimizations.
- [ ] **LOW:** Resolve all TODOs.
- [ ] **DB:** Add `idx_note_space_mod` index.
- [ ] **Sync:** Optimize Manifest generation (Merkle Tree or Timestamp Index).
- [ ] **Search:** Test `trigram` tokenizer for FTS5.
- [ ] **UI:** Optimize Glassmorphism performance.
- [ ] **Code:** Replace `unwrap()` with error propagation in `core-rs`.
- [ ] **Code:** Tree-shake unused icons.
