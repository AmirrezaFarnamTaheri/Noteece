use core_rs::social::processing::extractors::detect_platform;
use core_rs::social::processing::extractors::extract_engagement;
use core_rs::social::processing::types::DetectedPlatform;

#[test]
fn test_detect_platform_twitter_url() {
    assert!(matches!(
        detect_platform("https://twitter.com/user/status/123"),
        DetectedPlatform::Twitter
    ));
}

#[test]
fn test_detect_platform_x_com_url() {
    assert!(matches!(
        detect_platform("https://x.com/user/status/123"),
        DetectedPlatform::Twitter
    ));
}

#[test]
fn test_detect_platform_instagram_url() {
    assert!(matches!(
        detect_platform("https://instagram.com/p/abc123"),
        DetectedPlatform::Instagram
    ));
}

#[test]
fn test_detect_platform_linkedin_url() {
    assert!(matches!(
        detect_platform("https://linkedin.com/posts/user-activity-123"),
        DetectedPlatform::LinkedIn
    ));
}

#[test]
fn test_detect_platform_reddit_url() {
    assert!(matches!(
        detect_platform("https://reddit.com/r/programming/comments/abc"),
        DetectedPlatform::Reddit
    ));
}

#[test]
fn test_detect_platform_unknown() {
    assert!(matches!(
        detect_platform("https://example.com/some-page"),
        DetectedPlatform::Unknown
    ));
}

#[test]
fn test_detect_platform_empty_string() {
    assert!(matches!(detect_platform(""), DetectedPlatform::Unknown));
}

#[test]
fn test_extract_engagement_returns_default() {
    let metrics = extract_engagement("some text with 100 likes and 50 retweets");
    assert_eq!(metrics.likes, None);
    assert_eq!(metrics.comments, None);
    assert_eq!(metrics.shares, None);
    assert_eq!(metrics.views, None);
}

#[test]
fn test_detected_platform_display() {
    assert_eq!(DetectedPlatform::Twitter.to_string(), "twitter");
    assert_eq!(DetectedPlatform::Instagram.to_string(), "instagram");
    assert_eq!(DetectedPlatform::Reddit.to_string(), "reddit");
    assert_eq!(DetectedPlatform::Unknown.to_string(), "unknown");
}

#[test]
fn test_detected_platform_is_messaging() {
    assert!(DetectedPlatform::Telegram.is_messaging());
    assert!(DetectedPlatform::Discord.is_messaging());
    assert!(!DetectedPlatform::Twitter.is_messaging());
    assert!(!DetectedPlatform::Unknown.is_messaging());
}

#[test]
fn test_detected_platform_is_dating() {
    assert!(DetectedPlatform::Tinder.is_dating());
    assert!(DetectedPlatform::Bumble.is_dating());
    assert!(!DetectedPlatform::Twitter.is_dating());
    assert!(!DetectedPlatform::Unknown.is_dating());
}

#[test]
fn test_detected_platform_is_social() {
    assert!(DetectedPlatform::Twitter.is_social());
    assert!(DetectedPlatform::Instagram.is_social());
    assert!(DetectedPlatform::Reddit.is_social());
    assert!(!DetectedPlatform::Telegram.is_social());
    assert!(!DetectedPlatform::Unknown.is_social());
}

#[test]
fn test_detect_platform_reddit_handle_pattern() {
    assert!(matches!(
        detect_platform("u/testredditor Posted by u/testredditor"),
        DetectedPlatform::Reddit
    ));
}

#[test]
fn test_detect_platform_twitter_at_handle() {
    assert!(matches!(
        detect_platform("@user Retweets and stuff"),
        DetectedPlatform::Twitter
    ));
}
