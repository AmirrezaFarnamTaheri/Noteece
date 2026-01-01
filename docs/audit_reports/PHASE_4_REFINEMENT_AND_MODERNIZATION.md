# Phase 4: Refinement & Modernization Audit

**Status:** Optimization Opportunities Identified
**Goal:** Optimization and Polish. Make it fast, make it smooth.

## Overview
Once the critical security and correctness issues (Phase 1-3) are resolved, Phase 4 targets performance and code quality. The audit identified specific bottlenecks in the Sync Engine, Frontend rendering, and Database query patterns.

## 4.1 Backend Optimization (`core-rs`)

### Database Query Tuning
*   **Indexing:**
    *   **Missing:** `CREATE INDEX idx_note_space_mod ON note(space_id, modified_at DESC)` is critical for the `get_deltas` query. Currently, it might be doing a full table scan if filtering by space.
    *   **Redundant:** Check if `idx_note_mod` (global) is needed if we always query by `space_id`.
*   **Query Plans:**
    *   **Action:** Use `EXPLAIN QUERY PLAN` on the `compute_entity_hashes` query.
    *   **Goal:** Ensure it uses a Covering Index (reading only from the B-Tree, not the heap).

### Query Optimization (Cartesian Products)
*   **File:** `packages/core-rs/src/project/db/project.rs` -> `get_projects_in_space`
*   **Observation:** The query performs a `LEFT JOIN` on `task` AND `project_milestone`.
*   **Risk:** Cartesian Product Explosion.
    *   Example: 1 Project * 50 Tasks * 10 Milestones = 500 rows returned for a single project.
    *   If a space has 20 projects, this could return 10,000+ rows, consuming massive memory and CPU for deserialization.
*   **Fix:**
    *   **Option A:** Fetch Projects, then fetch Tasks (filtered by project IDs), then fetch Milestones. Stitch them together in Rust (Application-Side Join).
    *   **Option B:** Use `JSON_GROUP_ARRAY` (if SQLite version permits) to aggregate tasks/milestones into a single column per project row.

### Search Optimization
*   **File:** `packages/core-rs/src/search/mod.rs`
*   **Observation:** `search_notes` constructs a `MATCH` query dynamically.
*   **Risk:** FTS5 Syntax Errors.
    *   If a user searches for `foo"bar` or `foo*`, it might break the FTS syntax.
*   **Fix:** Sanitize the input string (escape quotes, handle special FTS operators) before binding it to `MATCH`.
*   **Robustness:** The fallback to `LIKE` is a good fail-safe, but FTS should be reliable.

### Memory & Allocation
*   **Serialization:**
    *   **Observation:** `smart_merge_entity` deserializes `serde_json::Value`. This is flexible but slow and heap-intensive.
    *   **Optimization:** Define strict Structs (`TaskPartial`, `NotePartial`) for the merge logic to use `serde`'s zero-copy deserialization where possible.
*   **Cloning:**
    *   **Audit:** Review `DeltaGatherer`. Are we cloning the entire content of a note just to check a hash?
    *   **Fix:** Hash the content stream directly from the DB row without loading the full string into RAM.

## 4.2 Frontend Polish (`apps/desktop`)

### Rendering Performance
*   **Task Board:**
    *   **Issue:** Dragging a card causes re-renders of the entire column.
    *   **Fix:** Use `React.memo` with custom comparison functions. Move "Drag State" to a transient atom (Jotai/Zustand) to avoid React Context ripple effects.
*   **Large Lists:**
    *   **Issue:** `NoteList` renders all items?
    *   **Fix:** Strict Virtualization (`react-window`).

### Visual Polish
*   **Glassmorphism:**
    *   **Issue:** `backdrop-filter: blur()` is GPU expensive.
    *   **Fix:** Disable on Low Power Mode or if battery < 20%.
*   **Transitions:**
    *   **Issue:** Layout thrashing when sidebar toggles.
    *   **Fix:** Use CSS `transform: translateX` instead of changing `width`.

## 4.3 Mobile Polish (`apps/mobile`)

### Startup Time
*   **Issue:** `initializeDatabase` runs migrations on every start.
*   **Fix:** Cache the `db_version` in `AsyncStorage` and only run migration check if the App Version changed.

### Gestures
*   **Issue:** `react-native-gesture-handler` vs built-in Responder system.
*   **Fix:** Ensure all swipe actions (Archive Note) use Reanimated 2/3 for 60fps native-thread interaction.

## Phase 4 Checklist
- [ ] **HIGH:** Fix Cartesian Product in `get_projects_in_space`.
- [ ] **HIGH:** Add `idx_note_space_mod` index.
- [ ] **MEDIUM:** Sanitize FTS5 Search Queries.
- [ ] **MEDIUM:** Optimize `smart_merge_entity` serialization.
- [ ] **MEDIUM:** Implement `React.memo` on Task Cards.
- [ ] **LOW:** CSS Transform optimization for Sidebar.
- [ ] **LOW:** Optimize Mobile Migration check.
