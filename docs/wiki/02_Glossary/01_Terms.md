# Glossary

## A

- **Anchor:** A coordinate-bound reference to a specific location on the mobile screen, used by Prime Interception to link notes to external app content. It contains `(x, y, width, height)` and the `package_name`.
- **Argon2id:** The password hashing algorithm used for key derivation. It is memory-hard, making GPU-based brute-force attacks prohibitively expensive.
- **Artifact:** A compiled binary (APK, MSI, DMG) or file generated during the build process.

## B

- **Backlink:** A link from Note B to Note A. Noteece automatically indexes these so when viewing Note A, you can see everything that references it.
- **Blind Relay:** A theoretical (or future) server component that blindly forwards encrypted packets between peers without knowing their contents or keys.

## C

- **CRDT (Conflict-free Replicated Data Type):** A data structure that simplifies distributed data storage systems and multi-user applications by ensuring that data updates can be applied without conflict. Noteece uses a hybrid of LWW-Registers and OR-Sets.

## D

- **DEK (Data Encryption Key):** The actual 32-byte key used to encrypt the database content and sensitive fields. It is generated randomly and encrypted by the KEK.
- **Delta:** A small unit of change (e.g., "Field 'Title' changed to 'Hello' at T=100"). Syncing Deltas is much more efficient than syncing whole files.

## E

- **ECDH (Elliptic-curve Diffie–Hellman):** An anonymous key agreement protocol that allows two parties, each having an elliptic-curve public–private key pair, to establish a shared secret over an insecure channel.

## F

- **FTS5:** The Full-Text Search extension for SQLite. We use it to provide instant search results across thousands of notes.

## H

- **Handshake:** The initial sequence of messages exchanged between two devices to authenticate and establish a secure session key.

## K

- **KEK (Key Encryption Key):** A key derived from the user's password (via Argon2id) used exclusively to encrypt/decrypt the DEK. This allows changing the password without re-encrypting the whole database.

## L

- **Local-First:** A software architecture where the local device is the primary authority. The cloud (if involved) is just a replica.
- **LWW (Last-Write-Wins):** A conflict resolution strategy where the update with the latest timestamp prevails. Simple but susceptible to clock skew.

## M

- **mDNS (Multicast DNS):** A protocol for discovering services on a local network without a central DNS server. Noteece uses this to find peers on the same WiFi.

## P

- **PARA:** Projects, Areas, Resources, Archives. An organizational methodology.
- **Prime Interception:** The mobile feature (Android "Sideload" flavor) that allows Noteece to "draw over" other apps, read screen content via Accessibility Services, and link notes to that context.
- **Project Hub:** The module in Noteece for managing tasks, milestones, and project lifecycles.

## S

- **Sideload:** Installing an application package (APK) manually, bypassing the official app store. Required for the "Prime" flavor due to restricted permissions.
- **Space:** A logical container for notes, tasks, and settings. Noteece supports multiple spaces (e.g., Personal, Work), effectively acting as separate databases.
- **Sync Bridge:** The software layer (JSI/C++) connecting the React Native frontend to the Rust core for synchronization.

## T

- **TOFU (Trust On First Use):** A security model where the client trusts the server/peer's public key the first time it sees it, but alerts on any subsequent change.
- **Tombstone:** A marker left behind when an item is deleted. It ensures that the deletion propagates to other devices during sync, preventing "zombie" items from reappearing.

## U

- **ULID (Universally Unique Lexicographically Sortable Identifier):** A 128-bit identifier that is compatible with UUIDs but sorts by creation time. Used for primary keys.

## V

- **Vault:** The top-level directory or database containing all of a user's data.
- **Vector Clock:** A data structure used for determining the partial ordering of events in a distributed system and detecting causality violations.

## X

- **XChaCha20-Poly1305:** An authenticated encryption algorithm. "X" denotes the extended 192-bit nonce, allowing random nonce generation without risk of collision (unlike standard ChaCha20's 96-bit nonce).
