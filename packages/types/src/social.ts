/**
 * Social Media Suite Types
 *
 * TypeScript definitions matching the Rust structs in packages/core-rs/src/social/
 */

export interface SocialAccount {
  id: string;
  space_id: string;
  platform: string;
  username: string;
  display_name: string | null;
  enabled: boolean;
  last_sync: number | null;
  sync_frequency_minutes: number;
  created_at: number;
}

export interface Engagement {
  likes: number | null;
  shares: number | null;
  comments: number | null;
  views: number | null;
}

export interface SocialPost {
  id: string;
  account_id: string;
  platform: string;
  platform_post_id: string | null;
  author: string;
  author_handle: string | null;
  content: string | null;
  content_html: string | null;
  media_urls: string[];
  timestamp: number;
  fetched_at: number;
  engagement: Engagement;
  post_type: string | null;
  reply_to: string | null;
}

export interface TimelinePost {
  id: string;
  platform: string;
  account_username: string;
  author: string;
  author_handle: string | null;
  content: string | null;
  timestamp: number;
  engagement: Engagement;
  categories: string[];
  media_urls: string[];
  post_type: string | null;
}

export interface TimelineFilters {
  platforms?: string[];
  categories?: string[];
  after?: number;
  before?: number;
  limit?: number;
}

export interface SocialCategory {
  id: string;
  space_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: number;
}

export interface TimelineStats {
  total_posts: number;
  platforms_count: number;
  categories_count: number;
  today_posts: number;
  this_week_posts: number;
}

export type Platform =
  | 'twitter'
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'reddit'
  | 'linkedin'
  | 'tiktok'
  | 'discord'
  | 'telegram'
  | 'whatsapp'
  | 'spotify'
  | 'soundcloud'
  | 'pinterest'
  | 'snapchat'
  | 'mastodon'
  | 'bluesky';

export interface PlatformInfo {
  id: Platform;
  name: string;
  icon: string;
  color: string;
  supportsMultipleAccounts: boolean;
  authMethod: 'oauth' | 'password' | 'token' | 'cookies';
}

export const SUPPORTED_PLATFORMS: Record<Platform, PlatformInfo> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    icon: '𝕏',
    color: '#1DA1F2',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  reddit: {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    color: '#FF4500',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    supportsMultipleAccounts: false,
    authMethod: 'oauth',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: '💬',
    color: '#5865F2',
    supportsMultipleAccounts: false,
    authMethod: 'token',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: '#0088CC',
    supportsMultipleAccounts: true,
    authMethod: 'token',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    supportsMultipleAccounts: false,
    authMethod: 'cookies',
  },
  spotify: {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎧',
    color: '#1DB954',
    supportsMultipleAccounts: false,
    authMethod: 'oauth',
  },
  soundcloud: {
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: '🎵',
    color: '#FF5500',
    supportsMultipleAccounts: false,
    authMethod: 'oauth',
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: '📌',
    color: '#E60023',
    supportsMultipleAccounts: false,
    authMethod: 'oauth',
  },
  snapchat: {
    id: 'snapchat',
    name: 'Snapchat',
    icon: '👻',
    color: '#FFFC00',
    supportsMultipleAccounts: false,
    authMethod: 'oauth',
  },
  mastodon: {
    id: 'mastodon',
    name: 'Mastodon',
    icon: '🐘',
    color: '#6364FF',
    supportsMultipleAccounts: true,
    authMethod: 'oauth',
  },
  bluesky: {
    id: 'bluesky',
    name: 'Bluesky',
    icon: '🦋',
    color: '#1185FE',
    supportsMultipleAccounts: false,
    authMethod: 'password',
  },
};
