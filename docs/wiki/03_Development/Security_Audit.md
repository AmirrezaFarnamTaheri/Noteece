# Security Audit Considerations

## Cryptography

- **Key Derivation**: We use Argon2id for user passwords and PBKDF2-SHA256 for database encryption keys.
- **Encryption**: XChaCha20-Poly1305 is used for content encryption.
- **Database**: SQLCipher is used for database encryption at rest.

## Current State

The implementation is verified and production-ready.

## Audit Log
- **Feb 7, 2024:**
    - Full codebase audit completed.
    - SQL Injection resilience verified via `advanced_search_tests.rs`.
    - P2P sync protocol (Vector Clocks) reviewed and tests passed.
    - Deprecated `packages/editor` removed.
    - Typewriter scrolling implemented in UI.

## TODO

- [ ] Schedule external penetration test for Relay Server (when deployed).
- [ ] Monitor CVEs for `rusqlite` and `sqlcipher`.
