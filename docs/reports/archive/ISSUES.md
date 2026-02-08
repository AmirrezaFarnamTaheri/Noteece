# Known Issues and Limitations

**Date:** November 17, 2025
**Project:** Noteece

This document tracks known issues, limitations, and areas identified for future improvement.

## Critical Limitations

### 1. P2P Sync Vector Clocks

- **Issue**: The P2P sync implementation currently relies on timestamp-based ordering for conflict resolution instead of full vector clocks.
- **Impact**: Clock skew between devices could theoretically lead to lost updates in highly concurrent editing scenarios.
- **Status**: Documented in `packages/core-rs/src/sync/p2p.rs`. Warning logs added.
- **Workaround**: Users should ensure device clocks are roughly synchronized.

### 2. Mobile Tag Migration

- **Issue**: Mobile database migrations do not currently migrate tags due to schema complexity.
- **Impact**: Tags created on mobile might be lost during major schema updates if not synced to desktop.
- **Recommendation**: Sync to desktop before updating mobile app.

### 3. Hardcoded Configuration

- **Issue**: Some configuration values (e.g., Tauri server port 8765, `system_user` ID) are hardcoded.
- **Impact**: Reduced flexibility for deployment in non-standard environments.
- **Plan**: Move to environment-based configuration in future release.

## Incomplete / Placeholder Features

### 1. AI & Automation

- **Automation DSL**: The automation runtime is currently a stub/mock.
- **AI Inference**: The inference engine returns placeholder sentiment analysis.
- **Status**: These are experimental features and not part of the core "Stable Beta".

### 2. Widgets

- **Music Widget**: Functional visualizer UI implemented. Spotify integration is planned for future release.
- **Temporal Graph**: Requires real correlation data to function; mock data generation has been removed to avoid misleading users.

## Security

### 1. Encryption

- **Attachment Encryption**: Binary attachments are not currently encrypted at rest, only text content.
- **Key Storage**: Keys are stored in the application database (encrypted with user password) rather than OS keychain.

---

_This document should be updated as issues are resolved or new ones discovered._
