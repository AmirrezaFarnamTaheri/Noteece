# Social Media Suite - 16-Week Implementation Roadmap

## 🎯 Current Status

**Current Phase:** Phase 1 - Foundation
**Current Week:** Week 3 Complete ✅ - Ready for Week 4
**Overall Progress:** 18.75% (3/16 weeks complete)
**Last Updated:** 2025-01-07

### Recent Milestones ✅
- ✅ Week 3 Complete (2025-01-07): WebView manager and data extraction pipeline implemented
- ✅ Week 2 Complete (2025-01-07): Full account management UI implemented
- ✅ Week 1 Complete (2025-01-07): Database schema and core Rust modules implemented
- ✅ JavaScript extraction framework (universal.js + twitter.js)
- ✅ 4 WebView management commands with encrypted session persistence
- ✅ "Open in WebView" UI integration with AccountCard

### Next Milestones 🎯
- ⏳ Week 4 Starting: Background sync scheduler and additional extractors
- ⏳ Week 5 Upcoming: Visual platform extractors (Instagram, TikTok)
- ⏳ Week 6 Upcoming: Professional & messaging platforms

---

## Overview

A local-first social media aggregation suite that enables multi-account management across platforms with zero infrastructure costs. Built on Noteece's Tauri + Rust + React Native architecture.

## Core Principles

1. **Zero Infrastructure Budget**: Everything runs locally
2. **Privacy-First**: Encrypted storage, user owns their data
3. **Platform Agnostic**: Support 15+ platforms
4. **Cross-Platform Categories**: Unified organization across all social accounts
5. **Scalable Modes**: Light → Medium → Heavy based on user needs

## Phase 1: Foundation (Weeks 1-3)

### Week 1: Database Schema & Core Types ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Database migration v6 with social tables
- [x] Rust types for social accounts, posts, categories
- [x] SQLCipher encrypted credential storage
- [x] Full-text search tables

**Files Created:**
```
packages/core-rs/src/
├── social.rs (mod declaration)
├── social/
│   ├── mod.rs
│   ├── account.rs
│   ├── post.rs
│   ├── category.rs
│   └── timeline.rs
```

**Database Tables:**
- `social_account` - Multi-account storage with encrypted credentials
- `social_post` - Unified post storage across platforms
- `social_category` - User-defined cross-platform categories
- `social_post_category` - Many-to-many mapping
- `social_post_fts` - Full-text search
- `social_sync_history` - Sync tracking
- `social_webview_session` - Session management

### Week 2: Account Management & Authentication ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Add/edit/delete social accounts (Rust functions complete)
- [x] Credential encryption using existing crypto (implemented)
- [x] Account enable/disable toggle (implemented)
- [x] Multi-account per platform support (implemented)
- [x] Tauri commands for account CRUD (10 commands implemented)
- [x] React components for UI (4 components created)
- [x] End-to-end account creation flow (fully functional)

**Rust Functions:**
```rust
- add_social_account(conn, space_id, platform, username, credentials, dek)
- get_social_accounts(conn, space_id)
- get_social_account(conn, account_id)
- update_social_account(conn, account_id, enabled, sync_frequency)
- delete_social_account(conn, account_id)
- get_decrypted_credentials(conn, account_id, dek)
```

**React Components:**
```typescript
- SocialAccountList.tsx
- AddAccountModal.tsx
- AccountCard.tsx
```

### Week 3: Tauri WebView Manager ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] WebView session manager in Rust with encrypted persistence
- [x] Open isolated WebView per account
- [x] Cookie/session persistence with XChaCha20-Poly1305 encryption
- [x] JavaScript injection framework (universal.js)
- [x] Basic data extraction pipeline with Tauri invoke
- [x] Twitter extractor with full functionality
- [x] UI integration with "Open in WebView" button

**Files Created:**
```
packages/core-rs/src/social/webview.rs
apps/desktop/src-tauri/js/extractors/
├── universal.js (common extraction utilities)
└── twitter.js (Twitter-specific extractor)
```

**Tauri Commands:**
```rust
- open_social_webview(app_handle, account_id) -> window_label
- handle_extracted_data(account_id, platform, event_type, data)
- save_webview_cookies(session_id, cookies_json)
- get_webview_session_cmd(account_id) -> WebViewSession
```

**React Updates:**
```typescript
AccountCard.tsx: Added "Open in WebView" button with mutation
```

**Architecture:**
- WebView windows created with isolated context per account
- JavaScript injection via include_str! and window.eval()
- Automatic content detection with MutationObserver
- Real-time data extraction sent to Rust backend
- Encrypted session persistence for seamless re-login

## Phase 2: Platform Extractors (Weeks 4-7)

### Week 4: Priority Platforms (Twitter, YouTube)

**Deliverables:**
- [ ] Twitter/X extractor with timeline, tweets, engagement
- [ ] YouTube extractor with subscriptions, watch history
- [ ] Generic RSS feed parser
- [ ] Rate limiting and error handling

**Extractors:**
```javascript
js/extractors/
├── twitter.js
├── youtube.js
└── rss.js
```

### Week 5: Visual Platforms (Instagram, TikTok, Pinterest)

**Deliverables:**
- [ ] Instagram posts, stories, reels extractor
- [ ] TikTok For You and Following feed
- [ ] Pinterest boards and pins
- [ ] Media URL extraction and caching

### Week 6: Professional & Messaging (LinkedIn, Discord, Slack)

**Deliverables:**
- [ ] LinkedIn feed and connections
- [ ] Discord servers and channels (web client)
- [ ] Slack workspace messages (with OAuth)
- [ ] WhatsApp Web extractor

### Week 7: Audio & Content (Spotify, Reddit, HackerNews)

**Deliverables:**
- [ ] Spotify playlists and recently played
- [ ] Reddit multi-subreddit aggregation
- [ ] HackerNews top stories
- [ ] SoundCloud tracks and playlists

## Phase 3: Unified Experience (Weeks 8-10)

### Week 8: Unified Timeline

**Deliverables:**
- [ ] Cross-platform timeline query
- [ ] Timeline filters (platform, date, category)
- [ ] Engagement metrics aggregation
- [ ] Infinite scroll with pagination
- [ ] Timeline refresh and real-time updates

**React Components:**
```typescript
- SocialTimeline.tsx
- TimelinePost.tsx
- TimelineFilters.tsx
- PlatformSelector.tsx
```

### Week 9: Category System

**Deliverables:**
- [ ] Create/edit/delete categories
- [ ] Manual post categorization
- [ ] Rule-based auto-categorization
- [ ] Category-based filtering
- [ ] Category analytics

**Features:**
- Tag posts as Work, Personal, Entertainment, News, etc.
- Cross-platform: "Work" includes LinkedIn posts + Slack messages + Work Twitter
- Color coding and icons
- Smart rules: "Posts from @work_account → Work category"

### Week 10: Search & Discovery

**Deliverables:**
- [ ] Full-text search across all posts
- [ ] Search by author, platform, date range
- [ ] Saved searches
- [ ] Search suggestions
- [ ] Recent searches

**Rust Functions:**
```rust
- search_social_posts(conn, query, filters)
- create_saved_search(conn, name, query, filters)
- execute_saved_search(conn, search_id)
```

## Phase 4: Mobile Integration (Weeks 11-12)

### Week 11: Mobile Foundation

**Deliverables:**
- [ ] Mobile database sync with desktop
- [ ] Social timeline on mobile
- [ ] Account management on mobile
- [ ] Category selection on mobile
- [ ] Pull-to-refresh

**React Native Components:**
```typescript
apps/mobile/src/features/social/
├── SocialHub.tsx
├── SocialPostCard.tsx
├── AccountsList.tsx
└── CategoryPicker.tsx
```

### Week 12: Mobile-Specific Features

**Deliverables:**
- [ ] Share target integration (iOS/Android)
- [ ] Quick capture from mobile apps
- [ ] Background sync (every 30 min)
- [ ] Notification parsing (Android)
- [ ] Widgets (timeline preview)

**Share Sheet:**
- Share from Twitter → Noteece (saved automatically)
- Share from Instagram → categorized and stored
- Share URLs → platform detected, content extracted

## Phase 5: Intelligence & Automation (Weeks 13-14)

### Week 13: Local AI Categorization

**Deliverables:**
- [ ] WebLLM integration (Phi-3-mini)
- [ ] Automatic post categorization
- [ ] Sentiment analysis
- [ ] Content summarization
- [ ] Topic extraction

**Light Mode:** Rule-based only
**Medium Mode:** Local ML with 50MB model
**Heavy Mode:** Full LLM with 4GB model

### Week 14: Focus Modes & Automation

**Deliverables:**
- [ ] Focus mode presets (Deep Work, Social Time, Learning)
- [ ] Platform blocklists per focus mode
- [ ] Time limits per platform
- [ ] Scheduled sync windows
- [ ] Automation rules

**Focus Modes:**
- **Deep Work**: Block all social, allow work platforms (LinkedIn, Slack)
- **Social Time**: 15min Instagram, 10min Twitter, 30min YouTube
- **Learning**: YouTube educational, Reddit programming, HackerNews
- **Detox**: All platforms disabled

## Phase 6: Advanced Features (Weeks 15-16)

### Week 15: Analytics Dashboard

**Deliverables:**
- [ ] Screen time by platform
- [ ] Engagement given vs. received
- [ ] Content consumption trends
- [ ] Platform comparison
- [ ] Weekly/monthly reports

**Charts:**
- Daily screen time heatmap
- Platform usage pie chart
- Engagement over time line graph
- Category distribution
- Most active hours

### Week 16: Polish & Documentation

**Deliverables:**
- [ ] User documentation
- [ ] Video tutorials
- [ ] Migration guide
- [ ] Platform-specific setup guides
- [ ] Troubleshooting guide
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing

## Mode Architecture

### Light Mode (RSS Only)
- **Platforms**: 5 max
- **Collection**: RSS feeds only (Nitter, Invidious, Reddit RSS)
- **Storage**: Last 7 days
- **Sync**: Every 6 hours
- **Features**: Basic timeline, manual categories
- **Resources**: 100MB RAM, 500MB storage
- **Best For**: Casual users, low-power devices

### Medium Mode (WebView Scraping)
- **Platforms**: 20 max
- **Collection**: WebView extraction + RSS
- **Storage**: Last 30 days
- **Sync**: Every 1 hour
- **Features**: Timeline, categories, search, basic ML
- **Resources**: 500MB RAM, 5GB storage
- **Best For**: Power users, daily usage

### Heavy Mode (Full Automation)
- **Platforms**: Unlimited
- **Collection**: All methods (WebView, API, RSS, email parsing)
- **Storage**: Unlimited with archival
- **Sync**: Real-time
- **Features**: All features + AI + automation
- **Resources**: 2GB RAM, unlimited storage
- **Best For**: Social media managers, researchers

## Success Metrics

**Week 4 Milestone:**
- ✅ 2 platforms working (Twitter + YouTube)
- ✅ 100+ posts extracted
- ✅ Basic timeline rendering

**Week 8 Milestone:**
- ✅ 5+ platforms working
- ✅ Categories functional
- ✅ Search working

**Week 12 Milestone:**
- ✅ Mobile app functional
- ✅ Desktop-mobile sync working
- ✅ 10+ platforms supported

**Week 16 Final:**
- ✅ 15+ platforms
- ✅ All three modes implemented
- ✅ Local AI working
- ✅ Analytics dashboard
- ✅ Production-ready

## Risk Mitigation

### Technical Risks
1. **Platform Changes**: Scrapers break when platforms update
   - *Mitigation*: Modular extractor design, easy to update
   - *Fallback*: RSS feeds always available

2. **Rate Limiting**: Platforms detect and ban
   - *Mitigation*: Exponential backoff, reasonable sync intervals
   - *Mitigation*: User-initiated sync only

3. **Browser Detection**: Platforms block automated WebViews
   - *Mitigation*: Use real browser user agents
   - *Mitigation*: Cookie/session persistence
   - *Mitigation*: Manual login flow

### Legal Risks
1. **Terms of Service**: Scraping may violate ToS
   - *Mitigation*: Users explicitly authorize access to their own accounts
   - *Mitigation*: Only scrape public data user has access to
   - *Mitigation*: Respect robots.txt

2. **API Terms**: Using unofficial methods
   - *Mitigation*: Use official APIs where available
   - *Mitigation*: Clear disclaimers in documentation

## Dependencies

### Rust Crates
```toml
[dependencies]
# Already in project:
rusqlite = "0.31"
reqwest = { version = "0.12", features = ["blocking", "json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
chrono = "0.4"
ulid = "1.0"

# New additions:
rss = "2.0"              # RSS feed parsing
scraper = "0.19"         # HTML parsing
html5ever = "0.27"       # HTML5 parsing
select = "0.6"           # CSS selector
regex = "1.10"           # Pattern matching
```

### JavaScript Libraries
```json
{
  "@mlc-ai/web-llm": "^0.2.0",        // Local AI
  "onnxruntime-web": "^1.17.0",       // ML inference
  "@tauri-apps/api": "^2.0.0",        // Tauri bindings
  "react-query": "^5.0.0",            // Data fetching
  "mantine": "^7.0.0"                 // UI components (already used)
}
```

## File Structure

```
noteece/
├── packages/core-rs/src/
│   ├── social.rs                    # Module declaration
│   └── social/
│       ├── mod.rs                   # Re-exports
│       ├── account.rs               # Account CRUD
│       ├── post.rs                  # Post storage
│       ├── category.rs              # Categories
│       ├── timeline.rs              # Timeline queries
│       ├── sync.rs                  # Sync logic
│       ├── platforms/               # Platform-specific
│       │   ├── mod.rs
│       │   ├── twitter.rs
│       │   ├── instagram.rs
│       │   └── youtube.rs
│       └── extractors/              # Data extraction
│           ├── mod.rs
│           ├── webview.rs
│           └── rss.rs
├── apps/desktop/src/
│   ├── components/social/
│   │   ├── SocialHub.tsx            # Main hub
│   │   ├── SocialTimeline.tsx       # Timeline view
│   │   ├── AccountManager.tsx       # Account management
│   │   ├── CategoryManager.tsx      # Categories
│   │   └── SocialAnalytics.tsx      # Analytics
│   └── services/
│       ├── socialApi.ts             # Tauri API wrapper
│       └── localAI.ts               # WebLLM integration
├── apps/desktop/src-tauri/
│   ├── js/extractors/               # Injection scripts
│   │   ├── twitter.js
│   │   ├── instagram.js
│   │   ├── youtube.js
│   │   └── universal.js
│   └── src/
│       └── social_commands.rs       # Tauri commands
└── apps/mobile/src/features/social/
    ├── SocialHub.tsx
    ├── SocialTimeline.tsx
    ├── AccountsList.tsx
    ├── ShareTarget.tsx
    └── SocialWidget.tsx
```

## Next Steps

After reviewing this roadmap:

1. **Approve Phase 1 scope** - Start with database schema
2. **Choose initial platforms** - Which 2-3 platforms to prioritize?
3. **Select starting mode** - Light, Medium, or Heavy first?
4. **Confirm timeline** - 16 weeks realistic or adjust?

Ready to start implementing Week 1 deliverables?
