/**
 * TikTok Extractor
 *
 * Extracts videos from TikTok For You and Following feeds
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece TikTok] Extractor loaded for account:', config.accountId);

  // TikTok-specific selectors
  const SELECTORS = {
    // Feed items
    videoItem: 'div[data-e2e="recommend-list-item-container"], div[class*="DivItemContainer"]',

    // Video details
    video: 'video',
    caption: 'div[data-e2e="browse-video-desc"], span[class*="SpanText"]',
    author: 'span[data-e2e="browse-username"], a[class*="author"]',
    authorLink: 'a[data-e2e="browse-username"]',
    avatar: 'img[data-e2e="browse-avatar"]',
    videoLink: 'a[href*="/video/"]',

    // Engagement
    likeButton: 'button[data-e2e="browse-like"], button[data-e2e="like-icon"]',
    likeCount: 'strong[data-e2e="browse-like-count"], strong[data-e2e="like-count"]',
    commentButton: 'button[data-e2e="browse-comment"], button[data-e2e="comment-icon"]',
    commentCount: 'strong[data-e2e="browse-comment-count"], strong[data-e2e="comment-count"]',
    shareButton: 'button[data-e2e="browse-share"]',
    shareCount: 'strong[data-e2e="browse-share-count"]',
    viewCount: 'strong[data-e2e="video-views"]',

    // Music/sound
    musicInfo: 'div[data-e2e="browse-music"], a[class*="music"]',
  };

  /**
   * Extract video ID from TikTok URL
   */
  function getVideoId(element) {
    const linkEl = element.querySelector(SELECTORS.videoLink);
    if (!linkEl) return null;

    const href = linkEl.getAttribute('href');
    if (!href) return null;

    // Extract video ID from /video/VIDEO_ID or /@user/video/VIDEO_ID
    const match = href.match(/\/video\/(\d+)/);
    if (match) return match[1];

    return null;
  }

  /**
   * Extract author information
   */
  function extractAuthor(element) {
    const authorEl = element.querySelector(SELECTORS.author);
    const authorLinkEl = element.querySelector(SELECTORS.authorLink);
    const avatarEl = element.querySelector(SELECTORS.avatar);

    let username = utils.safeText(authorEl);
    let handle = username;

    // Clean @ symbol if present
    if (username && username.startsWith('@')) {
      username = username.substring(1);
      handle = username;
    }

    // Try to get handle from link
    if (authorLinkEl) {
      const href = authorLinkEl.getAttribute('href');
      if (href) {
        const match = href.match(/\/@([^/?]+)/);
        if (match) handle = match[1];
      }
    }

    return {
      username,
      handle,
      avatar: utils.safeAttr(avatarEl, 'src'),
    };
  }

  /**
   * Extract engagement metrics
   */
  function extractEngagement(element) {
    const likeCountEl = element.querySelector(SELECTORS.likeCount);
    const commentCountEl = element.querySelector(SELECTORS.commentCount);
    const shareCountEl = element.querySelector(SELECTORS.shareCount);
    const viewCountEl = element.querySelector(SELECTORS.viewCount);

    return {
      likes: utils.parseEngagement(utils.safeText(likeCountEl)),
      comments: utils.parseEngagement(utils.safeText(commentCountEl)),
      shares: utils.parseEngagement(utils.safeText(shareCountEl)),
      views: utils.parseEngagement(utils.safeText(viewCountEl)),
    };
  }

  /**
   * Extract music/sound information
   */
  function extractMusic(element) {
    const musicEl = element.querySelector(SELECTORS.musicInfo);
    if (!musicEl) return null;

    return {
      title: utils.safeText(musicEl),
      url: musicEl.getAttribute('href') ? `https://tiktok.com${musicEl.getAttribute('href')}` : null,
    };
  }

  /**
   * Extract video media
   */
  function extractVideoMedia(element) {
    const videoEl = element.querySelector(SELECTORS.video);
    if (!videoEl) return [];

    // Try to get a valid HTTPS URL from multiple sources
    let videoUrl = null;

    // Check <source> elements first (often have higher quality)
    const sources = videoEl.querySelectorAll('source');
    for (const source of sources) {
      const src = source.getAttribute('src');
      if (src && src.startsWith('https://')) {
        videoUrl = src;
        break;
      }
    }

    // Fallback to video element src attribute
    if (!videoUrl) {
      const src = videoEl.getAttribute('src');
      // Validate URL - reject blob:, data:, and other non-persistent URLs
      if (src && src.startsWith('https://')) {
        videoUrl = src;
      }
    }

    // Only return if we have a valid persistent URL
    if (!videoUrl) return [];

    return [{
      type: 'video',
      url: videoUrl,
      poster: videoEl.getAttribute('poster'),
    }];
  }

  /**
   * Extract a single TikTok video
   */
  function extractVideo(videoElement) {
    const videoId = getVideoId(videoElement);
    if (!videoId || utils.isAlreadyExtracted(videoId)) {
      return null;
    }

    const author = extractAuthor(videoElement);
    if (!author.username) return null; // Skip if no author

    const captionEl = videoElement.querySelector(SELECTORS.caption);
    const caption = utils.safeText(captionEl);

    const engagement = extractEngagement(videoElement);
    const music = extractMusic(videoElement);
    const media = extractVideoMedia(videoElement);

    const video = {
      id: videoId,
      author: author.username,
      handle: author.handle,
      content: caption || '',
      contentHtml: caption ? `<p>${caption}</p>` : '',
      url: `https://tiktok.com/@${author.handle}/video/${videoId}`,
      media: media,
      metadata: {
        avatar: author.avatar,
        music: music,
        videoType: 'tiktok',
      },
      timestamp: Date.now(), // TikTok doesn't expose exact timestamps easily
      likes: engagement.likes,
      comments: engagement.comments,
      shares: engagement.shares,
      views: engagement.views,
      type: 'video',
    };

    return utils.normalizePost(video);
  }

  /**
   * Process all videos in the current view
   */
  function processVideos() {
    const videoElements = document.querySelectorAll(SELECTORS.videoItem);
    const videos = [];

    videoElements.forEach(videoEl => {
      try {
        const video = extractVideo(videoEl);
        if (video) {
          videos.push(video);
        }
      } catch (err) {
        console.error('[Noteece TikTok] Error extracting video:', err);
      }
    });

    if (videos.length > 0) {
      console.log(`[Noteece TikTok] Extracted ${videos.length} videos`);
      utils.sendToBackend('posts_batch', videos);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece TikTok] Initializing extractor');

    // Process existing videos
    processVideos();

    // Watch for new videos being loaded (infinite scroll)
    utils.observeElements(SELECTORS.videoItem, (newVideos) => {
      console.log(`[Noteece TikTok] Detected ${newVideos.length} new videos`);
      const extracted = [];

      newVideos.forEach(videoEl => {
        try {
          const video = extractVideo(videoEl);
          if (video) {
            extracted.push(video);
          }
        } catch (err) {
          console.error('[Noteece TikTok] Error extracting new video:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processVideos();
    }, 12000); // Every 12 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
