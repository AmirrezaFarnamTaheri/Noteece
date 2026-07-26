# Security Documentation

This folder contains security-related documentation for Noteece.

## Contents

- [Main Security Doc](SECURITY.md) - Security overview and reporting policy
- [Security Audit](SECURITY_AUDIT.md) - Security review findings
- [Privacy Policy](PRIVACY.md) - Privacy information
- [Terms of Service](TERMS.md) - Legal terms
- [Legal Review Checklist](LEGAL_REVIEW_CHECKLIST.md) - Pre-release legal checks
- [License Review](LICENSE_REVIEW.md) - Dependency licence review

## Related Documents

- [Security Model](../project_docs/01_Architecture/04_Security.md) - Core security architecture
- [Security Hardening](../project_docs/01_Architecture/09_Security_Hardening.md) - Hardening measures
- [Social Suite Security](../archive/social-media-suite-SECURITY.md) - Social feature security
- [Security Fixes Applied](../reports/archive/SECURITY_FIXES_APPLIED.md) - Applied security patches

## Security Principles

1. **Zero-Knowledge:** Encryption keys never leave user devices
2. **Local-First:** Full functionality without network
3. **Encryption at Rest (desktop):** SQLCipher, which uses AES-256-CBC with HMAC-SHA512 for
   page authentication; note/blob content is additionally sealed with XChaCha20-Poly1305 AEAD.
   The mobile app does **not** currently encrypt its local SQLite database — see
   `apps/mobile/src/lib/database.ts`.
4. **P2P Security:** X25519 ECDH key exchange for sync
5. **No Telemetry:** No data collection without explicit opt-in
