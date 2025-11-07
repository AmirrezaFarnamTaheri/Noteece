/**
 * Telegram Extractor
 *
 * Extracts messages from chats, groups, and channels via Telegram Web
 */

(function() {
  'use strict';

  const utils = window.__NOTEECE__.utils;
  const config = window.__NOTEECE__.config;

  console.log('[Noteece Telegram] Extractor loaded for account:', config.accountId);

  // Telegram-specific selectors
  const SELECTORS = {
    // Message containers
    message: 'div[class*="Message"], div[class*="message-"], div.message',
    messageItem: 'div[data-message-id], div[class*="MessageListItem"]',

    // Message details
    author: 'span[class*="sender"], div[class*="peer-title"], span[class*="name"]',
    content: 'div[class*="text-content"], div[class*="message-text"], div[class*="Message__text"]',
    time: 'time, span[class*="time"], div[class*="message-date"]',
    avatar: 'img[class*="avatar"], img[class*="Avatar"]',

    // Channel/Group info
    channelName: 'div[class*="chat-info-title"], h3[class*="peer-title"], div[class*="ChatInfo"]',
    channelAvatar: 'div[class*="chat-info"] img, div[class*="ChatInfo"] img',

    // Media attachments
    photo: 'img[class*="media"], img[class*="photo"]',
    video: 'video, div[class*="video-player"]',
    document: 'div[class*="document"], div[class*="file"]',
    sticker: 'div[class*="sticker"] img',
    voice: 'div[class*="voice"], audio',

    // Forwarded/replied messages
    forwarded: 'div[class*="forward"], div[class*="forwarded"]',
    replied: 'div[class*="reply"], div[class*="replied"]',

    // Reactions
    reactions: 'div[class*="reactions"], div[class*="reaction-"]',
    views: 'span[class*="views"], div[class*="view-count"]',
  };

  /**
   * Extract message ID from element or generate one
   */
  function getMessageId(element) {
    // Try to get from data attributes
    const dataId = element.getAttribute('data-message-id') ||
                  element.getAttribute('data-mid') ||
                  element.getAttribute('data-id') ||
                  element.getAttribute('id');

    if (dataId) return `tg_${dataId}`;

    // Try to find unique identifier in element
    const messageId = element.querySelector('[data-message-id]');
    if (messageId) {
      return `tg_${messageId.getAttribute('data-message-id')}`;
    }

    // Fallback: generate from content, channel, and numeric timestamp
    const contentEl = element.querySelector(SELECTORS.content);
    const timeEl = element.querySelector(SELECTORS.time);
    const channelEl = document.querySelector(SELECTORS.channelName);

    if (contentEl) {
      const content = utils.safeText(contentEl).substring(0, 30);
      const channel = channelEl ? utils.safeText(channelEl).replace(/\W/g, '_') : 'unknown';

      // Use numeric timestamp from time element or current time
      let timestamp = Date.now();
      if (timeEl) {
        const timeAttr = timeEl.getAttribute('datetime');
        if (timeAttr) {
          timestamp = new Date(timeAttr).getTime();
        }
      }

      return `tg_${channel}_${content.replace(/\W/g, '_')}_${timestamp}`;
    }

    return `tg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract message information
   */
  function extractMessage(element) {
    const authorEl = element.querySelector(SELECTORS.author);
    const contentEl = element.querySelector(SELECTORS.content);
    const timeEl = element.querySelector(SELECTORS.time);
    const avatarEl = element.querySelector(SELECTORS.avatar);
    const photoEl = element.querySelector(SELECTORS.photo);
    const videoEl = element.querySelector(SELECTORS.video);
    const documentEl = element.querySelector(SELECTORS.document);
    const stickerEl = element.querySelector(SELECTORS.sticker);
    const voiceEl = element.querySelector(SELECTORS.voice);
    const forwardedEl = element.querySelector(SELECTORS.forwarded);
    const repliedEl = element.querySelector(SELECTORS.replied);
    const reactionsEl = element.querySelector(SELECTORS.reactions);
    const viewsEl = element.querySelector(SELECTORS.views);

    // Try to get channel/group name from page header
    const channelNameEl = document.querySelector(SELECTORS.channelName);

    return {
      author: utils.safeText(authorEl),
      content: utils.safeText(contentEl),
      time: utils.safeText(timeEl),
      avatar: utils.safeAttr(avatarEl, 'src'),
      channelName: utils.safeText(channelNameEl),
      hasPhoto: !!photoEl,
      hasVideo: !!videoEl,
      hasDocument: !!documentEl,
      hasSticker: !!stickerEl,
      hasVoice: !!voiceEl,
      isForwarded: !!forwardedEl,
      isReplied: !!repliedEl,
      photo: utils.safeAttr(photoEl, 'src'),
      sticker: utils.safeAttr(stickerEl, 'src'),
      reactions: utils.safeText(reactionsEl),
      views: utils.safeText(viewsEl),
    };
  }

  /**
   * Parse view count
   */
  function parseViews(viewsText) {
    if (!viewsText) return 0;

    const match = viewsText.match(/([\d,]+)([KM]?)/);
    if (match) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      const multiplier = match[2] === 'K' ? 1000 : match[2] === 'M' ? 1000000 : 1;
      return Math.floor(num * multiplier);
    }
    return 0;
  }

  /**
   * Extract timestamp from time element
   */
  function extractTimestamp(element) {
    const timeEl = element.querySelector(SELECTORS.time);
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime') || timeEl.getAttribute('data-timestamp');
      if (datetime) {
        return utils.parseTimestamp(datetime);
      }

      // Try parsing the text
      const timeText = utils.safeText(timeEl);
      if (timeText) {
        const date = new Date(timeText);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
      }
    }
    return Date.now();
  }

  /**
   * Extract a single message as a post
   */
  function extractMessagePost(messageElement) {
    const messageId = getMessageId(messageElement);

    if (utils.isAlreadyExtracted(messageId)) {
      return null;
    }

    const msg = extractMessage(messageElement);
    if (!msg.content && !msg.hasPhoto && !msg.hasVideo && !msg.hasSticker) {
      return null; // Skip empty messages
    }

    // Determine message type
    let type = 'message';
    let typeLabel = '';
    if (msg.hasPhoto) {
      type = 'photo_message';
      typeLabel = '📷 ';
    } else if (msg.hasVideo) {
      type = 'video_message';
      typeLabel = '🎥 ';
    } else if (msg.hasSticker) {
      type = 'sticker';
      typeLabel = '🎨 ';
    } else if (msg.hasVoice) {
      type = 'voice_message';
      typeLabel = '🎤 ';
    } else if (msg.hasDocument) {
      type = 'document_message';
      typeLabel = '📎 ';
    }

    // Build content
    let content = msg.content || '';
    if (msg.isForwarded) {
      content = `🔁 Forwarded: ${content}`;
    }
    if (msg.isReplied) {
      content = `↩️ Reply: ${content}`;
    }
    if (!content) {
      content = `${typeLabel}Media message`;
    } else {
      content = `${typeLabel}${content}`;
    }

    const media = [];
    if (msg.photo) {
      media.push({
        type: 'image',
        url: msg.photo,
        alt: 'Message photo',
      });
    }
    if (msg.sticker) {
      media.push({
        type: 'image',
        url: msg.sticker,
        alt: 'Sticker',
      });
    }

    const timestamp = extractTimestamp(messageElement);
    const views = parseViews(msg.views);

    const post = {
      id: messageId,
      author: msg.author || msg.channelName || 'Telegram User',
      handle: msg.author?.toLowerCase().replace(/\s+/g, '_') || 'telegram_user',
      content,
      contentHtml: `<p>${content.replace(/\n/g, '<br>')}</p>`,
      media: media.length > 0 ? media : undefined,
      metadata: {
        channelName: msg.channelName,
        isForwarded: msg.isForwarded,
        isReplied: msg.isReplied,
        reactions: msg.reactions,
        platform: 'telegram',
        type,
      },
      timestamp,
      views: views > 0 ? views : undefined,
      type,
    };

    return utils.normalizePost(post);
  }

  /**
   * Process all messages in the current view
   */
  function processMessages() {
    const messageElements = document.querySelectorAll(SELECTORS.message);
    const itemElements = document.querySelectorAll(SELECTORS.messageItem);

    const allElements = [...messageElements, ...itemElements];
    const messages = [];

    allElements.forEach(msgEl => {
      try {
        const message = extractMessagePost(msgEl);
        if (message) {
          messages.push(message);
        }
      } catch (err) {
        console.error('[Noteece Telegram] Error extracting message:', err);
      }
    });

    if (messages.length > 0) {
      console.log(`[Noteece Telegram] Extracted ${messages.length} messages`);
      utils.sendToBackend('posts_batch', messages);
    }
  }

  /**
   * Initialize the extractor
   */
  function init() {
    console.log('[Noteece Telegram] Initializing extractor');

    // Process existing messages
    processMessages();

    // Watch for new messages
    utils.observeElements(`${SELECTORS.message}, ${SELECTORS.messageItem}`, (newMessages) => {
      console.log(`[Noteece Telegram] Detected ${newMessages.length} new messages`);
      const extracted = [];

      newMessages.forEach(msgEl => {
        try {
          const message = extractMessagePost(msgEl);
          if (message) {
            extracted.push(message);
          }
        } catch (err) {
          console.error('[Noteece Telegram] Error extracting new message:', err);
        }
      });

      if (extracted.length > 0) {
        utils.sendToBackend('posts_batch', extracted);
      }
    });

    // Periodic re-scan
    setInterval(() => {
      processMessages();
    }, 15000); // Every 15 seconds
  }

  // Start extraction when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
