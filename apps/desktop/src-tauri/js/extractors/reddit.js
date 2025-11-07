/**
 * Reddit Extractor
 *
 * Extracts posts and comments from Reddit (multi-subreddit support)
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Reddit] Extractor loaded for account:', config.accountId);

  // Reddit-specific selectors
  const SELECTORS = {
    // Post containers
    post: 'shreddit-post, div[data-testid="post-container"]',

    // Post details
    author: 'a[slot="author-name"], a[data-testid="post_author_link"]',
    subreddit: 'a[slot="subreddit-prefixed-name"], a[data-click-id="subreddit"]',
    title: 'a[slot="title"], h3[data-testid="post-title"]',
    content: 'div[slot="text-body"], div[data-testid="post-text-container"]',
    timestamp: 'shreddit-post-created-timestamp time, time',

    // Media
    image: 'shreddit-aspect-ratio img, img[data-testid="post-image"]',
    video: 'shreddit-player video',
    thumbnail: 'img[alt="Post image"]',
    gallery: 'ul[slot="gallery"]',

    // Engagement
    upvotes: 'shreddit-post-vote-button[aria-label*="upvote"], button[aria-label*="Upvote"]',
    score: 'shreddit-post[score], div[data-test-id="post-content"] faceplate-number',
    commentsCount: 'span[id$="-comment-count"], a[data-click-id="comments"]',

    // Link/URL posts
    linkUrl: 'a[slot="outbound-link"]',
  };

  /**
   * Extract post ID from Reddit's format
   */
  function getPostId(element) {
    // Try to get from element attributes
    const postId = element.getAttribute('id') ||
                  element.getAttribute('data-post-id') ||
                  element.getAttribute('post-id');

    if (postId) return postId;

    // Try to get from link
    const titleLink = element.querySelector(SELECTORS.title);
    if (titleLink) {
      const href = titleLink.getAttribute('href');
      const match = href?.match(/\/comments\/([a-z0-9]+)\//);
      if (match) return match[1];
    }

    // Fallback: generate ID
    const titleEl = element.querySelector(SELECTORS.title);
    const authorEl = element.querySelector(SELECTORS.author);
    if (titleEl) {
      const title = utils.safeText(titleEl).substring(0, 30);
      const author = utils.safeText(authorEl);
      return `rd_${author.replace(/\s/g, '_')}_${title.replace(/\s/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return `rd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract author and subreddit
   */
  function extractMetadata(element) {
    const authorEl = element.querySelector(SELECTORS.author);
    const subredditEl = element.querySelector(SELECTORS.subreddit);

    return {
      author: utils.safeText(authorEl),
      subreddit: utils.safeText(subredditEl),
    };
  }

  /**
   * Extract post content
   */
  function extractContent(element) {
    const titleEl = element.querySelector(SELECTORS.title);
    const contentEl = element.querySelector(SELECTORS.content);
    const linkEl = element.querySelector(SELECTORS.linkUrl);

    const title = utils.safeText(titleEl);
    const text = utils.safeText(contentEl);
    const linkUrl = linkEl?.getAttribute('href');

    let fullContent = title;
    if (text) {
      fullContent = `${title}\n\n${text}`;
    }
    if (linkUrl) {
      fullContent = `${fullContent}\n\nLink: ${linkUrl}`;
    }

    return {
      title,
      text: fullContent,
      html: contentEl?.innerHTML || title,
      linkUrl,
    };
  }

  /**
   * Extract media
   */
  function extractMedia(element) {
    const media = [];

    // Extract images
    const images = element.querySelectorAll(SELECTORS.image);
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.includes('preview.redd.it/award')) {
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

    // If no media found, check for thumbnail
    if (media.length === 0) {
      const thumbnail = element.querySelector(SELECTORS.thumbnail);
      if (thumbnail) {
        const src = thumbnail.getAttribute('src');
        if (src && !src.includes('default')) {
          media.push({
            type: 'thumbnail',
            url: src,
          });
        }
      }
    }

    return media;
  }

  /**
   * Extract engagement metrics
   */
  function extractEngagement(element) {
    // Try to get score from attribute
    let score = 0;
    const scoreAttr = element.getAttribute('score');
    if (scoreAttr) {
      score = parseInt(scoreAttr, 10);
    } else {
      // Try to find in DOM
      const scoreEl = element.querySelector(SELECTORS.score);
      score = utils.parseEngagement(utils.safeText(scoreEl));
    }

    // Get comment count
    const commentCountEl = element.querySelector(SELECTORS.commentsCount);
    const commentCountText = utils.safeText(commentCountEl);
    const comments = utils.parseEngagement(commentCountText);

    return {
      score,
      comments,
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
   * Extract a single Reddit post
   */
  function extractPost(postElement) {
    const postId = getPostId(postElement);

    if (utils.isAlreadyExtracted(postId)) {
      return null;
    }

    const metadata = extractMetadata(postElement);
    if (!metadata.author) return null; // Skip if no author

    const content = extractContent(postElement);
    if (!content.title) return null; // Skip if no title

    const media = extractMedia(postElement);
    const engagement = extractEngagement(postElement);
    const timestamp = extractTimestamp(postElement);

    const post = {
      id: postId,
      author: metadata.author,
      handle: metadata.author,
      content: content.text,
      contentHtml: content.html,
      url: content.linkUrl,
      media: media,
      metadata: {
        subreddit: metadata.subreddit,
        title: content.title,
        linkUrl: content.linkUrl,
        platform: 'reddit',
      },
      timestamp,
      likes: engagement.score,
      comments: engagement.comments,
      type: content.linkUrl ? 'link_post' : 'post',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all posts in the current view
   */
  function processPosts() {
    const postElements = document.querySelectorAll(SELECTORS.post);
    const posts = [];

    postElements.forEach(postEl => {
      try {
        const post = extractPost(postEl);
        if (post) {
          posts.push(post);
        }
      } catch (err) {
        console.error('[Noteece Reddit] Error extracting post:', err);
      }
    });

    if (posts.length > 0) {
      console.log(`[Noteece Reddit] Extracted ${posts.length} posts`);
      utils.sendToBackend('posts_batch', posts);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Reddit] Initializing extractor');

    // Process existing posts
    processPosts();

    // Watch for new posts being loaded (infinite scroll)
    utils.observeElements(SELECTORS.post, (newPosts) => {
      console.log(`[Noteece Reddit] Detected ${newPosts.length} new posts`);
      const extracted = [];

      newPosts.forEach(postEl => {
        try {
          const post = extractPost(postEl);
          if (post) {
            extracted.push(post);
          }
        } catch (err) {
          console.error('[Noteece Reddit] Error extracting new post:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processPosts();
    }, 12000); // Every 12 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
