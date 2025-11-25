# Noteece Prime: Sovereign Interception Architecture

This document describes the architecture of Noteece Prime, the advanced mobile experience that operates as a meta-layer over Android.

## Overview

Noteece Prime implements "Sovereign Interception" - a passive data capture system that reads content from other apps without modifying them, storing everything locally in your encrypted vault.

```
┌─────────────────────────────────────────────────────────────┐
│                    Android OS                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Twitter   │  │  Instagram  │  │   Other Apps...     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │            Noteece Prime (Tri-Layer)                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Layer 1: The Hub (Social Dock Launcher)        │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Layer 2: The Eyes (Accessibility Service)      │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Layer 3: The Wrapper (Overlay HUD)             │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐  │
│  │               Rust Core (Heuristic Engine)             │  │
│  │                    + Encrypted Vault                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Tri-Layer Architecture

### Layer 1: The Hub (Social Dock)

The entry point for passive capture sessions.

**Component**: `SocialDock.tsx`

**Function**:
- Displays a grid of supported social applications
- Triggers a `START_SESSION` intent before launching apps
- Categories: Social Media, Messaging, Dating, Browsers, Media

**Supported Platforms** (30+):

| Category | Platforms |
|----------|-----------|
| Social Media | Twitter, Instagram, LinkedIn, Reddit, Facebook, TikTok, Pinterest, Tumblr |
| Messaging | Telegram, Discord, WhatsApp, Signal, Slack, Snapchat |
| Dating | Tinder, Bumble, Hinge, OkCupid, Match |
| Browsers | Chrome, Firefox, Brave, Edge, DuckDuckGo |
| Media | YouTube, Twitch, Spotify, Medium, NYTimes, Hacker News |

### Layer 2: The Eyes (Accessibility Service)

Passive screen content reader.

**Component**: `NoteeceAccessibilityService.kt`

**Function**:
- Reads the UI tree from the screen buffer
- Bypasses SSL pinning by reading decrypted text at the view layer
- Streams raw text to Rust Core via JNI bridge
- Debounces scroll events (150ms) for efficiency

**Key Code**:

```kotlin
override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (!isRecording || event == null) return
    
    // Runtime package whitelist check
    if (!allowedPackages.contains(event.packageName.toString())) {
        return
    }
    
    // Event filtering
    if (event.eventType != TYPE_WINDOW_CONTENT_CHANGED &&
        event.eventType != TYPE_VIEW_SCROLLED) {
        return
    }
    
    // Debounce and capture
    val now = System.currentTimeMillis()
    if (now - lastScrollTime < DEBOUNCE_MS) return
    lastScrollTime = now
    
    scanScreen()
}
```

**Privacy Controls**:
- Strict package whitelist (runtime + XML config)
- Screen state awareness (pauses on screen off)
- No network access from service
- All processing happens locally

### Layer 3: The Wrapper (Overlay HUD)

User interface for capture control.

**Component**: `OverlayService.kt`

**Function**:
- Draws a floating "Green Dot" indicator
- Indicates active capture session
- Provides "Anchor" action to save current screen

**Anchor Action**:
When tapped, the current screen buffer (analyzed by heuristics) is committed to the encrypted vault as a saved Note.

## Heuristic Engine

The Rust-based pattern recognition system.

**Component**: `packages/core-rs/src/social/stream_processor.rs`

**Function**:
- Processes raw text streams from the accessibility service
- Applies regex patterns to identify structured content
- Reconstructs posts, messages, and profiles from fragments
- Deduplicates using Bloom filter

### Pattern Recognition

```rust
lazy_static! {
    // Twitter/Instagram handles
    static ref HANDLE_REGEX: Regex = Regex::new(r"(@[\w_]+|u/[\w_]+)").unwrap();
    
    // Relative timestamps
    static ref TIME_REGEX: Regex = Regex::new(r"(\d+[mhdw])").unwrap();
    
    // Engagement metrics
    static ref METRICS_REGEX: Regex = Regex::new(
        r"(\d+(?:\.\d+)?[KMB]?)\s+(Comments|Retweets|Likes|Views)"
    ).unwrap();
    
    // URLs in browser content
    static ref URL_REGEX: Regex = Regex::new(r"(https?://[^\s]+)").unwrap();
    
    // Dating app profiles
    static ref DATING_PROFILE_REGEX: Regex = Regex::new(
        r"(^|\n)([\w\s]+, \d{1,2}(?:, \w+)?)\n"
    ).unwrap();
}
```

### Detection Methods

1. **Social Posts**: Handle + timestamp + body text
2. **Browser Content**: URL presence
3. **Dating Profiles**: Name, age pattern
4. **Messages**: Time + sender + content pattern

### Output Structure

```rust
pub struct CapturedPost {
    pub id: String,
    pub platform: String,
    pub author_handle: Option<String>,
    pub content_text: String,
    pub captured_at: i64,
    pub confidence_score: f32,
    pub raw_context_blob: Option<String>,
}
```

## Data Flow

```
┌─────────────┐     ┌─────────────────┐     ┌───────────────┐
│   Screen    │────▶│  Accessibility  │────▶│  JNI Bridge   │
│   Buffer    │     │    Service      │     │   (Zero-Copy) │
└─────────────┘     └─────────────────┘     └───────┬───────┘
                                                    │
                    ┌───────────────────────────────▼───────┐
                    │         Stream Processor              │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Sliding Window Buffer (20 lines)│  │
                    │  └─────────────────────────────────┘  │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Pattern Matching (Regex)        │  │
                    │  └─────────────────────────────────┘  │
                    │  ┌─────────────────────────────────┐  │
                    │  │  Bloom Filter (Deduplication)    │  │
                    │  └─────────────────────────────────┘  │
                    └───────────────────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────┐
                    │       SQLCipher Encrypted Vault       │
                    │  ┌─────────────────────────────────┐  │
                    │  │  social_post table               │  │
                    │  │  + FTS5 full-text index          │  │
                    │  └─────────────────────────────────┘  │
                    └───────────────────────────────────────┘
```

## Build Flavors

### Store Build
- Standard P2P companion app
- Google Play compliant
- No accessibility service
- No overlay permissions

### Sideload (Prime) Build
- Full "Cyborg-Life OS" experience
- Accessibility service enabled
- Overlay HUD enabled
- APK distributed via GitHub Releases

## Security Model

1. **No Network from Service**: Accessibility service has no internet permission
2. **Local-Only Processing**: All heuristics run on-device
3. **Encrypted Storage**: SQLCipher with user-derived key
4. **Package Whitelist**: Only specified apps are monitored
5. **User Consent**: Explicit accessibility service permission
6. **Transparency**: Open source, auditable code

## Privacy Protections

### Redaction

```typescript
captureSettings: {
    redactEmails: true,
    redactPhoneNumbers: true,
    excludePrivateMessages: true
}
```

### Selective Capture

Users can:
- Enable/disable specific platforms
- Choose capture categories
- Review before saving
- Delete captured content

## Performance

| Metric | Value |
|--------|-------|
| Debounce interval | 150ms |
| Buffer size | 20 lines |
| Pattern matching | <5ms |
| JNI overhead | <1ms |
| Memory footprint | ~15MB |

## Limitations

1. **Android Only**: iOS restrictions prevent similar implementation
2. **Sideload Required**: Play Store prohibits accessibility abuse
3. **Some Apps Protected**: Banking apps often block accessibility
4. **Screen Reading Only**: Cannot interact with other apps

---

*See also: [Social Suite Feature Guide](../02_Features/04_Social_Suite.md)*

