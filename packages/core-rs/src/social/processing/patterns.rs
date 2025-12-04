use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    // Handle patterns for various platforms
    pub static ref TWITTER_HANDLE: Regex = Regex::new(r"@[\w_]{1,15}").expect("Failed to compile regex");
    pub static ref REDDIT_HANDLE: Regex = Regex::new(r"u/[\w_]{3,20}").expect("Failed to compile regex");
    pub static ref INSTAGRAM_HANDLE: Regex = Regex::new(r"@[\w_.]{1,30}").expect("Failed to compile regex");
    pub static ref LINKEDIN_NAME: Regex = Regex::new(r"^[A-Z][a-z]+ [A-Z][a-z]+").expect("Failed to compile regex");
    pub static ref TELEGRAM_HANDLE: Regex = Regex::new(r"@[\w]{5,32}").expect("Failed to compile regex");
    pub static ref DISCORD_HANDLE: Regex = Regex::new(r"[\w]+#\d{4}|@[\w]+").expect("Failed to compile regex");

    // Relative timestamps: 2h, 12m, 3d, 1w, "2 hours ago", "Yesterday"
    pub static ref TIME_REGEX: Regex = Regex::new(r"(?i)(\d+[mhdw]|\d+ (?:minute|hour|day|week)s? ago|just now|yesterday|today at \d+:\d+)").expect("Failed to compile regex");

    // Engagement metrics: "1.2K Likes", "500 Comments", "3.5M views"
    pub static ref METRICS_REGEX: Regex = Regex::new(r"(?i)(\d+(?:[.,]\d+)?[KMB]?)\s*(Comments?|Retweets?|Likes?|Views?|Upvotes?|Shares?|Reposts?|Replies?|Reactions?|Claps?|Subscribers?|Followers?)").expect("Failed to compile regex");

    // URL patterns
    pub static ref URL_REGEX: Regex = Regex::new(r"https?://\S+").expect("Failed to compile regex");

    // Hashtag patterns
    pub static ref HASHTAG_REGEX: Regex = Regex::new(r"#[\w]+").expect("Failed to compile regex");

    // Platform-specific identifiers
    pub static ref TWITTER_INDICATORS: Regex = Regex::new(r"(?i)(Retweet|Quote Tweet|Tweet|Reply|View Tweet)").expect("Failed to compile regex");
    pub static ref INSTAGRAM_INDICATORS: Regex = Regex::new(r"(?i)(likes this|commented|Reel|Story|View all \d+ comments)").expect("Failed to compile regex");
    pub static ref LINKEDIN_INDICATORS: Regex = Regex::new(r"(?i)(connections?|LinkedIn|• \d+(st|nd|rd|th)|Promoted|reactions?)").expect("Failed to compile regex");
    pub static ref REDDIT_INDICATORS: Regex = Regex::new(r"(?i)(r/[\w]+|points?|Posted by|karma|awards?)").expect("Failed to compile regex");
    pub static ref TELEGRAM_INDICATORS: Regex = Regex::new(r"(?i)(forwarded from|view in chat|pinned message|edited|channel|group)").expect("Failed to compile regex");
    pub static ref DISCORD_INDICATORS: Regex = Regex::new(r"(?i)(server|channel|#[\w-]+|replied to|edited|pinned)").expect("Failed to compile regex");
    pub static ref TINDER_INDICATORS: Regex = Regex::new(r"(?i)(super like|it's a match|liked you|new match|distance|miles away|km away)").expect("Failed to compile regex");
    pub static ref BUMBLE_INDICATORS: Regex = Regex::new(r"(?i)(bumble|extend|beeline|first move|expires in)").expect("Failed to compile regex");
    pub static ref HINGE_INDICATORS: Regex = Regex::new(r"(?i)(hinge|liked your|comment on|standout|most compatible)").expect("Failed to compile regex");
    pub static ref BROWSER_INDICATORS: Regex = Regex::new(r"(?i)(read more|article|published|author|min read|share|bookmark)").expect("Failed to compile regex");
    pub static ref YOUTUBE_INDICATORS: Regex = Regex::new(r"(?i)(subscribers?|views|watch later|subscribe|uploaded|premiere)").expect("Failed to compile regex");
    pub static ref TIKTOK_INDICATORS: Regex = Regex::new(r"(?i)(for you|following|fyp|sounds?|duet|stitch)").expect("Failed to compile regex");
    pub static ref WHATSAPP_INDICATORS: Regex = Regex::new(r"(?i)(online|last seen|typing|delivered|read|voice message)").expect("Failed to compile regex");
    pub static ref MEDIUM_INDICATORS: Regex = Regex::new(r"(?i)(min read|claps?|member only|follow|publication)").expect("Failed to compile regex");
}
