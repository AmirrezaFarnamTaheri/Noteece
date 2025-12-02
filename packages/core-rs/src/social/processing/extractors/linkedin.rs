use super::super::patterns::*;
use super::super::types::CapturedPost;
use super::extract_engagement;
use ulid::Ulid;

pub fn extract_linkedin_post(snapshot: &[&String]) -> Option<CapturedPost> {
    for i in (0..snapshot.len().saturating_sub(3)).rev() {
        let end = (i + 6).min(snapshot.len());
        let window: Vec<&str> = snapshot[i..end].iter().map(|s| s.as_str()).collect();

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
                    original_timestamp: TIME_REGEX
                        .find(&combined)
                        .map(|m| m.as_str().to_string()),
                });
            }
        }
    }
    None
}
