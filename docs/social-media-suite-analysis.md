# Social Media Suite Analysis & Adapted Implementation Plan

## Executive Summary

**Verdict: EXCELLENT VISION, NEEDS ARCHITECTURE ADAPTATION ✨**

Your social media suite plan is comprehensive and well-thought-out, but needs significant adaptation to work with Noteece's actual architecture. The good news: **Noteece's architecture is actually BETTER suited for this than the Electron-based approach in your plan!**

### Critical Architecture Differences

| Your Plan Assumes | Noteece Actually Uses | Impact |
|-------------------|----------------------|---------|
| Electron + Node.js | **Tauri v2 + Rust** | ✅ Better security, smaller footprint |
| Browser Extension | **Tauri WebView** | ⚠️ Different approach needed |
| JavaScript backend | **Rust core** | ✅ Better performance, type safety |
| Standard SQLite | **SQLCipher (encrypted)** | ✅ Built-in encryption! |
| Basic encryption | **Production-grade crypto** | ✅ Already implemented! |

## Part 1: What Works Perfectly ✅

### 1.1 Zero Infrastructure Budget
**Status: PERFECT MATCH**

Noteece is built for exactly this:
- ✅ Local-first architecture (no servers needed)
- ✅ SQLCipher encrypted database
- ✅ All data stored locally
- ✅ Existing CalDAV sync pattern for external services
- ✅ Mobile app with offline-first design

### 1.2 Multi-Account Support
**Status: EXCELLENT FIT**

Existing patterns you can follow:
```rust
// Already implemented in caldav.rs:
pub struct CalDavAccount {
    pub id: String,
    pub username: String,
    pub encrypted_password: String, // Uses crypto::encrypt_string()
    pub enabled: bool,
    pub auto_sync: bool,
}
```

Same pattern works for social accounts:
```rust
pub struct SocialAccount {
    pub id: String,
    pub platform: String, // 'twitter', 'instagram', etc.
    pub username: String,
    pub encrypted_credentials: String, // OAuth tokens, session cookies
    pub enabled: bool,
    pub last_sync: Option<i64>,
}
```

### 1.3 Encrypted Credential Storage
**Status: ALREADY BUILT**

You have production-ready encryption:
```rust
// packages/core-rs/src/crypto.rs
pub fn encrypt_string(plaintext: &str, dek: &[u8]) -> Result<String, CryptoError>
pub fn decrypt_string(encrypted: &str, dek: &[u8]) -> Result<String, CryptoError>
// Uses XChaCha20-Poly1305 AEAD encryption
```

### 1.4 Database Schema & Migrations
**Status: PERFECT PATTERN**

Follow existing migration system in `db.rs`:
```rust
pub fn migrate(conn: &mut Connection) -> Result<(), DbError> {
    if current_version < 6 {
        log::info!("[db] Migrating to version 6 - Social Media Suite");
        tx.execute_batch("
            CREATE TABLE social_account (...);
            CREATE TABLE social_post (...);
            CREATE TABLE social_category (...);
        ")?;
    }
}
```

### 1.5 Mobile Feature Parity
**Status: ACHIEVABLE**

Mobile app already has:
- ✅ React Native + Expo
- ✅ SQLite local storage
- ✅ Background sync every 15 minutes
- ✅ Biometric auth
- ✅ Offline-first design

## Part 2: What Needs Major Adaptation ⚠️

### 2.1 Browser Extension Approach
**Your Plan:**
```typescript
apps/desktop/src/social-suite/extension/
├── manifest.json
├── content-scripts/
└── background/
```

**Problem:** Tauri doesn't support Chrome extensions like Electron does.

**Solution:** Use Tauri's WebView with custom injection:
```rust
// In Tauri, use WebView with custom protocol handlers
use tauri::Manager;

#[tauri::command]
fn create_social_webview(
    app_handle: tauri::AppHandle,
    platform: String,
    account_id: String,
) -> Result<(), String> {
    let window = tauri::WindowBuilder::new(
        &app_handle,
        format!("social-{}-{}", platform, account_id),
        tauri::WindowUrl::External("https://twitter.com".parse().unwrap())
    )
    .title(format!("{} - {}", platform, account_id))
    .build()?;

    // Inject JavaScript after page loads
    window.eval(&format!(r#"
        // Extract timeline data
        const posts = document.querySelectorAll('[data-testid="tweet"]');
        // Send to Rust backend
        window.__TAURI__.invoke('social_data_extracted', {{
            platform: '{}',
            data: extractedData
        }});
    "#, platform))?;

    Ok(())
}
```

### 2.2 Multi-WebView Architecture
**Adapted Approach:**

```rust
// packages/core-rs/src/social/mod.rs
pub mod account;
pub mod collector;
pub mod webview_manager;
pub mod platforms;

pub struct WebViewSession {
    pub id: String,
    pub platform: String,
    pub account_id: String,
    pub window_label: String,
    pub cookies: Option<String>,
    pub session_data: Option<String>,
}

pub fn create_isolated_session(
    conn: &Connection,
    platform: &str,
    account_id: &str,
) -> Result<WebViewSession, SocialError> {
    // Create isolated WebView session
    let id = Ulid::new().to_string();

    conn.execute(
        "INSERT INTO social_webview_session (id, platform, account_id, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        [&id, platform, account_id, &Utc::now().timestamp().to_string()],
    )?;

    Ok(WebViewSession {
        id,
        platform: platform.to_string(),
        account_id: account_id.to_string(),
        window_label: format!("social-{}-{}", platform, account_id),
        cookies: None,
        session_data: None,
    })
}
```

### 2.3 Platform Data Extraction

**Your Plan:** Browser extension content scripts
**Adapted:** Tauri JavaScript injection + message passing

```rust
// Tauri command for data extraction
#[tauri::command]
fn social_data_extracted(
    platform: String,
    account_id: String,
    data: serde_json::Value,
    db: State<DbConnection>,
) -> Result<(), String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        // Parse and store social data
        store_social_posts(conn, &platform, &account_id, &data)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Database not available".to_string())
    }
}

// JavaScript injected into WebView
const INJECTION_SCRIPT = r#"
(function() {
    // Platform-specific extractors
    const extractors = {
        twitter: function() {
            const tweets = document.querySelectorAll('[data-testid="tweet"]');
            return Array.from(tweets).map(tweet => ({
                id: tweet.getAttribute('data-tweet-id'),
                author: tweet.querySelector('[data-testid="User-Name"]')?.textContent,
                content: tweet.querySelector('[data-testid="tweetText"]')?.textContent,
                timestamp: tweet.querySelector('time')?.dateTime,
            }));
        },
        instagram: function() {
            const posts = document.querySelectorAll('article');
            return Array.from(posts).map(post => ({
                author: post.querySelector('a[title]')?.title,
                caption: post.querySelector('span[dir="auto"]')?.textContent,
                timestamp: post.querySelector('time')?.dateTime,
            }));
        }
    };

    // Detect platform and extract
    const hostname = window.location.hostname;
    let platform = 'unknown';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        platform = 'twitter';
    } else if (hostname.includes('instagram.com')) {
        platform = 'instagram';
    }

    if (extractors[platform]) {
        const data = extractors[platform]();
        window.__TAURI__.invoke('social_data_extracted', {
            platform: platform,
            accountId: window.__ACCOUNT_ID__, // Injected by Rust
            data: data
        });
    }
})();
"#;
```

## Part 3: Adapted Roadmap for Tauri Architecture

### Phase 1: Core Infrastructure (Weeks 1-3)

#### Week 1: Database Schema & Rust Modules
```rust
// packages/core-rs/src/social.rs
pub mod account;
pub mod collector;
pub mod categories;
pub mod timeline;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialAccount {
    pub id: String,
    pub platform: Platform,
    pub username: String,
    pub display_name: Option<String>,
    pub encrypted_credentials: String,
    pub enabled: bool,
    pub last_sync: Option<i64>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Platform {
    Twitter,
    Instagram,
    Facebook,
    YouTube,
    Reddit,
    LinkedIn,
    TikTok,
    Discord,
    Telegram,
    WhatsApp,
    Spotify,
    // ... more platforms
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SocialPost {
    pub id: String,
    pub account_id: String,
    pub platform: Platform,
    pub author: String,
    pub content: String,
    pub media_urls: Vec<String>,
    pub timestamp: i64,
    pub engagement: Engagement,
    pub categories: Vec<String>,
    pub raw_json: String, // Full JSON for future processing
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Engagement {
    pub likes: Option<i64>,
    pub shares: Option<i64>,
    pub comments: Option<i64>,
    pub views: Option<i64>,
}
```

**Database Schema (Version 6):**
```sql
-- Social Accounts
CREATE TABLE social_account (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    platform TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    encrypted_credentials TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_sync INTEGER,
    sync_frequency_minutes INTEGER NOT NULL DEFAULT 60,
    created_at INTEGER NOT NULL,
    UNIQUE(space_id, platform, username)
);

-- Social Posts/Content
CREATE TABLE social_post (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES social_account(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    platform_post_id TEXT, -- External ID from platform
    author TEXT NOT NULL,
    author_handle TEXT,
    content TEXT,
    content_html TEXT,
    media_urls_json TEXT, -- JSON array
    timestamp INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL,
    -- Engagement metrics
    likes INTEGER,
    shares INTEGER,
    comments INTEGER,
    views INTEGER,
    -- Metadata
    post_type TEXT, -- 'post', 'story', 'reel', 'video', 'tweet', etc.
    reply_to TEXT, -- ID of parent post
    raw_json TEXT NOT NULL, -- Full platform data
    UNIQUE(account_id, platform_post_id)
);

-- Categories (user-defined cross-platform)
CREATE TABLE social_category (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES space(id),
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    filters_json TEXT, -- Auto-categorization rules
    created_at INTEGER NOT NULL,
    UNIQUE(space_id, name)
);

-- Post-Category Mapping
CREATE TABLE social_post_category (
    post_id TEXT REFERENCES social_post(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES social_category(id) ON DELETE CASCADE,
    assigned_at INTEGER NOT NULL,
    assigned_by TEXT, -- 'user', 'auto', 'ai'
    PRIMARY KEY(post_id, category_id)
);

-- Timeline View (for cross-platform unified timeline)
CREATE VIEW social_timeline AS
SELECT
    p.id,
    p.platform,
    p.author,
    p.content,
    p.timestamp,
    p.likes,
    a.username as account_username,
    GROUP_CONCAT(c.name, ',') as categories
FROM social_post p
JOIN social_account a ON p.account_id = a.id
LEFT JOIN social_post_category pc ON p.id = pc.post_id
LEFT JOIN social_category c ON pc.category_id = c.id
WHERE a.enabled = 1
GROUP BY p.id
ORDER BY p.timestamp DESC;

-- Full-text search for social content
CREATE VIRTUAL TABLE social_post_fts USING fts5(
    content,
    author,
    tokenize = 'porter'
);

-- Sync history
CREATE TABLE social_sync_history (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES social_account(id) ON DELETE CASCADE,
    sync_time INTEGER NOT NULL,
    posts_fetched INTEGER NOT NULL DEFAULT 0,
    errors_count INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT
);

-- WebView Sessions (for multi-account management)
CREATE TABLE social_webview_session (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES social_account(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    cookies TEXT, -- Encrypted session cookies
    session_data TEXT, -- Encrypted session storage
    created_at INTEGER NOT NULL,
    last_used INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_social_post_account ON social_post(account_id, timestamp DESC);
CREATE INDEX idx_social_post_platform ON social_post(platform, timestamp DESC);
CREATE INDEX idx_social_post_timestamp ON social_post(timestamp DESC);
CREATE INDEX idx_social_sync_history ON social_sync_history(account_id, sync_time DESC);
```

#### Week 2: Account Management & Authentication
```rust
// packages/core-rs/src/social/account.rs
use rusqlite::{Connection, params};
use ulid::Ulid;
use chrono::Utc;
use crate::crypto::{encrypt_string, decrypt_string};

#[derive(Error, Debug)]
pub enum SocialError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Crypto error: {0}")]
    Crypto(#[from] crate::crypto::CryptoError),
    #[error("Account not found")]
    AccountNotFound,
    #[error("Platform error: {0}")]
    Platform(String),
}

pub fn add_social_account(
    conn: &Connection,
    space_id: &str,
    platform: &str,
    username: &str,
    credentials: &str, // OAuth token, cookies, etc.
    dek: &[u8],
) -> Result<SocialAccount, SocialError> {
    let id = Ulid::new().to_string();
    let now = Utc::now().timestamp();

    // Encrypt credentials (same pattern as CalDAV)
    let encrypted_creds = encrypt_string(credentials, dek)?;

    conn.execute(
        "INSERT INTO social_account (
            id, space_id, platform, username, encrypted_credentials,
            enabled, sync_frequency_minutes, created_at, last_sync
        ) VALUES (?1, ?2, ?3, ?4, ?5, 1, 60, ?6, NULL)",
        params![&id, space_id, platform, username, &encrypted_creds, now],
    )?;

    Ok(SocialAccount {
        id: id.clone(),
        platform: platform.to_string(),
        username: username.to_string(),
        display_name: None,
        encrypted_credentials: encrypted_creds,
        enabled: true,
        last_sync: None,
        created_at: now,
    })
}

pub fn get_social_accounts(
    conn: &Connection,
    space_id: &str,
) -> Result<Vec<SocialAccount>, SocialError> {
    let mut stmt = conn.prepare(
        "SELECT id, platform, username, display_name, encrypted_credentials,
                enabled, last_sync, created_at
         FROM social_account
         WHERE space_id = ?1
         ORDER BY platform, username"
    )?;

    let accounts = stmt.query_map([space_id], |row| {
        Ok(SocialAccount {
            id: row.get(0)?,
            platform: row.get(1)?,
            username: row.get(2)?,
            display_name: row.get(3)?,
            encrypted_credentials: row.get(4)?,
            enabled: row.get::<_, i32>(5)? == 1,
            last_sync: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;

    let mut result = Vec::new();
    for account in accounts {
        result.push(account?);
    }

    Ok(result)
}
```

#### Week 3: Tauri WebView Manager
```rust
// packages/core-rs/src/social/webview_manager.rs

/// Manages isolated WebView sessions for each social account
pub struct WebViewManager {
    sessions: HashMap<String, WebViewSession>,
}

impl WebViewManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    pub fn create_session(
        &mut self,
        account_id: String,
        platform: String,
    ) -> WebViewSession {
        let session = WebViewSession {
            id: Ulid::new().to_string(),
            account_id: account_id.clone(),
            platform: platform.clone(),
            window_label: format!("social-{}-{}", platform, &account_id[..8]),
            created_at: Utc::now().timestamp(),
        };

        self.sessions.insert(session.id.clone(), session.clone());
        session
    }

    pub fn get_session(&self, account_id: &str) -> Option<&WebViewSession> {
        self.sessions.values().find(|s| s.account_id == account_id)
    }
}

// In apps/desktop/src-tauri/src/main.rs
#[tauri::command]
fn open_social_account(
    app_handle: tauri::AppHandle,
    account_id: String,
    platform: String,
    url: String,
    db: State<DbConnection>,
) -> Result<String, String> {
    // Load encrypted cookies/session from database
    let conn = db.conn.lock().unwrap();
    let dek = db.dek.lock().unwrap();

    if let (Some(conn), Some(dek)) = (conn.as_ref(), dek.as_ref()) {
        // Get account credentials
        let account = get_social_account(conn, &account_id)
            .map_err(|e| e.to_string())?;

        // Create new window with isolated session
        let window_label = format!("social-{}-{}", platform, &account_id[..8]);

        let window = tauri::WindowBuilder::new(
            &app_handle,
            window_label.clone(),
            tauri::WindowUrl::External(url.parse().unwrap())
        )
        .title(format!("{} - @{}", platform, account.username))
        .inner_size(1200.0, 800.0)
        .build()
        .map_err(|e| e.to_string())?;

        // Inject data extraction script after page load
        window.once("tauri://created", move |_| {
            // Inject extraction script
            window.eval(&get_platform_injection_script(&platform))
                .expect("Failed to inject script");
        });

        Ok(window_label)
    } else {
        Err("Database not available".to_string())
    }
}

fn get_platform_injection_script(platform: &str) -> String {
    match platform {
        "twitter" => include_str!("../js/extractors/twitter.js").to_string(),
        "instagram" => include_str!("../js/extractors/instagram.js").to_string(),
        "youtube" => include_str!("../js/extractors/youtube.js").to_string(),
        _ => String::new(),
    }
}
```

### Phase 2: Platform Extractors (Weeks 4-7)

**Create JavaScript extractors that work with Tauri:**

```javascript
// apps/desktop/src-tauri/js/extractors/twitter.js
(async function() {
    const POLL_INTERVAL = 5000; // Check every 5 seconds
    let lastExtractedIds = new Set();

    async function extractTweets() {
        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        const extracted = [];

        for (const tweet of tweets) {
            try {
                const tweetId = tweet.querySelector('a[href*="/status/"]')
                    ?.href.match(/status\/(\d+)/)?.[1];

                if (!tweetId || lastExtractedIds.has(tweetId)) continue;

                const data = {
                    id: tweetId,
                    author: tweet.querySelector('[data-testid="User-Name"]')?.textContent?.trim(),
                    handle: tweet.querySelector('[data-testid="User-Name"] a')?.textContent?.trim(),
                    content: tweet.querySelector('[data-testid="tweetText"]')?.textContent,
                    timestamp: new Date(tweet.querySelector('time')?.dateTime).getTime() / 1000,
                    likes: parseStat(tweet, 'like'),
                    retweets: parseStat(tweet, 'retweet'),
                    replies: parseStat(tweet, 'reply'),
                    media: extractMedia(tweet),
                    isRetweet: !!tweet.querySelector('[data-testid="socialContext"]'),
                    isReply: !!tweet.querySelector('[data-testid="inReplyTo"]'),
                };

                extracted.push(data);
                lastExtractedIds.add(tweetId);
            } catch (e) {
                console.error('Failed to extract tweet:', e);
            }
        }

        if (extracted.length > 0) {
            // Send to Rust backend via Tauri
            await window.__TAURI__.invoke('store_social_posts', {
                platform: 'twitter',
                accountId: window.__NOTEECE_ACCOUNT_ID__,
                posts: extracted
            });
        }
    }

    function parseStat(tweet, type) {
        const button = tweet.querySelector(`[data-testid="${type}"]`);
        const text = button?.getAttribute('aria-label') || '';
        const match = text.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    function extractMedia(tweet) {
        const images = tweet.querySelectorAll('img[src*="media"]');
        const videos = tweet.querySelectorAll('video');

        return {
            images: Array.from(images).map(img => img.src),
            videos: Array.from(videos).map(v => v.src),
        };
    }

    // Start polling
    setInterval(extractTweets, POLL_INTERVAL);
    extractTweets(); // Initial extraction
})();
```

```javascript
// apps/desktop/src-tauri/js/extractors/instagram.js
(async function() {
    const POLL_INTERVAL = 5000;
    let lastExtractedIds = new Set();

    async function extractPosts() {
        const posts = document.querySelectorAll('article');
        const extracted = [];

        for (const post of posts) {
            try {
                // Instagram uses React, so we need to be careful
                const link = post.querySelector('a[href*="/p/"]');
                const postId = link?.href.match(/\/p\/([^/]+)/)?.[1];

                if (!postId || lastExtractedIds.has(postId)) continue;

                const data = {
                    id: postId,
                    author: post.querySelector('a[title]')?.title,
                    handle: post.querySelector('a[role="link"]')?.textContent?.trim(),
                    caption: post.querySelector('span[dir="auto"]')?.textContent,
                    timestamp: new Date(post.querySelector('time')?.dateTime).getTime() / 1000,
                    likes: extractLikes(post),
                    media: extractMediaUrls(post),
                    isVideo: !!post.querySelector('video'),
                    isCarousel: !!post.querySelector('[aria-label*="carousel"]'),
                };

                extracted.push(data);
                lastExtractedIds.add(postId);
            } catch (e) {
                console.error('Failed to extract Instagram post:', e);
            }
        }

        if (extracted.length > 0) {
            await window.__TAURI__.invoke('store_social_posts', {
                platform: 'instagram',
                accountId: window.__NOTEECE_ACCOUNT_ID__,
                posts: extracted
            });
        }
    }

    function extractLikes(post) {
        const likeText = post.querySelector('[role="button"] span')?.textContent;
        return likeText ? parseInt(likeText.replace(/,/g, '')) : 0;
    }

    function extractMediaUrls(post) {
        const images = post.querySelectorAll('img[src*="instagram"]');
        return Array.from(images)
            .map(img => img.src)
            .filter(src => !src.includes('profile'));
    }

    setInterval(extractPosts, POLL_INTERVAL);
    extractPosts();
})();
```

**Rust command to store extracted data:**

```rust
#[tauri::command]
fn store_social_posts(
    platform: String,
    account_id: String,
    posts: Vec<serde_json::Value>,
    db: State<DbConnection>,
) -> Result<usize, String> {
    let conn = db.conn.lock().unwrap();
    if let Some(conn) = conn.as_ref() {
        let mut stored = 0;
        let now = Utc::now().timestamp();

        for post_data in posts {
            let post_id = Ulid::new().to_string();
            let platform_post_id = post_data["id"].as_str().unwrap_or("");
            let author = post_data["author"].as_str().unwrap_or("");
            let content = post_data["content"].as_str().unwrap_or("");
            let timestamp = post_data["timestamp"].as_i64().unwrap_or(now);
            let raw_json = serde_json::to_string(&post_data).unwrap();

            // Try to insert, skip if duplicate
            match conn.execute(
                "INSERT OR IGNORE INTO social_post (
                    id, account_id, platform, platform_post_id, author, content,
                    timestamp, fetched_at, raw_json
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    &post_id,
                    &account_id,
                    &platform,
                    platform_post_id,
                    author,
                    content,
                    timestamp,
                    now,
                    &raw_json
                ],
            ) {
                Ok(rows) => stored += rows,
                Err(e) => log::warn!("Failed to store post: {}", e),
            }

            // Also update FTS index
            let _ = conn.execute(
                "INSERT INTO social_post_fts (rowid, content, author) VALUES (?, ?, ?)",
                params![&post_id, content, author],
            );
        }

        // Update last_sync timestamp
        let _ = conn.execute(
            "UPDATE social_account SET last_sync = ?1 WHERE id = ?2",
            params![now, &account_id],
        );

        Ok(stored)
    } else {
        Err("Database not available".to_string())
    }
}
```

### Phase 3: Unified Timeline & Categories (Weeks 8-10)

```rust
// packages/core-rs/src/social/timeline.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelinePost {
    pub id: String,
    pub platform: String,
    pub account_username: String,
    pub author: String,
    pub content: String,
    pub timestamp: i64,
    pub engagement: Engagement,
    pub categories: Vec<String>,
    pub media: Vec<String>,
}

pub fn get_unified_timeline(
    conn: &Connection,
    space_id: &str,
    filters: TimelineFilters,
) -> Result<Vec<TimelinePost>, SocialError> {
    let mut query = String::from(
        "SELECT p.id, p.platform, a.username, p.author, p.content, p.timestamp,
                p.likes, p.shares, p.comments, p.media_urls_json,
                GROUP_CONCAT(c.name, ',') as categories
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         LEFT JOIN social_post_category pc ON p.id = pc.post_id
         LEFT JOIN social_category c ON pc.category_id = c.id
         WHERE a.space_id = ?1 AND a.enabled = 1"
    );

    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(space_id.to_string())];

    // Apply filters
    if let Some(platforms) = filters.platforms {
        query.push_str(" AND p.platform IN (");
        for (i, platform) in platforms.iter().enumerate() {
            if i > 0 { query.push_str(", "); }
            query.push_str("?");
            params.push(Box::new(platform.clone()));
        }
        query.push_str(")");
    }

    if let Some(category_id) = filters.category {
        query.push_str(" AND pc.category_id = ?");
        params.push(Box::new(category_id));
    }

    if let Some(after) = filters.after {
        query.push_str(" AND p.timestamp >= ?");
        params.push(Box::new(after));
    }

    query.push_str(" GROUP BY p.id ORDER BY p.timestamp DESC LIMIT ?");
    params.push(Box::new(filters.limit.unwrap_or(100)));

    let mut stmt = conn.prepare(&query)?;
    let posts = stmt.query_map(
        rusqlite::params_from_iter(params.iter().map(|b| b.as_ref())),
        |row| {
            let media_json: Option<String> = row.get(9)?;
            let media = media_json
                .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
                .unwrap_or_default();

            let categories_str: Option<String> = row.get(10)?;
            let categories = categories_str
                .map(|s| s.split(',').map(String::from).collect())
                .unwrap_or_default();

            Ok(TimelinePost {
                id: row.get(0)?,
                platform: row.get(1)?,
                account_username: row.get(2)?,
                author: row.get(3)?,
                content: row.get(4)?,
                timestamp: row.get(5)?,
                engagement: Engagement {
                    likes: row.get(6)?,
                    shares: row.get(7)?,
                    comments: row.get(8)?,
                    views: None,
                },
                categories,
                media,
            })
        },
    )?;

    let mut result = Vec::new();
    for post in posts {
        result.push(post?);
    }

    Ok(result)
}

#[derive(Debug, Clone, Default)]
pub struct TimelineFilters {
    pub platforms: Option<Vec<String>>,
    pub category: Option<String>,
    pub after: Option<i64>,
    pub before: Option<i64>,
    pub limit: Option<i64>,
}
```

**React component for unified timeline:**

```typescript
// apps/desktop/src/components/SocialTimeline.tsx
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api';
import { Stack, Card, Group, Text, Badge, Image } from '@mantine/core';

interface TimelinePost {
  id: string;
  platform: string;
  account_username: string;
  author: string;
  content: string;
  timestamp: number;
  engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
  categories: string[];
  media: string[];
}

export function SocialTimeline() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['socialTimeline'],
    queryFn: async () => {
      return await invoke<TimelinePost[]>('get_unified_timeline_cmd', {
        spaceId: 'current', // Get from context
        filters: {
          limit: 100,
        },
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) return <div>Loading timeline...</div>;

  return (
    <Stack spacing="md">
      {posts?.map((post) => (
        <Card key={post.id} shadow="sm" padding="lg">
          <Group position="apart" mb="xs">
            <Group>
              <Badge color={getPlatformColor(post.platform)}>
                {post.platform}
              </Badge>
              <Text weight={500}>{post.author}</Text>
              <Text size="sm" color="dimmed">
                @{post.account_username}
              </Text>
            </Group>
            <Text size="sm" color="dimmed">
              {formatTimestamp(post.timestamp)}
            </Text>
          </Group>

          <Text>{post.content}</Text>

          {post.media.length > 0 && (
            <Group mt="md" spacing="xs">
              {post.media.map((url, i) => (
                <Image
                  key={i}
                  src={url}
                  alt="Media"
                  height={200}
                  width="auto"
                  radius="md"
                />
              ))}
            </Group>
          )}

          <Group mt="md" spacing="xs">
            {post.categories.map((cat) => (
              <Badge key={cat} variant="outline">
                {cat}
              </Badge>
            ))}
          </Group>

          <Group mt="md" spacing="xl">
            {post.engagement.likes && (
              <Text size="sm">👍 {post.engagement.likes}</Text>
            )}
            {post.engagement.shares && (
              <Text size="sm">🔄 {post.engagement.shares}</Text>
            )}
            {post.engagement.comments && (
              <Text size="sm">💬 {post.engagement.comments}</Text>
            )}
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

function getPlatformColor(platform: string): string {
  const colors: Record<string, string> = {
    twitter: 'blue',
    instagram: 'pink',
    youtube: 'red',
    facebook: 'blue',
    linkedin: 'indigo',
  };
  return colors[platform.toLowerCase()] || 'gray';
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString();
}
```

## Part 4: Mobile Implementation

### Adapted Mobile Strategy

**Good news:** Your mobile plan mostly works! But leverage existing patterns:

```typescript
// apps/mobile/src/features/social/SocialHub.tsx
import { useQuery } from '@tanstack/react-query';
import { db } from '../../database';
import { ScrollView, RefreshControl } from 'react-native';

export function SocialHub() {
  const { data: timeline, refetch } = useQuery({
    queryKey: ['socialTimeline'],
    queryFn: async () => {
      // Query local SQLite database
      const posts = await db.getAllAsync(`
        SELECT p.*, a.username, a.platform
        FROM social_post p
        JOIN social_account a ON p.account_id = a.id
        WHERE a.enabled = 1
        ORDER BY p.timestamp DESC
        LIMIT 100
      `);
      return posts;
    },
  });

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => refetch()} />
      }
    >
      {timeline?.map(post => (
        <SocialPostCard key={post.id} post={post} />
      ))}
    </ScrollView>
  );
}
```

**Share Target (already supported by Expo):**
```typescript
// apps/mobile/app.json
{
  "expo": {
    "plugins": [
      [
        "expo-sharing",
        {
          "shareIntent": {
            "ios": true,
            "android": true
          }
        }
      ]
    ]
  }
}

// apps/mobile/src/features/social/ShareTarget.tsx
import * as IntentLauncher from 'expo-intent-launcher';

export async function handleSharedContent(intent: any) {
  const { type, extras } = intent;

  if (type === IntentLauncher.ActivityAction.SEND) {
    const text = extras[IntentLauncher.EXTRA_TEXT];
    const platform = detectPlatform(text); // Detect from URL

    // Save to local database
    await db.runAsync(`
      INSERT INTO social_post (id, platform, content, timestamp, fetched_at)
      VALUES (?, ?, ?, ?, ?)
    `, [ulid(), platform, text, Date.now() / 1000, Date.now() / 1000]);
  }
}
```

## Part 5: Mode Architecture

Your Light/Medium/Heavy modes concept is EXCELLENT. Adapt it to Noteece's mode system:

```rust
// packages/core-rs/src/social/modes.rs

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SocialMode {
    Light,    // RSS only, basic features
    Medium,   // WebView scraping, smart categorization
    Heavy,    // Full automation, AI processing
}

impl SocialMode {
    pub fn max_accounts(&self) -> usize {
        match self {
            Self::Light => 5,
            Self::Medium => 20,
            Self::Heavy => usize::MAX,
        }
    }

    pub fn sync_frequency_minutes(&self) -> i64 {
        match self {
            Self::Light => 360,  // 6 hours
            Self::Medium => 60,  // 1 hour
            Self::Heavy => 15,   // 15 minutes
        }
    }

    pub fn features_enabled(&self) -> Vec<&str> {
        match self {
            Self::Light => vec!["rss", "manual_import"],
            Self::Medium => vec!["rss", "manual_import", "webview", "categories", "search"],
            Self::Heavy => vec!["rss", "manual_import", "webview", "categories", "search", "ai", "automation"],
        }
    }
}
```

## Part 6: AI & Categorization

For zero-budget AI, use WebLLM or ONNX Runtime Web:

```typescript
// apps/desktop/src/services/ai.ts
import { WebLLM } from '@mlc-ai/web-llm';

class LocalAI {
  private engine: WebLLM.MLCEngine;

  async initialize() {
    // Load small quantized model (~50MB for Medium mode)
    this.engine = await WebLLM.CreateMLCEngine('Phi-3-mini-4k-instruct-q4f16_1');
  }

  async categorizePost(post: { content: string; author: string }) {
    const prompt = `Categorize this social media post into one of: Work, Personal, Entertainment, News, Shopping, Health, Finance.

Post: "${post.content}"
Author: ${post.author}

Category:`;

    const response = await this.engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10,
    });

    return response.choices[0].message.content.trim();
  }
}
```

## Part 7: Alternative Implementations

Your alternatives are great! Here's how they map to Tauri:

### Alternative 1: RSS Aggregator (Light Mode)
**Perfect for Tauri** - use existing HTTP client:

```rust
// packages/core-rs/src/social/rss.rs
use reqwest::blocking::Client;
use rss::Channel;

pub fn fetch_rss_feed(url: &str) -> Result<Vec<RssPost>, SocialError> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let response = client.get(url).send()?.bytes()?;
    let channel = Channel::read_from(&response[..])?;

    let posts: Vec<RssPost> = channel.items()
        .iter()
        .map(|item| RssPost {
            title: item.title().unwrap_or("").to_string(),
            content: item.description().unwrap_or("").to_string(),
            url: item.link().unwrap_or("").to_string(),
            pub_date: item.pub_date().unwrap_or("").to_string(),
        })
        .collect();

    Ok(posts)
}
```

### Alternative 2: Email Digest Pipeline
**Works with Tauri:**

```rust
// Use imap crate for IMAP access
use imap::Session;

pub fn fetch_notification_emails(
    server: &str,
    username: &str,
    password: &str,
) -> Result<Vec<NotificationEmail>, SocialError> {
    let tls = native_tls::TlsConnector::new()?;
    let client = imap::connect((server, 993), server, &tls)?;
    let mut session = client.login(username, password)
        .map_err(|e| e.0)?;

    session.select("INBOX")?;

    // Search for social media notifications
    let messages = session.search("FROM twitter.com OR FROM instagram.com")?;

    // Parse emails and extract structured data
    let mut notifications = Vec::new();
    for msg_id in messages {
        let msg = session.fetch(msg_id.to_string(), "BODY[]")?;
        // Parse email body
        notifications.push(parse_notification_email(msg)?);
    }

    session.logout()?;
    Ok(notifications)
}
```

## Part 8: Implementation Priority

**Recommended 16-Week Roadmap:**

```
Weeks 1-3:   Database schema, Rust modules, account management
Weeks 4-5:   WebView manager, basic extraction (Twitter, YouTube)
Weeks 6-7:   More platforms (Instagram, Reddit, LinkedIn)
Weeks 8-9:   Unified timeline UI, category system
Weeks 10-11: Mobile app integration, share targets
Weeks 12-13: Local AI categorization, search
Weeks 14-15: Advanced features (focus modes, analytics)
Week 16:     Testing, documentation, polish
```

## Part 9: Security Considerations

Your plan is good, but leverage Noteece's existing security:

✅ **Already Implemented:**
- XChaCha20-Poly1305 encryption for credentials
- SQLCipher encrypted database
- PBKDF2 key derivation (256k iterations)
- SecureDek wrapper with auto-zeroing

⚠️ **Additional Considerations:**
- Sanitize all scraped content (XSS prevention)
- Validate URLs before opening WebViews
- Rate-limit API calls to avoid platform bans
- Clear cookies/session data on account removal
- Implement HTTPS-only for WebView URLs

## Part 10: Final Recommendations

### ✅ DO THIS
1. **Start with RSS/API aggregation (Light Mode)**
   - Lowest friction, works immediately
   - Many platforms have RSS feeds (YouTube, Reddit, Medium)
   - Use Nitter for Twitter RSS
   - Use Invidious for YouTube RSS

2. **Build database schema first (Week 1)**
   - Follow existing migration pattern
   - Design for extensibility

3. **Implement one platform end-to-end (Week 2-3)**
   - Choose Twitter/X (easiest to scrape)
   - Prove the WebView→extraction→storage→timeline flow

4. **Focus on categories before AI (Weeks 8-9)**
   - Manual categorization first
   - Rule-based auto-categorization
   - AI can come later

5. **Mobile share targets immediately (Week 10)**
   - Expo already supports this
   - Easy quick win

### ⚠️ DON'T DO THIS (YET)
1. **Don't start with browser extension**
   - Won't work with Tauri
   - Use WebView injection instead

2. **Don't do all platforms at once**
   - Start with 3-5 platforms
   - Add more based on user feedback

3. **Don't build heavy AI features first**
   - Start with Light mode (RSS only)
   - Graduate to Medium mode
   - Heavy mode is v2.0

4. **Don't ignore rate limits**
   - Platforms will ban you
   - Implement exponential backoff
   - Respect robots.txt

## Conclusion

Your plan is **ambitious and well-thought-out**, but needs adaptation for Tauri's architecture. The good news: Tauri is actually BETTER for this use case than Electron due to:

- ✅ Smaller footprint (important for always-on monitoring)
- ✅ Better security (Rust backend, process isolation)
- ✅ Production-ready encryption (already implemented)
- ✅ Mobile parity (React Native with same patterns)

**Next Steps:**
1. Review this analysis
2. Decide on Light/Medium/Heavy priority
3. Start with Week 1 tasks (database schema)
4. Implement one platform end-to-end as proof of concept
5. Iterate based on real usage

Would you like me to start implementing the Week 1 database schema and Rust modules?
