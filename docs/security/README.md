# Security Documentation

This folder contains security-related documentation for Noteece.

## Contents

- [Security Model](../wiki/01_Architecture/04_Security.md) - Core security architecture
- [Security Audit](SECURITY_AUDIT.md) - Security review findings
- [Social Suite Security](../archive/social-media-suite-SECURITY.md) - Social feature security
- [Security Fixes Applied](../reports/SECURITY_FIXES_APPLIED.md) - Applied security patches

## Quick Links

- [Main Security Doc](../../SECURITY.md) - Security overview
- [Privacy Policy](../../PRIVACY.md) - Privacy information
- [Terms of Service](../../TERMS.md) - Legal terms

## Security Principles

1. **Zero-Knowledge:** Encryption keys never leave user devices
2. **Local-First:** Full functionality without network
3. **E2E Encryption:** AES-256-GCM for data at rest
4. **P2P Security:** X25519 ECDH key exchange for sync
5. **No Telemetry:** No data collection without explicit opt-in

