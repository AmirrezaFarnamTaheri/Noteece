# Security Architecture

## Threat Model

Noteece is designed to protect against:
- **Cloud Breaches:** Since no data is stored on our servers, a breach of our infrastructure exposes no user data.
- **Device Theft (At Rest):** If your laptop is stolen, the encrypted database (`vault.sqlite3`) is inaccessible without your password.
- **Network Snooping (In Transit):** P2P sync is encrypted end-to-end; an attacker on the WiFi cannot read the data.

## Encryption Implementation

### Database Encryption (At Rest)
- **Library:** SQLCipher (via `rusqlite` with `bundled-sqlcipher` feature).
- **Algorithm:** AES-256-CBC.
- **Keying:**
    - User enters Password.
    - `KEK` (Key Encryption Key) = `Argon2id(password, salt)`.
    - The database header contains the `DEK` (Data Encryption Key), encrypted by the `KEK`.
    - The `DEK` is used by SQLCipher to decrypt pages.

### Sync Encryption (In Transit)
- **Protocol:** Custom P2P protocol over TCP.
- **Key Exchange:** X25519 (Elliptic Curve Diffie-Hellman).
- **Cipher:** XChaCha20Poly1305 (Authenticated Encryption).
- **Flow:**
    1.  Discovery via mDNS.
    2.  Handshake: Ephemeral keys generated. Public keys exchanged. Shared secret derived.
    3.  Session: All messages encrypted with shared secret + nonce.

## Auditing

- **Audit Log:** The `audit_log` table records critical security events locally:
    - Vault unlocks (success/failure).
    - Password changes.
    - Device pairings.
    - Sync sessions.

## Best Practices for Users

1.  **Strong Password:** Your data security depends entirely on your vault password. Use a long, unique passphrase.
2.  **Backups:** While sync acts as a backup, regularly export your data (Settings > Backup > Create Backup). Keep backups in a secure location.
3.  **Updates:** Keep the application updated to receive security patches.
