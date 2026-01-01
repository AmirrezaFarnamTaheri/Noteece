# Phase 4: Refinement & Modernization Report

**Status:** Ready for Execution
**Goal:** Shift focus from "correctness" to "excellence". Optimize performance and modernize the visual layer.

## 4.1 Database Optimization (`core-rs`)

### Index Tuning
*   **Missing:** `idx_task_project_status`, `idx_health_metric_space_recorded`.
*   **Redundant:** `idx_note_mod` (superseded by `idx_note_space_mod`).
*   **Action:** Add/Remove indices via migration.

### Query Optimization (Deep Dive)
*   **Issue:** Cartesian Product in `get_projects_in_space`.
    *   **Logic:** `LEFT JOIN task` AND `LEFT JOIN milestone`.
    *   **Risk:** Returns `Projects * Tasks * Milestones` rows.
    *   **Fix:** Split into 3 queries or use `JSON_GROUP_ARRAY`.

### Search Optimization
*   **Issue:** FTS5 Query Construction.
    *   **Risk:** Syntax errors on user input (`*`, `"`).
    *   **Fix:** Sanitize input string before binding to `MATCH`.

### Memory Optimization
*   **JSON:** `serde_json::from_slice::<Value>` allocates heavily.
    *   **Fix:** Use struct deserialization (`Task`).
*   **Blobs:** `retrieve_blob` reads full file to RAM.
    *   **Fix:** Implement streaming retrieval.

## 4.2 Frontend Performance

### React Native
*   **FlashList:** Tune `drawDistance` and `estimatedItemSize`.
*   **Animations:** Use `Reanimated` on UI thread.

### Desktop UI
*   **CSS:** Prefer `transform` over `width/height` transitions.
*   **Glassmorphism:** Toggle blur based on power mode.

## 4.3 Technical Debt
*   **Graph:** Replace SVG placeholder with `react-force-graph`.
*   **Differential Sync:** Implement `modified_at > last_sync` query.

## Phase 4 Checklist
- [ ] **HIGH:** Fix Cartesian Product query.
- [ ] **HIGH:** Add `idx_note_space_mod`.
- [ ] **MEDIUM:** Sanitize Search Queries.
- [ ] **MEDIUM:** Optimize `apply_deltas` memory.
- [ ] **LOW:** Implement Streaming Blobs.
- [ ] **LOW:** CSS Optimizations.
