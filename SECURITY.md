# Security Policy

## Overview

Noteece is a privacy-first, local-first note-taking application that prioritizes data security and user privacy. This document outlines our security architecture, known considerations, and responsible disclosure practices.

## Security Architecture

### Encryption

#### Data Encryption Key (DEK) Management

- **Key Derivation**: DEKs are derived from user passwords using Argon2id, a memory-hard key derivation function resistant to GPU and ASIC attacks
- **Storage**: DEKs are **never** stored on disk unencrypted
- **Memory Security**:
  - DEKs are held in process memory for the application lifetime (required for local-first architecture)
  - Automatically zeroed on application exit using the Zeroize trait
  - Protected by OS process isolation
- **Lifetime**: While long-lived in-memory DEKs increase exposure surface, this is a necessary trade-off for the local-first architecture's responsiveness and offline capabilities

*Location: `apps/desktop/src-tauri/src/main.rs:30-49`*

#### Note Content Encryption

- **Algorithm**: XChaCha20-Poly1305 authenticated encryption
- **Nonce**: 24-byte random nonce generated for each encryption operation using OsRng
- **Tag**: 16-byte Poly1305 authentication tag
- **Validation**: Strict validation of DEK length (exactly 32 bytes) and ciphertext minimum length (nonce + tag)

*Location: `packages/core-rs/src/crypto.rs`*

#### Sync Agent Encryption

- **Re-encryption**: All incoming sync deltas are validated and re-encrypted with the local DEK before storage
- **Plaintext Fallback**: If incoming data cannot be decrypted, it's treated as plaintext and encrypted with the local DEK
- **Error Handling**: Encryption failures during sync are propagated as SyncError::EncryptionError

*Location: `packages/core-rs/src/sync_agent.rs:515-549`*

**Known Consideration**: The use of `String::from_utf8_lossy()` for converting sync data may not preserve binary ciphertext perfectly. This is acceptable for the current text-based note format but may need review for binary attachments.

### Data Export Security

#### JSON Export

- **Decryption**: Note content is automatically decrypted before export to prevent leaking ciphertext
- **Error Handling**: If decryption fails, the content field is cleared and a warning is logged
- **User Responsibility**: Exported JSON files are unencrypted and should be protected by the user

*Location: `packages/core-rs/src/import.rs:141-175`*

### Input Validation

#### OCR Processing

- **Language Parameter Validation**: The Tesseract language parameter is validated to prevent command injection
  - Maximum length: 20 characters
  - Allowed characters: alphanumeric, '+' (for combinations like 'eng+fra'), '-' (for variants like 'chi-sim')
- **Output Size Limits**: Tesseract output is capped at 10MB to prevent memory exhaustion
- **Path Validation**: Image paths are validated for existence and file type before processing

*Location: `packages/core-rs/src/ocr.rs:110-151`*

**Sensitive Data Consideration**: OCR output may contain sensitive information extracted from images. Downstream components are responsible for applying appropriate access controls.

#### Financial Transaction Validation

- **Currency**: Must be a valid 3-letter ISO currency code (e.g., USD, EUR, GBP)
- **Category**: Cannot be empty
- **Account**: Cannot be empty
- **Amount**: Must be a positive finite number, converted to integer cents to avoid floating-point precision errors

*Location: `apps/desktop/src/components/modes/FinanceMode.tsx:98-136`*

### SQL Injection Prevention

#### Parameterized Queries

All SQL queries use parameterized statements via rusqlite's `params!` macro to prevent SQL injection:

- **Note Links**: Backlink queries explicitly exclude self-links to maintain graph integrity
  *Location: `packages/core-rs/src/temporal_graph.rs:190-235`*

- **Personal Modes**: Health metrics queries use owned values to prevent dangling parameter references
  *Location: `packages/core-rs/src/personal_modes.rs`*

- **Search**: Task and note search queries use proper parameter binding
  *Location: `packages/core-rs/src/search.rs`*

### UI Security

#### CSS Injection Prevention

- **TaskBoard Color Validation**: Column colors are validated against a whitelist of safe Mantine color tokens
  - Whitelist: gray, blue, yellow, green, red, orange, cyan, teal, pink, purple
  - Default fallback: gray (if validation fails)

*Location: `apps/desktop/src/components/TaskBoard.tsx:11`*

#### Re-entrancy Guards

- **Foresight Action Execution**: Uses React useRef to prevent duplicate action execution on rapid clicks
- **CalDAV Sync**: Uses atomic ref-based locking to prevent concurrent syncs

*Locations: `apps/desktop/src/components/Foresight.tsx:73,108`, `apps/desktop/src/components/settings/CalDAVSettings.tsx:56,103-106`*

#### Date/Time Handling

- **Timezone Safety**: Date keys are normalized to local midnight to avoid timezone drift
- **Timer Stability**: Focus timer uses refs to prevent closure capture and interval drift

*Locations: `packages/ui/src/components/MiniCalendar.tsx`, `packages/ui/src/components/FocusTimer.tsx`*

### Search Privacy

#### Encrypted Content Handling

- **Note Search**: Search results explicitly exclude encrypted content fields to prevent attempting to process ciphertext as plaintext
- **Snippets**: Set to None for encrypted notes since ciphertext cannot produce meaningful snippets
- **Relevance**: Based on title only to avoid using ciphertext in scoring

*Location: `packages/core-rs/src/search.rs`*

## Known Security Considerations

### In-Memory DEK Lifetime

**Trade-off**: The Data Encryption Key (DEK) remains in process memory for the application lifetime rather than being cleared after each operation.

**Rationale**: This design choice is necessary for the local-first architecture, which requires:
- Fast, synchronous access to notes without password re-entry
- Offline-first functionality without authentication round-trips
- Responsive UI without encryption/decryption delays

**Mitigations**:
- DEK is never written to disk unencrypted
- Automatically zeroed on application exit (including panic scenarios)
- Protected by OS process isolation
- Derived from password using Argon2id (not stored directly)

**Alternative Approach for Enhanced Security**: Future versions could integrate with OS keystore services (macOS Keychain, Windows Credential Manager, Linux Secret Service) to minimize in-memory lifetime, with the trade-off of platform-specific complexity and potential loss of cross-platform consistency.

### Sync Encryption Handling

**Consideration**: The sync agent uses `String::from_utf8_lossy()` to convert incoming binary data to strings, which may not perfectly preserve binary ciphertext.

**Current Status**: Acceptable for text-based notes, which are the current use case.

**Future Enhancement**: For binary attachments or non-text content, consider:
- Using byte-based encryption/decryption
- Implementing separate handling for binary and text content
- Base64 encoding for binary data in sync protocol

### OCR Sensitive Data

**Consideration**: OCR processing extracts text from images, which may include sensitive information (PII, credentials, financial data).

**User Responsibility**: Users should:
- Be aware of what images they process with OCR
- Apply appropriate access controls to notes containing OCR results
- Consider disabling OCR for highly sensitive images

**Application Controls**:
- OCR results are encrypted at rest (same as note content)
- Access controlled through space-based permissions
- OCR can be disabled at the application level

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in Noteece:

### Reporting Process

1. **Do Not** create a public GitHub issue for security vulnerabilities
2. Submit vulnerabilities through GitHub's private vulnerability reporting:
   - Go to the repository's Security tab
   - Click "Report a vulnerability"
   - Fill out the form with detailed information

3. **Include in your report**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information for follow-up

### Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 60 days

### Responsible Disclosure

We request that security researchers:
- Allow reasonable time for fixes before public disclosure
- Avoid exploiting vulnerabilities beyond demonstration
- Not access, modify, or delete user data without permission
- Provide details to help us reproduce and fix the issue

## Security Best Practices for Users

### Password Security

- Use a strong, unique password for Noteece
- Consider using a password manager
- Enable 2FA for cloud sync providers (if used)
- Regularly rotate passwords (every 90 days recommended)

### Data Export Security

- Exported JSON files are **not encrypted**
- Store exports in secure locations
- Delete exports when no longer needed
- Use encrypted volumes for sensitive exports

### Sync Security

- Use trusted CalDAV providers with HTTPS
- Verify SSL/TLS certificates
- Use app-specific passwords when available
- Review sync logs regularly

### Application Security

- Keep Noteece updated to the latest version
- Enable automatic updates if available
- Review permissions requested by the application
- Use full-disk encryption on your device

## Security Audit History

| Date | Type | Scope | Findings | Status |
|------|------|-------|----------|--------|
| 2025-01 | PR Compliance Review | Batch 1 | 6 critical security issues | ✅ Fixed |
| 2025-01 | PR Compliance Review | Batch 2 | 13 medium/low priority issues | ✅ Fixed |
| 2025-01 | PR Compliance Review | Batch 3 | 5 high priority security issues | ✅ Fixed |
| 2025-01 | PR Compliance Review | Batch 4 | 7 reliability & performance issues | ✅ Fixed |
| 2025-01 | PR Compliance Review | Batch 5 | 4 security hardening improvements | ✅ Fixed |
| 2025-01 | Architecture Review | Major Items | 3 breaking changes identified | 📝 Documented |

### Batch 4 Improvements (Reliability & Performance)

**Sync Conflict Resolution (Priority 9)**:
- Populated `local_version` field with actual local data in conflict detection
- Essential for proper conflict resolution logic
- *Location: packages/core-rs/src/sync_agent.rs:602-686*

**Per-Account Sync Locking (Priority 8)**:
- Refactored from global lock to per-account Set
- Allows concurrent syncs of different accounts
- Added `safeNum()` utility to prevent NaN in UI
- *Location: apps/desktop/src/components/settings/CalDAVSettings.tsx*

**Database Atomicity (Priority 7)**:
- OCR status updates now use transactions
- Prevents inconsistent states on errors
- *Location: packages/core-rs/src/ocr.rs:219-276*

**Search Performance & Security (Priority 7)**:
- Removed unused `encrypted_content` column from note search
- Reduces memory usage and I/O
- Prevents unnecessary exposure of encrypted data
- *Location: packages/core-rs/src/search.rs:213-292*

**NULL Handling (Priority 7)**:
- Task search now uses proper `Option<T>` types instead of `.ok()`
- More robust handling of nullable database columns
- *Location: packages/core-rs/src/search.rs:350-358*

**Timestamp Validation (Priority 7)**:
- Added defensive checks for timestamps in ActivityTimeline
- Handles NaN, negative, and future dates gracefully
- *Location: packages/ui/src/components/ActivityTimeline.tsx:54-72*

**Logging Separation (Priority 6)**:
- Errors and warnings now sent to stderr
- Info and debug messages to stdout
- Better separation for CI/CD pipelines
- *Location: packages/core-rs/src/logger.rs:71-81*

### Batch 5 Improvements (Security Hardening)

**File I/O Error Reporting (Priority 8)**:
- Logger now surfaces write, flush, and lock errors to stderr
- Previously silently ignored file logging failures
- Helps diagnose logging infrastructure issues
- *Location: packages/core-rs/src/logger.rs:62-74*

**Unique ZIP Filenames (Priority 8)**:
- ZIP exports now use ID-prefixed filenames to prevent collisions
- Format: `notes/{id}_{sanitized_title}.md`
- Explicit directory creation in archive
- Prevents data loss when multiple notes have same title
- *Location: packages/core-rs/src/import.rs:184-213*

**Action Parameter Validation (Priority 8)**:
- Added ULID/UUID format validation before navigation
- Prevents injection attacks via malformed IDs
- Validates task_id and project_id parameters
- *Location: apps/desktop/src/components/Foresight.tsx:119-127*

**TypeScript Type Hardening (Priority 6)**:
- TaskBoard columns frozen with Object.freeze()
- Added strict SafeColor type with const assertion
- Icon validation to prevent XSS
- Improved compile-time type safety
- *Location: apps/desktop/src/components/TaskBoard.tsx:11-22*

### Known Architectural Limitations

The following issues were identified during security review but require breaking changes or major architectural refactoring. They are documented here for transparency and will be addressed in future major versions.

**1. Binary Data Handling in Sync (CRITICAL)**

**Issue**: The sync agent uses `String::from_utf8_lossy()` to convert potentially binary ciphertext to UTF-8 strings. Ciphertext should be treated as opaque bytes and stored in BLOB columns, not TEXT.

**Current Behavior**:
```rust
// sync_agent.rs
let data_str = String::from_utf8_lossy(data).to_string();
let ciphertext: String = crate::crypto::encrypt_string(&data_str, dek)?;
// Stores as TEXT in database
```

**Impact**:
- May corrupt binary data during sync
- Ciphertext stored as TEXT instead of BLOB
- Limited to UTF-8 representable ciphertext

**Why Not Fixed**:
- Requires database migration (TEXT → BLOB)
- Changes encrypt/decrypt API signatures
- Affects all callers throughout codebase
- Breaking change for existing encrypted data

**Mitigation**:
- Current implementation works for text-based notes
- Base64-encoded ciphertext is UTF-8 safe
- No reported data corruption issues

**Future Fix**: Version 2.0 will migrate to byte-based encryption/decryption with BLOB storage

*Location: packages/core-rs/src/sync_agent.rs:512-542*

**2. AAD (Authenticated Associated Data) Encryption (Priority 9)**

**Issue**: Encryption does not use AAD to bind ciphertext to its context, allowing potential misuse if ciphertext is moved between contexts.

**Current API**:
```rust
pub fn encrypt_string(plaintext: &str, dek: &[u8]) -> Result<String, CryptoError>
pub fn decrypt_string(encrypted: &str, dek: &[u8]) -> Result<String, CryptoError>
```

**Proposed API**:
```rust
pub fn encrypt_string(plaintext: &str, dek: &[u8], aad: &[u8]) -> Result<String, CryptoError>
pub fn decrypt_string(encrypted: &str, dek: &[u8], aad: &[u8]) -> Result<String, CryptoError>
```

**Impact of Change**:
- All 40+ callers need to provide AAD parameter
- Existing encrypted data incompatible without migration
- Protocol change affects sync

**Mitigation**:
- Current encryption uses XChaCha20-Poly1305 with authentication
- Poly1305 MAC prevents tampering
- DEK is user-specific, limiting attack surface

**Future Fix**: Version 2.0 will add AAD with format versioning and migration path

*Location: packages/core-rs/src/crypto.rs*

**3. Asynchronous DEK Cleanup (Priority 7)**

**Issue**: DEK cleanup in window close and panic handlers uses synchronous mutex locking, which could deadlock in rare cases.

**Proposed Solution**: Move to async tasks using `tauri::async_runtime::spawn()`

**Why Not Fixed**:
- Risk of incomplete cleanup if async task doesn't complete
- Panic hooks calling async code is non-idiomatic
- Current synchronous approach is safer
- No reported deadlock issues

**Mitigation**:
- Zeroizing trait ensures cleanup on Drop
- OS process termination clears memory
- Best-effort cleanup in panic handler

**Future Fix**: Comprehensive async refactor with guaranteed cleanup semantics

*Location: apps/desktop/src-tauri/src/main.rs*

### External Command Security

**OCR Tesseract Invocation**

**Current Security Measures**:
- Language parameter validation (alphanumeric + '+' and '-')
- Output size limit (10MB cap)
- Path existence and file type checks
- Process timeout protection

**Remaining Concerns**:
- No sandboxing of Tesseract process
- User-supplied image paths could reference unintended files
- Resource exhaustion if called repeatedly

**Mitigation**:
- OCR is user-initiated, not automatic
- Image paths from trusted UI file picker
- Output size and validation limits prevent DoS

**Future Enhancement**: Sandbox Tesseract using OS-level process isolation

*Location: packages/core-rs/src/ocr.rs*

## Security Features Roadmap

### Planned Enhancements

- [ ] Optional OS keystore integration for DEK storage
- [ ] End-to-end encrypted sync with key exchange
- [ ] Biometric authentication support (where available)
- [ ] Automatic session timeout with DEK clearing
- [ ] Enhanced audit logging for sensitive operations
- [ ] Content Security Policy (CSP) hardening
- [ ] Subresource Integrity (SRI) for web dependencies

### Under Consideration

- [ ] AAD (Authenticated Associated Data) for context-bound encryption
- [ ] Hardware security module (HSM) support for enterprise deployments
- [ ] Zero-knowledge proof for sync authentication
- [ ] Encrypted search with homomorphic encryption

## Test Coverage

### Comprehensive Security Test Suite

To ensure the security improvements documented above are robust and maintainable, comprehensive test coverage has been added for all critical security functions.

#### Cryptography Tests (packages/core-rs/tests/crypto_tests.rs)

**16 comprehensive tests** covering:

1. **Key Derivation**:
   - Basic key derivation (test_key_derivation)
   - Consistency verification (test_dek_derivation_consistency)
   - Salt variation validation

2. **Encryption/Decryption**:
   - Round-trip encryption (test_encrypt_decrypt_roundtrip)
   - Empty string handling (test_encrypt_empty_string)
   - Large data handling (1MB+) (test_encrypt_large_string)
   - Unicode and special characters (test_encrypt_unicode_and_special_chars)
   - Nonce randomness (test_same_plaintext_different_ciphertexts)

3. **DEK Validation** (Batch 1 Security):
   - Short DEK rejection (< 32 bytes) (test_encrypt_with_invalid_dek_length)
   - Long DEK rejection (> 32 bytes)
   - Empty DEK rejection
   - Wrong DEK authentication failure (test_decrypt_with_wrong_dek)

4. **Ciphertext Validation** (Batch 1 Security):
   - Too-short ciphertext rejection (< nonce + tag) (test_decrypt_with_invalid_ciphertext_too_short)
   - Corrupted ciphertext detection (test_decrypt_with_corrupted_ciphertext)
   - Invalid base64 rejection (test_decrypt_invalid_base64)
   - Tag verification enforcement

**Coverage**: All security-critical code paths in crypto.rs are tested.

#### OCR Security Tests (packages/core-rs/tests/ocr_tests.rs)

**16 total tests** including **6 security-specific tests**:

1. **Language Parameter Validation** (Batch 3 Security):
   - Valid language codes (eng, fra, deu, eng+fra, chi-sim) (test_ocr_language_validation_valid)
   - Command injection attempts (eng; rm -rf /, eng && cat /etc/passwd) (test_ocr_language_validation_invalid)
   - Path traversal attempts (../../../etc/passwd)
   - Shell metacharacters ($, |, `, #, etc.)
   - Length limit enforcement (20 chars max)

2. **Output Size Limits** (Batch 2 Security):
   - 10MB size limit enforcement (test_ocr_output_size_limit)
   - Memory exhaustion prevention

3. **Transactional Updates** (Batch 4 Reliability):
   - Atomic status transitions (test_process_ocr_job_transactional_behavior)
   - Success path atomicity (test_process_ocr_job_transactional_behavior)
   - Failure path atomicity (test_process_ocr_job_failure_transactional_behavior)
   - Transaction rollback verification (test_ocr_result_atomicity)

**Coverage**: All OCR security validations and transactional logic are tested.

#### Import/Export Security Tests (packages/core-rs/tests/import_tests.rs)

**7 total tests** including **5 security-specific tests**:

1. **Export Decryption** (Batch 3 Security):
   - JSON export decryption verification (test_export_to_json_decrypts_content)
   - Decryption failure handling (test_export_to_json_handles_decryption_failure)
   - Ciphertext leakage prevention

2. **Unique ZIP Filenames** (Batch 5 Security):
   - ID-prefixed filename generation (test_export_to_zip_unique_filenames)
   - Duplicate title collision prevention
   - Filename uniqueness verification

3. **Filename Sanitization**:
   - Special character handling (/, \, :, *, ?, ", <, >, |) (test_export_to_zip_filename_sanitization)
   - Path injection prevention

4. **Content Preservation**:
   - Unicode content preservation (test_export_to_zip_preserves_content)
   - Decryption integrity in ZIP exports

**Coverage**: All export security enhancements from batches 3 and 5 are tested.

#### Search Security Tests (packages/core-rs/tests/search_tests.rs)

**4 total tests** including **3 security-specific tests**:

1. **Encrypted Content Protection** (Batch 1 & 4 Security):
   - Encrypted content not exposed in results (test_search_does_not_expose_encrypted_content)
   - Encrypted content not matched by queries (test_search_does_not_match_encrypted_content)
   - Performance without loading encrypted_content (test_search_performance_without_encrypted_content)

2. **Privacy Guarantees**:
   - No ciphertext in search results
   - No plaintext leakage via snippets
   - Database query optimization verification

**Coverage**: All search privacy enhancements from batches 1 and 4 are tested.

### CI/CD Integration

The GitHub Actions CI workflow (`.github/workflows/ci.yml`) has been enhanced to run:

1. **Rust Checks**:
   - `cargo check --verbose` - Compilation verification
   - `cargo fmt -- --check` - Code formatting
   - `cargo clippy --all-targets --all-features -- -D warnings` - Linting with warnings as errors
   - `cargo test --verbose` - Full test suite execution

2. **TypeScript Checks**:
   - `pnpm lint` - ESLint verification
   - `pnpm format --check` - Prettier formatting

### Test Coverage Summary

| Module | Total Tests | Security Tests | Coverage |
|--------|-------------|----------------|----------|
| crypto.rs | 16 | 16 | 100% of security logic |
| ocr.rs | 16 | 6 | 100% of validation logic |
| import.rs | 7 | 5 | 100% of export security |
| search.rs | 4 | 3 | 100% of privacy logic |
| **Total** | **43** | **30** | **High** |

### Running Tests Locally

```bash
# Run all Rust tests
cd packages/core-rs
cargo test --verbose

# Run specific security test suite
cargo test crypto_tests
cargo test ocr_tests
cargo test import_tests
cargo test search_tests

# Run with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html --output-dir coverage
```

### Test Maintenance

- All security-critical functions must have corresponding tests
- Tests must be updated when security logic changes
- New security features require tests before merge
- Failed tests block deployment via CI/CD

## References

- [XChaCha20-Poly1305 Specification](https://tools.ietf.org/html/rfc8439)
- [Argon2 Password Hashing](https://github.com/P-H-C/phc-winner-argon2)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SQLite Security](https://www.sqlite.org/security.html)

## Contact

For security-related questions (non-vulnerabilities):
- Create a discussion in the GitHub repository
- Tag with `security` label

---

*Last Updated: January 2025*
*Security Policy Version: 1.0.0*
