// Social Media Suite Module
//
// This module provides local-first social media aggregation with zero infrastructure costs.
// All data is stored locally in an encrypted SQLite vault, with support for multiple accounts
// per platform and cross-platform categorization.

pub mod account;
pub mod post;
pub mod category;
pub mod timeline;

pub use account::{
    SocialAccount, add_social_account, get_social_accounts, get_social_account,
    update_social_account, delete_social_account, SocialError,
};
pub use post::{SocialPost, Engagement, store_social_posts, get_social_posts};
pub use category::{SocialCategory, create_category, get_categories, assign_category};
pub use timeline::{TimelinePost, get_unified_timeline, TimelineFilters};
