# Vector Clocks & Conflict Resolution

## The Challenge of Distributed Sync

In a local-first system like Noteece, multiple devices (nodes) can modify the same data independently while offline. When they reconnect, they need a way to converge on a consistent state without a central authority to dictate the "truth".

## Vector Clocks

Noteece uses **Vector Clocks** to track the causal history of data. A vector clock is an array of logical clocks, one for each node in the system.

### Structure

Each space has a `SyncState` table that stores the local vector clock for that space.

```rust
// Logical representation
struct VectorClock {
    clocks: HashMap<DeviceId, u64>
}
```

- **`DeviceId`**: A unique ULID generated when the app is installed.
- **`u64`**: A monotonically increasing counter representing the "version" or "time" of that device.

### Workflow

1.  **Local Update:**
    When Device A updates a note:
    - It increments its own counter in the vector clock: `VC_A[A] += 1`.
    - It records this new `timestamp` (counter value) on the entity itself or in an audit log.

2.  **Sync Handshake:**
    When Device A syncs with Device B:
    - They exchange their current Vector Clocks.
    - They compare them to determine which device is "ahead" or if they are concurrent.

3.  **Comparison Logic:**
    - **`A > B` (A dominates B):** If every counter in A is >= every counter in B.
      - _Result:_ B is outdated. A sends updates to B.
    - **`A < B` (B dominates A):** If every counter in B is >= every counter in A.
      - _Result:_ A is outdated. B sends updates to A.
    - **`A || B` (Concurrent):** If A has updates B hasn't seen, AND B has updates A hasn't seen.
      - _Result:_ **Conflict!**

## Conflict Resolution

When concurrent changes are detected (`A || B`), Noteece cannot automatically decide which version is "correct" because both are valid user intents.

### The `SyncConflict` Table

Instead of overwriting or discarding data, the system creates a `SyncConflict` record.

```sql
CREATE TABLE sync_conflict (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    local_data TEXT NOT NULL, -- JSON serialization of local version
    remote_data TEXT NOT NULL, -- JSON serialization of incoming version
    resolved INTEGER DEFAULT 0
);
```

### User Interface

1.  The user sees a "Sync Conflict" notification.
2.  Clicking it opens the **Resolution UI**.
3.  The UI displays a diff (side-by-side or unified) of the Local vs. Remote content.
4.  **Options:**
    - **Keep Local:** Discards remote changes.
    - **Keep Remote:** Overwrites local with remote.
    - **Merge:** Opens a text editor with both contents (for Notes) or allows field-level selection (for structured data).

### Automated Resolution (LWW)

For non-critical data (like `last_synced_at` timestamps or cached metadata), Noteece may employ **Last-Writer-Wins (LWW)** based on wall-clock time (`Utc::now()`) to resolve conflicts silently. However, for user data (Notes, Tasks), manual resolution is always preferred to prevent data loss.
