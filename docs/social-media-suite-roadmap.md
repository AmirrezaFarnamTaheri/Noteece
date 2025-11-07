# Social Media Suite - 16-Week Implementation Roadmap

## 🎯 Current Status

**Current Phase:** Phase 4 - Intelligence & Automation
**Current Week:** Week 12 Complete ✅ - Ready for Week 13
**Overall Progress:** 75% (12/16 weeks complete)
**Last Updated:** 2025-01-07

### Recent Milestones ✅
- ✅ Week 12 Complete (2025-01-07): Dating app extractors (Tinder, Bumble, Hinge)
- ✅ Week 11 Complete (2025-01-07): FTS-powered search with debouncing
- ✅ Week 10 Complete (2025-01-07): Analytics dashboard with charts and metrics
- ✅ Week 9 Complete (2025-01-07): Category system with auto-categorization
- ✅ 18 platform extractors: Twitter, YouTube, Instagram, TikTok, Pinterest, LinkedIn, Discord, Reddit, Spotify, Castbox, Tinder, Bumble, Hinge, Threads, Bluesky, Mastodon, Facebook, Snapchat
- ✅ Full analytics with platform breakdown, time series, engagement metrics
- ✅ FTS search across all posts with 300ms debouncing
- ✅ Security hardened with input validation and sanitization

### Next Milestones 🎯
- ⏳ Week 13 Upcoming: Local AI categorization with WebLLM
- ⏳ Week 14 Upcoming: Focus modes & automation rules
- ⏳ Week 15 Upcoming: Mobile integration (React Native)
- ⏳ Week 16 Final: Polish, documentation, security audit

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

### Week 4: Priority Platforms (YouTube) ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Twitter/X extractor with timeline, tweets, engagement (completed Week 3)
- [x] YouTube extractor with subscriptions, watch history, recommendations
- [x] Background sync scheduler in Rust
- [x] Sync status tracking and statistics
- [x] Rate limiting and error handling built into extractors

**Files Created:**
```javascript
apps/desktop/src-tauri/js/extractors/
├── youtube.js (NEW)

packages/core-rs/src/social/
├── sync.rs (NEW - background sync scheduler)
```

**Tauri Commands:**
```rust
- get_sync_tasks_cmd(space_id) -> Vec<SyncTask>
- get_all_sync_tasks_cmd(space_id) -> Vec<SyncTask>
- get_sync_history_cmd(account_id, limit) -> Vec<SyncStatus>
- get_sync_stats_cmd(space_id) -> SyncStats
```

**Architecture:**
- Sync scheduler checks accounts needing sync based on frequency
- Sync history tracking with timestamps and post counts
- Statistics aggregation for monitoring dashboard

### Week 5: Visual Platforms (Instagram, TikTok, Pinterest) ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Instagram posts, stories, reels extractor
- [x] TikTok For You and Following feed extractor
- [x] Pinterest boards and pins extractor
- [x] Media URL extraction and caching
- [x] SyncStatusPanel UI component

**Files Created:**
```javascript
apps/desktop/src-tauri/js/extractors/
├── instagram.js (NEW)
├── tiktok.js (NEW)
├── pinterest.js (NEW)

apps/desktop/src/components/social/
├── SyncStatusPanel.tsx (NEW)
```

**Updated Files:**
```typescript
apps/desktop/src-tauri/src/main.rs:
- Added platform extractors for youtube, instagram, tiktok, pinterest
- Registered 4 sync commands

apps/desktop/src/components/social/SocialHub.tsx:
- Added "Sync Status" tab
- Updated status badge to Phase 2 - Week 5
```

**Features:**
- Instagram: Posts, reels, video posts with engagement metrics
- TikTok: For You feed, Following feed, music/sound info
- Pinterest: Pins, boards, high-quality image URLs
- Sync Status Panel: Real-time progress, daily statistics, pending syncs

### Week 6: Professional & Messaging (LinkedIn, Discord) ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] LinkedIn feed and connections extractor
- [x] Discord servers and channels (web client) extractor

**Files Created:**
```javascript
apps/desktop/src-tauri/js/extractors/
├── linkedin.js (NEW - posts, feed, engagement, articles)
└── discord.js (NEW - messages, channels, reactions, embeds)
```

**Features:**
- LinkedIn: Feed posts, shared articles, engagement metrics, author profiles
- Discord: Messages, embeds, attachments, reactions, channel context

### Week 7: Audio & Content (Spotify, Reddit, Castbox) ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Spotify playlists and recently played tracks
- [x] Reddit multi-subreddit aggregation
- [x] Castbox podcast episodes (NEW - user requested)

**Files Created:**
```javascript
apps/desktop/src-tauri/js/extractors/
├── spotify.js (NEW - tracks, playlists, recently played)
├── reddit.js (NEW - posts, subreddits, scores, comments)
└── castbox.js (NEW - podcast episodes, duration, thumbnails)
```

**Features:**
- Spotify: Track extraction, album covers, playlists, recently played cards
- Reddit: Posts with scores, comments, subreddit context, link posts
- Castbox: Podcast episodes with duration parsing, publish dates, thumbnails

## Phase 3: Unified Experience (Weeks 8-10)

### Week 8: Unified Timeline ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Cross-platform timeline query
- [x] Timeline filters (platform, date, sort order)
- [x] Engagement metrics aggregation
- [x] Infinite scroll with pagination
- [x] Timeline refresh and real-time updates

**Files Created:**
```typescript
apps/desktop/src/components/social/
├── SocialTimeline.tsx (NEW - main timeline with infinite scroll)
├── TimelinePost.tsx (NEW - post card component)
└── TimelineFilters.tsx (NEW - filter controls)
```

**React Components:**
- **SocialTimeline.tsx**: Main timeline container with infinite scroll using IntersectionObserver
- **TimelinePost.tsx**: Individual post card with media, engagement, platform badges
- **TimelineFilters.tsx**: Multi-select platforms, time ranges, sort order, search query

**Updated Files:**
```typescript
apps/desktop/src-tauri/src/main.rs:
- Added 5 new platform extractors (linkedin, discord, reddit, spotify, castbox)

apps/desktop/src/components/social/SocialHub.tsx:
- Integrated SocialTimeline component
- Updated status badge to Phase 3 - Week 8
- Updated platform count to 10
```

**Features:**
- Infinite scroll pagination with 20 posts per page
- Filter by platforms (multi-select)
- Filter by time range (today, week, month, year, all)
- Sort by newest, oldest, most liked, most commented
- Search across post content
- Real-time engagement metrics display
- Media preview (images, videos, thumbnails)
- Platform-specific badges and colors
- Empty states with helpful messages

### Week 9: Category System ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Create/edit/delete categories
- [x] Manual post categorization
- [x] Rule-based auto-categorization
- [x] Category-based filtering
- [x] Category analytics

**Features:**
- Tag posts as Work, Personal, Entertainment, News, etc.
- Cross-platform: "Work" includes LinkedIn posts + Slack messages + Work Twitter
- Color coding and icons
- Smart rules: "Posts from @work_account → Work category"

**Files Created:**
```rust
packages/core-rs/src/social/category.rs - Full category system implementation
```

### Week 10: Analytics Dashboard ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Platform breakdown with stats
- [x] Time series activity tracking
- [x] Category statistics
- [x] Engagement metrics aggregation
- [x] Top performing posts ranking

**Files Created:**
```rust
packages/core-rs/src/social/analytics.rs - Analytics engine
apps/desktop/src/components/social/SocialAnalytics.tsx - Dashboard UI
```

### Week 11: Search & Discovery ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Full-text search across all posts with FTS5
- [x] Search by content and author
- [x] Debounced search input (300ms)
- [x] Result limiting and pagination

**Files Created:**
```typescript
apps/desktop/src/components/social/SocialSearch.tsx - Search UI component
```

**Rust Functions:**
```rust
- search_social_posts(conn, space_id, query, limit) ✅
```

### Week 12: Dating Apps & Integration ✅ COMPLETE

**Status:** ✅ Complete (2025-01-07)

**Deliverables:**
- [x] Tinder match and message extractor
- [x] Bumble connections extractor
- [x] Hinge matches with prompts extractor
- [x] Privacy-first design with explicit consent notices
- [x] Integration into unified timeline

**Files Created:**
```javascript
apps/desktop/src-tauri/js/extractors/
├── tinder.js (NEW - privacy-first match tracking)
├── bumble.js (NEW - connections tracking)
└── hinge.js (NEW - matches with profile prompts)
```

**Features:**
- Explicit privacy notices in all dating extractors
- Only first name display for privacy
- Less frequent polling (60s vs 15-30s)
- Sensitive metadata tagging for extra protection

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
