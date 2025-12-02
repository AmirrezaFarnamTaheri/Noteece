use super::super::patterns::*;
use super::super::types::CapturedPost;
use super::extract_engagement;
use ulid::Ulid;

pub fn extract_twitter_post(snapshot: &[&String]) -> Option<CapturedPost> {
    // Twitter pattern: @handle • time • content • metrics
    for i in (0..snapshot.len().saturating_sub(3)).rev() {
        let end = (i + 4).min(snapshot.len());
        let window: Vec<&str> = snapshot[i..end].iter().map(|s| s.as_str()).collect();

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

                let engagement = extract_engagement(&combined);
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
