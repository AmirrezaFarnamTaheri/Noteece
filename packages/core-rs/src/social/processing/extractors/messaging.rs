use super::super::patterns::*;
use super::super::types::{CapturedPost, DetectedPlatform, EngagementMetrics};
use ulid::Ulid;

pub fn extract_telegram_message(snapshot: &[&String]) -> Option<CapturedPost> {
    for i in (0..snapshot.len().saturating_sub(2)).rev() {
        let end = (i + 4).min(snapshot.len());
        let window: Vec<&str> = snapshot[i..end].iter().map(|s| s.as_str()).collect();

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

pub fn extract_discord_message(snapshot: &[&String]) -> Option<CapturedPost> {
    for i in (0..snapshot.len().saturating_sub(2)).rev() {
        let end = (i + 4).min(snapshot.len());
        let window: Vec<&str> = snapshot[i..end].iter().map(|s| s.as_str()).collect();

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

pub fn extract_chat_message(
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
