/**
 * Instagram Extractor
 *
 * Extracts posts, reels, and stories from Instagram feed
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Instagram] Extractor loaded for account:', config.accountId);

  // Instagram-specific selectors
  const SELECTORS = {
    // Feed posts
    article: 'article[role="presentation"], article',

    // Post details
    image: 'img[srcset], img[src]',
    video: 'video',
    caption: 'h1, div[style*="line-height"] > span',
    username: 'a[role="link"] span, header a span',
    userLink: 'header a[role="link"]',
    avatar: 'img[data-testid="user-avatar"], header img',
    timestamp: 'time',

    // Engagement
    likeButton: 'svg[aria-label*="Like"], button svg[aria-label*="like"]',
    likeCount: 'a[href*="/liked_by/"] span, button span',
    commentButton: 'svg[aria-label*="Comment"]',
    shareButton: 'svg[aria-label*="Share"]',

    // Reels
    reelVideo: 'video[playsinline]',
    reelCaption: 'h1[dir="auto"]',

    // Stories (if accessible)
    storyImage: 'img[draggable="false"]',
    storyVideo: 'video[playsinline]',
  };

  /**
   * Generate pseudo-ID from post content
   * Instagram doesn't expose post IDs easily, so we create one from URL or content hash
   */
  function generatePostId(element) {
    // Try to find permalink
    const linkEl = element.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    if (linkEl) {
      const href = linkEl.getAttribute('href');
      const match = href.match(/\/(p|reel)\/([^/?]+)/);
      if (match) return match[2];
    }

    // Fallback: use timestamp or generate from caption
    const timeEl = element.querySelector(SELECTORS.timestamp);
    const captionEl = element.querySelector(SELECTORS.caption);

    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) return `ig_${datetime}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Last resort: hash of caption text
    const caption = utils.safeText(captionEl);
    if (caption) {
      return `ig_${caption.substring(0, 20).replace(/\s/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract user information
   */
  function extractUser(element) {
    const usernameEl = element.querySelector(SELECTORS.username);
    const userLinkEl = element.querySelector(SELECTORS.userLink);
    const avatarEl = element.querySelector(SELECTORS.avatar);

    const username = utils.safeText(usernameEl);
    let handle = username;

    // Try to get handle from link
    if (userLinkEl) {
      const href = userLinkEl.getAttribute('href');
      if (href) {
        const match = href.match(/^\/([^/]+)/);
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
   * Extract media (images and videos)
   */
  function extractMediaFromPost(element) {
    const media = [];

    // Extract images
    const images = element.querySelectorAll(SELECTORS.image);
    images.forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('srcset')?.split(' ')[0];
      if (src && !src.includes('avatar') && !src.includes('profile')) {
        media.push({
          type: 'image',
          url: src,
          alt: img.getAttribute('alt'),
        });
      }
    });

    // Extract videos
    const videos = element.querySelectorAll(SELECTORS.video);
    videos.forEach(video => {
      const src = video.getAttribute('src');
      if (src) {
        media.push({
          type: 'video',
          url: src,
          poster: video.getAttribute('poster'),
        });
      }
    });

    return media;
  }

  /**
   * Extract engagement metrics
   */
  function extractEngagement(element) {
    const likeCountEl = element.querySelector(SELECTORS.likeCount);
    const likeText = utils.safeText(likeCountEl);

    return {
      likes: utils.parseEngagement(likeText),
      hasLikeButton: !!element.querySelector(SELECTORS.likeButton),
      hasCommentButton: !!element.querySelector(SELECTORS.commentButton),
      hasShareButton: !!element.querySelector(SELECTORS.shareButton),
    };
  }

  /**
   * Extract timestamp
   */
  function extractTimestamp(element) {
    const timeEl = element.querySelector(SELECTORS.timestamp);
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        return utils.parseTimestamp(datetime);
      }
    }
    return Date.now();
  }

  /**
   * Extract a single post
   */
  function extractPost(articleElement) {
    const postId = generatePostId(articleElement);

    if (utils.isAlreadyExtracted(postId)) {
      return null;
    }

    const user = extractUser(articleElement);
    if (!user.username) return null; // Skip if no user

    const captionEl = articleElement.querySelector(SELECTORS.caption);
    const caption = utils.safeText(captionEl);

    const media = extractMediaFromPost(articleElement);
    const engagement = extractEngagement(articleElement);
    const timestamp = extractTimestamp(articleElement);

    // Determine post type
    let type = 'post';
    const reelVideoEl = articleElement.querySelector(SELECTORS.reelVideo);
    if (reelVideoEl || articleElement.querySelector('a[href*="/reel/"]')) {
      type = 'reel';
    } else if (media.some(m => m.type === 'video')) {
      type = 'video_post';
    }

    const post = {
      id: postId,
      author: user.username,
      handle: user.handle,
      content: caption || '',
      contentHtml: caption ? `<p>${caption}</p>` : '',
      media: media,
      metadata: {
        avatar: user.avatar,
        postType: type,
      },
      timestamp,
      likes: engagement.likes,
      type,
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all posts in the current view
   */
  function processPosts() {
    const articles = document.querySelectorAll(SELECTORS.article);
    const posts = [];

    articles.forEach(articleEl => {
      try {
        const post = extractPost(articleEl);
        if (post) {
          posts.push(post);
        }
      } catch (err) {
        console.error('[Noteece Instagram] Error extracting post:', err);
      }
    });

    if (posts.length > 0) {
      console.log(`[Noteece Instagram] Extracted ${posts.length} posts`);
      utils.sendToBackend('posts_batch', posts);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Instagram] Initializing extractor');

    // Process existing posts
    processPosts();

    // Watch for new posts being loaded (infinite scroll)
    utils.observeElements(SELECTORS.article, (newArticles) => {
      console.log(`[Noteece Instagram] Detected ${newArticles.length} new posts`);
      const extracted = [];

      newArticles.forEach(articleEl => {
        try {
          const post = extractPost(articleEl);
          if (post) {
            extracted.push(post);
          }
        } catch (err) {
          console.error('[Noteece Instagram] Error extracting new post:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processPosts();
    }, 15000); // Every 15 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
