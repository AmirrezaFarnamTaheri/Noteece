# Phase 2: The Frontend Audit Report

**Status:** Ready for Execution
**Goal:** Ensure the User Interface is responsive, bug-free, and handles state mutations safely across both Desktop and Mobile platforms.

## 2.1 Desktop State (`apps/desktop/src/store.ts`)

### Zustand Persistence
*   **Config:** `persist(store, { name: 'app-storage' })`.
*   **Audit Finding:** `activeSpaceId` is persisted.
*   **Risk:** If the user deletes the active space (on another device), `activeSpaceId` points to a ghost.
*   **Fix:** `onRehydrateStorage` callback should verify `activeSpaceId` exists. If not, reset to `null`.
*   **Performance:** `spaces` array persistence.
    *   **Fix:** Only persist `activeSpaceId` and `zenMode`. Fetch `spaces` from DB on boot.

### React Component Performance (`apps/desktop`)
*   **TaskBoard:**
    *   **Audit:** Check for `React.memo` on `TaskCard`.
    *   **Risk:** Dragging one card causes re-render of *all* cards in the column.
    *   **Fix:** Memoize `TaskCard`. Use `dnd-kit`'s `<DragOverlay>` to optimize the dragging visual.
*   **API Layer (`api.ts`):**
    *   **Type Safety:** Manual mapping of snake_case to camelCase.
    *   **Fix:** Use `serde` rename attributes in Rust to force camelCase JSON output.

### Deep Dive: Security Configuration
*   **CSP (Content Security Policy):**
    *   **Finding:** `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`.
    *   **Risk:** Critical XSS if malicious note content renders script tags.
    *   **Fix:** Tighten CSP. Remove unsafe directives. Use nonces.
*   **Memory Safety:**
    *   **Finding:** `DbConnection` (state.rs) holds DEK in `Mutex<Option<Vec<u8>>>`.
    *   **Risk:** Memory dump reveals DEK.
    *   **Fix:** Use `Zeroize` to clear memory on lock screen or app suspend.

## 2.2 Mobile Database (`apps/mobile/src/lib/database.ts`)

### Migration Logic
*   **Function:** `runMigrations` (v4->v5).
*   **Audit Finding:** In-memory string splitting of all tags.
    *   **Risk:** OOM on large vaults.
    *   **Fix:** Process in chunks (pagination).

### JSI Bridge Integration
*   **Concurrency:**
    *   **Risk:** `SQLITE_BUSY` if Rust (Sync) writes while JS (UI) reads.
    *   **Fix:** Explicitly enable `PRAGMA journal_mode=WAL` in both contexts.
*   **Deep Dive: Encryption Gap:**
    *   **Finding:** `expo-sqlite` (JS) likely cannot read SQLCipher DBs created by Rust.
    *   **Action:** Verify binary capability. Replace with `op-sqlite` if needed.

## 2.3 Mobile UI Components (`src/components/social`)

### List Performance
*   **Images:** Social feeds are image-heavy.
*   **Fix:** Mandatory usage of `expo-image` with caching.
*   **FlashList:** Tune `drawDistance` and `estimatedItemSize`.

### Interaction & Accessibility
*   **Touch Targets:** Ensure 44x44pt minimum.
*   **State:** Check `useCallback` on handlers to prevent re-renders.
*   **Accessibility:** Ensure `accessibilityLabel` is set for all icon-only buttons.

## 2.4 Mobile Screens (`src/screens`)

### Navigation State
*   **Issue:** Android "Don't Keep Activities".
*   **Fix:** Persist draft content to `AsyncStorage` on keystroke (debounced).

## 2.5 Desktop Hooks & Utils (`src/hooks`)

### Stale Closures
*   **Pattern:** `useEffect` missing dependencies.
*   **Fix:** Enable `react-hooks/exhaustive-deps`.

## Phase 2 Checklist
- [ ] **CRITICAL:** Fix Mobile Encryption (Replace `expo-sqlite`?).
- [ ] **HIGH:** Tighten Desktop CSP.
- [ ] **HIGH:** Secure DEK in Memory.
- [ ] **MEDIUM:** Add `PRAGMA journal_mode = WAL`.
- [ ] **MEDIUM:** Paginate v4->v5 migration.
- [ ] **MEDIUM:** Memoize `TaskCard` and `CategoryPicker`.
- [ ] **LOW:** Implement Draft Persistence.

---

## Technical Appendix: Implementation Guides

### B.1 Secure Zustand Hydration
Prevent "Ghost State" crashes by validating persisted IDs against the database.

```typescript
// apps/desktop/src/store.ts

export const useStore = create<AppState>()(
  persist(store, {
    name: 'app-storage',
    partialize: (state) => ({
      activeSpaceId: state.activeSpaceId, // Only persist ID
      zenMode: state.zenMode
    }),
    onRehydrateStorage: () => (state) => {
      if (state && state.activeSpaceId) {
        checkSpaceExists(state.activeSpaceId).then(exists => {
          if (!exists) {
            console.warn("Hydrated space ID not found, resetting.");
            useStore.setState({ activeSpaceId: null });
          }
        });
      }
    }
  })
);
```

### B.2 Migration from expo-sqlite to op-sqlite
To support SQLCipher on Mobile.

```typescript
// apps/mobile/src/lib/database.ts

import { open } from '@op-engineering/op-sqlite';

export const initializeDatabase = async (key: string): Promise<void> => {
  db = open({
    name: 'noteece.db',
    encryptionKey: key, // Pass the key derived from User Password
  });

  await db.execute('PRAGMA journal_mode = WAL;');
};
```
