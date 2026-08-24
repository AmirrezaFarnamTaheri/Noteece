# Security Audit Considerations

## Cryptography

- **Key Derivation**: We use PBKDF2-HMAC-SHA512 (256,000 iterations) to derive the vault KEK from the user password; SQLCipher applies its own key derivation for database page encryption.
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
