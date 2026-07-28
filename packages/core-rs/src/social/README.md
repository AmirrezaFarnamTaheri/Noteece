# Social Media Suite - Core Module

**Version:** 1.1  
**Language:** Rust

## Overview

The social media suite provides local-first social aggregation and management.
Stored credentials use application-level encryption. Database encryption depends
on the active core-rs SQLCipher configuration where enabled.

This module is not a claim of complete product readiness; see the root project
status and audit documentation for current release blockers.

## Architecture

```
social/
├── account.rs              # Account management and credentials
├── post.rs                 # Post storage and retrieval
├── category.rs             # Category organization
├── timeline.rs             # Unified timeline queries
├── webview.rs              # WebView session management
├── sync.rs                 # Sync orchestration
├── analytics.rs            # Analytics queries
├── intelligence.rs         # Content analysis and rules
├── focus.rs                # Focus modes and automation
├── backup.rs               # Export and restore handling
└── selector_verification.rs # Selector integrity verification
```

## Security

### Encryption

- **Database:** SQLCipher with AES-256-CBC + HMAC-SHA512 where configured.
- **Credentials:** XChaCha20-Poly1305 AEAD.
- **Key derivation:** PBKDF2-HMAC-SHA512 with 256,000 iterations for vault/KEK derivation. This is not memory-hard. Argon2id is used for password authentication hashing and mobile vault DEK wrapping.

### Validation

- String length limits.
- JSON payload limits.
- Batch size limits.
- Timestamp validation.
- URL validation rejecting unsafe schemes such as `blob:` and `data:` where applicable.

### Memory safety

- Rust implementation with no unsafe blocks in this module.
- Sensitive material is **not zeroized**. `zeroize` is not currently a `core-rs` dependency, so cryptographic material relies on normal drop semantics. Zeroization remains a hardening task.

## Data Model

Primary concepts include:

- social accounts
- posts
- categories
- category assignments
- sync history
- WebView sessions
- automation rules
- focus modes

## Backup and Restore

The social backup subsystem provides:

- validated backup identifiers
- checksum verification
- encrypted backup payloads
- schema/version validation
- typed SQLite value preservation including BLOB data
- restore transaction validation

## Selector Verification

Selector bundles are verified through reviewed content hashes. Empty and unknown
payloads are rejected. A production remote selector signing and rotation process
remains an operational hardening item.

## Dependencies

```toml
[dependencies]
rusqlite = { version = "0.37.0", features = ["bundled-sqlcipher-vendored-openssl"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
ulid = "1.2.1"
chrono = "0.4"
chacha20poly1305 = "0.10"
argon2 = "0.5"      # password authentication hashing only
pbkdf2 = "0.12.2"   # PBKDF2-HMAC-SHA512 key derivation
log = "0.4"
```

> Note: `zeroize` is not currently a dependency of core-rs. Documentation must
> not claim that sensitive material is zeroized until that implementation exists.

## Testing

Run social module tests through the normal Rust workspace test commands:

```bash
cd packages/core-rs
cargo test
```

## Contributing

Before submitting changes:

- run `cargo fmt`
- run `cargo clippy -- -D warnings`
- add regression tests for security-sensitive changes
- update documentation when behavior changes
