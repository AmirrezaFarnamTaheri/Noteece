# Issues Resolved (Audit Fixes)

## Backend
1. **P2P Sync Vector Clocks**: Fixed in . Deltas now carry vector clock information for causal ordering.
2. **P2P Sync Handshake**: Implemented WebSocket handshake in  (server-side).
3. **Discovery**: Desktop now registers itself on MDNS in .
4. **Mobile FFI**: Fixed variable name bug and implemented basic discovery/sync stubs in .
5. **Sync Progress**: Fixed calculation in  to use .

## Frontend
1. **Task Board**: Implemented optimistic updates in  to prevent unnecessary refetches.
