# Vector Clocks in Noteece

A **Vector Clock** is a fundamental mechanism used in distributed systems to capture the causal relationship between events. In Noteece, it is the engine that drives our synchronization efficiency and correctness.

## 1. The Problem: "What did I miss?"

Imagine Device A and Device B.

- Device A makes 5 changes.
- Device B makes 3 changes.
- They sync.

How does Device B know _which_ of Device A's 5 changes it has already seen?

- **Naive approach:** Send everything. (Inefficient bandwidth).
- **Timestamp approach:** "Send me everything after T=100". (Fragile. What if clocks drift? What if A was offline during T=100..110?)
- **Vector Clock approach:** "I have seen up to update #4 from You."

## 2. The Data Structure

A Vector Clock is essentially a map of `DeviceID -> Counter`.

```json
{
  "Device_Alpha": 105,
  "Device_Beta": 42,
  "Device_Gamma": 12
}
```

This state means:
"I have applied all operations from Alpha up to sequence 105, from Beta up to 42, and Gamma up to 12."

## 3. How It Works

### Step 1: Tracking Local Changes

Every time a device (say, `Device_Alpha`) writes to the database (Create, Update, Delete):

1.  It increments its own counter in the `vault_meta` or `sync_state`.
2.  `Device_Alpha: 105` -> `Device_Alpha: 106`.
3.  The modified row is stamped with this new "Lamport Timestamp" (Origin ID + Counter).

### Step 2: The Handshake

When `Device_Alpha` connects to `Device_Beta`:

1.  **Alpha sends:** `VC_A = { Alpha: 106, Beta: 40 }`
2.  **Beta sends:** `VC_B = { Alpha: 100, Beta: 45 }`

### Step 3: Calculating the Delta (The Diff)

`Device_Alpha` looks at `VC_B` (Beta's clock).

- Beta has seen Alpha up to **100**.
- Alpha is at **106**.
- **Conclusion:** Alpha needs to send changes `101, 102, 103, 104, 105, 106` to Beta.

`Device_Alpha` looks at `VC_B` regarding Beta's own updates.

- Beta is at **45**.
- Alpha has seen Beta up to **40** (from `VC_A`).
- **Conclusion:** Alpha asks Beta for changes `41, 42, 43, 44, 45`.

### Step 4: Updating the Clock

After `Device_Beta` successfully receives and applies the 6 changes from Alpha:

- It updates its local record of Alpha's clock to **106**.
- Now `VC_B` becomes `{ Alpha: 106, Beta: 45 }`.
- They are consistent regarding Alpha's state.

## 4. Conflict Detection

Vector Clocks also help detect **concurrent** edits.

If we receive an update for Note X from Device C with timestamp `{ Alpha: 100, Gamma: 5 }`, but our local Note X was last modified by Device D with timestamp `{ Alpha: 100, Delta: 8 }`:

- The vectors are incomparable (neither strictly dominates the other).
- This implies **concurrency**.
- We trigger the Conflict Resolution strategy (LWW or Manual Merge).

## 5. Implementation Details

- **Storage:** We store the Vector Clock in a dedicated `sync_vector_clock` table.
- **Granularity:** We maintain one Vector Clock per _Space_ (Vault).
- **Pruning:** Unlike some systems, we do not prune entries for old devices immediately, to ensure we can always sync correctly with a device that returns after a year.

## 6. Why not just Lamport Clocks?

A standard Lamport Clock is just a single integer. It tells you "A happened before B" but it can't distinguish "A and B were concurrent" vs "A and B just happen to have the same counter value". Vector Clocks provide that causality guarantee.

---

**References:**

- [Vector Clocks on Wikipedia](https://en.wikipedia.org/wiki/Vector_clock)
- [Why Vector Clocks are Hard](https://queue.acm.org/detail.cfm?id=2917756)
