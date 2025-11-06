# Privacy Policy for Noteece

**Last Updated:** November 6, 2025

## Introduction

Noteece ("we," "our," or "the app") is committed to protecting your privacy. This Privacy Policy explains how Noteece handles your information in accordance with our zero-knowledge, local-first architecture.

## Our Philosophy

**Zero-Knowledge Architecture:** We fundamentally cannot access your data. Your vault is encrypted locally on your device with a password only you know. We never have access to your encryption keys, passwords, or decrypted data.

**Local-First:** All your data is stored locally on your device. Noteece operates fully offline and does not require an internet connection or cloud services.

**No Servers:** Noteece does not use any centralized servers. There is no "Noteece backend" that processes, stores, or has access to your information.

## Information We DO NOT Collect

Noteece does **NOT** collect, transmit, or have access to:

- Your personal information (name, email, phone number, etc.)
- Your notes, tasks, or any content you create
- Your calendar events or health metrics
- Your time tracking data or financial records
- Your location data
- Your usage patterns or analytics
- Your IP address or device identifiers
- Any metadata about your vault or its contents

## How Noteece Works

### Local Storage

All data is stored encrypted on your device using:
- **Encryption**: Industry-standard encryption (ChaCha20-Poly1305)
- **Local Database**: SQLite with SQLCipher encryption
- **Master Password**: Only you know your vault password
- **Zero-Knowledge**: Even if someone gains access to your device, your data remains encrypted without your password

### Local Network Sync (Optional)

If you choose to enable sync between your devices:

1. **Peer-to-Peer Only**: Devices communicate directly on your local network (mDNS/Bonjour)
2. **End-to-End Encryption**: All sync data is encrypted using ECDH key exchange and ChaCha20-Poly1305
3. **No Internet Required**: Sync happens entirely on your local network
4. **No Third Parties**: No data passes through any servers or third-party services
5. **You Control It**: You can disable sync at any time in settings

### Background Processing

Noteece may perform background operations on your device:
- **Background Sync**: Periodic sync with other devices on your network (if enabled)
- **Insight Generation**: Foresight correlation engine runs locally to generate insights
- **All Local**: These operations occur entirely on your device

## Third-Party Services

Noteece does **NOT** use:
- Analytics services (no Google Analytics, Mixpanel, etc.)
- Crash reporting services (no Sentry, Crashlytics, etc.)
- Advertising networks
- Cloud storage providers
- Authentication services

The only external libraries used are:
- **React Native/Expo**: Mobile framework (open source)
- **SQLite**: Local database (open source)
- **Cryptography Libraries**: Standard encryption libraries (open source)

None of these transmit your data anywhere.

## Permissions Explained

Noteece may request the following device permissions:

### Required Permissions

- **Storage**: To save your encrypted vault locally
- **None others are required**: The app works fully without other permissions

### Optional Permissions

These are only requested if you choose to use specific features:

- **Camera**: For capturing images and OCR (future feature)
- **Microphone**: For voice notes (future feature)
- **Location (When-in-Use)**: For location-based task reminders (optional feature)
- **NFC**: For NFC tag triggers (optional feature)

**Important**: You can deny all optional permissions and still use core features. We respect your choice.

## Data Security

### Encryption

- **Algorithm**: ChaCha20-Poly1305 authenticated encryption
- **Key Derivation**: Argon2 for password-based key derivation
- **Local Only**: Keys never leave your device

### What Happens If You Lose Your Password?

**We cannot recover your data.** This is by design. Your password is the only way to decrypt your vault. If you lose it, your data is permanently encrypted and unrecoverable. This ensures true zero-knowledge security.

### Recommendations

- **Use a strong password** (at least 12 characters)
- **Store it securely** (password manager recommended)
- **Back up regularly** using the export feature

## Children's Privacy

Noteece does not collect any personal information from anyone, including children under 13. However, the app is not specifically designed for children. Parents/guardians should supervise children's use of the app.

## Changes to This Policy

If we update this Privacy Policy, we will:
1. Update the "Last Updated" date at the top
2. Include changes in the app release notes
3. Notify users through an in-app message

Material changes will require your acceptance before continuing to use the app.

## Open Source

Noteece is open source software licensed under GNU GPL v3. You can:
- Review the source code on GitHub
- Verify that we do what we say in this policy
- Audit the encryption implementation
- Build the app yourself from source

**GitHub Repository**: https://github.com/[your-username]/Noteece

## Your Rights

Since we don't collect your data, traditional data rights (access, deletion, portability) are inherently satisfied:

- **Access**: You have full access to all your data in the app
- **Deletion**: Delete the app to permanently remove all data
- **Portability**: Use the export feature to take your data anywhere
- **Correction**: Edit any data directly in the app
- **Control**: You have complete control at all times

## Contact

For privacy questions or concerns:

- **Email**: privacy@noteece.app (fictional - update with real contact)
- **GitHub Issues**: https://github.com/[your-username]/Noteece/issues
- **In-App**: Use "Report Issue" in the More tab

## Compliance

### GDPR (EU)

While we don't collect personal data, Noteece is designed to comply with GDPR principles:
- **Data Minimization**: We collect zero data
- **Purpose Limitation**: Not applicable (no data collection)
- **Storage Limitation**: All data stored locally, you control retention
- **Integrity & Confidentiality**: Strong encryption protects your data
- **Accountability**: This policy documents our approach

### CCPA (California)

Noteece does not sell personal information because we don't collect it. California residents have full control over their data through the app's built-in features.

### Other Jurisdictions

We believe our zero-knowledge, local-first approach exceeds privacy requirements worldwide. If you have questions about specific regulations, please contact us.

## Transparency Report

Since we don't collect data, we cannot receive valid data requests:

- **Government Requests Received**: 0 (we have nothing to provide)
- **Takedown Requests**: Not applicable
- **Data Breaches**: Impossible (we don't store your data)

## Summary (TL;DR)

✅ **Your data stays on your device, encrypted**
✅ **We cannot see your data, ever**
✅ **No servers, no tracking, no analytics**
✅ **Optional local network sync is end-to-end encrypted**
✅ **Open source and auditable**
✅ **If you lose your password, your data is unrecoverable** (by design)

---

**Bottom Line**: Noteece is designed so that protecting your privacy is not optional—it's fundamental to how the app works. We couldn't access your data even if we wanted to.
