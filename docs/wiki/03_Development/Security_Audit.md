# Security Audit Considerations

## Cryptography

- **Key Derivation**: We use Argon2id for user passwords and PBKDF2-SHA256 for database encryption keys.
- **Encryption**: XChaCha20-Poly1305 is used for content encryption.
- **Database**: SQLCipher is used for database encryption at rest.

## Current State

The implementation appears solid based on standard practices. However, as the project matures, an external audit is recommended, especially for:

- The custom Key Exchange mechanism (ECDH over P2P).
- The `SecureDek` memory management (using `zeroize`).
- The Zero-Trust architecture assumptions.

## TODO

- [ ] Schedule external audit for P2P sync protocol.
- [ ] Verify `zeroize` effectiveness in WASM/JS contexts (if applicable).
