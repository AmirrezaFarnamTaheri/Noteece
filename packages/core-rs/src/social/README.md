# Social Media Suite - Core Module

**Version:** 1.1
**Language:** Rust

## Overview

The social media suite provides local-first social media aggregation. Stored credentials are encrypted locally; the database encryption model follows the current core-rs SQLCipher configuration where enabled.

## Security

### Encryption

- **Database**: SQLCipher with AES-256-CBC + HMAC-SHA512 where configured
- **Credentials**: XChaCha20-Poly1305 AEAD
- **Key Derivation**: **PBKDF2-HMAC-SHA512, 256,000 iterations** (`packages/core-rs/src/crypto.rs:28`). Not memory-hard. Argon2id is used only for password *authentication* hashing (`auth.rs:90-93`) and mobile vault DEK wrapping.

### Input Validation

- Length limits on all string inputs
- JSON payload size limits (10MB max)
- Batch size limits (1000 items max)
- Timestamp validation (no NaN)
- URL validation (reject blob:, data:)

### Memory Safety

- Pure Rust (no unsafe blocks)
- ⚠️ **Sensitive data is NOT zeroized.** `zeroize` is not a dependency of `core-rs`; key and credential material is left to normal drop semantics and may persist in freed memory or swap. Adding zeroization is an open hardening item.

## Dependencies

```toml
[dependencies]
rusqlite = { version = "0.37.0", features = ["sqlcipher"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
ulid = "1.2.1"
chrono = "0.4"
chacha20poly1305 = "0.10"
argon2 = "0.5"      # password authentication hashing only
pbkdf2 = "0.12.2"   # vault/KEK key derivation (PBKDF2-HMAC-SHA512, 256k iterations)
# NOTE: zeroize is NOT a dependency of core-rs. Any claim that key material is
# zeroized is inaccurate — see the Memory Safety section above.
log = "0.4"
```
