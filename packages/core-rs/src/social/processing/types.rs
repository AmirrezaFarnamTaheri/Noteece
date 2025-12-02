use serde::{Deserialize, Serialize};

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
