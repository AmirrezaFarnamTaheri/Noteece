//! Stream Processor - Heuristic Engine for Noteece Prime
//!
//! This module implements the core pattern-matching system for unstructured text capture
//! from the Android Accessibility Service. It uses regex heuristics to reconstruct
//! structured social media posts from raw UI text.

use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use ulid::Ulid;

lazy_static! {
    // Handle patterns for various platforms
    static ref TWITTER_HANDLE: Regex = Regex::new(r"@[\w_]{1,15}").unwrap();
    static ref REDDIT_HANDLE: Regex = Regex::new(r"u/[\w_]{3,20}").unwrap();
    static ref INSTAGRAM_HANDLE: Regex = Regex::new(r"@[\w_.]{1,30}").unwrap();
    static ref LINKEDIN_NAME: Regex = Regex::new(r"^[A-Z][a-z]+ [A-Z][a-z]+").unwrap();
    static ref TELEGRAM_HANDLE: Regex = Regex::new(r"@[\w]{5,32}").unwrap();
    static ref DISCORD_HANDLE: Regex = Regex::new(r"[\w]+#\d{4}|@[\w]+").unwrap();

    // Relative timestamps: 2h, 12m, 3d, 1w, "2 hours ago", "Yesterday"
    static ref TIME_REGEX: Regex = Regex::new(r"(?i)(\d+[mhdw]|\d+ (?:minute|hour|day|week)s? ago|just now|yesterday|today at \d+:\d+)").unwrap();

    // Engagement metrics: "1.2K Likes", "500 Comments", "3.5M views"
    static ref METRICS_REGEX: Regex = Regex::new(r"(?i)(\d+(?:[.,]\d+)?[KMB]?)\s*(Comments?|Retweets?|Likes?|Views?|Upvotes?|Shares?|Reposts?|Replies?|Reactions?|Claps?|Subscribers?|Followers?)").unwrap();

    // URL patterns
    static ref URL_REGEX: Regex = Regex::new(r"https?://\S+").unwrap();

    // Hashtag patterns
    static ref HASHTAG_REGEX: Regex = Regex::new(r"#[\w]+").unwrap();

    // Platform-specific identifiers
    static ref TWITTER_INDICATORS: Regex = Regex::new(r"(?i)(Retweet|Quote Tweet|Tweet|Reply|View Tweet)").unwrap();
    static ref INSTAGRAM_INDICATORS: Regex = Regex::new(r"(?i)(likes this|commented|Reel|Story|View all \d+ comments)").unwrap();
    static ref LINKEDIN_INDICATORS: Regex = Regex::new(r"(?i)(connections?|LinkedIn|• \d+(st|nd|rd|th)|Promoted|reactions?)").unwrap();
    static ref REDDIT_INDICATORS: Regex = Regex::new(r"(?i)(r/[\w]+|points?|Posted by|karma|awards?)").unwrap();
    static ref TELEGRAM_INDICATORS: Regex = Regex::new(r"(?i)(forwarded from|view in chat|pinned message|edited|channel|group)").unwrap();
    static ref DISCORD_INDICATORS: Regex = Regex::new(r"(?i)(server|channel|#[\w-]+|replied to|edited|pinned)").unwrap();
    static ref TINDER_INDICATORS: Regex = Regex::new(r"(?i)(super like|it's a match|liked you|new match|distance|miles away|km away)").unwrap();
    static ref BUMBLE_INDICATORS: Regex = Regex::new(r"(?i)(bumble|extend|beeline|first move|expires in)").unwrap();
    static ref HINGE_INDICATORS: Regex = Regex::new(r"(?i)(hinge|liked your|comment on|standout|most compatible)").unwrap();
    static ref BROWSER_INDICATORS: Regex = Regex::new(r"(?i)(read more|article|published|author|min read|share|bookmark)").unwrap();
    static ref YOUTUBE_INDICATORS: Regex = Regex::new(r"(?i)(subscribers?|views|watch later|subscribe|uploaded|premiere)").unwrap();
    static ref TIKTOK_INDICATORS: Regex = Regex::new(r"(?i)(for you|following|fyp|sounds?|duet|stitch)").unwrap();
    static ref WHATSAPP_INDICATORS: Regex = Regex::new(r"(?i)(online|last seen|typing|delivered|read|voice message)").unwrap();
    static ref MEDIUM_INDICATORS: Regex = Regex::new(r"(?i)(min read|claps?|member only|follow|publication)").unwrap();
}

/// Detected platform from heuristics
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DetectedPlatform {
    // Social Media
    Twitter,
    Instagram,
    LinkedIn,
    Reddit,
    Facebook,

    // Messaging
    Telegram,
    Discord,
    WhatsApp,
    Signal,
    Slack,
    Snapchat,

    // Dating
    Tinder,
    Bumble,
    Hinge,
    OkCupid,
    Match,

    // Browsers & Reading
    Browser,
    Medium,
    HackerNews,

    // Video & Content
    YouTube,
    TikTok,
    Twitch,
    Pinterest,
    Tumblr,
    Spotify,

    Unknown,
}

impl std::fmt::Display for DetectedPlatform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DetectedPlatform::Twitter => write!(f, "twitter"),
            DetectedPlatform::Instagram => write!(f, "instagram"),
            DetectedPlatform::LinkedIn => write!(f, "linkedin"),
            DetectedPlatform::Reddit => write!(f, "reddit"),
            DetectedPlatform::Facebook => write!(f, "facebook"),
            DetectedPlatform::Telegram => write!(f, "telegram"),
            DetectedPlatform::Discord => write!(f, "discord"),
            DetectedPlatform::WhatsApp => write!(f, "whatsapp"),
            DetectedPlatform::Signal => write!(f, "signal"),
            DetectedPlatform::Slack => write!(f, "slack"),
            DetectedPlatform::Snapchat => write!(f, "snapchat"),
            DetectedPlatform::Tinder => write!(f, "tinder"),
            DetectedPlatform::Bumble => write!(f, "bumble"),
            DetectedPlatform::Hinge => write!(f, "hinge"),
            DetectedPlatform::OkCupid => write!(f, "okcupid"),
            DetectedPlatform::Match => write!(f, "match"),
            DetectedPlatform::Browser => write!(f, "browser"),
            DetectedPlatform::Medium => write!(f, "medium"),
            DetectedPlatform::HackerNews => write!(f, "hackernews"),
            DetectedPlatform::YouTube => write!(f, "youtube"),
            DetectedPlatform::TikTok => write!(f, "tiktok"),
            DetectedPlatform::Twitch => write!(f, "twitch"),
            DetectedPlatform::Pinterest => write!(f, "pinterest"),
            DetectedPlatform::Tumblr => write!(f, "tumblr"),
            DetectedPlatform::Spotify => write!(f, "spotify"),
            DetectedPlatform::Unknown => write!(f, "unknown"),
        }
    }
}

impl DetectedPlatform {
    /// Check if this platform is a messaging app
    pub fn is_messaging(&self) -> bool {
        matches!(
            self,
            DetectedPlatform::Telegram
                | DetectedPlatform::Discord
                | DetectedPlatform::WhatsApp
                | DetectedPlatform::Signal
                | DetectedPlatform::Slack
                | DetectedPlatform::Snapchat
        )
    }

    /// Check if this platform is a dating app
    pub fn is_dating(&self) -> bool {
        matches!(
            self,
            DetectedPlatform::Tinder
                | DetectedPlatform::Bumble
                | DetectedPlatform::Hinge
                | DetectedPlatform::OkCupid
                | DetectedPlatform::Match
        )
    }

    /// Check if this platform is social media
    pub fn is_social(&self) -> bool {
        matches!(
            self,
            DetectedPlatform::Twitter
                | DetectedPlatform::Instagram
                | DetectedPlatform::LinkedIn
                | DetectedPlatform::Reddit
                | DetectedPlatform::Facebook
                | DetectedPlatform::TikTok
                | DetectedPlatform::Pinterest
                | DetectedPlatform::Tumblr
        )
    }
}

/// Engagement metrics extracted from post
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct EngagementMetrics {
    pub likes: Option<u64>,
    pub comments: Option<u64>,
    pub shares: Option<u64>,
    pub views: Option<u64>,
}

/// A captured post from the screen buffer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapturedPost {
    /// Unique identifier for this capture
    pub id: String,
    /// Detected platform
    pub platform: String,
    /// Author handle (e.g., @username)
    pub author_handle: Option<String>,
    /// Display name if detected separately
    pub author_display_name: Option<String>,
    /// Main content text
    pub content_text: String,
    /// Timestamp when captured
    pub captured_at: i64,
    /// Confidence score (0.0 - 1.0)
    pub confidence_score: f32,
    /// Extracted engagement metrics
    pub engagement: EngagementMetrics,
    /// Detected hashtags
    pub hashtags: Vec<String>,
    /// Detected URLs
    pub urls: Vec<String>,
    /// Raw context blob (for debugging/training)
    pub raw_context_blob: Option<String>,
    /// Original timestamp from post (if detected)
    pub original_timestamp: Option<String>,
}

/// Stream Processor - maintains sliding window buffer and performs heuristic analysis
pub struct StreamProcessor {
    /// Sliding window buffer of recent lines
    buffer: VecDeque<String>,
    /// Maximum buffer size
    buffer_size: usize,
    /// Bloom filter for deduplication
    dedup_filter: bloomfilter::Bloom<String>,
    /// Latest detected candidate
    latest_candidate: Option<CapturedPost>,
    /// Total posts captured this session
    capture_count: u64,
    /// Active platform hint (set by launcher)
    active_platform_hint: Option<DetectedPlatform>,
}

impl Default for StreamProcessor {
    fn default() -> Self {
        Self::new()
    }
}

impl StreamProcessor {
    /// Create a new StreamProcessor with default settings
    pub fn new() -> Self {
        StreamProcessor {
            buffer: VecDeque::with_capacity(30),
            buffer_size: 30,
            dedup_filter: bloomfilter::Bloom::new_for_fp_rate(10000, 0.01)
                .expect("Failed to create bloom filter"),
            latest_candidate: None,
            capture_count: 0,
            active_platform_hint: None,
        }
    }

    /// Reset the processor state (call on session end)
    pub fn reset(&mut self) {
        self.buffer.clear();
        self.latest_candidate = None;
        self.dedup_filter.clear();
        self.capture_count = 0;
        self.active_platform_hint = None;
        log::info!("[StreamProcessor] State reset. Session ended.");
    }

    /// Set a platform hint from the launcher (improves accuracy)
    pub fn set_platform_hint(&mut self, platform: DetectedPlatform) {
        self.active_platform_hint = Some(platform);
        log::debug!("[StreamProcessor] Platform hint set to: {:?}", platform);
    }

    /// Ingest raw text from the accessibility service
    pub fn ingest(&mut self, text: &str) {
        for line in text.lines() {
            let trimmed = line.trim();
            // Skip empty lines and very short noise
            if trimmed.len() > 2 {
                if self.buffer.len() >= self.buffer_size {
                    self.buffer.pop_front();
                }
                self.buffer.push_back(trimmed.to_string());
            }
        }

        // Auto-analyze after ingestion
        if let Some(post) = self.analyze_buffer() {
            // Deduplication check using content hash
            let content_key = format!(
                "{}:{}",
                post.author_handle.as_deref().unwrap_or("unknown"),
                &post.content_text[..post.content_text.len().min(100)]
            );

            if !self.dedup_filter.check(&content_key) {
                self.dedup_filter.set(&content_key);
                self.capture_count += 1;

                log::info!(
                    "[StreamProcessor] New candidate #{}: platform={}, author={:?}, confidence={:.2}",
                    self.capture_count,
                    post.platform,
                    post.author_handle,
                    post.confidence_score
                );

                self.latest_candidate = Some(post);
            }
        }
    }

    /// Get the latest captured candidate
    pub fn get_latest_candidate(&self) -> Option<CapturedPost> {
        self.latest_candidate.clone()
    }

    /// Get total capture count for this session
    pub fn get_capture_count(&self) -> u64 {
        self.capture_count
    }

    /// Get current buffer size
    pub fn get_buffer_size(&self) -> usize {
        self.buffer.len()
    }

    /// Analyze the buffer and extract a post candidate
    pub fn analyze_buffer(&self) -> Option<CapturedPost> {
        if self.buffer.len() < 3 {
            return None;
        }

        let snapshot: Vec<&String> = self.buffer.iter().collect();

        // Try to detect platform first
        let platform = self.detect_platform(&snapshot);

        // Use platform-specific extraction or generic
        match platform {
            DetectedPlatform::Twitter => self.extract_twitter_post(&snapshot),
            DetectedPlatform::Instagram => self.extract_instagram_post(&snapshot),
            DetectedPlatform::LinkedIn => self.extract_linkedin_post(&snapshot),
            DetectedPlatform::Reddit => self.extract_reddit_post(&snapshot),
            DetectedPlatform::Telegram => self.extract_telegram_message(&snapshot),
            DetectedPlatform::Discord => self.extract_discord_message(&snapshot),
            DetectedPlatform::Tinder | DetectedPlatform::Bumble | DetectedPlatform::Hinge => {
                self.extract_dating_profile(&snapshot, platform)
            }
            DetectedPlatform::Browser | DetectedPlatform::Medium | DetectedPlatform::HackerNews => {
                self.extract_article_content(&snapshot, platform)
            }
            DetectedPlatform::YouTube => self.extract_youtube_content(&snapshot),
            DetectedPlatform::TikTok => self.extract_tiktok_content(&snapshot),
            DetectedPlatform::WhatsApp | DetectedPlatform::Signal => {
                self.extract_chat_message(&snapshot, platform)
            }
            _ => self.extract_generic_post(&snapshot, platform),
        }
    }

    /// Detect platform from buffer content using heuristic scoring
    fn detect_platform(&self, snapshot: &[&String]) -> DetectedPlatform {
        // Use hint if available (set by launcher)
        if let Some(hint) = self.active_platform_hint {
            return hint;
        }

        let full_text = snapshot
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join(" ");

        // Score each platform based on indicator matches
        let scores: Vec<(DetectedPlatform, usize)> = vec![
            (
                DetectedPlatform::Twitter,
                TWITTER_INDICATORS.find_iter(&full_text).count()
                    + TWITTER_HANDLE.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Instagram,
                INSTAGRAM_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::LinkedIn,
                LINKEDIN_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Reddit,
                REDDIT_INDICATORS.find_iter(&full_text).count()
                    + REDDIT_HANDLE.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Telegram,
                TELEGRAM_INDICATORS.find_iter(&full_text).count()
                    + TELEGRAM_HANDLE.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Discord,
                DISCORD_INDICATORS.find_iter(&full_text).count()
                    + DISCORD_HANDLE.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Tinder,
                TINDER_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Bumble,
                BUMBLE_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Hinge,
                HINGE_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::YouTube,
                YOUTUBE_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::TikTok,
                TIKTOK_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::WhatsApp,
                WHATSAPP_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Medium,
                MEDIUM_INDICATORS.find_iter(&full_text).count(),
            ),
            (
                DetectedPlatform::Browser,
                BROWSER_INDICATORS.find_iter(&full_text).count(),
            ),
        ];

        // Find platform with highest score
        let (best_platform, best_score) = scores
            .into_iter()
            .max_by_key(|(_, score)| *score)
            .unwrap_or((DetectedPlatform::Unknown, 0));

        // Require minimum confidence
        if best_score < 2 {
            return DetectedPlatform::Unknown;
        }

        best_platform
    }

    /// Extract a Twitter post
    fn extract_twitter_post(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        // Twitter pattern: @handle • time • content • metrics
        for i in (0..snapshot.len().saturating_sub(3)).rev() {
            let end = (i + 4).min(snapshot.len());
            let window: Vec<&str> = snapshot[i..end]
                .iter()
                .map(|s| s.as_str())
                .collect();

            let combined = window.join("\n");

            // Check for handle
            if let Some(handle_match) = TWITTER_HANDLE.find(&combined) {
                // Check for timestamp nearby
                if TIME_REGEX.is_match(&combined) {
                    // Find content (longest line without handle/time)
                    let content = window
                        .iter()
                        .filter(|l| l.len() > 20 && !TWITTER_HANDLE.is_match(l))
                        .max_by_key(|l| l.len())
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| window[window.len().saturating_sub(1)].to_string());

                    let engagement = self.extract_engagement(&combined);
                    let timestamp = TIME_REGEX.find(&combined).map(|m| m.as_str().to_string());

                    return Some(CapturedPost {
                        id: Ulid::new().to_string(),
                        platform: "twitter".to_string(),
                        author_handle: Some(handle_match.as_str().to_string()),
                        author_display_name: None,
                        content_text: content,
                        captured_at: chrono::Utc::now().timestamp(),
                        confidence_score: 0.90,
                        engagement,
                        hashtags: HASHTAG_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        urls: URL_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        raw_context_blob: Some(combined),
                        original_timestamp: timestamp,
                    });
                }
            }
        }
        None
    }

    /// Extract an Instagram post
    fn extract_instagram_post(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        for i in (0..snapshot.len().saturating_sub(3)).rev() {
            let end = (i + 5).min(snapshot.len());
            let window: Vec<&str> = snapshot[i..end]
                .iter()
                .map(|s| s.as_str())
                .collect();

            let combined = window.join("\n");

            if let Some(handle_match) = INSTAGRAM_HANDLE.find(&combined) {
                if TIME_REGEX.is_match(&combined) || INSTAGRAM_INDICATORS.is_match(&combined) {
                    let content = window
                        .iter()
                        .filter(|l| l.len() > 15)
                        .max_by_key(|l| l.len())
                        .map(|s| s.to_string())
                        .unwrap_or_default();

                    if content.is_empty() {
                        continue;
                    }

                    return Some(CapturedPost {
                        id: Ulid::new().to_string(),
                        platform: "instagram".to_string(),
                        author_handle: Some(handle_match.as_str().to_string()),
                        author_display_name: None,
                        content_text: content,
                        captured_at: chrono::Utc::now().timestamp(),
                        confidence_score: 0.85,
                        engagement: self.extract_engagement(&combined),
                        hashtags: HASHTAG_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        urls: URL_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        raw_context_blob: Some(combined.clone()),
                        original_timestamp: TIME_REGEX
                            .find(&combined)
                            .map(|m| m.as_str().to_string()),
                    });
                }
            }
        }
        None
    }

    /// Extract a LinkedIn post
    fn extract_linkedin_post(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        for i in (0..snapshot.len().saturating_sub(3)).rev() {
            let end = (i + 6).min(snapshot.len());
            let window: Vec<&str> = snapshot[i..end]
                .iter()
                .map(|s| s.as_str())
                .collect();

            let combined = window.join("\n");

            // LinkedIn uses full names, check for name pattern
            if let Some(name_match) = LINKEDIN_NAME.find(&combined) {
                if LINKEDIN_INDICATORS.is_match(&combined) || TIME_REGEX.is_match(&combined) {
                    let content = window
                        .iter()
                        .filter(|l| l.len() > 30 && !LINKEDIN_NAME.is_match(l))
                        .max_by_key(|l| l.len())
                        .map(|s| s.to_string())
                        .unwrap_or_default();

                    if content.is_empty() {
                        continue;
                    }

                    return Some(CapturedPost {
                        id: Ulid::new().to_string(),
                        platform: "linkedin".to_string(),
                        author_handle: None,
                        author_display_name: Some(name_match.as_str().to_string()),
                        content_text: content,
                        captured_at: chrono::Utc::now().timestamp(),
                        confidence_score: 0.80,
                        engagement: self.extract_engagement(&combined),
                        hashtags: HASHTAG_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        urls: URL_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        raw_context_blob: Some(combined.clone()),
                        original_timestamp: TIME_REGEX
                            .find(&combined)
                            .map(|m| m.as_str().to_string()),
                    });
                }
            }
        }
        None
    }

    /// Extract a Reddit post
    fn extract_reddit_post(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        for i in (0..snapshot.len().saturating_sub(3)).rev() {
            let end = (i + 5).min(snapshot.len());
            let window: Vec<&str> = snapshot[i..end]
                .iter()
                .map(|s| s.as_str())
                .collect();

            let combined = window.join("\n");

            if let Some(handle_match) = REDDIT_HANDLE.find(&combined) {
                if REDDIT_INDICATORS.is_match(&combined) || TIME_REGEX.is_match(&combined) {
                    let content = window
                        .iter()
                        .filter(|l| l.len() > 20)
                        .max_by_key(|l| l.len())
                        .map(|s| s.to_string())
                        .unwrap_or_default();

                    if content.is_empty() {
                        continue;
                    }

                    return Some(CapturedPost {
                        id: Ulid::new().to_string(),
                        platform: "reddit".to_string(),
                        author_handle: Some(handle_match.as_str().to_string()),
                        author_display_name: None,
                        content_text: content,
                        captured_at: chrono::Utc::now().timestamp(),
                        confidence_score: 0.85,
                        engagement: self.extract_engagement(&combined),
                        hashtags: vec![],
                        urls: URL_REGEX
                            .find_iter(&combined)
                            .map(|m| m.as_str().to_string())
                            .collect(),
                        raw_context_blob: Some(combined.clone()),
                        original_timestamp: TIME_REGEX
                            .find(&combined)
                            .map(|m| m.as_str().to_string()),
                    });
                }
            }
        }
        None
    }

    /// Extract a Telegram message
    fn extract_telegram_message(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        for i in (0..snapshot.len().saturating_sub(2)).rev() {
            let end = (i + 4).min(snapshot.len());
            let window: Vec<&str> = snapshot[i..end]
                .iter()
                .map(|s| s.as_str())
                .collect();

            let combined = window.join("\n");

            // Telegram patterns: username/channel, time, message
            if TELEGRAM_INDICATORS.is_match(&combined) || TELEGRAM_HANDLE.is_match(&combined) {
                let handle = TELEGRAM_HANDLE
                    .find(&combined)
                    .map(|m| m.as_str().to_string());

                // Find the longest line as content
                let content = window
                    .iter()
                    .filter(|l| l.len() > 10 && !TELEGRAM_HANDLE.is_match(l))
                    .max_by_key(|l| l.len())
                    .map(|s| s.to_string())
                    .unwrap_or_default();

                if content.is_empty() {
                    continue;
                }

                return Some(CapturedPost {
                    id: Ulid::new().to_string(),
                    platform: "telegram".to_string(),
                    author_handle: handle,
                    author_display_name: None,
                    content_text: content,
                    captured_at: chrono::Utc::now().timestamp(),
                    confidence_score: 0.85,
                    engagement: EngagementMetrics::default(),
                    hashtags: HASHTAG_REGEX
                        .find_iter(&combined)
                        .map(|m| m.as_str().to_string())
                        .collect(),
                    urls: URL_REGEX
                        .find_iter(&combined)
                        .map(|m| m.as_str().to_string())
                        .collect(),
                    raw_context_blob: Some(combined.clone()),
                    original_timestamp: TIME_REGEX.find(&combined).map(|m| m.as_str().to_string()),
                });
            }
        }
        None
    }

    /// Extract a Discord message
    fn extract_discord_message(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        for i in (0..snapshot.len().saturating_sub(2)).rev() {
            let end = (i + 4).min(snapshot.len());
            let window: Vec<&str> = snapshot[i..end]
                .iter()
                .map(|s| s.as_str())
                .collect();

            let combined = window.join("\n");

            if DISCORD_INDICATORS.is_match(&combined) || DISCORD_HANDLE.is_match(&combined) {
                let handle = DISCORD_HANDLE
                    .find(&combined)
                    .map(|m| m.as_str().to_string());

                let content = window
                    .iter()
                    .filter(|l| l.len() > 10)
                    .max_by_key(|l| l.len())
                    .map(|s| s.to_string())
                    .unwrap_or_default();

                if content.is_empty() {
                    continue;
                }

                return Some(CapturedPost {
                    id: Ulid::new().to_string(),
                    platform: "discord".to_string(),
                    author_handle: handle,
                    author_display_name: None,
                    content_text: content,
                    captured_at: chrono::Utc::now().timestamp(),
                    confidence_score: 0.80,
                    engagement: EngagementMetrics::default(),
                    hashtags: vec![],
                    urls: URL_REGEX
                        .find_iter(&combined)
                        .map(|m| m.as_str().to_string())
                        .collect(),
                    raw_context_blob: Some(combined.clone()),
                    original_timestamp: TIME_REGEX.find(&combined).map(|m| m.as_str().to_string()),
                });
            }
        }
        None
    }

    /// Extract dating app profile information
    fn extract_dating_profile(
        &self,
        snapshot: &[&String],
        platform: DetectedPlatform,
    ) -> Option<CapturedPost> {
        let combined = snapshot
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        // Look for name + age pattern common in dating apps
        let name_age_pattern = regex::Regex::new(r"([A-Z][a-z]+),?\s*(\d{2})").ok()?;

        // Find profile bio (usually the longest text)
        let bio = snapshot
            .iter()
            .filter(|l| l.len() > 30)
            .max_by_key(|l| l.len())
            .map(|s| s.to_string())?;

        let display_name = name_age_pattern
            .captures(&combined)
            .map(|c| format!("{}, {}", &c[1], &c[2]));

        Some(CapturedPost {
            id: Ulid::new().to_string(),
            platform: platform.to_string(),
            author_handle: None,
            author_display_name: display_name,
            content_text: bio,
            captured_at: chrono::Utc::now().timestamp(),
            confidence_score: 0.75,
            engagement: EngagementMetrics::default(),
            hashtags: vec![],
            urls: vec![],
            raw_context_blob: Some(combined),
            original_timestamp: None,
        })
    }

    /// Extract article content from browsers/reading apps
    fn extract_article_content(
        &self,
        snapshot: &[&String],
        platform: DetectedPlatform,
    ) -> Option<CapturedPost> {
        let combined = snapshot
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        // Look for article title (usually shorter, may have "by Author")
        let title = snapshot
            .iter()
            .find(|l| l.len() > 20 && l.len() < 150)
            .map(|s| s.to_string())?;

        // Look for author pattern
        let author_pattern = regex::Regex::new(r"(?i)by\s+([A-Z][a-z]+ [A-Z][a-z]+)").ok()?;
        let author = author_pattern.captures(&combined).map(|c| c[1].to_string());

        // Get body text
        let body: String = snapshot
            .iter()
            .filter(|l| l.len() > 100)
            .take(3)
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join(" ");

        if body.is_empty() {
            return None;
        }

        Some(CapturedPost {
            id: Ulid::new().to_string(),
            platform: platform.to_string(),
            author_handle: None,
            author_display_name: author,
            content_text: format!("{}\n\n{}", title, body),
            captured_at: chrono::Utc::now().timestamp(),
            confidence_score: 0.70,
            engagement: self.extract_engagement(&combined),
            hashtags: vec![],
            urls: URL_REGEX
                .find_iter(&combined)
                .map(|m| m.as_str().to_string())
                .collect(),
            raw_context_blob: Some(combined),
            original_timestamp: None,
        })
    }

    /// Extract YouTube video content
    fn extract_youtube_content(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        let combined = snapshot
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        // Video title is usually prominent
        let title = snapshot
            .iter()
            .find(|l| l.len() > 15 && l.len() < 150)
            .map(|s| s.to_string())?;

        // Channel name
        let channel = snapshot
            .iter()
            .find(|l| l.len() > 3 && l.len() < 50 && !YOUTUBE_INDICATORS.is_match(l))
            .map(|s| s.to_string());

        Some(CapturedPost {
            id: Ulid::new().to_string(),
            platform: "youtube".to_string(),
            author_handle: None,
            author_display_name: channel,
            content_text: title,
            captured_at: chrono::Utc::now().timestamp(),
            confidence_score: 0.80,
            engagement: self.extract_engagement(&combined),
            hashtags: HASHTAG_REGEX
                .find_iter(&combined)
                .map(|m| m.as_str().to_string())
                .collect(),
            urls: URL_REGEX
                .find_iter(&combined)
                .map(|m| m.as_str().to_string())
                .collect(),
            raw_context_blob: Some(combined),
            original_timestamp: None,
        })
    }

    /// Extract TikTok content
    fn extract_tiktok_content(&self, snapshot: &[&String]) -> Option<CapturedPost> {
        let combined = snapshot
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        // TikTok has @handle and description
        let handle = TWITTER_HANDLE
            .find(&combined)
            .map(|m| m.as_str().to_string());

        // Description/caption
        let caption = snapshot
            .iter()
            .filter(|l| l.len() > 10)
            .max_by_key(|l| l.len())
            .map(|s| s.to_string())?;

        Some(CapturedPost {
            id: Ulid::new().to_string(),
            platform: "tiktok".to_string(),
            author_handle: handle,
            author_display_name: None,
            content_text: caption,
            captured_at: chrono::Utc::now().timestamp(),
            confidence_score: 0.75,
            engagement: self.extract_engagement(&combined),
            hashtags: HASHTAG_REGEX
                .find_iter(&combined)
                .map(|m| m.as_str().to_string())
                .collect(),
            urls: vec![],
            raw_context_blob: Some(combined),
            original_timestamp: None,
        })
    }

    /// Extract chat message from WhatsApp/Signal
    fn extract_chat_message(
        &self,
        snapshot: &[&String],
        platform: DetectedPlatform,
    ) -> Option<CapturedPost> {
        let combined = snapshot
            .iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join("\n");

        // Chat messages usually have contact name + message
        let message = snapshot
            .iter()
            .filter(|l| l.len() > 5)
            .max_by_key(|l| l.len())
            .map(|s| s.to_string())?;

        // Contact name (usually shorter)
        let contact = snapshot
            .iter()
            .find(|l| l.len() > 2 && l.len() < 30)
            .map(|s| s.to_string());

        Some(CapturedPost {
            id: Ulid::new().to_string(),
            platform: platform.to_string(),
            author_handle: None,
            author_display_name: contact,
            content_text: message,
            captured_at: chrono::Utc::now().timestamp(),
            confidence_score: 0.70,
            engagement: EngagementMetrics::default(),
            hashtags: vec![],
            urls: URL_REGEX
                .find_iter(&combined)
                .map(|m| m.as_str().to_string())
                .collect(),
            raw_context_blob: Some(combined.clone()),
            original_timestamp: TIME_REGEX.find(&combined).map(|m| m.as_str().to_string()),
        })
    }

    /// Extract a generic post (fallback)
    fn extract_generic_post(
        &self,
        snapshot: &[&String],
        platform: DetectedPlatform,
    ) -> Option<CapturedPost> {
        for i in (0..snapshot.len().saturating_sub(2)).rev() {
            let line1 = snapshot[i];
            let line2 = snapshot[i + 1];
            let line3 = snapshot.get(i + 2).map(|s| s.as_str()).unwrap_or("");

            let combined = format!("{}\n{}\n{}", line1, line2, line3);

            // Basic heuristics: handle + time + text
            let has_handle = TWITTER_HANDLE.is_match(&combined)
                || REDDIT_HANDLE.is_match(&combined)
                || TELEGRAM_HANDLE.is_match(&combined)
                || DISCORD_HANDLE.is_match(&combined);
            let has_time = TIME_REGEX.is_match(&combined);
            let has_content = line2.len() > 20 || line3.len() > 20;

            if (has_handle || has_time) && has_content {
                let handle = TWITTER_HANDLE
                    .find(&combined)
                    .or_else(|| REDDIT_HANDLE.find(&combined))
                    .or_else(|| TELEGRAM_HANDLE.find(&combined))
                    .map(|m| m.as_str().to_string());

                let content = if line3.len() > line2.len() {
                    line3
                } else {
                    line2
                };

                return Some(CapturedPost {
                    id: Ulid::new().to_string(),
                    platform: platform.to_string(),
                    author_handle: handle,
                    author_display_name: None,
                    content_text: content.to_string(),
                    captured_at: chrono::Utc::now().timestamp(),
                    confidence_score: 0.60, // Lower confidence for generic extraction
                    engagement: self.extract_engagement(&combined),
                    hashtags: HASHTAG_REGEX
                        .find_iter(&combined)
                        .map(|m| m.as_str().to_string())
                        .collect(),
                    urls: URL_REGEX
                        .find_iter(&combined)
                        .map(|m| m.as_str().to_string())
                        .collect(),
                    raw_context_blob: Some(combined.clone()),
                    original_timestamp: TIME_REGEX.find(&combined).map(|m| m.as_str().to_string()),
                });
            }
        }
        None
    }

    /// Extract engagement metrics from text
    fn extract_engagement(&self, text: &str) -> EngagementMetrics {
        let mut metrics = EngagementMetrics::default();

        for cap in METRICS_REGEX.captures_iter(text) {
            if let (Some(num_match), Some(type_match)) = (cap.get(1), cap.get(2)) {
                let num_str = num_match.as_str().replace([',', '.'], "");
                let type_str = type_match.as_str().to_lowercase();

                // Parse number with K/M/B suffix
                let value = self.parse_metric_number(&num_str);

                if type_str.starts_with("like") {
                    metrics.likes = Some(value);
                } else if type_str.starts_with("comment") || type_str.starts_with("repl") {
                    metrics.comments = Some(value);
                } else if type_str.starts_with("share")
                    || type_str.starts_with("retweet")
                    || type_str.starts_with("repost")
                {
                    metrics.shares = Some(value);
                } else if type_str.starts_with("view") {
                    metrics.views = Some(value);
                }
            }
        }

        metrics
    }

    /// Parse metric numbers with K/M/B suffixes
    fn parse_metric_number(&self, s: &str) -> u64 {
        let s = s.to_uppercase();
        let multiplier = if s.ends_with('K') {
            1_000.0
        } else if s.ends_with('M') {
            1_000_000.0
        } else if s.ends_with('B') {
            1_000_000_000.0
        } else {
            1.0
        };

        let num_part: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
        num_part.parse::<u64>().unwrap_or(0) * multiplier
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_processor() {
        let processor = StreamProcessor::new();
        assert_eq!(processor.get_buffer_size(), 0);
        assert_eq!(processor.get_capture_count(), 0);
        assert!(processor.get_latest_candidate().is_none());
    }

    #[test]
    fn test_ingest_basic() {
        let mut processor = StreamProcessor::new();
        processor.ingest("Hello world\nThis is a test");
        assert_eq!(processor.get_buffer_size(), 2);
    }

    #[test]
    fn test_twitter_extraction() {
        let mut processor = StreamProcessor::new();
        processor.set_platform_hint(DetectedPlatform::Twitter);

        let input = "@elonmusk\n2h\nJust had a great meeting about the future of technology! #tech #innovation\n1.5K Likes • 234 Retweets";
        processor.ingest(input);

        let candidate = processor.get_latest_candidate();
        assert!(candidate.is_some());

        let post = candidate.unwrap();
        assert_eq!(post.platform, "twitter");
        assert_eq!(post.author_handle, Some("@elonmusk".to_string()));
        assert!(!post.hashtags.is_empty());
    }

    #[test]
    fn test_reddit_extraction() {
        let mut processor = StreamProcessor::new();
        processor.set_platform_hint(DetectedPlatform::Reddit);

        let input = "Posted by u/testuser\n5h ago\nThis is an amazing post about programming and technology that everyone should read!\n2.5K points • 156 Comments";
        processor.ingest(input);

        let candidate = processor.get_latest_candidate();
        assert!(candidate.is_some());

        let post = candidate.unwrap();
        assert_eq!(post.platform, "reddit");
        assert!(post.author_handle.as_ref().unwrap().starts_with("u/"));
    }

    #[test]
    fn test_deduplication() {
        let mut processor = StreamProcessor::new();

        let input =
            "@testuser\n1h\nThis is a test post with enough content to be detected.\n100 Likes";
        processor.ingest(input);
        assert_eq!(processor.get_capture_count(), 1);

        // Ingest same content again
        processor.ingest(input);
        assert_eq!(processor.get_capture_count(), 1); // Should not increment
    }

    #[test]
    fn test_reset() {
        let mut processor = StreamProcessor::new();
        processor.ingest("@user\n1h\nTest content that should be captured.\n50 Likes");
        assert!(processor.get_capture_count() > 0);

        processor.reset();
        assert_eq!(processor.get_capture_count(), 0);
        assert_eq!(processor.get_buffer_size(), 0);
        assert!(processor.get_latest_candidate().is_none());
    }

    #[test]
    fn test_metric_parsing() {
        let processor = StreamProcessor::new();
        assert_eq!(processor.parse_metric_number("1K"), 1000);
        assert_eq!(processor.parse_metric_number("2.5M"), 2_500_000);
        assert_eq!(processor.parse_metric_number("100"), 100);
    }
}
