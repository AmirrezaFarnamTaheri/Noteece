# Security Model

Noteece operates on a **Zero-Trust, Zero-Knowledge** security model.

## 1. Encryption at Rest

- **Database:** The SQLite database is encrypted using SQLCipher (AES-256-CBC).
- **Key Derivation:** The user's master password is hashed using Argon2id to derive the Key Encryption Key (KEK).
- **Data Encryption Key (DEK):** A random 32-byte key is generated at vault creation. This DEK is encrypted by the KEK and stored in the database header.
- **Content:** Sensitive content (note bodies) is further encrypted using XChaCha20Poly1305 before being written to disk, ensuring that even if the DB page cache leaks, content remains secure.

## 2. Encryption in Transit

- **Transport Layer:** All P2P traffic is wrapped in a custom encrypted envelope using XChaCha20Poly1305, independent of TLS.
- **Forward Secrecy:** Session keys are ephemeral.

## 3. Authentication

- **Local:** Password required to unlock the vault (decrypt the DEK).
- **P2P:** Devices authenticate using a shared pairing secret established during the initial QR code handshake.

## 4. Threat Model

- **Device Theft:** Attacker has physical access. Data is safe as long as the vault is locked (powered down or app closed).
- **Network Eavesdropping:** Attacker is on the same WiFi. Data is safe due to E2EE transport.
- **Malicious Server:** Noteece has no central server.

## 5. Android Prime (Sideload) Security

The "Prime" flavor uses Android Accessibility APIs.

- **Permission:** Requires explicit user grant of Accessibility Service.
- **Data Handling:** Screen context is processed entirely on-device; no data is sent to the cloud.
- **Scope:** Only targeted apps (white-listed) are processed.
