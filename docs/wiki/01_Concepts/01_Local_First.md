# Local-First Software

**Local-first software** is a paradigm shift in application architecture that prioritizes the user's ownership and control of data by treating the local device as the primary source of truth. Unlike "cloud-first" or "offline-available" applications where the local data is merely a cache of the server state, Noteece treats the server (or peer devices) as secondary replicas.

## 1. The Seven Ideals

Noteece adheres to the seven ideals of local-first software as defined by Ink & Switch:

### 1. No Spinners: Your Data is Local

All read and write operations in Noteece occur against the local SQLite database. This means:

- **Zero Latency:** Opening a note, searching, or creating a task happens instantly (typically <16ms).
- **No Network Dependency:** You never see a "Connecting..." spinner when trying to access your own thoughts.
- **Reliability:** The app works exactly the same way on a plane, in a tunnel, or during an ISP outage.

### 2. Your Work is Not Trapped on One Device

While data starts local, it doesn't stay stranded. Noteece uses **Peer-to-Peer (P2P) Synchronization** to replicate data across all your devices (Desktop, Mobile).

- **Multi-Device:** Start writing on your Mac, finish on your Android phone.
- **No Central Hub:** Devices talk directly to each other. If you shut down your laptop, your phone and tablet can still sync with each other if they are paired.

### 3. The Network is Optional

Noteece is fully functional offline.

- **Read/Write:** You can create complex projects, edit massive documents, and reorganize your entire graph without an internet connection.
- **Queueing:** Synchronization logic runs in the background. When the network becomes available, Noteece quietly gossips changes to peers.

### 4. Seamless Collaboration

When multiple devices (or users) modify the same data offline, Noteece must reconcile those changes.

- **CRDTs:** We use Conflict-Free Replicated Data Types to merge changes mathematically.
- **Automatic Merging:** If you change the title on one device and the body on another, both changes are preserved.
- **Conflict Handling:** See [Conflict Resolution](03_CRDTs.md) for deep details on how we handle concurrent edits to the same field.

### 5. The Long Now

Data should outlive the application that created it.

- **SQLite:** Noteece uses SQLite, the most widely deployed database engine in the world. It is an open format, ensuring you can always access your raw data using standard tools (`sqlite3`) even if Noteece disappears.
- **Markdown:** Notes are stored as Markdown text, a human-readable, future-proof format.
- **Exportability:** You can export your entire vault to a folder of standard `.md` files and `.json` metadata at any time.

### 6. Security and Privacy

Because there is no central server storing your data in plaintext:

- **You are the Admin:** No "SRE" at a SaaS company can query your database.
- **Encryption:** Data is encrypted at rest (SQLCipher) and in transit (End-to-End Encryption).
- **GDPR by Default:** Since we don't hold your data, we don't track you.

### 7. User Control

You have ultimate authority.

- **Version History:** Noteece keeps a local history of changes (Snapshotting), allowing you to roll back to previous versions of notes.
- **Delete means Delete:** When you delete a note and empty the trash, it is cryptographically erased from the local store and the deletion tombstone is propagated to peers.

## 2. Implementation in Noteece

### Architecture

- **Frontend:** React/Tauri (Desktop) and React Native/Expo (Mobile).
- **Backend:** Rust (`core-rs`) embedded as a library.
- **Database:** `rusqlite` with `bundled-sqlcipher`.
- **Sync Engine:** Custom Rust implementation using `tokio` and `tungstenite` for WebSockets.

### Data Longevity Strategy

We deliberately avoid proprietary binary formats.

- **Schema:** The database schema is versioned (`user_version` PRAGMA) and migrations are strictly additive or transformative, ensuring backward compatibility.
- **Assets:** Images and attachments are stored as BLOBs or files on disk, referenced by standard paths, ensuring they can be extracted easily.

## 3. Challenges and Solutions

| Challenge               | Local-First Solution                                                          |
| :---------------------- | :---------------------------------------------------------------------------- |
| **Conflict Resolution** | Vector Clocks + LWW-Register + Manual Merge UI                                |
| **Large Dataset Sync**  | Delta-state replication (only send what changed)                              |
| **Initial Sync**        | Bulk snapshot transfer followed by delta catch-up                             |
| **Backups**             | User-managed file backups (ZIP export) + OS-level backup (Time Machine, etc.) |

---

**References:**

- [Ink & Switch: Local-first software](https://www.inkandswitch.com/local-first/)
- [Martin Kleppmann on CRDTs](https://crdt.tech/)
