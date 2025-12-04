/**
 * Social Config Service
 *
 * Connects the externalized social_selectors.json to the Desktop app's
 * WebView components for social media content capture.
 */

import { readTextFile } from '@tauri-apps/api/fs';
import { resolveResource } from '@tauri-apps/api/path';
import { logger } from '@/utils/logger';

export interface PlatformSelectors {
  timeline?: string;
  feed?: string;
  post: string;
  postText?: string;
  postTitle?: string;
  author?: string;
  timestamp?: string;
  likeButton?: string;
  commentButton?: string;
  retweetButton?: string;
  replyButton?: string;
  upvoteButton?: string;
  downvoteButton?: string;
  media?: string;
  chat?: string;
  message?: string;
  messageText?: string;
}

export interface PlatformPatterns {
  handle?: string;
  hashtag?: string;
  url?: string;
  mention?: string;
  subreddit?: string;
  user?: string;
}

export interface PlatformConfig {
  name: string;
  enabled: boolean;
  selectors: PlatformSelectors;
  patterns?: PlatformPatterns;
}

export interface CaptureSettings {
  debounceMs: number;
  maxBufferSize: number;
  autoSaveInterval: number;
  enableScreenshots: boolean;
  enableTextCapture: boolean;
}

export interface PrivacySettings {
  redactEmails: boolean;
  redactPhoneNumbers: boolean;
  excludePrivateMessages: boolean;
}

export interface SocialConfig {
  version: string;
  platforms: Record<string, PlatformConfig>;
  captureSettings: CaptureSettings;
  privacySettings: PrivacySettings;
}

// Default fallback config
const DEFAULT_CONFIG: SocialConfig = {
  version: '1.0.0',
  platforms: {},
  captureSettings: {
    debounceMs: 150,
    maxBufferSize: 100,
    autoSaveInterval: 30_000,
    enableScreenshots: false,
    enableTextCapture: true,
  },
  privacySettings: {
    redactEmails: true,
    redactPhoneNumbers: true,
    excludePrivateMessages: true,
  },
};

class SocialConfigService {
  private config: SocialConfig = DEFAULT_CONFIG;
  private loaded = false;

  /**
   * Load the social config from the bundled JSON file
   */
  async load(): Promise<SocialConfig> {
    if (this.loaded) {
      return this.config;
    }

    try {
      // Try to load from Tauri resource
      const resourcePath = await resolveResource('config/social_selectors.json');
      const configText = await readTextFile(resourcePath);
      this.config = JSON.parse(configText) as SocialConfig;
      this.loaded = true;
      logger.info('[SocialConfig] Loaded configuration', {
        version: this.config.version,
        platforms: Object.keys(this.config.platforms).length,
      });
    } catch (error) {
      logger.warn('[SocialConfig] Failed to load config, using defaults', { error });
      this.config = DEFAULT_CONFIG;
    }

    return this.config;
  }

  /**
   * Get configuration for a specific platform
   */
  getPlatform(platformId: string): PlatformConfig | undefined {

    return this.config.platforms[platformId];
  }

  /**
   * Get all enabled platforms
   */
  getEnabledPlatforms(): Record<string, PlatformConfig> {
    const enabled: Record<string, PlatformConfig> = {};
    for (const [id, config] of Object.entries(this.config.platforms)) {
      if (config.enabled) {

        enabled[id] = config;
      }
    }
    return enabled;
  }

  /**
   * Get capture settings
   */
  getCaptureSettings(): CaptureSettings {
    return this.config.captureSettings;
  }

  /**
   * Get privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return this.config.privacySettings;
  }

  /**
   * Generate injection script for a specific platform
   * This script runs in the WebView to capture content
   */
  generateInjectionScript(platformId: string): string {
    const platform = this.getPlatform(platformId);
    if (!platform) {
      return '';
    }

    const { selectors, patterns } = platform;
    const { debounceMs, maxBufferSize } = this.config.captureSettings;
    const { redactEmails, redactPhoneNumbers } = this.config.privacySettings;

    return `
(function() {
  const PLATFORM_ID = '${platformId}';
  const SELECTORS = ${JSON.stringify(selectors)};
  const PATTERNS = ${JSON.stringify(patterns || {})};
  const DEBOUNCE_MS = ${debounceMs};
  const MAX_BUFFER = ${maxBufferSize};
  const REDACT_EMAILS = ${redactEmails};
  const REDACT_PHONES = ${redactPhoneNumbers};

  let buffer = [];
  let debounceTimer = null;

  function sanitizeText(text) {
    if (!text) return '';
    let result = text.trim();
    
    if (REDACT_EMAILS) {
      result = result.replace(/[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]');
    }
    if (REDACT_PHONES) {
      result = result.replace(/\\+?\\d{1,3}[-. ]?\\(?\\d{3}\\)?[-. ]?\\d{3}[-. ]?\\d{4}/g, '[PHONE REDACTED]');
    }
    
    return result;
  }

  function extractPost(element) {
    const post = {
      platform: PLATFORM_ID,
      timestamp: Date.now(),
      author: '',
      text: '',
      metadata: {}
    };

    // Extract author
    if (SELECTORS.author) {
      const authorEl = element.querySelector(SELECTORS.author);
      if (authorEl) {
        post.author = sanitizeText(authorEl.textContent);
      }
    }

    // Extract text content
    const textSelector = SELECTORS.postText || SELECTORS.messageText || SELECTORS.postTitle;
    if (textSelector) {
      const textEl = element.querySelector(textSelector);
      if (textEl) {
        post.text = sanitizeText(textEl.textContent);
      }
    }

    // Extract patterns (hashtags, mentions, etc.)
    if (PATTERNS.hashtag && post.text) {
      const hashtags = post.text.match(new RegExp(PATTERNS.hashtag, 'g')) || [];
      post.metadata.hashtags = hashtags;
    }

    if (PATTERNS.handle && post.text) {
      const mentions = post.text.match(new RegExp(PATTERNS.handle, 'g')) || [];
      post.metadata.mentions = mentions;
    }

    return post;
  }

  function processCapture() {
    const postSelector = SELECTORS.post || SELECTORS.message;
    if (!postSelector) return;

    const posts = document.querySelectorAll(postSelector);
    const newPosts = [];

    posts.forEach(post => {
      const extracted = extractPost(post);
      if (extracted.text && extracted.text.length > 10) {
        newPosts.push(extracted);
      }
    });

    if (newPosts.length > 0 && buffer.length < MAX_BUFFER) {
      buffer.push(...newPosts.slice(0, MAX_BUFFER - buffer.length));
      
      // Send to Tauri backend
      if (window.__TAURI__) {
        window.__TAURI__.invoke('ingest_social_capture_cmd', {
          posts: buffer
        }).then(() => {
          buffer = [];
        }).catch(err => {
          console.error('[Noteece] Capture failed:', err);
        });
      }
    }
  }

  function debouncedCapture() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processCapture, DEBOUNCE_MS);
  }

  // Set up mutation observer for dynamic content
  const observer = new MutationObserver(debouncedCapture);
  
  const feedSelector = SELECTORS.timeline || SELECTORS.feed || SELECTORS.chat;
  if (feedSelector) {
    const feed = document.querySelector(feedSelector);
    if (feed) {
      observer.observe(feed, { 
        childList: true, 
        subtree: true 
      });
    }
  }

  // Also capture on scroll
  window.addEventListener('scroll', debouncedCapture, { passive: true });

  // Initial capture
  setTimeout(processCapture, 1000);

  // Logger replaced with internal console for WebView context
  // eslint-disable-next-line no-console
  console.log('[Noteece] Social capture initialized for', PLATFORM_ID);
})();
`;
  }

  /**
   * Get all platform IDs
   */
  getPlatformIds(): string[] {
    return Object.keys(this.config.platforms);
  }
}

// Singleton instance
export const socialConfigService = new SocialConfigService();
