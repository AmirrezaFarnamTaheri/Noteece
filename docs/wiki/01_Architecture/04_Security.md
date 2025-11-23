# Security Model

## Threat Model

Noteece assumes the following threats:
- **Device Theft:** An attacker gains physical access to your laptop or phone.
- **Network Snooping:** An attacker intercepts traffic on your local WiFi.
- **Cloud Compromise:** Since there is no cloud, this class of threat is eliminated by design.

## Defense Mechanisms

### 1. Data at Rest (Encryption)

- **Engine:** SQLCipher (Community Edition).
- **Algorithm:** AES-256-CBC (Page level).
- **Key Management:**
    - **User Password:** The root of trust.
    - **KEK (Key Encryption Key):** Derived from password via `Argon2id` (memory-hard).
    - **DEK (Data Encryption Key):** Random 32-byte key.
    - **Process:** `Password -> Argon2id -> KEK -> Decrypt(Encrypted_DEK) -> DEK -> Unlock Database`.

### 2. Data in Transit (Sync)

- **Protocol:** Custom binary protocol over TCP.
- **Encryption:**
    - **Key Exchange:** X25519 (ECDH) to establish shared secret.
    - **Transport:** ChaCha20Poly1305 (Authenticated Encryption).
- **Authentication:**
    - Device Identity Keys (Ed25519) are verified during the handshake to prevent Man-in-the-Middle (MITM) attacks.

### 3. Application Security

- **Tauri Isolation:**
    - The frontend is a webview but has **NO** direct Node.js access.
    - Interaction with the system is strictly limited to the exposed Rust Commands (`commands.rs`).
    - **CSP (Content Security Policy):** Strict rules prevent loading external scripts or styles (except for specific, trusted sources if necessary).

- **Input Validation:**
    - All SQL queries use parameterized statements (`?1`, `?2`) to prevent SQL Injection.
    - Filenames for exports/imports are sanitized to prevent directory traversal attacks.

## Audit Logs

A tamper-evident audit log (`audit_log` table) records critical security events:
- Login attempts (success/failure).
- Password changes.
- Device pairing events.
- Export operations.

This log allows users to verify if unauthorized access has occurred.
