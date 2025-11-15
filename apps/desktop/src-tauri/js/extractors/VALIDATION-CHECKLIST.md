# Extractor Validation Checklist

**Purpose:** Systematic validation of all 18 social media platform extractors to ensure consistency, security, and reliability.

## Validation Categories

### 1. **Code Structure** ✅

- [ ] IIFE wrapper with 'use strict'
- [ ] Clear JSDoc comments for main functions
- [ ] Consistent naming conventions
- [ ] Modular function structure
- [ ] No global pollution

### 2. **Dependencies** ✅

- [ ] Checks for `window.__NOTEECE__` availability
- [ ] Properly imports utils from universal.js
- [ ] Logs initialization message
- [ ] Handles missing dependencies gracefully

### 3. **ID Extraction & Validation** ⚠️ CRITICAL

- [ ] Has dedicated ID extraction function
- [ ] ID validation function exists (regex/format check)
- [ ] Multiple fallback strategies for ID extraction
- [ ] Returns null on failure (not undefined/empty string)
- [ ] IDs are stable across page reloads
- [ ] No duplicate IDs for different content

**Common Validation Patterns:**

```javascript
// Twitter: Numeric ID (snowflake)
/^\d{15,20}$/

// YouTube: 11-character alphanumeric
/^[A-Za-z0-9_-]{11}$/

// Instagram: Alphanumeric post ID
/^[A-Za-z0-9_-]{11,}$/

// Pinterest: Numeric pin ID
/^\d{18,20}$/
```

### 4. **Data Extraction** ✅

- [ ] Content extraction with null safety
- [ ] Author/username extraction
- [ ] Timestamp extraction and validation
- [ ] Media URL extraction with validation
- [ ] Engagement metrics extraction
- [ ] Handles missing fields gracefully (returns null, not crashes)

### 5. **Input Validation** 🔒 SECURITY

- [ ] Validates all extracted URLs (rejects blob:, data:, javascript:)
- [ ] Validates numeric values (checks for NaN, Infinity)
- [ ] Validates timestamps (no future dates, no NaN)
- [ ] Validates string lengths (prevent OOM)
- [ ] Sanitizes HTML/text content

**Security Validations:**

```javascript
// URL validation
function isValidMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('blob:')) return false;
  if (url.startsWith('data:')) return false;
  if (url.startsWith('javascript:')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

// Timestamp validation
function isValidTimestamp(ts) {
  return Number.isFinite(ts) && ts > 0 && ts <= Date.now() + 86400000; // Allow 1 day future
}

// Engagement validation
function isValidEngagement(num) {
  return num === null || (Number.isFinite(num) && num >= 0);
}
```

### 6. **Error Handling** ✅

- [ ] Try-catch blocks around complex operations
- [ ] Logs errors with platform prefix
- [ ] Doesn't crash on malformed DOM
- [ ] Continues processing on single item failure
- [ ] Returns partial data on errors

### 7. **Performance** ⚡

- [ ] Debouncing for rapid mutations
- [ ] Deduplication using Set or Map
- [ ] Marks processed elements with data attribute
- [ ] Limits memory usage (clears old IDs periodically)
- [ ] Batch operations where possible

**Performance Patterns:**

```javascript
const processedIds = new Set();
const MAX_PROCESSED_IDS = 1000;

// Periodic cleanup
if (processedIds.size > MAX_PROCESSED_IDS) {
  const toKeep = Array.from(processedIds).slice(-500);
  processedIds.clear();
  toKeep.forEach((id) => processedIds.add(id));
}
```

### 8. **Observer Implementation** 👁️

- [ ] MutationObserver configured properly
- [ ] Observes correct target (usually document.body)
- [ ] Proper childList and subtree options
- [ ] Disconnects observer on errors
- [ ] Processes existing elements on load

### 9. **Platform-Specific Validations** 🎯

#### Twitter/X

- [ ] Handles retweets vs original tweets
- [ ] Quote tweet detection
- [ ] Thread detection
- [ ] Numeric snowflake ID validation (15-20 digits)

#### YouTube

- [ ] 11-character video ID validation
- [ ] Duration parsing validation (no NaN)
- [ ] Shorts vs regular video detection
- [ ] Channel handle extraction

#### Instagram

- [ ] Story vs post vs reel detection
- [ ] Carousel image handling
- [ ] Caption hashtag parsing
- [ ] Post ID from URL (/p/{id}/)

#### TikTok

- [ ] Video ID validation
- [ ] Sound/music metadata
- [ ] For You Page vs Following feed
- [ ] Video URL validation

#### LinkedIn

- [ ] URN-based ID extraction
- [ ] Sponsored content filtering
- [ ] Article vs post detection
- [ ] Job posting detection

#### Discord

- [ ] Message ID from element ID
- [ ] Fallback ID with channel + author + timestamp
- [ ] Attachment URL extraction
- [ ] Embed detection

#### Reddit

- [ ] t3\_ prefix handling
- [ ] Fullname attribute extraction
- [ ] Subreddit context
- [ ] Comment vs post detection

#### Spotify

- [ ] URI format (spotify:track:ID)
- [ ] Track vs playlist vs podcast
- [ ] Duration parsing
- [ ] Album artwork URL

#### Pinterest

- [ ] 18-digit numeric pin ID
- [ ] Board context
- [ ] Source URL tracking
- [ ] Image URL extraction

#### Facebook

- [ ] Data-ft JSON parsing
- [ ] Story vs post detection
- [ ] Group vs page vs profile
- [ ] Reactions breakdown

#### Threads

- [ ] Post ID from URL (/t/{id})
- [ ] Reply chain detection
- [ ] Quote post handling
- [ ] Instagram integration

#### Bluesky

- [ ] AT Protocol URI parsing
- [ ] DID (Decentralized ID) extraction
- [ ] Repost vs original
- [ ] Handle extraction

#### Mastodon

- [ ] Instance-agnostic selectors
- [ ] Boost vs original detection
- [ ] Content warning handling
- [ ] Status ID extraction

#### Snapchat

- [ ] Story vs Spotlight detection
- [ ] Ephemeral content handling
- [ ] Limited metadata availability
- [ ] Composite ID generation

#### Telegram

- [ ] Message ID from data-mid
- [ ] Channel vs chat detection
- [ ] Fallback ID generation
- [ ] View count for channels

#### Gmail

- [ ] Message ID from data attribute
- [ ] Label extraction
- [ ] Conversation threading
- [ ] Attachment metadata
- [ ] Privacy-conscious extraction

#### Dating Apps (Tinder, Bumble, Hinge)

- [ ] **Privacy consent required**
- [ ] Limited extraction scope
- [ ] Profile ID anonymization
- [ ] No photo URLs by default
- [ ] Explicit user opt-in

#### Castbox

- [ ] Episode ID extraction
- [ ] Duration parsing validation (no NaN)
- [ ] Show metadata
- [ ] Play count extraction

### 10. **Testing Scenarios** 🧪

For each extractor, test:

- [ ] **Empty feed:** No content breaks gracefully
- [ ] **Rapid scrolling:** No duplicate posts, no crashes
- [ ] **Malformed content:** Missing fields don't break parser
- [ ] **Large batches:** 100+ items process without OOM
- [ ] **Page navigation:** State resets properly
- [ ] **Dynamic UI changes:** New platform UI doesn't crash extractor

### 11. **Documentation** 📚

- [ ] JSDoc comments on main functions
- [ ] Inline comments for complex logic
- [ ] Platform-specific quirks documented
- [ ] Known limitations noted
- [ ] Example selectors documented

### 12. **Security Compliance** 🔐

- [ ] No eval() or Function() constructor
- [ ] No innerHTML (use textContent)
- [ ] No arbitrary code execution
- [ ] No access to parent window
- [ ] Sandboxed from other extractors
- [ ] OWASP Top 10 compliant

### 13. **Privacy Compliance** 🛡️

- [ ] No screenshot capture
- [ ] No credential extraction
- [ ] Sensitive platforms require consent
- [ ] GDPR-friendly data minimization
- [ ] User can disable per-platform

### 14. **Logging & Debugging** 🐛

- [ ] Console logs with platform prefix
- [ ] Error logs with context
- [ ] Initialization confirmation
- [ ] Performance warnings for slow operations
- [ ] No sensitive data in logs

---

## Validation Process

### Phase 1: Automated Checks (Use this checklist)

1. Review code structure
2. Check all validation functions exist
3. Verify error handling
4. Confirm security validations
5. Check logging consistency

### Phase 2: Manual Testing

1. Load platform in WebView
2. Scroll through feed
3. Check console for errors
4. Verify data in database
5. Test edge cases

### Phase 3: Cross-Platform Consistency

1. Compare extractor patterns
2. Ensure consistent ID formats
3. Standardize error messages
4. Align logging formats
5. Document differences

---

## Common Issues & Fixes

### Issue: Duplicate Posts

**Fix:** Add deduplication Set and mark processed elements

### Issue: NaN in Engagement/Duration

**Fix:** Add `Number.isFinite()` checks before returning

### Issue: Invalid URLs

**Fix:** Validate URL scheme before adding to media_urls

### Issue: Future Timestamps

**Fix:** Cap timestamps at Date.now() + reasonable buffer

### Issue: Memory Leaks

**Fix:** Limit processedIds Set size, clear periodically

### Issue: Platform UI Changes

**Fix:** Add multiple fallback selectors, graceful degradation

---

## Validation Status

| Platform  | Structure | Validation | Security | Performance | Status      |
| --------- | --------- | ---------- | -------- | ----------- | ----------- |
| Twitter   | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| YouTube   | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Instagram | ⚠️        | ⚠️         | ✅       | ✅          | **REVIEW**  |
| TikTok    | ⚠️        | ⚠️         | ✅       | ✅          | **REVIEW**  |
| LinkedIn  | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Discord   | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Reddit    | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Spotify   | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Pinterest | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Facebook  | ⚠️        | ⚠️         | ✅       | ⚠️          | **REVIEW**  |
| Threads   | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Bluesky   | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Mastodon  | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Snapchat  | ⚠️        | ⚠️         | ✅       | ✅          | **REVIEW**  |
| Telegram  | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Gmail     | ✅        | ✅         | ✅       | ✅          | **PASS**    |
| Tinder    | ⚠️        | ✅         | ✅       | ✅          | **PRIVACY** |
| Bumble    | ⚠️        | ✅         | ✅       | ✅          | **PRIVACY** |
| Hinge     | ⚠️        | ✅         | ✅       | ✅          | **PRIVACY** |
| Castbox   | ✅        | ✅         | ✅       | ✅          | **PASS**    |

**Legend:**

- ✅ **PASS:** Fully validated
- ⚠️ **REVIEW:** Needs enhancements
- ❌ **FAIL:** Critical issues
- 🔒 **PRIVACY:** Requires user consent

---

## Next Steps

1. Review all extractors against this checklist
2. Add missing validation functions
3. Enhance error handling where needed
4. Standardize logging formats
5. Document platform-specific quirks
6. Add automated validation tests
7. Update README with validation status

---

_Last Updated: 2025-11-07_
_Version: 1.0_
