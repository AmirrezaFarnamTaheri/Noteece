# Privacy Policy for Noteece

**Last Updated:** 2025-11-18

**[NEEDS LEGAL REVIEW]**

_This document is a placeholder and requires review by a qualified legal professional. The content is based on standard templates and has not been tailored to specific jurisdictions or business needs._

## Our Commitment to Privacy

Your privacy is critically important to us. Noteece is designed from the ground up to be a "zero-knowledge" application. This means we, the developers, have no access to your personal data or content.

## 1. Data Collection

- **No Personal Data:** We do not collect, store, or transmit any of your personal content. All notes, tasks, and other data you create are stored exclusively on your local devices.
- **No Telemetry or Analytics:** The application does not collect any usage data, analytics, or telemetry.
- **Accounts and Servers:** Noteece can be used entirely locally, with no account required. However, the project **does** ship a relay server (`packages/relay-server`) that acts as a store-and-forward mailbox. If you enable relay-based sync, your (encrypted) sync payloads **are** transmitted to and temporarily stored on that relay server. Only local-network sync avoids any server entirely.

## 2. Encryption

**Desktop:** Your data is encrypted at rest using SQLCipher with **AES-256-CBC plus HMAC-SHA512**. The database key is derived from your password using PBKDF2-HMAC-SHA512 (256,000 iterations); the password itself is never stored or transmitted. **If you lose your password, your data cannot be recovered.**

**Mobile (iOS and Android): your data is NOT encrypted at rest.** The mobile app stores notes and all other content in a **plaintext** SQLite database (`apps/mobile/src/lib/database.ts:585`). Anyone with access to the device's file system, an unencrypted device backup, or a forensic extraction can read your mobile data. Mobile at-rest encryption is not yet implemented. Do not rely on the mobile app for confidential content.

## 3. Syncing

When you use the local network sync feature, your data is transmitted directly between your own devices over your local Wi-Fi network. This transmission is end-to-end encrypted, and the data is never exposed to the internet or any third party.

## 4. Permissions (Mobile App)

The mobile application will request certain permissions to enable specific features (e.g., camera for photo capture). These permissions are only used for the stated purpose and are not used to collect any data.

### 4a. Android "Prime" Sideload Flavor — Accessibility Service Screen Capture

**[NEEDS LEGAL REVIEW — this disclosure is material and must be reviewed before any distribution]**

The Android **"Prime" sideload build flavor** (application ID suffix `.prime`) includes an **Android Accessibility Service** (`apps/mobile/android/app/src/sideload/java/com/noteece/services/NoteeceAccessibilityService.kt`). When you explicitly enable this service in Android system settings and start a capture session, it **reads on-screen text content from other, third-party applications** on your device.

The apps it can read from include social media and **private messaging applications** — for example X/Twitter, Instagram, LinkedIn, Facebook, Telegram, Discord, Slack, and WhatsApp. This means **the contents of your private conversations, including messages sent to you by other people who have not consented to this capture, can be read and stored by Noteece.**

Key points:

- This service is **not** present in the standard app-store build; it exists only in the sideload "Prime" flavor.
- It is **off by default** and requires an explicit, manual grant in Android's Accessibility settings.
- Capture only occurs during an explicitly started session and is paused when the screen turns off.
- Captured content is stored in the mobile database, which — as stated in Section 2 — is **NOT encrypted at rest**.
- You may be subject to legal obligations (including wiretap, interception, and data-protection laws) regarding the capture and retention of communications involving third parties. You are responsible for your use of this feature.

## 5. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.

---

**Company Name:** [Your Company Name]
**Contact:** [Your Contact Information]
