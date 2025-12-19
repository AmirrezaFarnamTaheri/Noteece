//! Stream Processor - Heuristic Engine for Noteece Prime
//!
//! This module implements the core pattern-matching system for unstructured text capture
//! from the Android Accessibility Service. It uses regex heuristics to reconstruct
//! structured social media posts from raw UI text.

use super::processing::extractors::detect_platform;
use super::processing::extractors::instagram::extract_instagram_post;
use super::processing::extractors::linkedin::extract_linkedin_post;
use super::processing::extractors::media::{extract_tiktok_content, extract_youtube_content};
use super::processing::extractors::messaging::{
    extract_chat_message, extract_discord_message, extract_telegram_message,
};
use super::processing::extractors::misc::{
    extract_article_content, extract_dating_profile, extract_generic_post,
};
use super::processing::extractors::reddit::extract_reddit_post;
use super::processing::extractors::twitter::extract_twitter_post;
use super::processing::types::{CapturedPost, DetectedPlatform};
use std::collections::VecDeque;

/// Platform extraction rule configuration
struct PlatformRule {
    platform: DetectedPlatform,
    extractor: fn(&[&String]) -> Option<CapturedPost>,
}

/// Helper for platforms that require platform-aware extraction (like generic messaging/dating)
struct PlatformAwareRule {
    platform: DetectedPlatform,
    extractor: fn(&[&String], DetectedPlatform) -> Option<CapturedPost>,
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
            // Skip empty lines and very short noise, but allow 2 chars for "1h", "2m", etc.
            if trimmed.len() >= 2 {
                if self.buffer.len() >= self.buffer_size {
                    self.buffer.pop_front();
                }
                self.buffer.push_back(trimmed.to_string());
                log::trace!("[StreamProcessor] Ingested line: {}", trimmed);
            } else {
                log::trace!("[StreamProcessor] Skipped short line: {}", trimmed);
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
        let platform = detect_platform(
            &snapshot
                .iter()
                .map(|s| s.as_str())
                .collect::<Vec<_>>()
                .join("\n"),
        );

        // Define extraction rules
        const RULES: &[PlatformRule] = &[
            PlatformRule {
                platform: DetectedPlatform::Twitter,
                extractor: extract_twitter_post,
            },
            PlatformRule {
                platform: DetectedPlatform::Instagram,
                extractor: extract_instagram_post,
            },
            PlatformRule {
                platform: DetectedPlatform::LinkedIn,
                extractor: extract_linkedin_post,
            },
            PlatformRule {
                platform: DetectedPlatform::Reddit,
                extractor: extract_reddit_post,
            },
            PlatformRule {
                platform: DetectedPlatform::Telegram,
                extractor: extract_telegram_message,
            },
            PlatformRule {
                platform: DetectedPlatform::Discord,
                extractor: extract_discord_message,
            },
            PlatformRule {
                platform: DetectedPlatform::YouTube,
                extractor: extract_youtube_content,
            },
            PlatformRule {
                platform: DetectedPlatform::TikTok,
                extractor: extract_tiktok_content,
            },
        ];

        // Define aware rules (require platform arg)
        const AWARE_RULES: &[PlatformAwareRule] = &[
            PlatformAwareRule {
                platform: DetectedPlatform::Tinder,
                extractor: extract_dating_profile,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::Bumble,
                extractor: extract_dating_profile,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::Hinge,
                extractor: extract_dating_profile,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::Browser,
                extractor: extract_article_content,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::Medium,
                extractor: extract_article_content,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::HackerNews,
                extractor: extract_article_content,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::WhatsApp,
                extractor: extract_chat_message,
            },
            PlatformAwareRule {
                platform: DetectedPlatform::Signal,
                extractor: extract_chat_message,
            },
        ];

        // Match platform to rule
        if let Some(rule) = RULES.iter().find(|r| r.platform == platform) {
            return (rule.extractor)(&snapshot);
        }

        if let Some(rule) = AWARE_RULES.iter().find(|r| r.platform == platform) {
            return (rule.extractor)(&snapshot, platform);
        }

        // Default generic fallback
        extract_generic_post(&snapshot, platform)
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

        let input = "@elonmusk\n2h ago\nJust had a great meeting about the future of technology! #tech #innovation\n1.5K Likes • 234 Retweets";
        processor.ingest(input);

        let candidate = processor.get_latest_candidate();
        assert!(candidate.is_some());

        let post = candidate.expect("Candidate should be present");
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

        let post = candidate.expect("Candidate should be present");
        assert_eq!(post.platform, "reddit");
        assert!(post
            .author_handle
            .as_ref()
            .expect("Author handle should be present")
            .starts_with("u/"));
    }

    #[test]
    fn test_deduplication() {
        let mut processor = StreamProcessor::new();

        // Use content that is explicitly detected as Twitter by platform detection logic
        // to avoid ambiguity between "generic" (no handle found) and "twitter" (handle found).
        // Adding #Retweet makes platform detection score higher for Twitter.
        let input =
            "@testuser\n1h\nThis is a test post with enough content to be detected.\n#Retweet 100 Likes";
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
}
