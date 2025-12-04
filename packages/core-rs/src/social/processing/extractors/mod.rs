pub mod instagram;
pub mod linkedin;
pub mod media;
pub mod messaging;
pub mod misc;
pub mod reddit;
pub mod twitter;

use super::patterns::*;
use super::types::{DetectedPlatform, EngagementMetrics};

/// Detect platform from buffer content using heuristic scoring
pub fn detect_platform(snapshot: &[&String], hint: Option<DetectedPlatform>) -> DetectedPlatform {
    // Use hint if available (set by launcher)
    if let Some(hint) = hint {
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

/// Extract engagement metrics from text
pub fn extract_engagement(text: &str) -> EngagementMetrics {
    let mut metrics = EngagementMetrics::default();

    for cap in METRICS_REGEX.captures_iter(text) {
        if let (Some(num_match), Some(type_match)) = (cap.get(1), cap.get(2)) {
            let num_str = num_match.as_str().replace([',', '.'], "");
            let type_str = type_match.as_str().to_lowercase();

            // Parse number with K/M/B suffix
            let value = parse_metric_number(&num_str);

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
fn parse_metric_number(s: &str) -> u64 {
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

    let num_part: String = s
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.')
        .collect();
    (num_part.parse::<f64>().unwrap_or(0.0) * multiplier) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metric_parsing() {
        assert_eq!(parse_metric_number("1K"), 1000);
        assert_eq!(parse_metric_number("2.5M"), 2_500_000);
        assert_eq!(parse_metric_number("100"), 100);
    }
}
