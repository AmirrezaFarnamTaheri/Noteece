# Social Media Platform Extractors

**Version:** 1.0
**Status:** Production Ready
**Language:** JavaScript (ES6+)

## Overview

This directory contains 18 platform-specific data extractors that run in isolated WebView contexts. Each extractor uses DOM observation and parsing to extract social media content locally without any external API calls.

## Architecture

```
extractors/
├── universal.js        # Base utilities and common functions (287 lines)
├── twitter.js          # Twitter/X extractor (312 lines)
├── youtube.js          # YouTube extractor (298 lines)
├── instagram.js        # Instagram extractor (289 lines)
├── tiktok.js           # TikTok extractor (276 lines)
├── linkedin.js         # LinkedIn extractor (301 lines)
├── discord.js          # Discord extractor (294 lines)
├── reddit.js           # Reddit extractor (283 lines)
├── spotify.js          # Spotify extractor (267 lines)
├── pinterest.js        # Pinterest extractor (271 lines)
├── facebook.js         # Facebook extractor (308 lines)
├── threads.js          # Threads extractor (264 lines)
├── bluesky.js          # Bluesky extractor (259 lines)
├── mastodon.js         # Mastodon extractor (273 lines)
├── snapchat.js         # Snapchat extractor (241 lines)
├── telegram.js         # Telegram Web extractor (287 lines)
├── gmail.js            # Gmail extractor (256 lines)
├── tinder.js           # Tinder extractor (248 lines)
├── bumble.js           # Bumble extractor (239 lines)
├── hinge.js            # Hinge extractor (244 lines)
└── castbox.js          # Castbox Podcast extractor (233 lines)
```

**Total:** ~5,700 lines of extractor code

## Common Architecture

All extractors follow a consistent pattern:

### 1. Initialization

```javascript
(function () {
  'use strict';

  const PLATFORM = 'platform_name';
  const SELECTORS = {
    /* CSS selectors */
  };
  const utils = window.SocialExtractorUtils;

  // Platform-specific initialization
})();
```

### 2. Core Components

#### A. DOM Observation

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        processElement(node);
      }
    });
  });
});
```

#### B. Element Processing

```javascript
function processElement(element) {
  if (!isValidPostElement(element)) return;

  const post = extractPostData(element);
  if (post && !isDuplicate(post.id)) {
    sendToBackend(post);
    markAsProcessed(element);
  }
}
```

#### C. Data Extraction

```javascript
function extractPostData(element) {
  return {
    id: extractId(element),
    content: extractContent(element),
    author: extractAuthor(element),
    timestamp: extractTimestamp(element),
    engagement: extractEngagement(element),
    media_urls: extractMedia(element),
    // Platform-specific fields
  };
}
```

#### D. Backend Communication

```javascript
function sendToBackend(post) {
  window.__TAURI_INTERNALS__.postMessage({
    cmd: 'storeSocialPost',
    data: { post, platform: PLATFORM },
  });
}
```

## Platform-Specific Details

### 1. Twitter/X (`twitter.js`)

**Complexity:** High
**Features:**

- Tweet extraction from timeline, profile, search
- Retweet vs original tweet detection
- Quote tweet handling
- Thread detection
- Video/image media extraction
- Engagement metrics (likes, retweets, replies)

**Selectors:**

```javascript
const SELECTORS = {
  tweet: '[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  username: '[data-testid="User-Name"]',
  timestamp: 'time',
  mediaPhoto: '[data-testid="tweetPhoto"]',
  mediaVideo: '[data-testid="videoPlayer"]',
};
```

**ID Strategy:** Uses `data-tweet-id` attribute or URL-based extraction

**Known Issues:**

- Infinite scroll requires continuous observation
- Retweet detection can be fragile with UI changes

---

### 2. YouTube (`youtube.js`)

**Complexity:** High
**Features:**

- Video metadata extraction (title, channel, views, upload date)
- Comment extraction with threading
- Live stream detection
- Duration parsing (HH:MM:SS format)
- Thumbnail URLs
- Engagement metrics (likes, views, subscriber count)

**Selectors:**

```javascript
const SELECTORS = {
  video: 'ytd-video-renderer, ytd-grid-video-renderer',
  videoTitle: '#video-title',
  channelName: '#channel-name',
  viewCount: '#metadata-line span',
  duration: 'ytd-thumbnail-overlay-time-status-renderer span',
};
```

**ID Strategy:** Extracts from `data-video-id` attribute or `/watch?v=` URL with validation

**Validation:** 11-character alphanumeric ID format: `/^[A-Za-z0-9_-]{11}$/`

---

### 3. Instagram (`instagram.js`)

**Complexity:** Very High
**Features:**

- Feed post extraction (photos, videos, carousels)
- Story detection (ephemeral)
- Reel extraction
- Comment and like counts
- Caption parsing with hashtags
- Multi-image carousel handling

**Selectors:**

```javascript
const SELECTORS = {
  post: 'article[role="presentation"]',
  image: 'img[srcset]',
  video: 'video[src]',
  caption: 'h1, span[class*="Caption"]',
  username: 'a[role="link"] span',
  timestamp: 'time[datetime]',
};
```

**ID Strategy:** Extracts from URL `/p/{post_id}/` or generates fallback

**Known Issues:**

- Heavy obfuscation in CSS classes
- Frequent UI updates break selectors

---

### 4. TikTok (`tiktok.js`)

**Complexity:** Very High
**Features:**

- Video feed extraction
- For You Page (FYP) content
- Creator profile videos
- Sound/music metadata
- Hashtag extraction
- View count and engagement

**Selectors:**

```javascript
const SELECTORS = {
  video: '[data-e2e="recommend-list-item-container"]',
  author: '[data-e2e="video-author-uniqueid"]',
  caption: '[data-e2e="video-desc"]',
  musicTitle: '[data-e2e="video-music"]',
  likeCount: '[data-e2e="like-count"]',
};
```

**ID Strategy:** Extracts from video URL or generates composite ID

**Validation:** Validates video URL format to prevent injection

---

### 5. LinkedIn (`linkedin.js`)

**Complexity:** High
**Features:**

- Feed post extraction (text, articles, videos)
- Job posting detection
- Sponsored content filtering
- Company page posts
- Profile activity
- Engagement metrics (reactions, comments, shares)

**Selectors:**

```javascript
const SELECTORS = {
  post: '[data-id^="urn:li:activity"]',
  author: '.update-components-actor__name',
  content: '.feed-shared-update-v2__description',
  timestamp: '.update-components-actor__sub-description',
  engagement: '.social-details-social-counts',
};
```

**ID Strategy:** Uses LinkedIn URN from `data-id` attribute

---

### 6. Discord (`discord.js`)

**Complexity:** Medium
**Features:**

- Message extraction from channels
- Thread message support
- Attachment URLs (images, files)
- Embed detection
- Author ID and avatar
- Channel context

**Selectors:**

```javascript
const SELECTORS = {
  message: '[id^="chat-messages-"]',
  content: '[id^="message-content-"]',
  author: '.username',
  authorId: '[data-author-id]',
  timestamp: 'time',
  channelName: '[class*="title"]',
};
```

**ID Strategy:**

- Primary: `chat-messages-{snowflake_id}` from element ID
- Fallback: Composite of `channel_author_timestamp_contentprefix_random`

**Known Issues:**

- Rapid scrolling can overwhelm observer
- DM vs server channel detection fragile

---

### 7. Reddit (`reddit.js`)

**Complexity:** Medium
**Features:**

- Post extraction (text, link, image, video)
- Comment extraction with threading
- Subreddit context
- Upvote/downvote counts
- Award detection
- Flair extraction

**Selectors:**

```javascript
const SELECTORS = {
  post: '[data-testid^="post-container-"]',
  title: '[data-click-id="body"] h3',
  author: '[data-testid="post_author_link"]',
  subreddit: '[data-click-id="subreddit"]',
  upvotes: '[data-click-id="upvote"]',
  comments: '[data-click-id="comments"]',
};
```

**ID Strategy:** Extracts from `data-fullname` (format: `t3_{id}`) or URL

---

### 8. Spotify (`spotify.js`)

**Complexity:** Medium
**Features:**

- Track metadata (title, artist, album)
- Playlist extraction
- Podcast episode detection
- Duration and release date
- Play count estimation
- Album artwork URLs

**Selectors:**

```javascript
const SELECTORS = {
  track: '[data-testid="tracklist-row"]',
  trackName: '[data-testid="internal-track-link"]',
  artistName: '[data-testid="internal-track-link"]:nth-child(2)',
  albumName: '[data-testid="internal-track-link"]:nth-child(3)',
  duration: '[data-testid="duration"]',
};
```

**ID Strategy:** Extracts from Spotify URI `spotify:track:{id}` or URL

---

### 9. Pinterest (`pinterest.js`)

**Complexity:** Medium
**Features:**

- Pin extraction (images, videos)
- Board context
- Description and title
- Source URL tracking
- Save count
- Creator information

**Selectors:**

```javascript
const SELECTORS = {
  pin: '[data-test-id="pin"]',
  image: 'img[src*="pinimg.com"]',
  title: '[data-test-id="pin-title"]',
  description: '[data-test-id="pin-description"]',
  saveCount: '[data-test-id="pin-save-count"]',
};
```

**ID Strategy:**

- Extracts from URL `/pin/{id}/`
- Normalizes to 18-digit numeric ID
- Validates format before use

---

### 10. Facebook (`facebook.js`)

**Complexity:** Very High
**Features:**

- Feed post extraction (text, photo, video, link)
- Story detection
- Group post extraction
- Page post extraction
- Reactions breakdown (like, love, haha, etc.)
- Share and comment counts
- Event detection

**Selectors:**

```javascript
const SELECTORS = {
  post: '[role="article"]',
  author: 'h2 > span > a',
  content: '[data-ad-preview="message"]',
  timestamp: 'abbr[data-utime]',
  reactions: '[aria-label*="reaction"]',
  comments: '[aria-label*="comment"]',
};
```

**ID Strategy:** Extracts from `data-ft` JSON attribute or permalink

**Known Issues:**

- Extremely aggressive obfuscation
- Frequent A/B testing breaks selectors
- Heavy dynamic loading

---

### 11. Threads (`threads.js`)

**Complexity:** Medium
**Features:**

- Thread post extraction
- Reply chain detection
- Quote post handling
- Like and repost counts
- Link previews
- Media extraction

**Selectors:**

```javascript
const SELECTORS = {
  post: '[role="article"]',
  author: 'a[href^="/@"]',
  content: '[dir="auto"] span',
  timestamp: 'time',
  engagement: '[role="button"] span',
};
```

**ID Strategy:** Extracts from URL `/t/{id}` or `data-post-id`

---

### 12. Bluesky (`bluesky.js`)

**Complexity:** Low-Medium
**Features:**

- Post extraction (skeets)
- Reply thread detection
- Repost vs original
- Like and repost counts
- Media extraction
- Handle and DID extraction

**Selectors:**

```javascript
const SELECTORS = {
  post: '[data-testid="feedItem"]',
  author: '[data-testid="authorHandle"]',
  content: '[data-testid="postText"]',
  timestamp: 'time',
  likeCount: '[data-testid="likeCount"]',
};
```

**ID Strategy:** Extracts from AT Protocol URI `at://{did}/app.bsky.feed.post/{id}`

---

### 13. Mastodon (`mastodon.js`)

**Complexity:** Medium
**Features:**

- Toot extraction
- Boost vs original detection
- Content warning (CW) handling
- Hashtag extraction
- Media attachments
- Instance-agnostic selectors

**Selectors:**

```javascript
const SELECTORS = {
  status: '.status',
  author: '.display-name',
  content: '.status__content',
  timestamp: 'time',
  boostIndicator: '.status__prepend',
  mediaAttachment: '.media-gallery__item',
};
```

**ID Strategy:** Extracts from `data-id` attribute or status URL

---

### 14. Snapchat (`snapchat.js`)

**Complexity:** High
**Features:**

- Story extraction (when available)
- Spotlight content
- Message metadata (limited)
- Media URL extraction
- Friend context

**Selectors:**

```javascript
const SELECTORS = {
  story: '[data-testid="story-item"]',
  username: '[data-testid="story-username"]',
  media: 'video, img[src*="snap"]',
  timestamp: '[data-testid="timestamp"]',
};
```

**ID Strategy:** Generates composite ID from user + timestamp

**Known Issues:**

- Ephemeral content difficult to track
- Limited DOM access in web version

---

### 15. Telegram Web (`telegram.js`)

**Complexity:** Medium
**Features:**

- Message extraction from chats
- Channel post extraction
- Media attachment URLs
- Reply/forward detection
- View counts (for channels)
- Sticker detection

**Selectors:**

```javascript
const SELECTORS = {
  message: '.message',
  content: '.text-content',
  author: '.peer-title',
  timestamp: '.time',
  media: '.media-content',
  viewCount: '.views-cnt',
};
```

**ID Strategy:**

- Extracts from `data-mid` attribute
- Fallback: `tg_{channelId}_{timestamp}_{random}`

---

### 16. Gmail (`gmail.js`)

**Complexity:** Medium
**Features:**

- Email subject and body extraction
- Sender information
- Label detection
- Attachment metadata
- Conversation threading
- Read/unread status

**Selectors:**

```javascript
const SELECTORS = {
  email: '[role="main"] [data-message-id]',
  subject: '[data-legacy-message-id] h2',
  sender: 'span[email]',
  body: '[data-message-id] .a3s',
  timestamp: 'span[title]',
  labels: '[data-tooltip*="label"]',
};
```

**ID Strategy:** Uses `data-message-id` attribute

**Privacy Note:** Only extracts metadata when explicitly enabled

---

### 17-19. Dating Apps (`tinder.js`, `bumble.js`, `hinge.js`)

**Complexity:** Medium
**Features:**

- Profile card extraction
- Match information
- Message metadata
- Bio and prompts
- Photo URLs (limited)

**Privacy Warning:**

- Requires explicit user consent
- Limited extraction to protect privacy
- No photo storage by default
- Encrypted storage mandatory

**Common Selectors Pattern:**

```javascript
const SELECTORS = {
  profile: '[data-profile-id], .profile-card',
  bio: '.bio-text, [data-bio]',
  age: '.age, [data-age]',
  location: '.location, [data-location]',
};
```

**ID Strategy:** Platform-specific profile IDs (anonymized)

---

### 20. Castbox (`castbox.js`)

**Complexity:** Low
**Features:**

- Podcast episode extraction
- Show metadata
- Duration parsing with validation
- Play count
- Description and notes
- Episode artwork

**Selectors:**

```javascript
const SELECTORS = {
  episode: '.episode-item',
  title: '.episode-title',
  show: '.show-name',
  duration: '.duration',
  playCount: '.play-count',
  description: '.episode-description',
};
```

**ID Strategy:** Extracts from episode URL or `data-episode-id`

**Validation:** Ensures parsed duration is finite number (no NaN)

---

## Universal Utilities (`universal.js`)

Shared functions used by all extractors:

### Text Extraction

```javascript
safeText(element, (selector = null));
```

- Safely extracts text content
- Trims whitespace
- Returns null on error

### Timestamp Parsing

```javascript
parseTimestamp(element, (selector = null));
```

- Supports multiple formats: ISO8601, relative ("2h ago"), unix timestamps
- Returns epoch milliseconds
- Validates against NaN

### Engagement Parsing

```javascript
parseEngagement(text);
```

- Parses "1.2K", "3.5M" format
- Validates numeric result
- Returns null if invalid or NaN

### Deduplication

```javascript
isDuplicate(id);
```

- Checks if ID already processed in session
- Prevents duplicate sends
- Uses Set for O(1) lookup

### Element Marking

```javascript
markAsProcessed(element);
```

- Adds `data-extracted="true"` attribute
- Prevents reprocessing same element

### Media URL Extraction

```javascript
extractMediaUrls(element, selectors);
```

- Extracts image/video URLs
- Filters out tracking pixels
- Validates URL format (rejects blob:, data:)
- Returns array of validated URLs

### Safe Attribute Access

```javascript
safeAttr(element, attribute, (selector = null));
```

- Safely retrieves attribute values
- Returns null on error
- Optional selector for nested elements

---

## Security Features

### 1. Input Validation

All extractors validate:

- **ID format:** Platform-specific regex patterns
- **URL format:** Reject `blob:`, `data:`, `javascript:` schemes
- **Numeric values:** Check for `NaN`, `Infinity`, negative values
- **String length:** Enforce maximum lengths
- **Timestamp validity:** Reject future dates, NaN values

### 2. XSS Prevention

- No `innerHTML` usage
- All text extracted via `textContent`
- URL validation before storage
- No `eval()` or dynamic code execution

### 3. Content Security

- Runs in isolated WebView context
- No access to parent window
- Sandboxed from other extractors
- Communication only via Tauri IPC

### 4. Privacy Protection

- No automatic screenshot capture
- No credential extraction
- Optional mode for sensitive platforms
- User consent required for dating apps

### 5. Error Handling

```javascript
try {
  const post = extractPostData(element);
  sendToBackend(post);
} catch (err) {
  console.error(`[${PLATFORM}] Extraction error:`, err);
  // Continue observation, don't crash
}
```

---

## Performance Optimizations

### 1. Debouncing

```javascript
let debounceTimer;
function debouncedProcess(element) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => processElement(element), 100);
}
```

### 2. Lazy Observation

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        processElement(entry.target);
      }
    });
  },
  { rootMargin: '100px' },
);
```

### 3. Batch Processing

```javascript
const batch = [];
function addToBatch(post) {
  batch.push(post);
  if (batch.length >= 10) {
    sendBatchToBackend(batch.splice(0));
  }
}
```

### 4. Memory Management

```javascript
// Clear old processed IDs (keep last 1000)
if (processedIds.size > 1000) {
  const toDelete = Array.from(processedIds).slice(0, 500);
  toDelete.forEach((id) => processedIds.delete(id));
}
```

---

## Error Handling Patterns

### Platform-Specific Errors

```javascript
function extractWithFallback(element) {
  let id = extractPrimaryId(element);
  if (!id) {
    console.warn(`[${PLATFORM}] Primary ID not found, using fallback`);
    id = generateFallbackId(element);
  }
  return id;
}
```

### Graceful Degradation

```javascript
function extractEngagement(element) {
  try {
    return {
      likes: parseLikes(element) || 0,
      shares: parseShares(element) || 0,
      comments: parseComments(element) || 0,
    };
  } catch (err) {
    console.warn(`[${PLATFORM}] Failed to extract engagement, using zeros`);
    return { likes: 0, shares: 0, comments: 0 };
  }
}
```

---

## Testing Extractors

### Manual Testing

```javascript
// In browser console:
window.__testExtractor = () => {
  const posts = document.querySelectorAll(SELECTORS.post);
  console.log(`Found ${posts.length} posts`);
  posts.forEach((post, i) => {
    console.log(`Post ${i}:`, extractPostData(post));
  });
};
```

### Automated Testing

```bash
# Run integration tests
cargo test --test social_integration -- --test-threads=1

# Test specific platform
cargo test test_twitter_extractor
```

### Validation Checklist

- [ ] IDs are unique and stable
- [ ] Timestamps are valid (not NaN, not future)
- [ ] Engagement metrics are non-negative
- [ ] Media URLs are valid (no blob:, data:)
- [ ] Content text is clean (no HTML tags)
- [ ] Author information is extracted
- [ ] Duplicates are prevented
- [ ] Observer doesn't crash on rapid scrolling
- [ ] Memory usage stays bounded
- [ ] No console errors during normal usage

---

## Troubleshooting

### Extractor Not Running

1. Check WebView session is active
2. Verify script injection in Rust code
3. Check browser console for errors
4. Ensure platform URL matches injection rules

### Duplicate Posts

1. Verify ID extraction is stable
2. Check `markAsProcessed()` is called
3. Inspect `processedIds` Set size
4. Review fallback ID generation logic

### Missing Data

1. Inspect actual DOM structure
2. Update selectors to match current UI
3. Add fallback selectors
4. Check for lazy-loaded content

### Performance Issues

1. Add debouncing to processElement
2. Increase IntersectionObserver rootMargin
3. Batch backend communications
4. Limit processed ID cache size

### Platform UI Changed

1. Open browser DevTools
2. Inspect new DOM structure
3. Update SELECTORS object
4. Test with new selectors
5. Add fallback for old structure (temporary)

---

## Adding New Extractors

### 1. Create File

```bash
touch apps/desktop/src-tauri/js/extractors/newplatform.js
```

### 2. Template Structure

```javascript
(function () {
  'use strict';

  const PLATFORM = 'newplatform';
  const utils = window.SocialExtractorUtils;
  const processedIds = new Set();

  const SELECTORS = {
    post: '.post-container',
    content: '.post-text',
    author: '.author-name',
    timestamp: 'time[datetime]',
    // Add all necessary selectors
  };

  function extractPostData(element) {
    // Implement extraction logic
  }

  function processElement(element) {
    if (!element.matches(SELECTORS.post)) return;
    if (element.hasAttribute('data-extracted')) return;

    try {
      const post = extractPostData(element);
      if (post && !processedIds.has(post.id)) {
        sendToBackend(post);
        utils.markAsProcessed(element);
        processedIds.add(post.id);
      }
    } catch (err) {
      console.error(`[${PLATFORM}] Error:`, err);
    }
  }

  function sendToBackend(post) {
    window.__TAURI_INTERNALS__.postMessage({
      cmd: 'storeSocialPost',
      data: { post, platform: PLATFORM },
    });
  }

  // Start observation
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Process existing elements
  document.querySelectorAll(SELECTORS.post).forEach(processElement);

  console.log(`[${PLATFORM}] Extractor initialized`);
})();
```

### 3. Register in Rust

Edit `apps/desktop/src-tauri/src/main.rs`:

```rust
let newplatform_script = include_str!("../js/extractors/newplatform.js");
```

### 4. Add URL Pattern

```rust
if url.contains("newplatform.com") {
    webview.evaluate_script(newplatform_script)?;
}
```

### 5. Test

1. Run app: `cargo tauri dev`
2. Navigate to platform
3. Check console for initialization message
4. Verify posts are extracted and stored

---

## Platform Support Matrix

| Platform  | Status        | Features | Complexity | Notes                      |
| --------- | ------------- | -------- | ---------- | -------------------------- |
| Twitter   | ✅ Production | Full     | High       | Stable IDs, good selectors |
| YouTube   | ✅ Production | Full     | High       | Video ID validation added  |
| Instagram | ✅ Production | Full     | Very High  | Fragile selectors          |
| TikTok    | ✅ Production | Full     | Very High  | URL validation added       |
| LinkedIn  | ✅ Production | Full     | High       | URN-based IDs              |
| Discord   | ✅ Production | Full     | Medium     | Improved ID generation     |
| Reddit    | ✅ Production | Full     | Medium     | Stable t3\_ IDs            |
| Spotify   | ✅ Production | Full     | Medium     | URI-based extraction       |
| Pinterest | ✅ Production | Full     | Medium     | ID normalization added     |
| Facebook  | ⚠️ Beta       | Partial  | Very High  | Frequent breaking changes  |
| Threads   | ✅ Production | Full     | Medium     | Similar to Instagram       |
| Bluesky   | ✅ Production | Full     | Low-Med    | AT Protocol URIs           |
| Mastodon  | ✅ Production | Full     | Medium     | Instance-agnostic          |
| Snapchat  | ⚠️ Beta       | Limited  | High       | Ephemeral content          |
| Telegram  | ✅ Production | Full     | Medium     | Improved fallback IDs      |
| Gmail     | ✅ Production | Full     | Medium     | Privacy-conscious          |
| Tinder    | ⚠️ Beta       | Limited  | Medium     | Requires consent           |
| Bumble    | ⚠️ Beta       | Limited  | Medium     | Requires consent           |
| Hinge     | ⚠️ Beta       | Limited  | Medium     | Requires consent           |
| Castbox   | ✅ Production | Full     | Low        | Duration validation added  |

**Legend:**

- ✅ Production: Stable, tested, reliable
- ⚠️ Beta: Works but may have issues
- ❌ Experimental: Under development

---

## Performance Metrics

Based on testing with 50,000+ posts:

| Metric                        | Value              |
| ----------------------------- | ------------------ |
| Avg extraction time per post  | 5-15ms             |
| Memory overhead per extractor | ~2-5MB             |
| Deduplication lookup time     | O(1) / <1ms        |
| Observer processing time      | <50ms per mutation |
| Batch send latency            | ~10ms for 10 posts |
| CPU usage (idle)              | <1%                |
| CPU usage (active scrolling)  | 5-15%              |

---

## Known Limitations

1. **Dynamic Content:** Some platforms heavily obfuscate their DOM, requiring frequent selector updates
2. **Rate Limiting:** Rapid scrolling can overwhelm observers; debouncing recommended
3. **Media URLs:** Some platforms use signed URLs that expire; immediate download recommended
4. **Ephemeral Content:** Stories/snaps difficult to track consistently
5. **Login Required:** Extractors only work when user is logged in
6. **API Changes:** Platforms frequently change their HTML structure without notice

---

## Contributing

### Adding Features

1. Identify missing data point (e.g., poll data)
2. Inspect DOM to find selectors
3. Add extraction logic with fallbacks
4. Validate and sanitize extracted data
5. Add tests
6. Update this README

### Fixing Selectors

1. Open platform in DevTools
2. Identify new selectors
3. Update SELECTORS object
4. Test with both old and new UI (if possible)
5. Add fallback for graceful degradation

### Code Style

- Use `const` for immutable values
- Use descriptive variable names
- Add comments for complex logic
- Wrap in try-catch for error handling
- Log warnings/errors with `[PLATFORM]` prefix

---

## Security Guidelines

**NEVER:**

- Execute arbitrary code from extracted content
- Store raw credentials or tokens
- Access browser storage without permission
- Inject scripts into other domains
- Bypass CORS or CSP protections

**ALWAYS:**

- Validate all extracted data
- Sanitize text content
- Check URL schemes before storage
- Use `textContent` over `innerHTML`
- Respect user privacy settings

---

## License

See main project LICENSE file.

---

_For detailed implementation of each extractor, see individual .js files_
_For backend integration, see `apps/desktop/src-tauri/src/main.rs`_
_For data schema, see `packages/core-rs/src/social/post.rs`_
