# Security Hardening

This document describes the security measures implemented in Noteece v1.1.0.

## Overview

Noteece has achieved **"Secure Beta"** status with industry-standard security practices:

| Security Area | Status | Implementation |
|--------------|--------|----------------|
| Transport Encryption | ✅ Secure | ECDH + ChaCha20-Poly1305 |
| Key Storage | ✅ Secure | Hardware-backed Keystore |
| Data at Rest | ✅ Secure | SQLCipher AES-256 |
| Config Backup | ✅ Secure | SQLite redundancy |
| Selector Verification | ✅ Secure | Hash + signature verification |

---

## 1. Transport Encryption (ECDH Handshake)

### Implementation

Every P2P sync session uses ephemeral key exchange:

```typescript
// Generate ephemeral keys
const privateKey = x25519.utils.randomPrivateKey();
const publicKey = x25519.getPublicKey(privateKey);

// Exchange public keys with peer
// ...

// Compute shared secret
const sharedSecret = x25519.getSharedSecret(privateKey, peerPublicKey);
this.sessionKey = hmac(sha256, sharedSecret, new Uint8Array(0));
```

### Properties

- **Perfect Forward Secrecy**: Each session uses new ephemeral keys
- **Passive Sniffing Mitigation**: Session keys derived via ECDH
- **Authenticated Encryption**: ChaCha20-Poly1305 for all payloads

---

## 2. Biometric Key Wrapping

### Android Keystore Integration

```typescript
await SecureStore.setItemAsync(SOCIAL_KEY_STORAGE_KEY, keyToStore, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: true // Forces biometric prompt
});
```

### Properties

- **Hardware-Backed Storage**: Keys stored in TEE/Secure Enclave
- **Biometric Requirement**: Access requires fingerprint/face
- **Device-Bound**: Keys cannot be extracted even with root

---

## 3. Vault Configuration Backup

### Problem

The vault's `config.json` contains critical encryption parameters:
- `salt` for key derivation
- `wrapped_dek` (encrypted Data Encryption Key)

If this file is lost, the database becomes inaccessible.

### Solution

Redundant backup in SQLite:

```rust
// packages/core-rs/src/db/vault_backup.rs
store_vault_backup(&conn, &salt, &wrapped_dek)?;
```

### Recovery

```rust
// If config.json is lost
if let Some((salt, wrapped_dek)) = recover_from_backup(&conn)? {
    // Rebuild config.json
}
```

---

## 4. Social Selector Verification

### Problem

Social selectors fetched from remote URLs could be tampered with.

### Solution

Multi-layered verification:

1. **Signature Verification** (preferred)
   - Ed25519 signatures on selector configs
   - Public key embedded in binary

2. **Hash Allowlist** (fallback)
   - Known-good SHA256 hashes
   - Updated with each release

3. **Bundled Fallback**
   - Static selectors compiled into binary
   - Used when verification fails

```rust
let signed = SignedSelectors::parse(&remote_config)?;
signed.verify()?; // Throws if invalid
```

---

## 5. Conflict Resolution (SET UNION Merge)

### Problem

Previous array merge strategy caused data loss during concurrent edits.

### Solution

Arrays now merge using SET UNION:

```rust
// Before: replaced entirely
(Array(_), Array(_)) => remote.clone()

// After: union of all items
(Array(local), Array(remote)) => merge_arrays(local, remote)
```

### Example

Device A adds "Tag A", Device B adds "Tag B":

| Before | After |
|--------|-------|
| Only "Tag B" | "Tag A" + "Tag B" |

---

## 6. JSI Bridge (Unified Core)

### Architecture

```
┌─────────────────────────────────────────────┐
│           React Native (TypeScript)          │
└─────────────────┬───────────────────────────┘
                  │ JSI
┌─────────────────▼───────────────────────────┐
│           C++ Bridge (NoteeceCore)           │
└─────────────────┬───────────────────────────┘
                  │ FFI
┌─────────────────▼───────────────────────────┐
│           Rust Core (core-rs)               │
└─────────────────────────────────────────────┘
```

### Benefits

- Single source of truth for sync logic
- No crypto implementation divergence
- High performance native execution

---

## 7. Social Post Archival

### Problem

`social_post` table grows rapidly with raw JSON blobs.

### Solution

Automatic archival on startup:

```rust
// packages/core-rs/src/social/maintenance.rs
run_startup_maintenance(&mut conn, 7)?; // 7-day retention
```

### Flow

1. Posts older than 7 days → `social_post_archive`
2. Raw JSON excluded from archive
3. Archive entries pruned after 30 days

---

## Security Checklist

### For Developers

- [ ] Never log encryption keys or passwords
- [ ] Use parameterized SQL queries only
- [ ] Validate all external input
- [ ] Run `cargo audit` before releases
- [ ] Update dependencies regularly

### For Users

- [ ] Use strong vault password
- [ ] Enable biometric authentication
- [ ] Keep regular backups
- [ ] Don't share pairing codes

---

## Threat Model

### Protected Against

- Passive network sniffing
- Filesystem dumps
- Lost/stolen devices (locked)
- Selector tampering

### Not Protected Against

- Active MITM during pairing
- Malware with memory access
- Compromised build system
- Social engineering

---

*See also: [Security Model](04_Security.md)*

