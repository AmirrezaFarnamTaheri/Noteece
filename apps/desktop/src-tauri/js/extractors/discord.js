/**
 * Discord Extractor
 *
 * Extracts messages from Discord servers and channels (web client)
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Discord] Extractor loaded for account:', config.accountId);

  // Discord-specific selectors
  const SELECTORS = {
    // Message containers
    message: 'li[id^="chat-messages-"]',
    messageGroup: 'div[class*="message-"]',

    // Message details
    author: 'span[class*="username-"], h3[class*="username-"]',
    authorId: 'div[data-author-id]',
    avatar: 'img[class*="avatar-"]',
    content: 'div[class*="messageContent-"], div[id^="message-content-"]',
    timestamp: 'time',

    // Media and embeds
    image: 'img[class*="imageWrapper-"]',
    video: 'video',
    attachment: 'div[class*="attachment-"]',
    embed: 'div[class*="embed-"]',
    embedTitle: 'div[class*="embedTitle-"]',
    embedDescription: 'div[class*="embedDescription-"]',

    // Reactions and engagement
    reactions: 'div[class*="reactions-"]',
    reaction: 'div[class*="reaction-"]',
    reactionCount: 'div[class*="reactionCount-"]',

    // Channel info
    channelName: 'h3[class*="title-"], div[class*="channelName-"]',
  };

  /**
   * Extract message ID from Discord's format
   */
  function getMessageId(element) {
    // Try to get from list item ID
    const id = element.getAttribute('id');
    if (id) {
      const match = id.match(/chat-messages-(\d+)/);
      if (match) return `dc_${match[1]}`;
    }

    // Try to get from data attributes
    const messageContainer = element.querySelector('[data-list-item-id]');
    if (messageContainer) {
      const listItemId = messageContainer.getAttribute('data-list-item-id');
      const match = listItemId?.match(/chat-messages___chat-messages-(\d+)/);
      if (match) return `dc_${match[1]}`;
    }

    // Fallback: compose from channel + author + time + content prefix
    const channelEl = document.querySelector(SELECTORS.channelName);
    const channel = (utils.safeText(channelEl) || 'channel').toLowerCase().replace(/\W+/g, '_');
    const authorId = element.querySelector(SELECTORS.authorId)?.getAttribute('data-author-id') || 'anon';
    const contentEl = element.querySelector(SELECTORS.content);
    const contentPrefix = contentEl ? utils.safeText(contentEl).substring(0, 24).replace(/\W+/g, '_') : 'msg';
    const ts = Date.now();
    return `dc_${channel}_${authorId}_${contentPrefix}_${ts}_${Math.random().toString(36).substr(2,6)}`;
  }

  /**
   * Extract author information
   */
  function extractAuthor(element) {
    const authorEl = element.querySelector(SELECTORS.author);
    const avatarEl = element.querySelector(SELECTORS.avatar);
    const authorIdContainer = element.querySelector(SELECTORS.authorId);

    return {
      name: utils.safeText(authorEl),
      id: authorIdContainer?.getAttribute('data-author-id'),
      avatar: utils.safeAttr(avatarEl, 'src'),
    };
  }

  /**
   * Extract message content
   */
  function extractContent(element) {
    const contentEl = element.querySelector(SELECTORS.content);
    const text = utils.safeText(contentEl);
    const html = contentEl?.innerHTML || '';

    // Check for embeds
    const embedTitleEl = element.querySelector(SELECTORS.embedTitle);
    const embedDescEl = element.querySelector(SELECTORS.embedDescription);

    let enrichedContent = text;
    if (embedTitleEl) {
      const embedTitle = utils.safeText(embedTitleEl);
      const embedDesc = utils.safeText(embedDescEl);
      enrichedContent = `${text}\n\nEmbed: ${embedTitle}\n${embedDesc}`;
    }

    return {
      text: enrichedContent,
      html: html,
    };
  }

  /**
   * Extract media and attachments
   */
  function extractMedia(element) {
    const media = [];

    // Extract images - check multiple sources for highest quality
    const images = element.querySelectorAll(SELECTORS.image);
    images.forEach(img => {
      // Priority order: data-fullsize > parent <a> href > srcset > data-src > src
      let url = img.getAttribute('data-fullsize') ||
                img.parentElement?.tagName === 'A' ? img.parentElement.getAttribute('href') : null;

      if (!url) {
        // Parse srcset for highest resolution
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const sources = srcset.split(',').map(s => s.trim().split(' '));
          // Get the last (highest resolution) source
          url = sources[sources.length - 1]?.[0];
        }
      }

      // Fallback to data-src or regular src
      url = url || img.getAttribute('data-src') || img.getAttribute('src');

      if (url && !url.includes('avatar')) {
        media.push({
          type: 'image',
          url: url,
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

    // Extract attachments
    const attachments = element.querySelectorAll(SELECTORS.attachment);
    attachments.forEach(attachment => {
      const link = attachment.querySelector('a');
      if (link) {
        media.push({
          type: 'attachment',
          url: link.getAttribute('href'),
          name: utils.safeText(link),
        });
      }
    });

    return media;
  }

  /**
   * Extract reactions
   */
  function extractReactions(element) {
    const reactions = [];
    const reactionElements = element.querySelectorAll(SELECTORS.reaction);

    reactionElements.forEach(reactionEl => {
      const countEl = reactionEl.querySelector(SELECTORS.reactionCount);
      const emoji = reactionEl.querySelector('img')?.getAttribute('alt') ||
                    utils.safeText(reactionEl).split(' ')[0];
      const count = utils.parseEngagement(utils.safeText(countEl));

      if (emoji && count > 0) {
        reactions.push({
          emoji,
          count,
        });
      }
    });

    return reactions;
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
   * Get current channel name
   */
  function getCurrentChannel() {
    const channelEl = document.querySelector(SELECTORS.channelName);
    return utils.safeText(channelEl) || 'Unknown Channel';
  }

  /**
   * Extract a single Discord message
   */
  function extractMessage(messageElement) {
    const messageId = getMessageId(messageElement);

    if (utils.isAlreadyExtracted(messageId)) {
      return null;
    }

    const author = extractAuthor(messageElement);
    if (!author.name) return null; // Skip if no author

    const content = extractContent(messageElement);
    if (!content.text && !content.html) return null; // Skip empty messages

    const media = extractMedia(messageElement);
    const reactions = extractReactions(messageElement);
    const timestamp = extractTimestamp(messageElement);
    const channel = getCurrentChannel();

    // Calculate total reactions
    const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

    const message = {
      id: messageId,
      author: author.name,
      handle: author.id || author.name,
      content: content.text,
      contentHtml: content.html,
      media: media,
      metadata: {
        avatar: author.avatar,
        channel: channel,
        reactions: reactions,
        platform: 'discord',
      },
      timestamp,
      likes: totalReactions, // Use total reactions as "likes"
      type: 'message',
    };

    return utils.normalizePost(message);
  }

  /**
   * Process all messages in the current view
   */
  function processMessages() {
    const messageElements = document.querySelectorAll(SELECTORS.message);
    const messages = [];

    messageElements.forEach(msgEl => {
      try {
        const message = extractMessage(msgEl);
        if (message) {
          messages.push(message);
        }
      } catch (err) {
        console.error('[Noteece Discord] Error extracting message:', err);
      }
    });

    if (messages.length > 0) {
      console.log(`[Noteece Discord] Extracted ${messages.length} messages`);
      utils.sendToBackend('posts_batch', messages);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Discord] Initializing extractor');

    // Process existing messages
    processMessages();

    // Watch for new messages
    utils.observeElements(SELECTORS.message, (newMessages) => {
      console.log(`[Noteece Discord] Detected ${newMessages.length} new messages`);
      const extracted = [];

      newMessages.forEach(msgEl => {
        try {
          const message = extractMessage(msgEl);
          if (message) {
            extracted.push(message);
          }
        } catch (err) {
          console.error('[Noteece Discord] Error extracting new message:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processMessages();
    }, 10000); // Every 10 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
