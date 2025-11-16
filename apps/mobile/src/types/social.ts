/**
 * Social Media Suite Types for Mobile
 *
 * Type definitions matching the desktop implementation
 * for social media aggregation and management.
 */

// ===== Social Account Types =====

export interface SocialAccount {
  id: string;
  space_id: string;
  platform: Platform;
  username: string;
  display_name?: string;
  credentials_encrypted: Uint8Array;
  enabled: boolean;
  sync_frequency_minutes: number;
  last_sync?: number;
  created_at: number;
}

export type Platform =
  | "twitter"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "reddit"
  | "facebook"
  | "pinterest"
  | "tumblr"
  | "medium"
  | "mastodon"
  | "bluesky"
  | "threads"
  | "slack"
  | "discord"
  | "telegram"
  | "whatsapp"
  | "tinder";

// ===== Social Post Types =====

export interface SocialPost {
  id: string;
  account_id: string;
  platform: Platform;
  platform_post_id?: string;
  author: string;
  author_avatar?: string;
  content?: string;
  content_html?: string;
  url?: string;
  media_urls?: string[]; // Stored as JSON string in DB
  engagement?: PostEngagement;
  created_at: number; // Timestamp when post was created on platform
  collected_at: number; // Timestamp when we collected it
}

export interface PostEngagement {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

// ===== Timeline Post (with metadata) =====

export interface TimelinePost extends SocialPost {
  categories: SocialCategory[];
  account_username: string;
  account_display_name?: string;
}

// ===== Social Category Types =====

export interface SocialCategory {
  id: string;
  space_id: string;
  name: string;
  color?: string;
  icon?: string;
  filters?: CategoryFilters;
  created_at: number;
}

export interface CategoryFilters {
  platforms?: Platform[];
  authors?: string[];
  keywords?: string[];
}

export interface PostCategory {
  post_id: string;
  category_id: string;
  assigned_at: number;
  assigned_by: "user" | "auto" | "ai";
}

// ===== Focus Mode Types =====

export interface FocusMode {
  id: string;
  space_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  blocked_platforms: Platform[];
  allowed_platforms: Platform[];
  created_at: number;
}

// ===== Automation Rule Types =====

export interface AutomationRule {
  id: string;
  space_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_value: string;
  action_type: ActionType;
  action_value: string;
  enabled: boolean;
  created_at: number;
}

export type TriggerType =
  | "time_of_day"
  | "day_of_week"
  | "platform_open"
  | "category_post";

export type ActionType =
  | "activate_focus_mode"
  | "disable_sync"
  | "send_notification"
  | "auto_categorize";

// ===== Auto Categorization Rule Types =====

export interface AutoCategoryRule {
  id: string;
  category_id: string;
  rule_type: RuleType;
  pattern: string;
  priority: number;
  created_at: number;
}

export type RuleType =
  | "author_contains"
  | "content_contains"
  | "platform_equals"
  | "hashtag_contains"
  | "url_contains";

// ===== Sync History Types =====

export interface SyncHistory {
  id: string;
  account_id: string;
  sync_time: number;
  posts_synced: number;
  sync_duration_ms: number;
  status: "in_progress" | "completed" | "failed";
}

// ===== Content Insight Types (from intelligence module) =====

export interface ContentInsight {
  post_id: string;
  sentiment: Sentiment;
  topics: string[];
  suggested_categories: string[];
  summary?: string;
}

export type Sentiment = "positive" | "negative" | "neutral" | "mixed";

// ===== Analytics Types =====

export interface PlatformStats {
  platform: Platform;
  post_count: number;
  percentage: number;
  color: string;
}

export interface CategoryStats {
  category_id: string;
  category_name: string;
  post_count: number;
  color?: string;
}

export interface ActivityStats {
  date: string;
  post_count: number;
  platforms: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [_key in Platform]?: number;
  };
}

export interface SocialAnalytics {
  total_posts: number;
  total_accounts: number;
  total_categories: number;
  platform_breakdown: PlatformStats[];
  category_breakdown: CategoryStats[];
  activity_timeline: ActivityStats[];
  most_active_accounts: {
    username: string;
    platform: Platform;
    post_count: number;
  }[];
}

// ===== Filter Types =====

export interface TimelineFilters {
  platforms?: Platform[];
  categories?: string[];
  authors?: string[];
  search_query?: string;
  time_range?: {
    start: number;
    end: number;
  };
}

// ===== Platform Configuration =====

export interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  url_pattern: RegExp;
  requires_auth: boolean;
}

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  twitter: {
    name: "Twitter/X",
    icon: "🐦",
    color: "#1DA1F2",
    url_pattern: /twitter\.com|x\.com/,
    requires_auth: true,
  },
  instagram: {
    name: "Instagram",
    icon: "📷",
    color: "#E4405F",
    url_pattern: /instagram\.com/,
    requires_auth: true,
  },
  tiktok: {
    name: "TikTok",
    icon: "🎵",
    color: "#000000",
    url_pattern: /tiktok\.com/,
    requires_auth: true,
  },
  youtube: {
    name: "YouTube",
    icon: "📺",
    color: "#FF0000",
    url_pattern: /youtube\.com/,
    requires_auth: false,
  },
  linkedin: {
    name: "LinkedIn",
    icon: "💼",
    color: "#0A66C2",
    url_pattern: /linkedin\.com/,
    requires_auth: true,
  },
  reddit: {
    name: "Reddit",
    icon: "🤖",
    color: "#FF4500",
    url_pattern: /reddit\.com/,
    requires_auth: false,
  },
  facebook: {
    name: "Facebook",
    icon: "👍",
    color: "#1877F2",
    url_pattern: /facebook\.com/,
    requires_auth: true,
  },
  pinterest: {
    name: "Pinterest",
    icon: "📌",
    color: "#E60023",
    url_pattern: /pinterest\.com/,
    requires_auth: false,
  },
  tumblr: {
    name: "Tumblr",
    icon: "📝",
    color: "#36465D",
    url_pattern: /tumblr\.com/,
    requires_auth: true,
  },
  medium: {
    name: "Medium",
    icon: "✍️",
    color: "#000000",
    url_pattern: /medium\.com/,
    requires_auth: false,
  },
  mastodon: {
    name: "Mastodon",
    icon: "🐘",
    color: "#6364FF",
    url_pattern: /mastodon/,
    requires_auth: true,
  },
  bluesky: {
    name: "Bluesky",
    icon: "🦋",
    color: "#0085FF",
    url_pattern: /bsky\.app/,
    requires_auth: true,
  },
  threads: {
    name: "Threads",
    icon: "🧵",
    color: "#000000",
    url_pattern: /threads\.net/,
    requires_auth: true,
  },
  slack: {
    name: "Slack",
    icon: "💬",
    color: "#4A154B",
    url_pattern: /slack\.com/,
    requires_auth: true,
  },
  discord: {
    name: "Discord",
    icon: "🎮",
    color: "#5865F2",
    url_pattern: /discord\.com/,
    requires_auth: true,
  },
  telegram: {
    name: "Telegram",
    icon: "✈️",
    color: "#0088CC",
    url_pattern: /t\.me/,
    requires_auth: true,
  },
  whatsapp: {
    name: "WhatsApp",
    icon: "💚",
    color: "#25D366",
    url_pattern: /whatsapp\.com/,
    requires_auth: true,
  },
  tinder: {
    name: "Tinder",
    icon: "🔥",
    color: "#FE3C72",
    url_pattern: /tinder\.com/,
    requires_auth: true,
  },
};
