# Phase 2: The Frontend Audit Report

**Status:** Ready for Execution
**Goal:** Ensure the User Interface is responsive, bug-free, and handles state mutations safely across both Desktop and Mobile platforms.

## 2.1 Desktop State (`apps/desktop/src/store.ts`)

### Zustand Persistence
*   **Config:** `persist(store, { name: 'app-storage' })`.
*   **Audit Finding:** `activeSpaceId` is persisted.
*   **Risk:** If the user deletes the active space (on another device or via manual DB edit), then opens Desktop, `activeSpaceId` points to a ghost. The app will likely show a blank screen or crash on `get_space(id)`.
*   **Fix:** `onRehydrateStorage` callback should verify `activeSpaceId` exists in `spaces` array. If not, reset to `null`.
*   **Performance:**
    *   **Finding:** `spaces` array is also persisted.
    *   **Risk:** If the user has 1000 spaces (unlikely but possible), local storage gets heavy.
    *   **Fix:** Only persist `activeSpaceId` and `zenMode`. Fetch `spaces` from DB on boot.

### React Component Performance (`apps/desktop`)
*   **TaskBoard:**
    *   **Audit:** Check for `React.memo` on `TaskCard`.
    *   **Risk:** Dragging one card causes re-render of *all* cards in the column.
    *   **Fix:** Memoize `TaskCard`. Use `dnd-kit`'s `<DragOverlay>` to optimize the dragging visual.
*   **API Layer (`api.ts`):**
    *   **Type Safety:** `createManualTimeEntry` manually maps `started_at` (Rust snake_case) to `startedAt` (JS camelCase).
    *   **Risk:** Fragile. If Rust struct changes, TS won't complain until runtime failure.
    *   **Fix:** Use `serde` rename attributes in Rust to force camelCase JSON output, matching JS conventions automatically.

## 2.2 Mobile Database (`apps/mobile/src/lib/database.ts`)

### Migration Logic
*   **Function:** `runMigrations`
*   **Audit Finding (v4->v5):**
    *   `const tagNames = item.tags.split(',')`.
    *   **Logic:** In-memory processing of *all* notes with tags.
    *   **Memory Risk:** If a user has 10,000 notes, `oldTags` array might cause OOM on low-end Android.
    *   **Fix:** Process in chunks (LIMIT/OFFSET) or use a cursor.

### JSI Bridge Integration
*   **Code:** `if (syncBridge.isJSIAvailable()) ... syncBridge.init(dbPath)`.
*   **Concurrency:**
    *   SQLite is opened in JS (`SQLite.openDatabaseAsync`) AND in Rust (`syncBridge.init`).
    *   **Risk:** `SQLITE_BUSY`. If Rust Sync Engine writes while JS UI reads, one will fail if WAL mode isn't perfect.
    *   **Check:** `PRAGMA journal_mode=WAL` is set in Rust, but is it set in Expo SQLite? Expo SQLite often uses `DELETE` mode by default.
    *   **Action:** Explicitly run `db.execAsync('PRAGMA journal_mode = WAL;')` in `initializeDatabase`.

## 2.3 Mobile UI Components (`src/components/social`)

### List Performance
*   **Component:** `PostCard.tsx` (inferred).
*   **Images:** Social feeds are image-heavy.
*   **Risk:** Using standard `<Image />` without caching causes re-downloads on every scroll.
*   **Audit:** Check if `expo-image` is used.
*   **Fix:** Mandatory usage of `expo-image` with `cachePolicy="memory-disk"` for all user-generated content.
*   **Draw Distance:**
    *   **Component:** `FlashList`.
    *   **Setting:** `drawDistance`.
    *   **Tuning:** Set to roughly 2x screen height. Too low = blank spaces on fast scroll. Too high = memory waste.

### Interaction & Accessibility
*   **Component:** `CategoryPicker.tsx`.
*   **Touch Targets:** Ensure category chips are at least 44x44 points.
*   **State:** Does selecting a category trigger a full list re-render?
*   **Audit:** Check for `useCallback` on selection handlers passed to children.
*   **Accessibility:** Ensure `accessibilityLabel` is set for all icon-only buttons.

## 2.4 Mobile Screens (`src/screens`)

### Navigation State
*   **Issue:** Android "Don't Keep Activities" setting.
*   **Risk:** If user backgrounds app while editing a note, OS kills activity.
*   **Audit:** Does the app restore the draft state on restart?
*   **Fix:** Persist draft content to `AsyncStorage` on every keystroke (debounced 500ms) or `onBlur`.

## Phase 2 Checklist
- [ ] Add `PRAGMA journal_mode = WAL` to `initializeDatabase` in Mobile.
- [ ] Paginate the v4->v5 migration tag processing.
- [ ] Implement `onRehydrateStorage` validation for `activeSpaceId`.
- [ ] Switch Social Feed images to `expo-image` if not already.
- [ ] Verify `CategoryPicker` handlers are memoized.
- [ ] Implement Draft Persistence for Note Editor (Mobile).
