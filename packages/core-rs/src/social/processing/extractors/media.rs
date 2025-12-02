use super::super::patterns::*;
use super::super::types::CapturedPost;
use super::extract_engagement;
use ulid::Ulid;

pub fn extract_youtube_content(snapshot: &[&String]) -> Option<CapturedPost> {
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
        engagement: extract_engagement(&combined),
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

pub fn extract_tiktok_content(snapshot: &[&String]) -> Option<CapturedPost> {
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
        engagement: extract_engagement(&combined),
        hashtags: HASHTAG_REGEX
            .find_iter(&combined)
            .map(|m| m.as_str().to_string())
            .collect(),
        urls: vec![],
        raw_context_blob: Some(combined),
        original_timestamp: None,
    })
}
