/**
 * LinkedIn Extractor
 *
 * Extracts posts from LinkedIn feed and connections
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece LinkedIn] Extractor loaded for account:', config.accountId);

  // LinkedIn-specific selectors
  const SELECTORS = {
    // Feed posts
    feedPost: 'div[data-id^="urn:li:activity:"], div.feed-shared-update-v2',

    // Post details
    author: 'span.feed-shared-actor__name, span.update-components-actor__name',
    authorLink: 'a.app-aware-link[href*="/in/"]',
    authorTitle: 'span.feed-shared-actor__description, span.update-components-actor__description',
    avatar: 'img.feed-shared-actor__avatar-image, img.EntityPhoto-circle-3',
    content: 'div.feed-shared-update-v2__description, div.feed-shared-text',
    contentExpanded: 'div.feed-shared-inline-show-more-text',
    timestamp: 'span.feed-shared-actor__sub-description time, time',

    // Media
    image: 'img.feed-shared-image__image, img.ivm-view-attr__img--centered',
    video: 'video',
    document: 'div.feed-shared-document, div.feed-shared-article',
    articleTitle: 'span.feed-shared-article__title',
    articleDescription: 'div.feed-shared-article__description',

    // Engagement
    likeButton: 'button[aria-label*="Like"], button.reactions-react-button',
    commentButton: 'button[aria-label*="Comment"]',
    repostButton: 'button[aria-label*="Repost"]',
    socialCounts: 'ul.social-details-social-counts',
    reactionCount: 'span.social-details-social-counts__reactions-count',
    commentCount: 'li.social-details-social-counts__comments',
  };

  /**
   * Extract post ID from LinkedIn URN or DOM
   */
  function getPostId(element) {
    // Try data-id attribute (urn:li:activity:ID)
    const dataId = element.getAttribute('data-id');
    if (dataId) {
      const match = dataId.match(/activity:(\d+)/);
      if (match) return match[1];
    }

    // Try to find in permalink
    const permalink = element.querySelector('a[href*="/feed/update/"]');
    if (permalink) {
      const href = permalink.getAttribute('href');
      const match = href.match(/update\/urn:li:activity:(\d+)/);
      if (match) return match[1];
    }

    // Fallback: generate from content
    const contentEl = element.querySelector(SELECTORS.content);
    const authorEl = element.querySelector(SELECTORS.author);
    if (contentEl && authorEl) {
      const text = utils.safeText(contentEl).substring(0, 30);
      const author = utils.safeText(authorEl);
      return `li_${author.replace(/\s/g, '_')}_${text.replace(/\s/g, '_')}_${Math.random().toString(36).substr(2, 9)}`;
    }

    return `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract author information
   */
  function extractAuthor(element) {
    const authorEl = element.querySelector(SELECTORS.author);
    const authorLinkEl = element.querySelector(SELECTORS.authorLink);
    const authorTitleEl = element.querySelector(SELECTORS.authorTitle);
    const avatarEl = element.querySelector(SELECTORS.avatar);

    let handle = null;
    if (authorLinkEl) {
      const href = authorLinkEl.getAttribute('href');
      const match = href?.match(/\/in\/([^/?]+)/);
      if (match) handle = match[1];
    }

    return {
      name: utils.safeText(authorEl),
      handle: handle,
      title: utils.safeText(authorTitleEl),
      avatar: utils.safeAttr(avatarEl, 'src'),
    };
  }

  /**
   * Extract post content
   */
  function extractContent(element) {
    // Check for expanded "See more" content first
    let contentEl = element.querySelector(SELECTORS.contentExpanded);
    if (!contentEl) {
      contentEl = element.querySelector(SELECTORS.content);
    }

    const text = utils.safeText(contentEl);

    // Check for article/document
    const articleTitleEl = element.querySelector(SELECTORS.articleTitle);
    const articleDescEl = element.querySelector(SELECTORS.articleDescription);

    let enrichedContent = text;
    if (articleTitleEl) {
      const articleTitle = utils.safeText(articleTitleEl);
      const articleDesc = utils.safeText(articleDescEl);
      enrichedContent = `${text}\n\nShared article: ${articleTitle}\n${articleDesc}`;
    }

    return {
      text: enrichedContent,
      html: contentEl?.innerHTML || '',
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
      if (src && !src.includes('ghost') && !src.includes('avatar')) {
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
    const reactionCountEl = element.querySelector(SELECTORS.reactionCount);
    const commentCountEl = element.querySelector(SELECTORS.commentCount);

    return {
      reactions: utils.parseEngagement(utils.safeText(reactionCountEl)),
      comments: utils.parseEngagement(utils.safeText(commentCountEl)),
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
   * Extract a single LinkedIn post
   */
  function extractPost(postElement) {
    const postId = getPostId(postElement);

    if (utils.isAlreadyExtracted(postId)) {
      return null;
    }

    const author = extractAuthor(postElement);
    if (!author.name) return null; // Skip if no author

    const content = extractContent(postElement);
    if (!content.text) return null; // Skip if no content

    const media = extractMedia(postElement);
    const engagement = extractEngagement(postElement);
    const timestamp = extractTimestamp(postElement);

    const post = {
      id: postId,
      author: author.name,
      handle: author.handle || author.name,
      content: content.text,
      contentHtml: content.html,
      media: media,
      metadata: {
        avatar: author.avatar,
        authorTitle: author.title,
        platform: 'linkedin',
      },
      timestamp,
      likes: engagement.reactions,
      comments: engagement.comments,
      type: 'post',
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all posts in the current view
   */
  function processPosts() {
    const postElements = document.querySelectorAll(SELECTORS.feedPost);
    const posts = [];

    postElements.forEach(postEl => {
      try {
        const post = extractPost(postEl);
        if (post) {
          posts.push(post);
        }
      } catch (err) {
        console.error('[Noteece LinkedIn] Error extracting post:', err);
      }
    });

    if (posts.length > 0) {
      console.log(`[Noteece LinkedIn] Extracted ${posts.length} posts`);
      utils.sendToBackend('posts_batch', posts);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece LinkedIn] Initializing extractor');

    // Process existing posts
    processPosts();

    // Watch for new posts being loaded (infinite scroll)
    utils.observeElements(SELECTORS.feedPost, (newPosts) => {
      console.log(`[Noteece LinkedIn] Detected ${newPosts.length} new posts`);
      const extracted = [];

      newPosts.forEach(postEl => {
        try {
          const post = extractPost(postEl);
          if (post) {
            extracted.push(post);
          }
        } catch (err) {
          console.error('[Noteece LinkedIn] Error extracting new post:', err);
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
