// Social Media Suite - Core Module
//
// This module provides local-first social media aggregation and management
// with zero infrastructure costs. All data is stored in an encrypted SQLite vault.

pub mod account;
pub mod post;
pub mod category;
pub mod timeline;
pub mod webview;
pub mod sync;
pub mod analytics;
pub mod intelligence;

// Re-export commonly used types
pub use account::{
    SocialAccount, SocialError, add_social_account, get_social_accounts,
    get_social_account, update_social_account, delete_social_account,
    get_decrypted_credentials, update_last_sync, get_accounts_needing_sync,
};

pub use post::{
    SocialPost, Engagement, store_social_posts, get_social_posts,
    search_social_posts, delete_old_posts, get_post_statistics,
};

pub use category::{
    SocialCategory, CategoryFilters, create_category, get_categories,
    get_category, update_category, delete_category, assign_category,
    remove_category, get_post_categories, auto_categorize_posts,
};

pub use timeline::{
    TimelinePost, TimelineFilters, TimelineStats, get_unified_timeline,
    get_category_timeline, get_platform_timeline, get_timeline_stats,
};

pub use webview::{
    WebViewSession, create_webview_session, get_webview_session,
    save_session_cookies, save_session_data, get_session_cookies,
    get_session_data, update_session_last_used, delete_webview_session,
    delete_account_sessions, get_platform_url, get_platform_display_name,
};

pub use sync::{
    SyncTask, SyncStatus, SyncStats, get_accounts_needing_sync,
    get_all_sync_tasks, start_sync, complete_sync, fail_sync,
    get_sync_history, get_sync_stats,
};

pub use analytics::{
    AnalyticsOverview, PlatformStats, TimeSeriesPoint, CategoryStats,
    EngagementStats, TopPost, get_analytics_overview,
};

pub use intelligence::{
    ContentInsight, Sentiment, AutoCategorizationRule, RuleType,
    analyze_post_content, auto_categorize_posts, create_auto_rule,
};
