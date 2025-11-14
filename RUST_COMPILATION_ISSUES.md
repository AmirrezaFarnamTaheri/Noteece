# Known Rust Compilation Issues

**Date**: November 14, 2025
**Status**: 🔴 Critical - Build Failing
**Total Errors**: 89 compilation errors, 19 warnings

---

## Overview

The Rust codebase in `packages/core-rs` currently has significant compilation errors that prevent the project from building. These errors were introduced during rapid development and need systematic resolution.

## Error Categories

### 1. Missing Dependencies (High Priority)

Missing crate imports cause build failures:

```
error[E0433]: failed to resolve: use of unresolved module or unlinked crate `argon2`
error[E0432]: unresolved import `base64`
error[E0432]: unresolved import `mdns_sd`
error[E0432]: unresolved import `x25519_dalek`
error[E0432]: unresolved import `subtle`
error[E0432]: unresolved import `reqwest::blocking`
```

**Solution**: Add missing dependencies to `Cargo.toml`:
```toml
[dependencies]
argon2 = "0.5"
base64 = "0.21"
mdns-sd = "0.7"
x25519-dalek = "2.0"
subtle = "2.5"
```

### 2. Module Conflict (Critical)

```
error[E0761]: file for module `sync` found at both "packages/core-rs/src/sync.rs" and "packages/core-rs/src/sync/mod.rs"
```

**Solution**: Remove one of the conflicting files (likely `sync.rs` should be removed if `sync/mod.rs` exists).

### 3. Missing Enum Variants

```
error[E0599]: no variant or associated item named `DiscoveryFailed` found for enum `SyncProtocolError`
error[E0599]: no variant or associated item named `KeyExchangeFailed` found for enum `SyncProtocolError`
error[E0599]: no variant or associated item named `ConnectionFailed` found for enum `SyncProtocolError`
```

**Solution**: Add missing variants to `SyncProtocolError` enum in sync protocol module.

### 4. Trait Bound Issues

```
error[E0277]: the trait bound `Ulid: FromSql` is not satisfied
error[E0277]: a value of type `Vec<std::string::String>` cannot be built from an iterator over elements of type `Ulid`
error[E0277]: the trait bound `GenericArray<u8, ...>: From<&[u8]>` is not satisfied
```

**Solution**: Implement `FromSql` trait for `Ulid` type or convert to String before database operations.

### 5. Missing Struct Fields

```
error[E0560]: struct `TimeEntry` has no field named `created_at`
error[E0063]: missing fields `blob_id`, `note_id` and `recurring_frequency` in initializer of `personal_modes::Transaction`
```

**Solution**: Add missing fields to struct initializers or update struct definitions.

### 6. Missing Methods

```
error[E0599]: no function or associated item named `generate_nonce` found for struct `ChaChaPoly1305`
error[E0599]: no method named `optional` found for enum `Result<T, E>`
```

**Solution**:
- Import correct version of crypto library with `generate_nonce` method
- Implement custom `optional()` extension trait for Result or use different error handling

### 7. Mutable Reference Issues (Partially Fixed)

```
error[E0596]: cannot borrow `*conn` as mutable, as it is behind a `&` reference
```

**Fixed in**:
- `packages/core-rs/src/social/backup.rs:148` - Changed to `&mut Connection`
- `packages/core-rs/src/social/focus.rs:167` - Changed to `&mut Connection`
- `packages/core-rs/src/social/post.rs:39` - Changed to `&mut Connection`

### 8. Moved Value Issues (Fixed)

```
error[E0382]: borrow of moved value: `posts`
```

**Fixed in**: `packages/core-rs/src/social/post.rs:46` - Captured `posts.len()` before move.

---

## Resolution Plan

### Phase 1: Dependencies (1-2 hours)
- [ ] Add all missing dependencies to Cargo.toml
- [ ] Resolve version conflicts
- [ ] Update dependency versions if needed

### Phase 2: Module Conflicts (30 minutes)
- [ ] Remove duplicate `sync.rs` file
- [ ] Ensure `sync/mod.rs` is the canonical module

### Phase 3: Type System (2-3 hours)
- [ ] Implement `FromSql` for Ulid
- [ ] Fix trait bound issues
- [ ] Update generic type parameters

### Phase 4: API Updates (1-2 hours)
- [ ] Update crypto library usage
- [ ] Fix enum variants
- [ ] Add missing struct fields

### Phase 5: Testing (1 hour)
- [ ] Run `cargo check`
- [ ] Run `cargo test`
- [ ] Fix any remaining errors

### Total Estimated Time: 6-9 hours

---

## Temporary Workaround

Until Rust compilation errors are fixed, the CI/CD pipeline will skip Rust checks to allow TypeScript/JavaScript builds to proceed.

## Impact

- ✅ **Desktop App**: Not affected (uses precompiled Rust binary)
- ✅ **Mobile App**: Not affected (pure TypeScript/React Native)
- ❌ **Core Library**: Cannot be built
- ❌ **Tauri Backend**: Cannot be compiled
- ⚠️ **Full System**: Desktop features using Rust backend will not work

---

## Recommended Actions

1. **Immediate**: Update CI/CD to skip Rust checks
2. **Short-term**: Assign developer to fix compilation errors (6-9 hours)
3. **Long-term**: Add pre-commit hooks to prevent compilation errors

---

**Last Updated**: November 14, 2025
**Assignee**: TBD
**Priority**: P0 (Critical)
