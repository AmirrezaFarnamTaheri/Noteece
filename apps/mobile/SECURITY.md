# Security Documentation

> # ⚠️ CRITICAL WARNING: MOBILE DATA IS **NOT** ENCRYPTED AT REST
>
> The Noteece mobile app stores **all** notes and user content in a **plaintext SQLite database**.
> `apps/mobile/src/lib/database.ts:585` calls `SQLite.openDatabaseAsync('noteece.db')` with **no
> encryption key and no SQLCipher PRAGMA**. There is no at-rest encryption on mobile whatsoever.
>
> **Consequences:**
>
> - Anyone with file-system access, a rooted/jailbroken device, an unencrypted device backup, or a
>   forensic extraction tool can read every note in plaintext.
> - Claims of "zero-knowledge", "encrypted at rest", or "AES-256 at rest" are **FALSE for mobile**.
>   They are true only for the **desktop** app, which uses SQLCipher.
> - The vault lock on mobile is a **UI-level gate only**. Locking the vault does not make the data
>   on disk unreadable.
>
> Much of the architecture described below is **aspirational / desktop-only**. Sections that do not
> reflect the shipped mobile implementation are marked inline. Do not rely on this document as a
> description of mobile's actual at-rest protections until this warning is removed.

This document details the security architecture, threat model, and security fixes implemented in Noteece Mobile.

## Security Fixes Applied

### 1. ✅ Database Migration System (P1 - Critical)

**Issue**: The `CREATE TABLE IF NOT EXISTS` pattern doesn't add new columns to existing tables, causing SQL errors for users upgrading from older versions.

**Fix**: Implemented comprehensive migration system in `src/lib/database.ts`:

- Added database versioning with `CURRENT_DB_VERSION = 2`
- Created `runMigrations()` function that safely adds missing columns
- Uses `PRAGMA table_info()` to check for existing columns before ALTER TABLE
- Stores database version in AsyncStorage for tracking
- Migration v1→v2 adds: `space_id`, `all_day`, `recurrence_rule`, `created_at`, `updated_at` to `calendar_event`

**Code Changes**:

```typescript
// Database version tracking
const CURRENT_DB_VERSION = 2;
const DB_VERSION_KEY = 'database_version';

// Safe column addition with existence check
if (!columnNames.includes('space_id')) {
  await db.execAsync('ALTER TABLE calendar_event ADD COLUMN space_id TEXT');
}
```

**Impact**: Prevents sync failures and data loss for existing users upgrading to new versions.

---

### 2. ✅ Music URL Domain Allowlisting

**Issue**: Audio files loaded from external URLs without integrity verification could expose users to malicious content if URLs are compromised.

**Fix**: Implemented domain allowlisting in `src/lib/music-security.ts`:

- Created `isValidMusicUrl()` function to validate URLs
- Allowlisted trusted domains: incompetech.com, bensound.com, freemusicarchive.org
- Validates protocol (http/https only)
- Supports subdomains of allowed domains
- Integrated validation into `music.tsx` before playing tracks

**Code Changes**:

```typescript
// Allowed domains for music streaming
const ALLOWED_MUSIC_DOMAINS = [
  'incompetech.com',
  'bensound.com',
  'freemusicarchive.org',
  // ...
];

// Validate before playing
if (!isValidMusicUrl(track.url)) {
  Alert.alert('Security Error', 'Track from untrusted source blocked');
  return;
}
```

**Impact**: Prevents malicious audio content from being loaded, protecting users from potential exploits.

---

### 3. ✅ Peer Authentication Documentation

**Issue**: ECDH key exchange uses simulated remote public key without peer authentication, potentially allowing MITM attacks.

**Status**: Known limitation - cryptography is production-ready, transport layer is simulated pending WebSocket implementation.

**Documentation Added** to `src/lib/sync/sync-client.ts`:

**Current Implementation**:

- ✅ ECDH key exchange (**X25519** curve — see `src/lib/sync/sync-client.ts:191-232`; this is not P-256)
- ✅ HKDF session key derivation
- ✅ ChaCha20-Poly1305 authenticated encryption
- ⚠️ Peer authentication (simulated)

**Security Limitations**:

- Mobile app cannot verify it's connecting to actual desktop app
- MITM attacker on local network could intercept key exchange

**Required for Production**:

1. WebSocket transport layer with TLS/SSL
2. Certificate pinning for desktop app
3. Mutual authentication with vault-derived signing keys
4. Replay attack protection with nonces/timestamps

**Current Mitigations**:

- Sync only works on local trusted networks (WiFi)
- End-to-end encryption protects data confidentiality
- User can verify sync success by checking data consistency

**Impact**: Documented the security limitation and mitigation strategies for developers and security auditors.

---

### 4. ✅ DEK Storage Security Model

**Issue**: DEK stored in SecureStore without additional wrapping could be at risk if device security is weak.

**Evaluation**: Current implementation is **secure and follows industry best practices**. Additional wrapping is not needed.

**Documentation Added** to `src/store/vault.ts`:

**Security Architecture**:

```
> ⚠️ **The chain below describes the DESKTOP design and is NOT implemented on mobile.** On mobile
> there is no KEK, no DEK, and no encrypted database — data is stored in plaintext. Additionally,
> the KDF in the shipped Rust core is **PBKDF2-HMAC-SHA512 (256,000 iterations)**, not Argon2id.
> Argon2id is used only for password authentication hashing.

User Password (memorized secret)
    ↓ PBKDF2-HMAC-SHA512, 256,000 iterations (NOT memory-hard) — desktop only
KEK (Key Encryption Key)
    ↓ ChaCha20-Poly1305 AEAD
DEK (Data Encryption Key)
    ↓ Encrypts all user data
```

**Storage Locations**:

| Data            | Storage      | Protection                      |
| --------------- | ------------ | ------------------------------- |
| Vault metadata  | AsyncStorage | Encrypted DEK, salts, hashes    |
| DEK (biometric) | SecureStore  | iOS Keychain / Android Keystore |
| Unlocked DEK    | Memory       | Cleared on lock/exit            |

**Device-Level Protection**:

**iOS**:

- Stored in iOS Keychain with `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
- Protected by Secure Enclave (hardware security module)
- Requires Face ID / Touch ID authentication
- Not backed up to iCloud

**Android**:

- Stored in Android Keystore with hardware-backed keys
- Protected by StrongBox or TEE (Trusted Execution Environment)
- Requires Fingerprint / Face authentication
- Keys bound to device, cannot be extracted

**Why Additional Wrapping Is Not Needed**:

1. **Circular Problem**: Additional wrapping would require another key, which also needs secure storage
2. **Hardware Security**: Secure Enclave / TEE provide stronger protection than software-based encryption
3. **Industry Standard**: This pattern is used by major apps (1Password, Signal, etc.)
4. **No Security Gain**: Additional software wrapping doesn't improve security beyond hardware keystores

**Threat Model**:

Protects Against:

- ✅ Lost/stolen device (device locked)
> ⚠️ **The protections below apply to the DESKTOP app only.** On mobile the database is
> unencrypted, so none of them hold.

- 🖥️ Desktop only — Physical access to a locked device (vault locked). ❌ **Mobile: NOT protected** — the database is plaintext regardless of vault lock state.
- 🖥️ Desktop only — Malware attempting to read vault data. ❌ **Mobile: NOT protected** — any process or tool with file access reads plaintext.
- 🖥️ Desktop only — Cloud backup compromise. ❌ **Mobile: NOT protected** — the plaintext database is included in ordinary device backups.
- 🖥️ Desktop only — Password brute-force is slowed by PBKDF2-HMAC-SHA512 at 256,000 iterations. Note this is **not** a memory-hard KDF, so it offers limited resistance to GPU/ASIC-accelerated cracking. ❌ **Mobile: not applicable** — no password is required to read the data off disk at all.

Does NOT Protect Against:

- ❌ Device with no passcode/biometrics (user responsibility)
- ❌ Advanced malware with biometric bypass (requires device compromise)
- ❌ State-level attacks with physical device access (forensic extraction)

**Compliance**:

- NIST SP 800-63B: Password-based authentication
- OWASP Mobile Security: Secure data storage
- iOS Security Guide: Keychain best practices
- Android Security Guide: Keystore best practices

---

## Overall Security Posture

### Cryptographic Primitives

| Component        | Algorithm         | Purpose                |
| ---------------- | ----------------- | ---------------------- |
| Password hashing | Argon2id          | Password **authentication** hashing only (`packages/core-rs/src/auth.rs:90-93`). It does **not** derive any key and does **not** protect the mobile database, which is unencrypted. |
| Key derivation (vault/DEK, **desktop only**) | **PBKDF2-HMAC-SHA512, 256,000 iterations** | Password → KEK (`packages/core-rs/src/crypto.rs:28`). Not memory-hard; not GPU/ASIC resistant. Not applied on mobile. |
| Key derivation (sync session) | HKDF-SHA256 | Derives an **ephemeral sync session key** from the X25519 shared secret. It is **not** used to derive any database or at-rest key. |
| Encryption       | ChaCha20-Poly1305 | AEAD for sync transport payloads. **Not** used for mobile data at rest. |
| Key exchange     | ECDH (**X25519**) | Sync session keys      |
| Signatures       | HMAC-SHA256       | Data integrity         |

All cryptographic primitives are from the `@noble` suite, which is:

- Audited by multiple security researchers
- Side-channel resistant
- TypeScript-native with no C dependencies
- Used by major projects (Metamask, etc.)

### Security Best Practices Implemented

1. ⚠️ **Sync transport encryption**: sync payloads are encrypted in transit, so a relay/server does not see plaintext sync data. This is **not** a zero-knowledge architecture end to end — mobile data is stored unencrypted on the device itself.
2. ⚠️ **Defense in depth**: applies to desktop (SQLCipher at rest + AEAD note content). **Mobile has no at-rest encryption layer at all.**
3. ✅ **Secure defaults**: Strong crypto parameters
4. ✅ **Input validation**: All user inputs validated
5. ✅ **Constant-time comparisons**: Prevents timing attacks
6. ✅ **Random nonces**: Unique per encryption operation
7. ✅ **Forward secrecy**: Session keys rotated
8. ✅ **Minimal permissions**: Only necessary device permissions

### Known Limitations

1. **Sync peer authentication**: Simulated pending WebSocket transport
2. **Platform constraints**: iOS Alert.prompt for password change
3. **User responsibility**: Device passcode/biometric configuration

### Future Security Enhancements

1. **Key rotation**: Periodic DEK rotation with re-encryption
2. **PIN/Pattern fallback**: Alternative to biometric unlock
3. **Security audit logging**: Track vault access attempts
4. **Auto-lock timer**: Configurable vault auto-lock
5. **Panic mode**: Quick data wipe in emergency

---

## Security Disclosure

If you discover a security vulnerability, please email security@noteece.com with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We follow responsible disclosure and will:

- Acknowledge receipt within 24 hours
- Provide a fix timeline within 72 hours
- Credit you in the security advisory (unless you prefer anonymity)

---

## Changelog

### 2025-11-06

- ✅ Fixed calendar_event migration issue (P1)
- ✅ Added music URL domain allowlisting
- ✅ Documented sync peer authentication limitation
- ✅ Documented DEK storage security model

---

**Last Updated**: 2025-11-06
**Security Contact**: security@noteece.com
**Version**: 1.1.0
