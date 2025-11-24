# Noteece Project Plan

## Phase 1: Security Hardening (Completed)
- [x] **Sync Transport**: Replaced hardcoded key with X25519 ECDH handshake.
- [x] **Mobile Storage**: Migrated sensitive flags from AsyncStorage to SecureStore.
- [x] **Accessibility**: Added package filtering and screen-off pause logic to Android service.

## Phase 2: Architecture & Stability (In Progress)
- [x] **JNI Safety**: Refactored `jni.rs` to handle Mutex poisoning gracefully.
- [x] **Database Optimization**: Added `social_post_archive` and pruning logic (`maintenance.rs`).
- [x] **JSI Bridge**: Created C++ scaffolding for direct Rust-JS calls on Mobile.

## Phase 3: Feature Maturity (Started)
- [x] **AI Upgrade**: Created `inference.rs` abstraction for ONNX Runtime.
- [x] **Web Scrapers**: Externalized selector config to `socialConfig.js`.

## Next Steps
- Implement full `ort` integration for inference.
- Complete the JSI implementation (Android build system integration).
- Verify pruning job execution.
