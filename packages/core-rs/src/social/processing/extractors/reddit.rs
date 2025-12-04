use super::super::patterns::*;
use super::super::types::CapturedPost;
use super::extract_engagement;
use ulid::Ulid;

pub fn extract_reddit_post(snapshot: &[&String]) -> Option<CapturedPost> {
    for i in (0..snapshot.len().saturating_sub(3)).rev() {
        let end = (i + 5).min(snapshot.len());
        let window: Vec<&str> = snapshot[i..end].iter().map(|s| s.as_str()).collect();

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
                    engagement: extract_engagement(&combined),
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
    }
    None
}
