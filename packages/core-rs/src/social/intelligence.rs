/**
 * Social Intelligence Module
 *
 * Provides intelligent categorization, sentiment analysis, and content insights
 * using rule-based and ML approaches.
 */
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::account::SocialError;
use super::category::{assign_category, get_categories};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentInsight {
    pub post_id: String,
    pub sentiment: Sentiment,
    pub topics: Vec<String>,
    pub suggested_categories: Vec<String>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Sentiment {
    Positive,
    Negative,
    Neutral,
    Mixed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoCategorizationRule {
    pub id: String,
    pub category_id: String,
    pub rule_type: RuleType,
    pub pattern: String,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RuleType {
    AuthorContains,
    ContentContains,
    PlatformEquals,
    HashtagContains,
    UrlContains,
}

/// Analyze post content and generate insights
pub fn analyze_post_content(content: &str, author: &str, platform: &str) -> ContentInsight {
    log::debug!(
        "[Social::Intelligence] Analyzing post content - author: {}, platform: {}, content_len: {}",
        author,
        platform,
        content.len()
    );

    let sentiment = detect_sentiment(content);
    let topics = extract_topics(content);
    let summary = generate_summary(content);

    log::info!(
        "[Social::Intelligence] Analysis complete - sentiment: {:?}, topics: {:?}",
        sentiment,
        topics
    );

    ContentInsight {
        post_id: String::new(), // Will be set by caller
        sentiment,
        topics,
        suggested_categories: Vec::new(), // Will be populated by categorization
        summary,
    }
}

/// Rule-based sentiment detection
fn detect_sentiment(content: &str) -> Sentiment {
    let content_lower = content.to_lowercase();

    // Positive indicators
    let positive_words = [
        "love",
        "great",
        "amazing",
        "excellent",
        "wonderful",
        "fantastic",
        "happy",
        "joy",
        "success",
        "excited",
        "beautiful",
        "perfect",
        "awesome",
        "brilliant",
        "glad",
        "thank",
        "congrat",
    ];

    // Negative indicators
    let negative_words = [
        "hate",
        "terrible",
        "awful",
        "bad",
        "worst",
        "angry",
        "sad",
        "disappoint",
        "fail",
        "problem",
        "issue",
        "concern",
        "worry",
        "unfortunate",
        "upset",
        "frustrat",
    ];

    // Tokenize into lowercase alphanumeric words
    let tokens: Vec<String> = content_lower
        .split(|c: char| !c.is_alphanumeric())
        .filter(|t| !t.is_empty())
        .map(|s| s.to_string())
        .collect();

    // Allow prefix matching for stemmed lists (e.g., "frustrat" -> "frustrating")
    let has_prefix = |list: &[&str]| -> usize {
        tokens
            .iter()
            .filter(|tok| list.iter().any(|w| tok.starts_with(w)))
            .count()
    };

    let positive_count = has_prefix(&positive_words);
    let negative_count = has_prefix(&negative_words);

    let sentiment = if positive_count > 0 && negative_count > 0 {
        Sentiment::Mixed
    } else if positive_count > negative_count {
        Sentiment::Positive
    } else if negative_count > positive_count {
        Sentiment::Negative
    } else {
        Sentiment::Neutral
    };

    log::debug!(
        "[Social::Intelligence] Sentiment detected: {:?} (positive: {}, negative: {})",
        sentiment,
        positive_count,
        negative_count
    );

    sentiment
}

/// Extract topics from content using keyword analysis
fn extract_topics(content: &str) -> Vec<String> {
    const MAX_CONTENT_LENGTH: usize = 10_000; // Cap content length for analysis
    const MAX_TOPICS: usize = 5; // Maximum topics to return
    const MIN_KEYWORD_MATCHES: usize = 1; // Minimum keyword matches for a topic

    let mut topics = Vec::new();

    // Normalize content: trim, lowercase, cap length
    let normalized_content = content.trim().to_lowercase();
    let content_lower = if normalized_content.len() > MAX_CONTENT_LENGTH {
        &normalized_content[..MAX_CONTENT_LENGTH]
    } else {
        &normalized_content
    };

    // Early return for empty content
    if content_lower.is_empty() {
        return topics;
    }

    // Topic keywords mapping
    let topic_keywords: HashMap<&str, Vec<&str>> = [
        (
            "tech",
            vec![
                "code",
                "programming",
                "software",
                "ai",
                "ml",
                "tech",
                "computer",
                "algorithm",
            ],
        ),
        (
            "work",
            vec![
                "work", "job", "career", "meeting", "project", "deadline", "office",
            ],
        ),
        (
            "health",
            vec![
                "health", "fitness", "workout", "exercise", "diet", "wellness",
            ],
        ),
        (
            "news",
            vec!["news", "breaking", "report", "announce", "update", "alert"],
        ),
        (
            "entertainment",
            vec!["movie", "music", "game", "show", "concert", "entertainment"],
        ),
        (
            "politics",
            vec![
                "politics",
                "government",
                "election",
                "policy",
                "vote",
                "senator",
            ],
        ),
        (
            "sports",
            vec![
                "sport", "game", "team", "player", "match", "score", "win", "lose",
            ],
        ),
        (
            "food",
            vec!["food", "recipe", "cook", "restaurant", "meal", "delicious"],
        ),
        (
            "travel",
            vec![
                "travel",
                "trip",
                "vacation",
                "flight",
                "hotel",
                "destination",
            ],
        ),
        (
            "business",
            vec![
                "business",
                "startup",
                "entrepreneur",
                "invest",
                "market",
                "finance",
            ],
        ),
    ]
    .iter()
    .cloned()
    .collect();

    // Score topics by keyword matches
    let mut topic_scores: Vec<(&str, usize)> = Vec::new();
    for (topic, keywords) in topic_keywords.iter() {
        let matches = keywords
            .iter()
            .filter(|keyword| content_lower.contains(keyword))
            .count();

        if matches >= MIN_KEYWORD_MATCHES {
            topic_scores.push((topic, matches));
        }
    }

    // Sort by number of matches (descending) and cap results
    topic_scores.sort_by(|a, b| b.1.cmp(&a.1));
    topics = topic_scores
        .into_iter()
        .take(MAX_TOPICS)
        .map(|(topic, _)| topic.to_string())
        .collect();

    log::debug!(
        "[Social::Intelligence] Extracted {} topics from {} chars: {:?}",
        topics.len(),
        content_lower.len(),
        topics
    );

    topics
}

/// Generate a simple summary (first 100 chars or first sentence)
fn generate_summary(content: &str) -> Option<String> {
    if content.is_empty() {
        return None;
    }

    // Try to find first sentence
    if let Some(end) = content.find(|c| c == '.' || c == '!' || c == '?') {
        let summary = &content[..=end];
        if summary.len() <= 150 {
            return Some(summary.to_string());
        }
    }

    // Fallback to first 100 characters
    let summary: String = content.chars().take(100).collect();
    if summary.len() < content.len() {
        Some(format!("{}...", summary))
    } else {
        Some(summary)
    }
}

/// Auto-categorize posts based on rules
pub fn auto_categorize_posts(conn: &Connection, space_id: &str) -> Result<usize, SocialError> {
    log::debug!(
        "[Social::Intelligence] Starting auto-categorization for space {}",
        space_id
    );

    let categories = get_categories(conn, space_id)?;
    let mut categorized = 0;

    // Get uncategorized posts
    let mut stmt = conn.prepare(
        "SELECT p.id, p.content, p.author, p.platform
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1
           AND NOT EXISTS (
               SELECT 1 FROM social_post_category spc
               WHERE spc.post_id = p.id
           )
         LIMIT 100",
    )?;

    let posts: Vec<(String, Option<String>, String, String)> = stmt
        .query_map([space_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .filter_map(Result::ok)
        .collect();

    log::debug!(
        "[Social::Intelligence] Found {} uncategorized posts to process",
        posts.len()
    );

    for (post_id, content_opt, author, platform) in posts {
        let content = content_opt.unwrap_or_default();
        let insight = analyze_post_content(&content, &author, &platform);

        // Match topics to categories
        for category in &categories {
            let category_name_lower = category.name.to_lowercase();

            // Check if any topic matches category name
            let has_topic_match = insight.topics.iter().any(|topic| {
                category_name_lower.contains(topic) || topic.contains(&category_name_lower)
            });

            // Platform-based categorization
            let is_work_platform = matches!(platform.as_str(), "linkedin" | "slack");
            let is_work_category = matches!(
                category.name.to_lowercase().as_str(),
                "work" | "professional" | "career"
            );

            if has_topic_match || (is_work_platform && is_work_category) {
                if assign_category(conn, &post_id, &category.id, Some("auto")).is_ok() {
                    categorized += 1;
                }
                break; // Only assign to first matching category
            }
        }
    }

    log::info!(
        "[Social::Intelligence] Auto-categorization complete for space {}: {} posts categorized out of {}",
        space_id,
        categorized,
        posts.len()
    );

    Ok(categorized)
}

/// Store categorization rule
pub fn create_auto_rule(
    conn: &Connection,
    category_id: &str,
    rule_type: RuleType,
    pattern: &str,
    priority: i32,
) -> Result<String, SocialError> {
    log::debug!(
        "[Social::Intelligence] Creating auto-categorization rule - category: {}, type: {:?}, pattern: {}, priority: {}",
        category_id,
        rule_type,
        pattern,
        priority
    );

    let id = ulid::Ulid::new().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    let rule_type_str = match rule_type {
        RuleType::AuthorContains => "author_contains",
        RuleType::ContentContains => "content_contains",
        RuleType::PlatformEquals => "platform_equals",
        RuleType::HashtagContains => "hashtag_contains",
        RuleType::UrlContains => "url_contains",
    };

    conn.execute(
        "INSERT INTO social_auto_rule (
            id, category_id, rule_type, pattern, priority, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![&id, category_id, rule_type_str, pattern, priority, now],
    )?;

    log::info!(
        "[Social::Intelligence] Created auto-categorization rule {} for category {}",
        id,
        category_id
    );

    Ok(id)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== Sentiment Detection Tests =====

    #[test]
    fn test_sentiment_detection() {
        assert_eq!(
            detect_sentiment("I love this amazing product!"),
            Sentiment::Positive
        );
        assert_eq!(
            detect_sentiment("This is terrible and awful"),
            Sentiment::Negative
        );
        assert_eq!(detect_sentiment("The weather is nice"), Sentiment::Neutral);
        assert_eq!(
            detect_sentiment("I love it but hate the price"),
            Sentiment::Mixed
        );
    }

    #[test]
    fn test_sentiment_edge_cases() {
        // Empty string
        assert_eq!(detect_sentiment(""), Sentiment::Neutral);

        // Multiple positive indicators
        assert_eq!(
            detect_sentiment("I'm so happy and excited about this wonderful news!"),
            Sentiment::Positive
        );

        // Multiple negative indicators
        assert_eq!(
            detect_sentiment("This is the worst, most disappointing failure ever"),
            Sentiment::Negative
        );

        // Case insensitivity
        assert_eq!(
            detect_sentiment("I LOVE this AMAZING product"),
            Sentiment::Positive
        );
        assert_eq!(
            detect_sentiment("i hate terrible things"),
            Sentiment::Negative
        );

        // Partial word matches
        assert_eq!(
            detect_sentiment("I congratulate you on your success"),
            Sentiment::Positive
        );
    }

    #[test]
    fn test_sentiment_neutral_content() {
        assert_eq!(
            detect_sentiment("The meeting is at 3pm tomorrow"),
            Sentiment::Neutral
        );
        assert_eq!(
            detect_sentiment("Please review the attached document"),
            Sentiment::Neutral
        );
        assert_eq!(detect_sentiment("1234567890"), Sentiment::Neutral);
    }

    // ===== Topic Extraction Tests =====

    #[test]
    fn test_topic_extraction() {
        let topics = extract_topics("Just finished coding a new algorithm for AI");
        assert!(topics.contains(&"tech".to_string()));

        let topics = extract_topics("Going on vacation to Paris");
        assert!(topics.contains(&"travel".to_string()));
    }

    #[test]
    fn test_topic_extraction_multiple_topics() {
        // Multiple topics in one post
        let topics =
            extract_topics("Just finished my workout at the gym, now heading to the office");
        assert!(topics.contains(&"health".to_string()));
        assert!(topics.contains(&"work".to_string()));

        // Business and tech overlap
        let topics = extract_topics("Our startup is building AI software for investors");
        assert!(topics.contains(&"business".to_string()));
        assert!(topics.contains(&"tech".to_string()));
    }

    #[test]
    fn test_topic_extraction_edge_cases() {
        // Empty string
        let topics = extract_topics("");
        assert_eq!(topics.len(), 0);

        // No matching keywords
        let topics = extract_topics("xyzabc123");
        assert_eq!(topics.len(), 0);

        // Case insensitivity
        let topics = extract_topics("PROGRAMMING AI MACHINE LEARNING");
        assert!(topics.contains(&"tech".to_string()));

        // Partial matches
        let topics = extract_topics("I'm a programmer working on algorithms");
        assert!(topics.contains(&"tech".to_string()));
        assert!(topics.contains(&"work".to_string()));
    }

    #[test]
    fn test_topic_extraction_all_categories() {
        // Tech
        assert!(extract_topics("coding software development").contains(&"tech".to_string()));

        // Work
        assert!(extract_topics("office meeting deadline").contains(&"work".to_string()));

        // Health
        assert!(extract_topics("fitness workout exercise").contains(&"health".to_string()));

        // News
        assert!(extract_topics("breaking news report").contains(&"news".to_string()));

        // Entertainment
        assert!(extract_topics("watching a movie concert").contains(&"entertainment".to_string()));

        // Politics
        assert!(extract_topics("election government policy").contains(&"politics".to_string()));

        // Sports
        assert!(extract_topics("team player match score").contains(&"sports".to_string()));

        // Food
        assert!(extract_topics("delicious recipe cooking").contains(&"food".to_string()));

        // Travel
        assert!(extract_topics("vacation trip destination").contains(&"travel".to_string()));

        // Business
        assert!(extract_topics("startup entrepreneur investment").contains(&"business".to_string()));
    }

    // ===== Summary Generation Tests =====

    #[test]
    fn test_summary_generation() {
        let content = "This is a test. It should only return the first sentence.";
        let summary = generate_summary(content);
        assert_eq!(summary, Some("This is a test.".to_string()));
    }

    #[test]
    fn test_summary_edge_cases() {
        // Empty string
        assert_eq!(generate_summary(""), None);

        // Short content without punctuation
        let summary = generate_summary("Hello world");
        assert_eq!(summary, Some("Hello world".to_string()));

        // Long content without sentence breaks
        let long_content = "a".repeat(200);
        let summary = generate_summary(&long_content);
        assert!(summary.is_some());
        assert!(summary.unwrap().ends_with("..."));

        // Content exactly 100 chars
        let content_100 = "a".repeat(100);
        let summary = generate_summary(&content_100);
        assert_eq!(summary, Some(content_100));
    }

    #[test]
    fn test_summary_different_terminators() {
        // Period
        let summary = generate_summary("First sentence. Second sentence.");
        assert_eq!(summary, Some("First sentence.".to_string()));

        // Exclamation mark
        let summary = generate_summary("Exciting news! More details follow.");
        assert_eq!(summary, Some("Exciting news!".to_string()));

        // Question mark
        let summary = generate_summary("Is this working? Yes it is.");
        assert_eq!(summary, Some("Is this working?".to_string()));
    }

    #[test]
    fn test_summary_truncation() {
        // First sentence too long (>150 chars)
        let long_sentence = format!("{}.", "a".repeat(200));
        let summary = generate_summary(&long_sentence);
        assert!(summary.is_some());
        let result = summary.unwrap();
        assert!(result.len() <= 103); // 100 chars + "..."
        assert!(result.ends_with("..."));
    }

    // ===== Content Insight Tests =====

    #[test]
    fn test_analyze_post_content() {
        let insight = analyze_post_content("I love coding AI algorithms!", "user123", "twitter");

        assert_eq!(insight.sentiment, Sentiment::Positive);
        assert!(insight.topics.contains(&"tech".to_string()));
        assert!(insight.summary.is_some());
        assert_eq!(insight.post_id, ""); // Set by caller
    }

    #[test]
    fn test_analyze_post_content_empty() {
        let insight = analyze_post_content("", "user123", "twitter");

        assert_eq!(insight.sentiment, Sentiment::Neutral);
        assert_eq!(insight.topics.len(), 0);
        assert_eq!(insight.summary, None);
    }

    #[test]
    fn test_analyze_post_content_complex() {
        let content = "Terrible news! Our startup's AI project failed due to poor planning. Very disappointing.";
        let insight = analyze_post_content(content, "founder", "linkedin");

        // Should be negative despite tech/business topics
        assert_eq!(insight.sentiment, Sentiment::Negative);

        // Should detect both business and tech topics
        assert!(insight.topics.contains(&"business".to_string()));
        assert!(insight.topics.contains(&"tech".to_string()));

        // Should have a summary
        assert!(insight.summary.is_some());
    }
}
