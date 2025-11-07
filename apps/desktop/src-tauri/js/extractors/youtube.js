/**
 * YouTube Extractor
 *
 * Extracts videos from YouTube feed, subscriptions, and watch history
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece YouTube] Extractor loaded for account:', config.accountId);

  // YouTube-specific selectors
  const SELECTORS = {
    // Home feed and subscription videos
    videoRenderer: 'ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer',

    // Video details
    thumbnail: 'img#img, img.yt-core-image',
    title: '#video-title, h3 a#video-title',
    channelName: '#channel-name a, #text a.yt-simple-endpoint',
    channelAvatar: '#avatar img',
    viewCount: '#metadata-line span:first-child',
    uploadDate: '#metadata-line span:last-child',
    duration: 'ytd-thumbnail-overlay-time-status-renderer span',
    description: '#description-text',

    // Engagement
    likeButton: 'like-button-view-model button[aria-label*="like"]',
    viewCountVideo: '.view-count',

    // Watch history
    watchHistoryItem: 'ytd-item-section-renderer #contents > *',
  };

  /**
   * Extract video ID from various YouTube URL formats
   */
  function getVideoId(element) {
    const linkEl = element.querySelector('a#video-title, a#thumbnail');
    if (!linkEl) return null;

    const href = linkEl.getAttribute('href');
    if (!href) return null;

    // Extract video ID from /watch?v=VIDEO_ID or /shorts/VIDEO_ID
    const watchMatch = href.match(/[?&]v=([^&]+)/);
    if (watchMatch) return watchMatch[1];

    const shortsMatch = href.match(/\/shorts\/([^?&]+)/);
    if (shortsMatch) return shortsMatch[1];

    return null;
  }

  /**
   * Extract channel information
   */
  function extractChannel(element) {
    const channelLink = element.querySelector(SELECTORS.channelName);
    const channelAvatar = element.querySelector(SELECTORS.channelAvatar);

    return {
      name: utils.safeText(channelLink),
      handle: channelLink ? channelLink.getAttribute('href')?.replace('/@', '').split('/')[0] : null,
      url: channelLink ? `https://youtube.com${channelLink.getAttribute('href')}` : null,
      avatar: utils.safeAttr(channelAvatar, 'src'),
    };
  }

  /**
   * Extract video metadata
   */
  function extractMetadata(element) {
    const viewCountEl = element.querySelector(SELECTORS.viewCount);
    const uploadDateEl = element.querySelector(SELECTORS.uploadDate);
    const durationEl = element.querySelector(SELECTORS.duration);

    return {
      views: parseViewCount(utils.safeText(viewCountEl)),
      uploadDate: utils.safeText(uploadDateEl),
      duration: utils.safeText(durationEl),
    };
  }

  /**
   * Parse view count from text like "1.2M views" or "1,234 views"
   */
  function parseViewCount(text) {
    if (!text) return 0;

    const match = text.match(/([\d,.]+)([KMB]?)/i);
    if (!match) return 0;

    let num = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2].toUpperCase();

    if (suffix === 'K') num *= 1000;
    else if (suffix === 'M') num *= 1000000;
    else if (suffix === 'B') num *= 1000000000;

    return Math.floor(num);
  }

  /**
   * Extract a single video
   */
  function extractVideo(videoElement) {
    const videoId = getVideoId(videoElement);
    if (!videoId || utils.isAlreadyExtracted(videoId)) {
      return null;
    }

    const titleEl = videoElement.querySelector(SELECTORS.title);
    const thumbnailEl = videoElement.querySelector(SELECTORS.thumbnail);
    const descEl = videoElement.querySelector(SELECTORS.description);

    const title = utils.safeText(titleEl);
    if (!title) return null; // Skip if no title

    const channel = extractChannel(videoElement);
    const metadata = extractMetadata(videoElement);

    const video = {
      id: videoId,
      author: channel.name,
      handle: channel.handle,
      content: title,
      contentHtml: `<a href="https://youtube.com/watch?v=${videoId}">${title}</a>`,
      url: `https://youtube.com/watch?v=${videoId}`,
      media: [{
        type: 'thumbnail',
        url: utils.safeAttr(thumbnailEl, 'src'),
      }],
      metadata: {
        channelUrl: channel.url,
        channelAvatar: channel.avatar,
        description: utils.safeText(descEl),
        duration: metadata.duration,
        uploadDate: metadata.uploadDate,
      },
      views: metadata.views,
      type: 'video',
    };

    return utils.normalizePost(video);
  }

  /**
   * Process all videos in the current view
   */
  function processVideos() {
    const videoElements = document.querySelectorAll(SELECTORS.videoRenderer);
    const videos = [];

    videoElements.forEach(videoEl => {
      try {
        const video = extractVideo(videoEl);
        if (video) {
          videos.push(video);
        }
      } catch (err) {
        console.error('[Noteece YouTube] Error extracting video:', err);
      }
    });

    if (videos.length > 0) {
      console.log(`[Noteece YouTube] Extracted ${videos.length} videos`);
      utils.sendToBackend('posts_batch', videos);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece YouTube] Initializing extractor');

    // Process existing videos
    processVideos();

    // Watch for new videos being loaded (infinite scroll)
    utils.observeElements(SELECTORS.videoRenderer, (newVideos) => {
      console.log(`[Noteece YouTube] Detected ${newVideos.length} new videos`);
      const extracted = [];

      newVideos.forEach(videoEl => {
        try {
          const video = extractVideo(videoEl);
          if (video) {
            extracted.push(video);
          }
        } catch (err) {
          console.error('[Noteece YouTube] Error extracting new video:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan for content that might be dynamically updated
    setInterval(() => {
      processVideos();
    }, 10000); // Every 10 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
