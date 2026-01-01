# Phase 4: Refinement & Modernization Report

**Status:** Ready for Execution
**Goal:** Shift focus from "correctness" to "excellence". Optimize performance (memory, CPU, battery) and modernize the visual layer.

## 4.1 Database Optimization (`core-rs`)

### Index Tuning
*   **Method:** `EXPLAIN QUERY PLAN` analysis.
*   **Target Queries:**
    *   **Dashboard Load:** `SELECT * FROM task WHERE status != 'done'`.
    *   **Project Kanban:** `SELECT * FROM task WHERE project_id = ? AND status = ?`.
    *   **Sync:** `SELECT * FROM note WHERE modified_at > ?`.
    *   **Health:** `SELECT * FROM health_metric WHERE space_id = ? ORDER BY recorded_at DESC`.
*   **Findings:**
    *   **Missing Index:** `idx_task_project_status` on `task(project_id, status)`. Current scan is inefficient for large projects.
    *   **Missing Index:** `idx_health_metric_space_recorded` on `health_metric(space_id, recorded_at DESC)`. Used heavily for charts.
    *   **Redundant Index:** `idx_note_mod` (modified_at) vs `idx_note_space_mod` (space_id, modified_at).
        *   **Action:** Drop `idx_note_mod`. Queries almost always filter by `space_id` first.
    *   **FTS Overhead:** `fts_task` triggers run on every insert.
        *   **Optimization:** For bulk imports, disable triggers, run insert, then `REBUILD` FTS index.

### Rust Memory Optimization
*   **Profiling Tool:** `valgrind --tool=massif` or `dhat`.
*   **Hot Path:** `sync/engine.rs` -> `apply_deltas`.
    *   **Issue:** `serde_json::from_slice::<Value>` allocates a HashMap for every JSON object.
    *   **Optimization:** Use strong typing `serde_json::from_slice::<Task>`. This allows Serde to deserialize directly into the struct memory layout, avoiding heap allocations for field names.
*   **String Churn:**
    *   **Issue:** `delta.entity_id.clone()` is called frequently in loops.
    *   **Optimization:** Use `Rc<str>` or `Arc<str>` for IDs if they are shared across threads/structs, or simply pass by reference `&str` where ownership isn't needed.
*   **Blob Storage:**
    *   **Optimization:** Implement streaming for `retrieve_blob` to handle >100MB files without OOM.

## 4.2 Frontend Performance

### React Native Optimization
*   **List Rendering (`FlashList`):**
    *   **Prop:** `estimatedItemSize`.
    *   **Audit:** If inaccurate, scroll bar jumps. Measure average height of `PostCard` (e.g., 250px) and set it explicitly.
    *   **Prop:** `drawDistance`. Set to ~2000 (approx 2 screens) to pre-render content smoothly.
*   **Animations (`Reanimated`):**
    *   **Audit:** Check for `runOnJS(true)` usage.
    *   **Goal:** Minimize. Animations should run purely on the UI thread.
    *   **Shared Values:** Ensure heavily updated values (like scroll offset) are `SharedValue`s, not React State.

### Desktop UI Modernization
*   **CSS Compositing:**
    *   **Anti-Pattern:** `transition: width 0.3s`. (Triggers Layout).
    *   **Fix:** `transform: scaleX(...)`. (Triggers Composite only).
*   **Glassmorphism:**
    *   **Performance:** `backdrop-filter: blur(20px)` is expensive on 4K screens.
    *   **Optimization:** Use a "Low Quality" mode toggle that replaces blur with a solid semi-transparent background (`rgba(5,5,6,0.95)`).

## 4.3 Technical Debt & Cleanup (Codebase Scan Results)

### TODOs & Placeholders
*   **Sync Logic:**
    *   `packages/core-rs/src/sync/engine.rs`: "Check for notes modified since last sync if possible".
        *   **Action:** Implement differential sync query using `modified_at > last_sync`.
*   **Graph Visualizer:**
    *   `apps/desktop/src/components/TemporalGraph.tsx`: "In a full production build, we would use 'react-force-graph-2d'".
        *   **Action:** Replace the SVG placeholder with a proper WebGL-based graph library (`react-force-graph` or `sigma.js`) once dependencies allow.
*   **General:**
    *   **Action:** Execute `grep -r "TODO" .` and resolve or document remaining items in `ISSUES.md`.

## Phase 4 Checklist
- [ ] Create `idx_task_project_status`.
- [ ] Create `idx_health_metric_space_recorded`.
- [ ] Drop `idx_note_mod` if unused.
- [ ] Refactor `apply_deltas` to use struct deserialization.
- [ ] Profile memory usage of Sync Engine under load (10k items).
- [ ] Set `FlashList` `drawDistance` and `estimatedItemSize` correctly.
- [ ] Replace layout animations with transform animations where possible.
- [ ] Resolve SVG placeholder in `TemporalGraph.tsx`.
- [ ] Implement Streaming Blob Retrieval.
