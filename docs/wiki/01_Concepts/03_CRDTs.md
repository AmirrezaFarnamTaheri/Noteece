# Conflict-Free Replicated Data Types (CRDTs)

**Conflict-Free Replicated Data Types (CRDTs)** are data structures that can be replicated across multiple computers in a network, where the replicas can be updated independently and concurrently without coordination, and it is mathematically guaranteed that any inconsistencies will eventually be resolved.

Noteece uses **State-based CRDTs (CvRDTs)**. This means we send the full state (or a delta of the state) and "merge" it into the local state.

## 1. The Challenge of Sync

In a distributed system like Noteece (User A on Laptop, User A on Phone), concurrent edits are inevitable.

- **Scenario:**
  - Laptop: Changes Note Title to "Project Alpha".
  - Phone: Changes Note Title to "Project Beta".
  - _Offline._
  - _Online:_ They sync. Who wins?

Without CRDTs, you get "Split Brain" (conflicted copies) or data loss (last one overwrites). With CRDTs, we have a deterministic rule.

## 2. Noteece's CRDT Implementation

We implement a pragmatic mix of CRDT concepts tailored for SQLite.

### A. Last-Write-Wins Register (LWW-Register)

Used for: **Scalar values** (Title, Status, Priority, Due Date).

_Structure:_ `(Value, Timestamp, DeviceID)`

_Merge Logic:_

```rust
fn merge(local: &State, remote: &State) -> State {
    if remote.timestamp > local.timestamp {
        return remote.clone();
    } else if remote.timestamp < local.timestamp {
        return local.clone();
    } else {
        // Tie-breaker: Deterministic comparison of Device ID
        if remote.device_id > local.device_id {
            return remote.clone();
        } else {
            return local.clone();
        }
    }
}
```

_Implication:_ If you edit the title on two devices at the exact same millisecond, the device with the lexically higher ID wins. It's arbitrary but consistent.

### B. Observed-Remove Set (OR-Set)

Used for: **Tags, Lists**.

_Concept:_ An element is in the set if it has been added and not yet removed. Removals are handled by "tombstones".

_Implementation in SQL:_

- We don't delete rows immediately.
- We set a `deleted_at` timestamp (Tombstone).
- _Merge:_ If one device says "Active" at T=10, and another says "Deleted" at T=20, the deletion wins.

### C. Vector Clocks (Causality Tracking)

Used for: **Sync Protocol Efficiency & Conflict Detection.**

A Vector Clock is a list of logical clocks from all known nodes.
`VC = { DeviceA: 5, DeviceB: 3, DeviceC: 12 }`

_Why use it?_
It allows us to answer: "Has Device A seen Device B's update #4?"

1.  **Update:** When Device A updates a note, it increments its own counter in the vector: `{ DeviceA: 6, ... }`.
2.  **Sync:** Device A sends its VC to Device B.
3.  **Comparison:**
    - If `RemoteVC >= LocalVC`: They have everything we have + more. We accept their changes.
    - If `LocalVC >= RemoteVC`: We are ahead. They need our changes.
    - If `Concurrent` (neither is greater): We have a conflict. We invoke the LWW-Register logic to resolve specific fields, or create a `SyncConflict` record for the user.

## 3. The Merge Flow (Step-by-Step)

1.  **Receive Payload:** Device receives a `SyncPayload` containing a Note update.
2.  **Lookup Local:** Fetch the existing note (if any) from DB.
3.  **Compare Timestamps (LWW):**
    - Check `modified_at`.
    - If `remote.modified_at > local.modified_at`:
      - Apply update.
      - Update Vector Clock.
    - If `remote.modified_at < local.modified_at`:
      - Ignore (we have newer data).
    - If `equal`: Use Device ID tiebreaker.
4.  **Conflict Logging:**
    - If the content is significantly different (hash check) and timestamps are dangerously close (within collision window), we might create a "Conflicted Copy" of the note just in case LWW destroyed data the user wanted.

## 4. Edge Cases

- **Clock Skew:** LWW relies on physical time. If a user manually sets their clock back 10 years, their edits will be "old" and easily overwritten.
  - _Mitigation:_ We use `hybrid logical clocks` (HLC) where possible, or enforce that timestamps essentially always move forward (monotonicity).
- **The "Zombie" Problem:** A deleted item resurfaces because a device that was offline for months syncs an "update" to it.
  - _Mitigation:_ Tombstones must be kept for a long time (forever, in our current design) to suppress resurrection.

---

**References:**

- [A comprehensive study of Convergent and Commutative Replicated Data Types](https://hal.inria.fr/inria-00555588/document)
