# Sync Architecture

 Noteece uses a unique P2P synchronization protocol designed for high latency, intermittent connectivity, and zero-trust environments.

 ## 1. Core Principles

 - **Local-First:** All writes happen to the local SQLite database first.
 - **Eventual Consistency:** All devices will eventually reach the same state.
 - **Transport Agnostic:** The protocol runs over WebSockets, but is designed to support Bluetooth LE or other transports in the future.

 ## 2. The Protocol

 ### Discovery
 Devices discover each other using mDNS (Multicast DNS) on the local network. The service type is `_noteece._tcp`.

 ### Handshake & Pairing
 1.  **Connection:** Device A connects to Device B's WebSocket server.
 2.  **Handshake:** Device A sends `{"type": "handshake"}`.
 3.  **Key Exchange:** A secure channel is established using ECDH (X25519) if not already paired.
 4.  **Authentication:** Devices verify each other's identity using the shared secret.

 ### Synchronization (Delta State Replication)
 Noteece does *not* send whole files. It sends **Deltas**.

 1.  **Vector Clock Exchange:** Devices exchange their current Vector Clocks.
 2.  **Delta Calculation:** Each device calculates what the other is missing based on the clock.
 3.  **Batch Sending:** Deltas are batched and sent as `SyncPayload` messages.
 4.  **Application:** The receiver applies the deltas locally, detecting conflicts.

 ## 3. Conflict Resolution

 - **Last-Write-Wins (LWW):** For simple fields (like task title), the later timestamp wins.
 - **Manual Resolution:** For complex content (like Note text), if a divergence is detected that cannot be merged automatically, a `SyncConflict` entry is created in the database, requiring user intervention.
