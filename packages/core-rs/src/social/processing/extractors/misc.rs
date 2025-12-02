use super::super::patterns::*;
use super::super::types::{CapturedPost, DetectedPlatform, EngagementMetrics};
use super::extract_engagement;
use regex::Regex;
use ulid::Ulid;

pub fn extract_dating_profile(
    snapshot: &[&String],
    platform: DetectedPlatform,
) -> Option<CapturedPost> {
    let combined = snapshot
        .iter()
        .map(|s| s.as_str())
        .collect::<Vec<_>>()
        .join("\n");

    // Look for name + age pattern common in dating apps
    let name_age_pattern = Regex::new(r"([A-Z][a-z]+),?\s*(\d{2})").ok()?;

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

pub fn extract_article_content(
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
    let author_pattern = Regex::new(r"(?i)by\s+([A-Z][a-z]+ [A-Z][a-z]+)").ok()?;
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
        engagement: extract_engagement(&combined),
        hashtags: vec![],
        urls: URL_REGEX
            .find_iter(&combined)
            .map(|m| m.as_str().to_string())
            .collect(),
        raw_context_blob: Some(combined),
        original_timestamp: None,
    })
}

pub fn extract_generic_post(
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
            let mut handle = TWITTER_HANDLE
                .find(&combined)
                .or_else(|| REDDIT_HANDLE.find(&combined))
                .or_else(|| TELEGRAM_HANDLE.find(&combined))
                .map(|m| m.as_str().to_string());

            // Platform specific patch: if detected platform is Twitter but no handle found via generic regex, try Twitter regex again
            if handle.is_none() && platform == DetectedPlatform::Twitter {
                handle = TWITTER_HANDLE
                    .find(&combined)
                    .map(|m| m.as_str().to_string());
            }

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
                engagement: extract_engagement(&combined),
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
