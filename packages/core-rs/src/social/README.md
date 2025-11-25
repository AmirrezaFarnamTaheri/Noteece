# Social Media Suite - Core Module

**Version:** 1.1
**Status:** Production Ready
**Language:** Rust

## Overview

The social media suite provides local-first social media aggregation with zero infrastructure costs. All data is encrypted and stored locally using SQLCipher.

## Architecture

```
social/
├── mod.rs              # Module exports and re-exports
├── account.rs          # Account management (362 lines)
├── post.rs             # Post storage and retrieval (348 lines)
├── category.rs         # Category system (312 lines)
├── timeline.rs         # Unified timeline queries (329 lines)
├── webview.rs          # WebView session management (287 lines)
├── sync.rs             # Sync orchestration (311 lines)
├── analytics.rs        # Analytics and insights (276 lines)
├── intelligence.rs     # AI categorization (283 lines)
└── focus.rs            # Focus modes and automation (396 lines)
```

## Key Features

### 1. Account Management (`account.rs`)

- Multi-account support per platform
- Encrypted credential storage (XChaCha20-Poly1305)
- Enable/disable accounts
- Configurable sync frequency

### 2. Post Storage (`post.rs`)

- Unified post schema across all platforms
- FTS5 full-text search with automatic triggers
- Media URL storage with size limits
- Engagement metrics tracking

### 3. Category System (`category.rs`)

- User-defined categories with colors/icons
- Manual and auto-categorization
- Rule-based categorization with priorities
- Cross-platform organization

### 4. Timeline (`timeline.rs`)

- Unified timeline across all platforms
- Advanced filtering (platform, category, time, search)
- Pagination with limit/offset
- Timeline statistics

### 5. WebView Management (`webview.rs`)

- Isolated WebView sessions per account
- Encrypted session persistence
- Cookie and session data management
- Platform URL mapping

### 6. Sync (`sync.rs`)

- Sync task orchestration
- Status tracking (pending, in_progress, completed, failed)
- Sync history with metrics
- Error handling and retry logic

### 7. Analytics (`analytics.rs`)

- Platform breakdown statistics
- Time series activity tracking
- Category performance metrics
- Top posts ranking by engagement

### 8. Intelligence (`intelligence.rs`)

- Sentiment analysis (Positive, Negative, Neutral, Mixed)
- Topic extraction (10 categories)
- Content summarization
- Auto-categorization rules

### 9. Focus Modes (`focus.rs`)

- 4 preset modes (Deep Work, Social Time, Learning, Detox)
- Custom mode creation
- Platform blocking/allowing
- Automation triggers and actions

## Database Schema

### Tables (11 total)

```sql
social_account              # Account credentials (encrypted)
social_post                 # Unified posts
social_category             # Categories
social_post_category        # Many-to-many mapping
social_post_fts             # Full-text search index
social_sync_history         # Sync tracking
social_webview_session      # Session persistence
social_auto_rule            # Auto-categorization rules
social_focus_mode           # Focus mode configurations
social_automation_rule      # Automation triggers/actions
```

### Triggers

```sql
social_post_ai              # Auto-insert into FTS on INSERT
social_post_au              # Auto-update FTS on UPDATE
social_post_ad              # Auto-delete from FTS on DELETE
```

## Security

### Encryption

- **Database**: SQLCipher with 256-bit AES
- **Credentials**: XChaCha20-Poly1305 AEAD
- **Key Derivation**: Argon2id

### Input Validation

- Length limits on all string inputs
- JSON payload size limits (10MB max)
- Batch size limits (1000 items max)
- Timestamp validation (no NaN)
- URL validation (reject blob:, data:)

### Memory Safety

- Pure Rust (no unsafe blocks)
- Zeroize trait for sensitive data
- Connection pooling with Mutex

## API Reference

### Account Operations

```rust
add_social_account(conn, space_id, platform, username, credentials, dek) -> Result<String>
get_social_accounts(conn, space_id) -> Result<Vec<SocialAccount>>
update_social_account(conn, account_id, enabled, sync_freq) -> Result<()>
delete_social_account(conn, account_id) -> Result<()>
```

### Post Operations

```rust
store_social_posts(conn, account_id, posts) -> Result<usize>
get_social_posts(conn, account_id, limit, offset) -> Result<Vec<SocialPost>>
search_social_posts(conn, space_id, query, limit) -> Result<Vec<SocialPost>>
```

### Timeline Operations

```rust
get_unified_timeline(conn, space_id, filters) -> Result<Vec<TimelinePost>>
get_timeline_stats(conn, space_id, filters) -> Result<TimelineStats>
```

### Category Operations

```rust
create_category(conn, space_id, name, color, icon) -> Result<String>
assign_category(conn, post_id, category_id) -> Result<()>
auto_categorize_posts(conn, space_id, limit) -> Result<usize>
```

### Analytics Operations

```rust
get_analytics_overview(conn, space_id, days) -> Result<AnalyticsOverview>
```

### Intelligence Operations

```rust
analyze_post_content(content) -> ContentInsight
create_auto_rule(conn, category_id, rule_type, pattern, priority) -> Result<String>
```

### Focus Mode Operations

```rust
create_focus_mode(conn, space_id, name, blocked, allowed) -> Result<FocusMode>
activate_focus_mode(conn, focus_mode_id, space_id) -> Result<()>
is_platform_blocked(conn, space_id, platform) -> Result<bool>
```

## Error Handling

All functions return `Result<T, SocialError>` where `SocialError` wraps:

- `rusqlite::Error` - Database errors
- `serde_json::Error` - JSON serialization errors
- `String` - Custom error messages

Error categories:

- **Database errors**: Connection, query, constraint violations
- **Validation errors**: Invalid input, size limits exceeded
- **Encryption errors**: Failed to encrypt/decrypt credentials
- **Not found**: Account, category, post not found

## Performance

### Optimizations

- **Indexes**: 7 indexes on hot paths
- **Transactions**: Batch operations use transactions
- **FTS Triggers**: Automatic index maintenance
- **Prepared Statements**: Reused for repeated queries
- **Pagination**: All queries support limit/offset

### Scalability

- **Posts**: Tested with 50,000+ posts
- **Accounts**: Supports 20+ accounts
- **Categories**: Unlimited user-defined categories
- **Search**: Sub-100ms for 10,000+ posts with FTS5

## Testing

### Unit Tests

```bash
cd packages/core-rs
cargo test social::intelligence::tests
cargo test social::focus::tests
```

### Integration Tests

```bash
cargo test --test social_integration
```

## Logging

All modules use the `log` crate:

```rust
log::info!("[Social] Account created: {}", account_id);
log::warn!("[Social] Post media JSON exceeds size limit");
log::error!("[Social] Failed to sync account: {}", error);
```

## Dependencies

```toml
[dependencies]
rusqlite = { version = "0.31", features = ["bundled"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
ulid = "1.1"
chrono = "0.4"
chacha20poly1305 = "0.10"
argon2 = "0.5"
zeroize = "1.7"
log = "0.4"
```

## Contributing

### Code Style

- Run `cargo fmt` before committing
- Run `cargo clippy -- -D warnings`
- Add tests for new features
- Update documentation

### Security

- Never use `unsafe` blocks
- Always validate inputs
- Use parameterized queries
- Encrypt sensitive data

## License

See main project LICENSE file.

---

_For detailed API documentation, run `cargo doc --open`_
_For usage examples, see `apps/desktop/src-tauri/src/main.rs`_
