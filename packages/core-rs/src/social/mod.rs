// Social Media Suite - Core Module
//
// This module provides local-first social media aggregation and management
// with zero infrastructure costs. All data is stored in an encrypted SQLite vault.

pub mod account;
pub mod analytics;
pub mod backup;
pub mod category;
pub mod focus;
pub mod inference;
pub mod intelligence;
pub mod maintenance;
pub mod post;
pub mod selector_verification;
pub mod stream_processor;
pub mod sync;
pub mod timeline;
pub mod webview;

// Re-export commonly used types
pub use account::{
    add_social_account, delete_social_account, get_decrypted_credentials, get_social_account,
    get_social_accounts, update_last_sync, update_social_account, SocialAccount, SocialError,
};

pub use backup::{Backup, BackupError, BackupMetadata, BackupService};

pub use post::{
    delete_old_posts, get_post_statistics, get_social_posts, search_social_posts,
    store_social_posts, Engagement, SocialPost,
};

pub use category::{
    assign_category, create_category, delete_category, get_categories, get_category,
    get_post_categories, remove_category, update_category, CategoryFilters, SocialCategory,
};

pub use timeline::{
    get_category_timeline, get_platform_timeline, get_timeline_stats, get_unified_timeline,
    TimelineFilters, TimelinePost, TimelineStats,
};

pub use webview::{
    create_webview_session, delete_account_sessions, delete_webview_session,
    get_platform_display_name, get_platform_url, get_session_cookies, get_session_data,
    get_webview_session, save_session_cookies, save_session_data, update_session_last_used,
    WebViewSession,
};

pub use sync::{
    complete_sync, fail_sync, get_accounts_needing_sync, get_all_sync_tasks, get_sync_history,
    get_sync_stats, start_sync, SyncStats, SyncStatus, SyncTask,
};

pub use analytics::{
    get_analytics_overview, AnalyticsOverview, CategoryStats, EngagementStats, PlatformStats,
    TimeSeriesPoint, TopPost,
};

pub use intelligence::{
    analyze_post_content, auto_categorize_posts, create_auto_rule, AutoCategorizationRule,
    ContentInsight, RuleType, Sentiment,
};

pub use inference::{InferenceEngine, InferenceError, InferenceResult};

pub use focus::{
    activate_focus_mode, create_automation_rule, create_focus_mode, create_preset_focus_modes,
    deactivate_all_focus_modes, delete_focus_mode, get_automation_rules, get_focus_modes,
    is_platform_blocked, toggle_automation_rule, ActionType, AutomationRule, FocusMode, TimeLimit,
    TriggerType,
};

pub use maintenance::{prune_old_posts, run_startup_maintenance, MaintenanceResult};

pub use selector_verification::{
    load_verified_selectors, get_bundled_selectors, SignedSelectors, VerificationError,
};
