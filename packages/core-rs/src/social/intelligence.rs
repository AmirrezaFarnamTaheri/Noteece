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
    let sentiment = detect_sentiment(content);
    let topics = extract_topics(content);
    let summary = generate_summary(content);

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

    let positive_count = positive_words
        .iter()
        .filter(|word| content_lower.contains(word))
        .count();

    let negative_count = negative_words
        .iter()
        .filter(|word| content_lower.contains(word))
        .count();

    if positive_count > 0 && negative_count > 0 {
        Sentiment::Mixed
    } else if positive_count > negative_count {
        Sentiment::Positive
    } else if negative_count > positive_count {
        Sentiment::Negative
    } else {
        Sentiment::Neutral
    }
}

/// Extract topics from content using keyword analysis
fn extract_topics(content: &str) -> Vec<String> {
    let mut topics = Vec::new();
    let content_lower = content.to_lowercase();

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

    for (topic, keywords) in topic_keywords {
        let matches = keywords
            .iter()
            .filter(|keyword| content_lower.contains(keyword))
            .count();

        if matches > 0 {
            topics.push(topic.to_string());
        }
    }

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
    let categories = get_categories(conn, space_id)?;
    let mut categorized = 0;

    // Get uncategorized posts
    let mut stmt = conn.prepare(
        "SELECT p.id, p.content, p.author, p.platform
         FROM social_post p
         JOIN social_account a ON p.account_id = a.id
         WHERE a.space_id = ?1
           AND p.id NOT IN (
               SELECT post_id FROM social_post_category
           )
         LIMIT 100",
    )?;

    let posts: Vec<(String, Option<String>, String, String)> = stmt
        .query_map([space_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .filter_map(Result::ok)
        .collect();

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

    Ok(id)
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_topic_extraction() {
        let topics = extract_topics("Just finished coding a new algorithm for AI");
        assert!(topics.contains(&"tech".to_string()));

        let topics = extract_topics("Going on vacation to Paris");
        assert!(topics.contains(&"travel".to_string()));
    }

    #[test]
    fn test_summary_generation() {
        let content = "This is a test. It should only return the first sentence.";
        let summary = generate_summary(content);
        assert_eq!(summary, Some("This is a test.".to_string()));
    }
}
