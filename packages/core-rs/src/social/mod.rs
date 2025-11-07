// Social Media Suite - Core Module
//
// This module provides local-first social media aggregation and management
// with zero infrastructure costs. All data is stored in an encrypted SQLite vault.

pub mod account;
pub mod post;
pub mod category;
pub mod timeline;

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
